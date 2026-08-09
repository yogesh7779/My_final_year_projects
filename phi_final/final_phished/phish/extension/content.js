// Content script: detects hover and click on links, asks background to analyze, shows an in-page confirmation modal

const API_ORIGIN = 'http://127.0.0.1:5000'; // referenced for clarity
const ADAPT_ENDPOINT = API_ORIGIN + '/adapt';

// small debounce map for hover
const hoverTimers = new WeakMap();

// Analysis cache and prefetch queue to avoid duplicate requests and limit concurrency
const analysisCache = new Map(); // url -> Promise of result
const PREFETCH_CONCURRENCY = 2;
let prefetchActive = 0;
const prefetchQueue = [];

function enqueuePrefetch(url) {
  return new Promise((resolve) => {
    prefetchQueue.push({ url, resolve });
    processPrefetchQueue();
  });
}

function processPrefetchQueue() {
  while (prefetchActive < PREFETCH_CONCURRENCY && prefetchQueue.length) {
    const job = prefetchQueue.shift();
    prefetchActive++;
    (async () => {
      try {
        const res = await performAnalyzeWithRetries(job.url, 2);
        job.resolve(res);
      } catch (e) {
        job.resolve({ ok: false, error: e.message || String(e) });
      } finally {
        prefetchActive--;
        // continue processing
        setTimeout(processPrefetchQueue, 0);
      }
    })();
  }
}

// Wrapper to send a single analyze request to background (returns Promise)
function sendAnalyzeOnce(url) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ action: 'analyze', url }, (resp) => {
      resolve(resp || { ok: false, error: 'No response from background' });
    });
  });
}

// Perform analyze with retry/backoff; caches results in analysisCache
async function performAnalyzeWithRetries(url, attempts = 2) {
  if (analysisCache.has(url)) return analysisCache.get(url);

  const p = (async () => {
    let lastErr = null;
    for (let i = 0; i < attempts; i++) {
      try {
        const resp = await sendAnalyzeOnce(url);
        if (resp && resp.ok) return resp;
        lastErr = resp && resp.error ? new Error(resp.error) : new Error('Unknown error');
      } catch (e) {
        lastErr = e;
      }
      // exponential backoff
      await new Promise(r => setTimeout(r, 300 * Math.pow(2, i)));
    }
    throw lastErr || new Error('Analyze failed');
  })();

  analysisCache.set(url, p);
  // ensure cache entry is cleared after some time (5 minutes) to avoid stale data
  p.finally(() => setTimeout(() => analysisCache.delete(url), 5 * 60 * 1000));
  return p;
}

// Create or reuse confirmation modal
function getOrCreateModal() {
  let modal = document.getElementById('phish-guard-modal');
  if (modal) return modal;

  modal = document.createElement('div');
  modal.id = 'phish-guard-modal';
  modal.style.position = 'fixed';
  modal.style.zIndex = 2147483647; // top
  modal.style.left = '50%';
  modal.style.top = '12%';
  modal.style.transform = 'translateX(-50%)';
  modal.style.minWidth = '320px';
  modal.style.maxWidth = '720px';
  modal.style.padding = '18px';
  modal.style.borderRadius = '12px';
  modal.style.boxShadow = '0 12px 40px rgba(79,70,229,0.14), inset 0 1px 0 rgba(255,255,255,0.02)';
  modal.style.backdropFilter = 'blur(6px)';
  modal.style.color = '#e6eef8';
  modal.style.fontFamily = 'Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
  modal.style.display = 'none';
  modal.style.background = 'linear-gradient(180deg, rgba(8,12,24,0.94), rgba(12,18,32,0.94))';
  modal.style.border = '1px solid rgba(124,92,255,0.12)';

  modal.innerHTML = `
    <div id="pg-header" style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:8px;">
      <div style="display:flex;align-items:center;gap:12px;">
        <div id="pg-icon" style="width:40px;height:40px;border-radius:10px;background:linear-gradient(90deg,#7C5CFF,#4F46E5);display:flex;align-items:center;justify-content:center;font-weight:800;color:white;">🔗</div>
        <div>
          <div id="pg-title" style="font-weight:800;font-size:1.05rem;color:#e6eef8;">Analyze link</div>
          <div id="pg-url" style="font-size:0.95rem;color:#bcd7ee;max-width:540px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:700;">...</div>
        </div>
      </div>
      <div style="display:flex;gap:8px;align-items:center;">
        <button id="pg-close" style="background:transparent;border:none;color:#9fb0c8;cursor:pointer;font-size:16px;">✕</button>
      </div>
    </div>
    <div id="pg-body" style="display:flex;align-items:center;gap:18px;">
      <div id="pg-status" style="flex:0 0 90px;text-align:center;">
        <div id="pg-indicator" style="font-size:26px;">⏳</div>
      </div>
      <div style="flex:1;">
        <div id="pg-result-text" style="font-weight:900;font-size:1.15rem;color:#dff6ff;">Analyzing...</div>
        <div id="pg-detail" style="margin-top:8px;color:#9fb0c8;font-size:0.95rem;">Waiting for verdict from the local model...</div>
      </div>
    </div>
    <div id="pg-feedback" style="margin-top:10px;display:none;">
      <div style="font-size:0.8rem;color:#9fb0c8;margin-bottom:6px;">Was this prediction correct?</div>
      <div style="display:flex;gap:8px;justify-content:flex-end;">
        <button id="pg-mark-phish" style="padding:8px 14px;border-radius:999px;border:1px solid rgba(248,113,113,0.5);background:transparent;color:#fecaca;cursor:pointer;font-weight:700;font-size:0.8rem;">Mark as Phishing</button>
        <button id="pg-mark-safe" style="padding:8px 14px;border-radius:999px;border:1px solid rgba(52,211,153,0.55);background:transparent;color:#bbf7d0;cursor:pointer;font-weight:700;font-size:0.8rem;">Mark as Safe</button>
      </div>
    </div>
    <div id="pg-actions" style="display:flex;gap:8px;justify-content:flex-end;margin-top:14px;">
      <button id="pg-block" style="padding:10px 18px;border-radius:10px;border:1px solid rgba(255,255,255,0.04);background:transparent;color:#ff6b6b;cursor:pointer;font-weight:800;">Block</button>
      <button id="pg-proceed" style="padding:10px 18px;border-radius:10px;border:none;background:linear-gradient(90deg,#7C5CFF,#4F46E5);color:white;cursor:pointer;font-weight:800;box-shadow:0 6px 20px rgba(79,70,229,0.18);">Proceed</button>
    </div>
  `;

  document.body.appendChild(modal);

  // close handler
  modal.querySelector('#pg-close').addEventListener('click', () => {
    modal.style.display = 'none';
  });

  // Feedback button handlers (use modal properties for current URL/prediction)
  const markPhishBtn = modal.querySelector('#pg-mark-phish');
  const markSafeBtn = modal.querySelector('#pg-mark-safe');

  async function sendFeedbackFromModal(label) {
    const url = modal._currentUrl;
    const modelPred = modal._currentPrediction;
    if (!url) return;
    try {
      const resp = await fetch(ADAPT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          label,
          model_prediction: modelPred
        })
      });
      const data = await resp.json();
      console.log('[PhishingGuard] feedback sent from modal', { url, label, modelPred, data });
      // small inline acknowledgement
      const detail = modal.querySelector('#pg-detail');
      if (detail) {
        detail.textContent = 'Feedback saved locally and sent to admin.';
      }
    } catch (e) {
      console.warn('[PhishingGuard] feedback failed', e);
      const detail = modal.querySelector('#pg-detail');
      if (detail) {
        detail.textContent = 'Could not send feedback to backend.';
      }
    }
  }

  if (markPhishBtn) {
    markPhishBtn.addEventListener('click', () => sendFeedbackFromModal('phishing'));
  }
  if (markSafeBtn) {
    markSafeBtn.addEventListener('click', () => sendFeedbackFromModal('legitimate'));
  }

  return modal;
}

// Show modal with result
function showModalForUrl(url, analysis) {
  const modal = getOrCreateModal();
  modal.querySelector('#pg-url').textContent = url;
  modal._currentUrl = url;

  const indicator = modal.querySelector('#pg-indicator');
  const resultText = modal.querySelector('#pg-result-text');
  const detail = modal.querySelector('#pg-detail');
  const blockBtn = modal.querySelector('#pg-block');
  const proceedBtn = modal.querySelector('#pg-proceed');
  const feedbackRow = modal.querySelector('#pg-feedback');
  const markPhishBtn = modal.querySelector('#pg-mark-phish');
  const markSafeBtn = modal.querySelector('#pg-mark-safe');

  // clear previous handlers
  blockBtn.onclick = null; proceedBtn.onclick = null;

  // reset feedback row
  if (feedbackRow) feedbackRow.style.display = 'none';
  if (markPhishBtn) markPhishBtn.style.display = 'inline-block';
  if (markSafeBtn) markSafeBtn.style.display = 'inline-block';

  if (!analysis || !analysis.ok) {
    indicator.textContent = '⚠️';
    resultText.textContent = 'Backend offline or error';
    resultText.style.color = '#f59e0b';
    detail.textContent = analysis && analysis.error ? analysis.error : 'Backend server is offline — cannot analyze URL.';

    // allow user to proceed or block; default to suggest caution
    proceedBtn.onclick = () => {
      modal.style.display = 'none';
      if (modal._proceedCallback) modal._proceedCallback();
    };
    blockBtn.onclick = () => {
      modal.style.display = 'none';
      if (modal._blockCallback) modal._blockCallback();
    };

    modal.style.display = 'block';
    return;
  }

  const data = analysis.data;
  const isPhish = data.is_phishing || data.prediction === 'phishing';
  const prob = (Number(data.probability) * 100).toFixed(1) + '%';
  modal._currentPrediction = data.prediction;

  if (isPhish) {
    indicator.textContent = '⚠️';
    resultText.textContent = 'PHISHING';
    resultText.style.color = '#ff4d4d';
    detail.textContent = `Confidence: ${prob} — Navigation is risky.`;
    // add red accent border
    modal.style.borderColor = 'rgba(255,77,77,0.22)';
    modal.style.boxShadow = '0 14px 40px rgba(255,77,77,0.06), inset 0 1px 0 rgba(255,77,77,0.02)';
  } else {
    indicator.textContent = '✅';
    resultText.textContent = 'SAFE';
    resultText.style.color = '#00ff99';
    detail.textContent = `Confidence: ${prob} — This link appears safe.`;
    modal.style.borderColor = 'rgba(16,185,129,0.12)';
    modal.style.boxShadow = '0 14px 40px rgba(16,185,129,0.06), inset 0 1px 0 rgba(16,185,129,0.02)';
  }

  // Show adaptive feedback controls
  if (feedbackRow && markPhishBtn && markSafeBtn) {
    feedbackRow.style.display = 'block';
    if (isPhish) {
      // model says phishing → give user option to correct to safe more prominently
      markPhishBtn.style.display = 'none';
      markSafeBtn.style.display = 'inline-block';
    } else {
      // model says safe → show both so user can reinforce or correct
      markPhishBtn.style.display = 'inline-block';
      markSafeBtn.style.display = 'inline-block';
    }
  }

  proceedBtn.onclick = () => {
    modal.style.display = 'none';
    if (modal._proceedCallback) modal._proceedCallback();
  };
  blockBtn.onclick = () => {
    modal.style.display = 'none';
    if (modal._blockCallback) modal._blockCallback();
  };

  modal.style.display = 'block';
}

// Ask background to analyze (click-time) using retries via performAnalyzeWithRetries
async function analyze(url) {
  try {
    return await performAnalyzeWithRetries(url, 2);
  } catch (e) {
    return { ok: false, error: e.message || String(e) };
  }
}

// Attach event listeners to document to capture clicks on links
function onLinkClick(event) {
  // find the anchor element
  let target = event.target;
  while (target && target !== document.body && !target.href) target = target.parentElement;
  if (!target || !target.href) return;

  // only left clicks without modifier
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

  const href = target.href;

  // prevent default navigation
  event.preventDefault();
  event.stopImmediatePropagation();

  const modal = getOrCreateModal();

  // set callbacks for proceed/block
  modal._proceedCallback = () => {
    // open in same target
    window.location.href = href;
  };
  modal._blockCallback = () => {
    // do nothing, just remain on page
  };

  // while analyzing, show modal with loading state
  showModalForUrl(href, null);

  analyze(href).then(result => {
    showModalForUrl(href, result);
  });
}

// Hover prefetch (optional): analyze after short hover to speed up UX
function onLinkHover(e) {
  let target = e.target;
  while (target && target !== document.body && !target.href) target = target.parentElement;
  if (!target || !target.href) return;

  // create timer (debounce) for prefetch
  if (hoverTimers.has(target)) return;
  const t = setTimeout(() => {
    // enqueue prefetch (limited concurrency)
    enqueuePrefetch(target.href).catch(()=>{});
    hoverTimers.delete(target);
  }, 500);
  hoverTimers.set(target, t);
}

function onLinkLeave(e) {
  let target = e.target;
  while (target && target !== document.body && !target.href) target = target.parentElement;
  if (!target) return;
  const t = hoverTimers.get(target);
  if (t) { clearTimeout(t); hoverTimers.delete(target); }
}

// Attach event listeners using capturing so we can intercept before other handlers
document.addEventListener('click', onLinkClick, true);
document.addEventListener('mouseover', onLinkHover, true);
document.addEventListener('mouseout', onLinkLeave, true);

// Make modal draggable small improvement (optional)
(function makeModalDraggable(){
  const modal = getOrCreateModal();
  let isDown = false, startY=0, startTop=0;
  modal.querySelector('#pg-header').addEventListener('mousedown', (e)=>{
    isDown = true; startY = e.clientY; startTop = modal.getBoundingClientRect().top; document.body.style.userSelect='none';
  });
  window.addEventListener('mousemove', (e)=>{
    if (!isDown) return; const dy = e.clientY - startY; modal.style.top = (startTop + dy) + 'px';
  });
  window.addEventListener('mouseup', ()=>{ isDown=false; document.body.style.userSelect='auto'; });
})();

// Expose for debugging
window.__phishGuard = { analyze };
