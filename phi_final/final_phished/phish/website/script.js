// ===== Configuration =====
const CONFIG = {
    API_URL: 'http://127.0.0.1:5000/predict',
    BATCH_API_URL: 'http://127.0.0.1:5000/predict_batch',
    MAX_URL_LENGTH: 2048,
    DEBOUNCE_DELAY: 300
};

// ===== State Management =====
const state = {
    isAnalyzing: false,
    currentUrl: '',
    history: [],
    modelPrediction: null
};

// ===== DOM Elements =====
const elements = {
    form: document.getElementById('urlForm'),
    urlInput: document.getElementById('urlInput'),
    clearBtn: document.getElementById('clearBtn'),
    checkBtn: document.getElementById('checkBtn'),
    resultContainer: document.getElementById('resultContainer'),
    errorContainer: document.getElementById('errorContainer'),
    
    // Result elements
    resultIconWrapper: document.getElementById('resultIconWrapper'),
    resultIcon: document.getElementById('resultIcon'),
    resultTitle: document.getElementById('resultTitle'),
    resultUrl: document.getElementById('resultUrl'),
    predictionValue: document.getElementById('predictionValue'),
    confidenceFill: document.getElementById('confidenceFill'),
    confidenceText: document.getElementById('confidenceText'),
    resultMessage: document.getElementById('resultMessage'),
    
    // Action buttons
    copyUrlBtn: document.getElementById('copyUrlBtn'),
    checkAnotherBtn: document.getElementById('checkAnotherBtn'),
    
    // Error elements
    errorMessage: document.getElementById('errorMessage'),
    dismissErrorBtn: document.getElementById('dismissErrorBtn')
};

// Adaptive feedback buttons
const markPhishingBtn = document.getElementById("markPhishingBtn");
const markSafeBtn = document.getElementById("markSafeBtn");

// Batch elements
elements.batchForm = document.getElementById('batchForm');
elements.batchInput = document.getElementById('batchInput');
elements.batchCheckBtn = document.getElementById('batchCheckBtn');
elements.batchClearBtn = document.getElementById('batchClearBtn');
elements.batchResultContainer = document.getElementById('batchResultContainer');
elements.safeList = document.getElementById('safeList');
elements.phishedList = document.getElementById('phishedList');
elements.batchTotal = document.getElementById('batchTotal');
elements.batchSafeCount = document.getElementById('batchSafeCount');
elements.batchPhishCount = document.getElementById('batchPhishCount');
elements.downloadBatchBtn = document.getElementById('downloadBatchBtn');
elements.closeBatchBtn = document.getElementById('closeBatchBtn');

// ===== Utility Functions =====
function isValidUrl(string) {
    if (!string || string.trim() === '') return false;
    if (string.length > CONFIG.MAX_URL_LENGTH) return false;
    
    try {
        // Allow URLs with or without protocol
        const urlPattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,})([\/\w \.-]*)*\/?$/i;
        return urlPattern.test(string.trim());
    } catch (_) {
        return false;
    }
}

// Header-aware smooth scrolling helper to avoid sticky header overlap
function getHeaderOffset() {
    try {
        const header = document.querySelector('.header');
        const extra = 12; // some breathing room
        return header ? (header.getBoundingClientRect().height + extra) : extra;
    } catch (e) {
        return 12;
    }
}

function smoothScrollToElement(el, options = { behavior: 'smooth', block: 'start' }) {
    if (!el) return;
    try {
        const rect = el.getBoundingClientRect();
        const absoluteTop = rect.top + window.scrollY;
        let topPos;

        if (options.block === 'center') {
            topPos = absoluteTop - (window.innerHeight / 2) + (rect.height / 2);
        } else {
            // 'start' and 'nearest' default to aligning top with header offset
            topPos = absoluteTop - getHeaderOffset();
        }

        window.scrollTo({ top: Math.max(0, Math.floor(topPos)), behavior: options.behavior || 'smooth' });
    } catch (e) {
        try { el.scrollIntoView({ behavior: options.behavior || 'smooth' }); } catch (_) { /* ignore */ }
    }
}

// ⚠ IMPORTANT: we DO NOT add http:// here to avoid changing model behavior
function normalizeUrl(url) {
    return url.trim();
}

function truncateUrl(url, maxLength = 50) {
    if (url.length <= maxLength) return url;
    return url.substring(0, maxLength - 3) + '...';
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (err) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
            document.execCommand('copy');
            textArea.remove();
            return true;
        } catch (err) {
            textArea.remove();
            return false;
        }
    }
}

// ===== Adaptive Feedback API =====
async function sendFeedback(label) {
    const url = state.currentUrl;
    if (!url) {
        console.warn('No current URL to send feedback for.');
        return;
    }

    try {
        const response = await fetch("http://127.0.0.1:5000/adapt", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                url: url,
                label: label,
                model_prediction: state.modelPrediction
            })
        });

        const data = await response.json();
        console.log("Feedback saved locally + sent to admin", data);
    } catch (e) {
        console.error("Failed to send feedback", e);
    }
}

// ===== History Helpers =====
function saveHistory() {
    try {
        localStorage.setItem('phishing_history', JSON.stringify(state.history));
    } catch (e) {
        console.warn('Could not save to localStorage:', e);
    }
}

function addHistoryEntry(url, data, mode = 'single') {
    const isPhishing = Boolean(
        data.is_phishing ||
        data.isPhishing ||
        data.prediction === 'phishing' ||
        data.prediction === 'PHISHING'
    );
    const probability = Number(data.probability ?? data.confidence ?? 0);

    state.history.unshift({
        url,
        mode,
        result: {
            is_phishing: isPhishing,
            probability
        },
        raw: data,
        timestamp: new Date().toISOString()
    });

    // keep a reasonable cap
    if (state.history.length > 100) {
        state.history = state.history.slice(0, 100);
    }

    saveHistory();
}

// ===== UI Functions =====
function showLoading() {
    elements.checkBtn.classList.add('loading');
    elements.checkBtn.disabled = true;
    state.isAnalyzing = true;
}

function hideLoading() {
    elements.checkBtn.classList.remove('loading');
    elements.checkBtn.disabled = false;
    state.isAnalyzing = false;
}

function hideAllContainers() {
    elements.resultContainer.classList.add('hidden');
    elements.errorContainer.classList.add('hidden');
}

function showError(message) {
    hideAllContainers();
    elements.errorMessage.textContent = message;
    elements.errorContainer.classList.remove('hidden');
    
    setTimeout(() => {
        if (!elements.errorContainer.classList.contains('hidden')) {
            elements.errorContainer.classList.add('hidden');
        }
    }, 5000);
}

function updateResultUI(data, url) {
    state.modelPrediction = data.prediction;

    const isPhishing = data.is_phishing || data.prediction === 'phishing';
    const confidence = (data.probability * 100).toFixed(1);
    
    const resultCard = elements.resultContainer.querySelector('.result-card');
    
    resultCard.classList.remove('safe', 'danger');
    elements.resultIconWrapper.classList.remove('safe', 'danger');
    elements.predictionValue.classList.remove('safe', 'danger');
    elements.confidenceFill.classList.remove('safe', 'danger');
    elements.resultMessage.classList.remove('safe', 'danger');
    
    const statusClass = isPhishing ? 'danger' : 'safe';
    resultCard.classList.add(statusClass);
    elements.resultIconWrapper.classList.add(statusClass);
    elements.predictionValue.classList.add(statusClass);
    elements.confidenceFill.classList.add(statusClass);
    elements.resultMessage.classList.add(statusClass);
    
    const iconPath = isPhishing
        ? '<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293z" clip-rule="evenodd"/>'
        : '<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>';
    elements.resultIcon.innerHTML = iconPath;
    
    elements.resultTitle.textContent = isPhishing ? '⚠️ Phishing Detected!' : '✅ Safe URL';
    
    elements.resultUrl.textContent = url;
    elements.resultUrl.title = url;
    
    elements.predictionValue.textContent = isPhishing ? 'PHISHING' : 'LEGITIMATE';
    
    setTimeout(() => {
        elements.confidenceFill.style.width = confidence + '%';
        elements.confidenceText.textContent = confidence + '%';
    }, 100);
    
    if (isPhishing) {
        elements.resultMessage.innerHTML = `
            <strong>⚠️ Warning:</strong> This URL appears to be a phishing attempt. 
            Do not enter personal information, passwords, or payment details. 
            Be cautious if this came via email, SMS, or unknown sender.
        `;
    } else {
        elements.resultMessage.innerHTML = `
            <strong>✅ Safe:</strong> This URL appears to be legitimate based on the model's analysis. 
            However, always verify the website yourself and be cautious with sensitive information.
        `;
    }

    // adaptive feedback buttons visibility
    if (markPhishingBtn && markSafeBtn) {
        if (data.is_phishing) {
            markPhishingBtn.style.display = "none";
            markSafeBtn.style.display = "inline-block";
        } else {
            markPhishingBtn.style.display = "inline-block";
            markSafeBtn.style.display = "none";
        }
    }
    
    hideAllContainers();
    elements.resultContainer.classList.remove('hidden');
    
    setTimeout(() => {
        smoothScrollToElement(elements.resultContainer, { behavior: 'smooth', block: 'start' });
    }, 100);
}

// ===== API Functions =====
async function analyzeUrl(url) {
    showLoading();
    
    try {
        const normalizedUrl = normalizeUrl(url);
        
        const response = await fetch(CONFIG.API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url: normalizedUrl })
        });
        
        if (!response.ok) {
            throw new Error(`Server error: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        updateResultUI(data, normalizedUrl);
        addHistoryEntry(normalizedUrl, data, 'single');
    } catch (error) {
        console.error('Analysis error:', error);
        
        let errorMsg = 'Unable to analyze URL. ';
        
        if (error.message.includes('Failed to fetch')) {
            errorMsg += 'Please make sure the backend server is running at http://127.0.0.1:5000';
        } else if (error.message.includes('Server error')) {
            errorMsg += error.message;
        } else {
            errorMsg += 'An unexpected error occurred. Please try again.';
        }
        
        showError(errorMsg);
    } finally {
        hideLoading();
    }
}

// Fetch prediction helper used by batch processor. Returns { ok: true, data } or { ok:false, error }
async function fetchPrediction(url) {
    try {
        const normalizedUrl = normalizeUrl(url);
        const response = await fetch(CONFIG.API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: normalizedUrl })
        });

        if (!response.ok) {
            return { ok: false, error: `Server error: ${response.status} ${response.statusText}` };
        }

        const data = await response.json();
        return { ok: true, data };
    } catch (err) {
        return { ok: false, error: err.message || String(err) };
    }
}

function parseBatchUrls(text) {
    if (!text) return [];
    // Split on newlines and commas, keep things that look like urls
    const lines = text.split(/\r?\n|,/).map(s => s.trim()).filter(Boolean);
    // De-duplicate while preserving order
    const seen = new Set();
    return lines.filter(s => {
        if (seen.has(s)) return false;
        seen.add(s);
        return true;
    });
}

function updateBatchResultsUI(results) {
    // results: array of { url, ok, data, error }
    elements.safeList.innerHTML = '';
    elements.phishedList.innerHTML = '';

    let safeCount = 0;
    let phishCount = 0;

    results.forEach(r => {
        const li = document.createElement('li');
        // left: icon + url
        const left = document.createElement('div');
        left.className = 'item-left';
        const iconWrap = document.createElement('span');
        iconWrap.className = 'item-icon';
        const urlText = document.createElement('div');
        urlText.className = 'item-url';
        urlText.textContent = r.url;

        const right = document.createElement('div');
        right.className = 'mini-confidence';

        if (!r.ok) {
            right.textContent = 'ERR';
            li.title = r.error || 'Request failed';
            // fallback icon for error
            iconWrap.innerHTML = `
                <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293z" clip-rule="evenodd"/>
                </svg>`;
            li.classList.add('danger');
            right.classList.add('danger');
            left.appendChild(iconWrap);
            left.appendChild(urlText);
            li.appendChild(left);
            li.appendChild(right);
            elements.phishedList.appendChild(li);
            phishCount++;
            return;
        }

        const data = r.data;
        const isPhishing = data.is_phishing || data.prediction === 'phishing';
        const confidence = (Number(data.probability) * 100).toFixed(1) + '%';
        right.textContent = confidence;

        if (isPhishing) {
            // warning icon
            iconWrap.innerHTML = `
                <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
                    <path fill-rule="evenodd" d="M8.257 3.099c.366-.772 1.415-.772 1.781 0l5.454 11.518A1 1 0 0114.54 16H5.46a1 1 0 01-.952-1.383L8.257 3.1zM11 13a1 1 0 10-2 0 1 1 0 002 0zm-1-2a.75.75 0 01-.75-.75V7.5a.75.75 0 011.5 0v2.75A.75.75 0 0110 11z" clip-rule="evenodd"/>
                </svg>`;
            li.classList.add('danger');
            right.classList.add('danger');
            left.appendChild(iconWrap);
            left.appendChild(urlText);
            li.appendChild(left);
            li.appendChild(right);
            elements.phishedList.appendChild(li);
            phishCount++;
        } else {
            // check icon
            iconWrap.innerHTML = `
                <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                </svg>`;
            li.classList.add('safe');
            right.classList.add('safe');
            left.appendChild(iconWrap);
            left.appendChild(urlText);
            li.appendChild(left);
            li.appendChild(right);
            elements.safeList.appendChild(li);
            safeCount++;
        }
    });

    const total = results.length;
    elements.batchTotal.textContent = String(total);
    elements.batchSafeCount.textContent = String(safeCount);
    elements.batchPhishCount.textContent = String(phishCount);

    hideAllContainers();
    // decide majority and mark container for styling: safe / danger / neutral
    if (elements.batchResultContainer) {
        elements.batchResultContainer.classList.remove('major-safe', 'major-danger', 'major-neutral');
        if (phishCount > safeCount) {
            elements.batchResultContainer.classList.add('major-danger');
        } else if (safeCount > phishCount) {
            elements.batchResultContainer.classList.add('major-safe');
        } else {
            // tie -> neutral (use purple glow)
            elements.batchResultContainer.classList.add('major-neutral');
        }
    }

    elements.batchResultContainer.classList.remove('hidden');

    // Smoothly bring the batch result card into view after rendering
    try {
        setTimeout(() => {
            smoothScrollToElement(elements.batchResultContainer, { behavior: 'smooth', block: 'start' });
        }, 120);
    } catch (e) {
        console.warn('Batch result auto-scroll failed', e);
    }

    // mark columns panels accordingly
    try {
        const safeCol = elements.safeList ? elements.safeList.closest('.batch-column') : null;
        const phishCol = elements.phishedList ? elements.phishedList.closest('.batch-column') : null;
        if (safeCol) {
            safeCol.classList.remove('panel-safe','panel-danger','panel-empty');
            if (safeCount > 0) safeCol.classList.add('panel-safe'); else safeCol.classList.add('panel-empty');
        }
        if (phishCol) {
            phishCol.classList.remove('panel-safe','panel-danger','panel-empty');
            if (phishCount > 0) phishCol.classList.add('panel-danger'); else phishCol.classList.add('panel-empty');
        }
    } catch (e) {
        console.warn('Could not set panel classes for batch columns', e);
    }
}

async function handleBatchSubmit(e) {
    e.preventDefault();

    const raw = elements.batchInput.value;
    const urls = parseBatchUrls(raw).filter(u => u && u.length > 0);

    if (!urls.length) {
        showError('Please enter one or more URLs to analyze in batch.');
        return;
    }

    const valid = urls.filter(u => isValidUrl(u));
    if (!valid.length) {
        showError('No valid URLs found in the batch input. Ensure each line contains a valid URL.');
        return;
    }

    // UI: show loading on batch button
    elements.batchCheckBtn.classList.add('loading');
    elements.batchCheckBtn.disabled = true;

    // Ensure the batch result card is visible and scroll to it so user sees progress
    try {
        if (elements.batchResultContainer) {
            elements.batchResultContainer.classList.remove('hidden');
            setTimeout(() => {
                smoothScrollToElement(elements.batchResultContainer, { behavior: 'smooth', block: 'start' });
            }, 70);
        }
    } catch (e) {
        console.warn('Auto-scroll to batch results failed', e);
    }

    const results = [];

    // Process sequentially to keep backend stable; could be parallelized if needed
    for (const u of valid) {
        // small delay optional: await new Promise(r=>setTimeout(r,50));
        const res = await fetchPrediction(u);
        results.push({ url: u, ok: res.ok, data: res.ok ? res.data : null, error: res.ok ? null : res.error });

        // push into history as batch entries when ok
        if (res.ok && res.data) {
            addHistoryEntry(u, res.data, 'batch');
        }
    }

    elements.batchCheckBtn.classList.remove('loading');
    elements.batchCheckBtn.disabled = false;

    updateBatchResultsUI(results);
}

function handleBatchClear() {
    elements.batchInput.value = '';
    elements.batchInput.focus();
    elements.batchResultContainer.classList.add('hidden');
}

function downloadBatchCSV() {
    const rows = [];
    const safeItems = Array.from(elements.safeList.querySelectorAll('li')).map(li => {
        const url = li.querySelector('div') ? li.querySelector('div').textContent : li.textContent;
        const conf = li.querySelector('.mini-confidence') ? li.querySelector('.mini-confidence').textContent : '';
        return { url, status: 'safe', confidence: conf };
    });
    const phishItems = Array.from(elements.phishedList.querySelectorAll('li')).map(li => {
        const url = li.querySelector('div') ? li.querySelector('div').textContent : li.textContent;
        const conf = li.querySelector('.mini-confidence') ? li.querySelector('.mini-confidence').textContent : '';
        return { url, status: 'phishing', confidence: conf };
    });

    const all = safeItems.concat(phishItems);
    if (!all.length) return;

    const csv = ['url,status,confidence', ...all.map(r => `${JSON.stringify(r.url)} , ${r.status} , ${r.confidence}`)].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'batch_results.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

function handleCloseBatch() {
    elements.batchResultContainer.classList.add('hidden');
}

// ===== Event Handlers =====
function handleFormSubmit(e) {
    e.preventDefault();
    
    const url = elements.urlInput.value.trim();
    
    if (!url) {
        showError('Please enter a URL to check.');
        elements.urlInput.focus();
        return;
    }
    
    if (!isValidUrl(url)) {
        showError('Please enter a valid URL (e.g., example.com or https://example.com)');
        elements.urlInput.focus();
        return;
    }
    
    if (state.isAnalyzing) {
        return;
    }
    
    state.currentUrl = url;
    analyzeUrl(url);
}

function handleInputChange() {
    const value = elements.urlInput.value;
    
    if (value.length > 0) {
        elements.clearBtn.classList.add('visible');
    } else {
        elements.clearBtn.classList.remove('visible');
    }
}

function handleClearInput() {
    elements.urlInput.value = '';
    elements.clearBtn.classList.remove('visible');
    elements.urlInput.focus();
    hideAllContainers();
}

function handleCheckAnother() {
    elements.urlInput.value = '';
    elements.urlInput.focus();
    elements.clearBtn.classList.remove('visible');
    hideAllContainers();
    
    smoothScrollToElement(elements.urlInput, { behavior: 'smooth', block: 'center' });
}

async function handleCopyUrl() {
    const url = elements.resultUrl.textContent;
    const success = await copyToClipboard(url);
    
    const btn = elements.copyUrlBtn;
    const originalText = btn.innerHTML;
    
    if (success) {
        btn.innerHTML = `
            <svg viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
            </svg>
            Copied!
        `;
        
        setTimeout(() => {
            btn.innerHTML = originalText;
        }, 2000);
    } else {
        btn.innerHTML = `
            <svg viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293z" clip-rule="evenodd"/>
            </svg>
            Copy Failed
        `;
        
        setTimeout(() => {
            btn.innerHTML = originalText;
        }, 2000);
    }
}

function handleDismissError() {
    elements.errorContainer.classList.add('hidden');
}

// ===== Smooth Scrolling for Navigation =====
function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (href === '#') return;
            
            e.preventDefault();
            const target = document.querySelector(href);
            
            if (target) {
                smoothScrollToElement(target, { behavior: 'smooth', block: 'start' });
                
                document.querySelectorAll('.nav-link').forEach(link => {
                    link.classList.remove('active');
                });
                this.classList.add('active');
            }
        });
    });
}

// ===== Keyboard Shortcuts =====
function initKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (!elements.resultContainer.classList.contains('hidden')) {
                handleCheckAnother();
            } else if (!elements.errorContainer.classList.contains('hidden')) {
                handleDismissError();
            }
        }
        
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            elements.urlInput.focus();
            elements.urlInput.select();
        }
    });
}

// ===== Load History from localStorage =====
function loadHistory() {
    try {
        const saved = localStorage.getItem('phishing_history');
        if (saved) {
            state.history = JSON.parse(saved);
        }
    } catch (e) {
        console.warn('Could not load history from localStorage:', e);
    }
}

// ===== Initialize =====
function init() {
    loadHistory();
    
    elements.form.addEventListener('submit', handleFormSubmit);
    elements.urlInput.addEventListener('input', debounce(handleInputChange, CONFIG.DEBOUNCE_DELAY));
    elements.clearBtn.addEventListener('click', handleClearInput);
    elements.checkAnotherBtn.addEventListener('click', handleCheckAnother);
    elements.copyUrlBtn.addEventListener('click', handleCopyUrl);
    elements.dismissErrorBtn.addEventListener('click', handleDismissError);
    if (markPhishingBtn) {
        markPhishingBtn.addEventListener("click", () => sendFeedback("phishing"));
    }
    if (markSafeBtn) {
        markSafeBtn.addEventListener("click", () => sendFeedback("legitimate"));
    }
    // Batch handlers
    if (elements.batchForm) elements.batchForm.addEventListener('submit', handleBatchSubmit);
    if (elements.batchClearBtn) elements.batchClearBtn.addEventListener('click', handleBatchClear);
    if (elements.downloadBatchBtn) elements.downloadBatchBtn.addEventListener('click', downloadBatchCSV);
    if (elements.closeBatchBtn) elements.closeBatchBtn.addEventListener('click', handleCloseBatch);
    
    initSmoothScroll();
    initKeyboardShortcuts();
    
    elements.urlInput.focus();
    
    console.log('URL Phishing Guard initialized ✓');
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}




