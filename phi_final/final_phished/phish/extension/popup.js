// Popup script: shows the most recent scan and offers actions

const API_URL = "http://127.0.0.1:5000/predict";
const ADAPT_URL = "http://127.0.0.1:5000/adapt";

let lastModelPrediction = null;

async function getLastScan() {
  return new Promise(resolve => {
    chrome.runtime.sendMessage({ action: 'getLast' }, (resp) => {
      resolve(resp || null);
    });
  });
}

function formatTimestamp(ts) {
  try { return new Date(ts).toLocaleString(); } catch(e){ return ''+ts; }
}

function setNote(msg){
  const el = document.getElementById('note');
  if (!el) return; if (!msg) el.style.display='none'; else { el.textContent = msg; el.style.display = 'block'; }
}

async function populate() {
  const last = await getLastScan();
  const lastUrlEl = document.getElementById('last-url');
  const resultSection = document.getElementById('result-section');
  const feedbackSection = document.getElementById('feedback-section');
  const markPhishBtn = document.getElementById('mark-phishing-btn');
  const markSafeBtn = document.getElementById('mark-safe-btn');
  const statusInd = document.getElementById('status-indicator');
  const statusText = document.getElementById('status-text');
  const statusDetail = document.getElementById('status-detail');

  if (!last) {
    lastUrlEl.textContent = 'No scans yet';
    resultSection.style.display = 'none';
    if (feedbackSection) feedbackSection.style.display = 'none';
    setNote('');
    return;
  }

  lastUrlEl.textContent = last.url;

  if (!last.result || !last.result.ok) {
    resultSection.style.display = 'block';
    statusInd.textContent = '⚠️';
    statusText.textContent = 'No result';
    statusDetail.textContent = last.result ? last.result.error : 'Backend server is offline — cannot analyze URL.';
    if (feedbackSection) feedbackSection.style.display = 'none';
    setNote('Backend server is offline — cannot analyze URL.');
    return;
  }

  const d = last.result.data;
  lastModelPrediction = d.prediction;
  const isPhish = d.is_phishing || d.prediction === 'phishing';
  const prob = (Number(d.probability) * 100).toFixed(1) + '%';
  resultSection.style.display = 'block';
  if (isPhish) {
    statusInd.textContent = '⚠️';
    statusText.textContent = 'PHISHING';
    statusDetail.textContent = `Confidence: ${prob}`;
    setNote('');
  } else {
    statusInd.textContent = '✅';
    statusText.textContent = 'SAFE';
    statusDetail.textContent = `Confidence: ${prob}`;
    setNote('');
  }

   // Show feedback buttons, toggling which one is primary based on prediction
  if (feedbackSection && markPhishBtn && markSafeBtn) {
    feedbackSection.style.display = 'block';
    if (isPhish) {
      markPhishBtn.style.display = 'none';
      markSafeBtn.style.display = 'inline-block';
    } else {
      markPhishBtn.style.display = 'inline-block';
      markSafeBtn.style.display = 'inline-block'; // both allowed, user can reinforce or correct
    }
  }
}

async function sendFeedback(label) {
  const last = await getLastScan();
  if (!last || !last.url) return;

  try {
    const resp = await fetch(ADAPT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: last.url,
        label: label,
        model_prediction: lastModelPrediction
      })
    });

    const data = await resp.json();
    console.log("Extension feedback sent", data);
    setNote("Feedback saved locally + sent to admin.");
    setTimeout(() => setNote(""), 4000);
  } catch (e) {
    console.error("Extension feedback failed", e);
    setNote("Could not send feedback to backend.");
  }
}

function copyToClipboard(text) {
  try { navigator.clipboard.writeText(text); } catch(e) { console.warn('copy failed', e); }
}

document.addEventListener('DOMContentLoaded', () => {
  populate();

  document.getElementById('open-btn').addEventListener('click', async () => {
    const last = await getLastScan();
    if (!last) return;
    const url = last.url;
    // open in a new tab
    chrome.tabs.create({ url });
  });

  document.getElementById('copy-btn').addEventListener('click', async () => {
    const last = await getLastScan(); if (!last) return; copyToClipboard(last.url);
  });

  document.getElementById('rescan-btn').addEventListener('click', async () => {
    const last = await getLastScan(); if (!last) return;
    // request background to rescan
    chrome.runtime.sendMessage({ action: 'rescan', url: last.url }, (resp) => {
      // refresh UI
      setTimeout(populate, 300);
    });
  });

  const markPhishBtn = document.getElementById('mark-phishing-btn');
  const markSafeBtn = document.getElementById('mark-safe-btn');
  if (markPhishBtn) {
    markPhishBtn.addEventListener('click', () => sendFeedback("phishing"));
  }
  if (markSafeBtn) {
    markSafeBtn.addEventListener('click', () => sendFeedback("legitimate"));
  }
});
