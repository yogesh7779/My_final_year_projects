// Background service worker for Chrome Extension (Manifest V3)
// Responsible for sending URL predictions to your backend and storing latest results.

const API_URL = "http://127.0.0.1:5000/predict";

// helper - do fetch to backend
async function analyzeUrlBackend(url) {
  try {
    const resp = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });

    if (!resp.ok) {
      return { ok: false, error: `Server error: ${resp.status} ${resp.statusText}` };
    }

    const data = await resp.json();
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: e.message || String(e) };
  }
}

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.action) return;

  if (message.action === 'analyze') {
    const url = message.url;
    // Analyze and respond asynchronously
    analyzeUrlBackend(url).then(result => {
      // store last result for popup retrieval
      const toStore = {
        lastScan: {
          url,
          timestamp: Date.now(),
          result
        }
      };
      chrome.storage.local.set(toStore, () => {
        // ignore errors
      });

      sendResponse(result);
    }).catch(err => {
      sendResponse({ ok: false, error: err.message || String(err) });
    });

    // Indicate async response
    return true;
  }

  if (message.action === 'getLast') {
    chrome.storage.local.get(['lastScan'], (items) => {
      sendResponse(items.lastScan || null);
    });
    return true;
  }

  if (message.action === 'rescan') {
    const url = message.url;
    analyzeUrlBackend(url).then(result => {
      const toStore = { lastScan: { url, timestamp: Date.now(), result } };
      chrome.storage.local.set(toStore, () => {});
      sendResponse(result);
    }).catch(err => sendResponse({ ok: false, error: err.message || String(err) }));

    return true;
  }
});

// Optional: handle installed
chrome.runtime.onInstalled.addListener(() => {
  console.log('URL Phishing Guard installed');
});
