// History page script for URL Phishing Guard

const HISTORY_STORAGE_KEY = 'phishing_history';

const historyState = {
    allItems: [],
    filterMode: 'all',        // all | single | batch
    filterExtra: 'none'       // none | safe | phishing
};

const historyEls = {
    list: document.getElementById('historyList'),
    empty: document.getElementById('emptyHistory'),
    totalScans: document.getElementById('totalScans'),
    totalSafe: document.getElementById('totalSafe'),
    totalPhishing: document.getElementById('totalPhishing'),
    exportBtn: document.getElementById('exportHistoryBtn'),
    clearBtn: document.getElementById('clearHistoryBtn'),
    tabs: Array.from(document.querySelectorAll('.history-tab')),
    toggleFilters: Array.from(document.querySelectorAll('.history-toggle-btn'))
};

function loadHistoryFromStorage() {
    try {
        const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        console.warn('Failed to read history from localStorage', e);
        return [];
    }
}

function formatRelativeTime(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    if (isNaN(date)) return '';

    const now = new Date();
    const diffMs = now - date;
    const diffMinutes = Math.round(diffMs / 60000);
    const diffHours = Math.round(diffMs / 3600000);
    const diffDays = Math.round(diffMs / 86400000);

    if (diffMinutes < 1) return 'just now';
    if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
    return date.toLocaleString();
}

function getBasicResult(entry) {
    const data = entry.result || entry.raw || entry.data || {};
    const isPhishing = Boolean(
        data.is_phishing ||
        data.isPhishing ||
        data.prediction === 'phishing' ||
        data.prediction === 'PHISHING' ||
        entry.is_phishing
    );
    const probability = Number(
        data.probability ??
        data.confidence ??
        entry.probability ??
        0
    );
    return { isPhishing, probability };
}

function applyFilters() {
    let items = historyState.allItems.slice();

    // main mode filter
    if (historyState.filterMode === 'single') {
        items = items.filter(h => (h.mode || 'single') === 'single');
    } else if (historyState.filterMode === 'batch') {
        items = items.filter(h => (h.mode || 'single') === 'batch');
    }

    // extra filter (safe / phishing)
    if (historyState.filterExtra === 'safe') {
        items = items.filter(h => !getBasicResult(h).isPhishing);
    } else if (historyState.filterExtra === 'phishing') {
        items = items.filter(h => getBasicResult(h).isPhishing);
    }

    return items;
}

function renderSummary() {
    const all = historyState.allItems;
    const totals = all.reduce(
        (acc, item) => {
            const { isPhishing } = getBasicResult(item);
            if (isPhishing) acc.phishing += 1;
            else acc.safe += 1;
            return acc;
        },
        { safe: 0, phishing: 0 }
    );

    const totalCount = all.length;
    historyEls.totalScans.textContent = String(totalCount);
    historyEls.totalSafe.textContent = String(totals.safe);
    historyEls.totalPhishing.textContent = String(totals.phishing);
}

function renderList() {
    const filtered = applyFilters();

    if (!filtered.length) {
        historyEls.list.innerHTML = '';
        historyEls.empty.classList.remove('hidden');
        return;
    }

    historyEls.empty.classList.add('hidden');
    const frag = document.createDocumentFragment();

    filtered.forEach((entry) => {
        const { isPhishing, probability } = getBasicResult(entry);
        const mode = entry.mode || 'single';

        const item = document.createElement('article');
        item.className = `history-item ${isPhishing ? 'danger' : 'safe'}`;

        const left = document.createElement('div');
        left.className = 'history-item-main';

        const iconWrap = document.createElement('div');
        iconWrap.className = 'history-item-icon';
        iconWrap.innerHTML = isPhishing
            ? '<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 10-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293z" clip-rule="evenodd"/></svg>'
            : '<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 10-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>';

        const textWrap = document.createElement('div');
        textWrap.className = 'history-item-text';

        const urlEl = document.createElement('div');
        urlEl.className = 'history-item-url';
        urlEl.textContent = entry.url || '-';
        urlEl.title = entry.url || '';

        const meta = document.createElement('div');
        meta.className = 'history-item-meta';

        const timeSpan = document.createElement('span');
        timeSpan.textContent = formatRelativeTime(entry.timestamp);

        const dot = document.createElement('span');
        dot.className = 'history-dot';

        const modeSpan = document.createElement('span');
        modeSpan.textContent = mode === 'batch' ? 'Batch Scan' : 'Single Scan';

        meta.appendChild(timeSpan);
        meta.appendChild(dot);
        meta.appendChild(modeSpan);

        textWrap.appendChild(urlEl);
        textWrap.appendChild(meta);

        left.appendChild(iconWrap);
        left.appendChild(textWrap);

        const right = document.createElement('div');
        right.className = 'history-item-right';

        const badge = document.createElement('div');
        badge.className = `history-pill ${isPhishing ? 'danger' : 'safe'}`;
        badge.textContent = isPhishing ? 'PHISHING' : 'SAFE';

        const conf = document.createElement('div');
        conf.className = `history-confidence ${isPhishing ? 'danger' : 'safe'}`;
        const pct = Math.max(0, Math.min(100, Number.isFinite(probability) ? probability * 100 : probability)).toFixed(1);
        conf.textContent = `${pct}%`;

        right.appendChild(badge);
        right.appendChild(conf);

        item.appendChild(left);
        item.appendChild(right);

        frag.appendChild(item);
    });

    historyEls.list.innerHTML = '';
    historyEls.list.appendChild(frag);
}

function handleTabClick(e) {
    const btn = e.currentTarget;
    const mode = btn.getAttribute('data-filter') || 'all';
    historyState.filterMode = mode;

    historyEls.tabs.forEach(t => t.classList.remove('active'));
    btn.classList.add('active');

    renderList();
}

function handleToggleFilterClick(e) {
    const btn = e.currentTarget;
    const val = btn.getAttribute('data-filter-extra') || 'none';
    historyState.filterExtra = val;

    historyEls.toggleFilters.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    renderList();
}

function exportHistoryAsCSV() {
    const items = applyFilters();
    if (!items.length) return;

    const header = 'url,status,confidence,mode,timestamp';
    const rows = items.map(entry => {
        const { isPhishing, probability } = getBasicResult(entry);
        const status = isPhishing ? 'phishing' : 'safe';
        const mode = entry.mode || 'single';
        const pct = Math.max(0, Math.min(100, Number.isFinite(probability) ? probability * 100 : probability)).toFixed(1);
        const url = JSON.stringify(entry.url || '');
        const ts = JSON.stringify(entry.timestamp || '');
        return `${url},${status},${pct}%,${mode},${ts}`;
    });

    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'url_phishing_history.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

function clearHistory() {
    if (!confirm('This will remove all saved scan history from this browser. Continue?')) {
        return;
    }
    try {
        localStorage.removeItem(HISTORY_STORAGE_KEY);
    } catch (e) {
        console.warn('Failed to clear history from storage', e);
    }
    historyState.allItems = [];
    renderSummary();
    renderList();
}

function initHistoryPage() {
    historyState.allItems = loadHistoryFromStorage();
    renderSummary();
    renderList();

    historyEls.tabs.forEach(tab => tab.addEventListener('click', handleTabClick));
    historyEls.toggleFilters.forEach(btn => btn.addEventListener('click', handleToggleFilterClick));
    if (historyEls.exportBtn) historyEls.exportBtn.addEventListener('click', exportHistoryAsCSV);
    if (historyEls.clearBtn) historyEls.clearBtn.addEventListener('click', clearHistory);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHistoryPage);
} else {
    initHistoryPage();
}


