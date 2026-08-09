URL Phishing Guard - Chrome Extension
====================================

This Chrome extension intercepts link clicks and hovers in webpages (including email UIs like Gmail/Outlook), sends the URL to your local backend ML server, and warns the user if the link looks like phishing before navigation.

Important: This extension calls your existing backend API — do NOT change your model code.

API URL used by the extension (constant):

  const API_URL = "http://127.0.0.1:5000/predict";

Files
- `manifest.json` — Manifest V3 configuration
- `background.js` — Service worker background; forwards analyze requests to backend and stores last scan in `chrome.storage`
- `content.js` — Injected into pages; intercepts link hover/click and shows in-page modal to proceed/block
- `popup.html`, `popup.css`, `popup.js` — Extension popup to show last scan and actions
- `icons/*` — placeholder icons

Installation (load unpacked)
1. Build or copy the `extension/` folder into your machine (it's in this repo at `extension/`).
2. Open Chrome and go to `chrome://extensions`.
3. Enable "Developer mode" (top-right).
4. Click "Load unpacked" and select the `extension/` folder.
5. The extension should appear in your toolbar.

Testing in Gmail (quick)
1. Ensure your backend server is running at `http://127.0.0.1:5000`.
2. Load the extension (see steps above).
3. Open Gmail in Chrome and open an email with links.
4. Hover a link for ~600ms to trigger a prefetch. Click a link (left-click) — navigation will be paused and a confirmation modal will appear.
5. If the service reports `PHISHING` (red), choose "Block" to stop navigation. If `SAFE` (green), choose "Proceed" to follow the link.

Notes and Troubleshooting
- If the backend is offline, the modal will show: "Backend server is offline — cannot analyze URL." You can still choose to proceed or block manually.
- If you reload the page, content scripts re-inject automatically.
- To debug the background service worker, open `chrome://extensions`, find the extension, click "service worker (background)" to inspect logs and console.

Debugging tips
- Open the DevTools for the webpage to see `content.js` console logs; the extension also exposes `window.__phishGuard.analyze(url)` to manually test.
- Use `chrome.runtime.getBackgroundPage` (not in MV3) — instead inspect the service worker via the extensions page.

Security & Privacy
- This extension will send URLs to `http://127.0.0.1:5000/predict` — ensure the backend is running locally and secure.
- The extension stores the most recent scan result in `chrome.storage.local` for display in the popup.

Publishing (optional)
- Review privacy and permissions, prepare store listing, and upload the extension ZIP to the Chrome Web Store Developer Dashboard.

If you want, I can:
- Add an optional domain allowlist/denylist in extension settings.
- Implement in-page highlight overlays for suspicious links.
- Add batch scanning support for selected links.
