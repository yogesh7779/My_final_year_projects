# URL Phishing Detection — Installation & Deployment Guide

## Step 1: Install Python (3.10 – 3.12)

Download Python from:
https://www.python.org/downloads/

Make sure "Add to PATH" is checked.

Verify installation:
```
python --version
```

## Step 2: Start the Backend Server

You have two options to start the backend server:

### Option 1: Using `start_backend.bat` (Recommended)

1. Navigate to the project folder: `phishing_detection/`
2. Double-click: **`start_backend.bat`**

This script will:
- ✓ Automatically detect and activate the virtual environment (`.venv` or `venv`)
- ✓ Change to the `backend` directory
- ✓ Start the Flask backend server at: `http://127.0.0.1:5000`

**Note:** If no virtual environment is found, it will use system Python.

### Option 2: Using `run.bat`

1. Navigate to the project folder: `phishing_detection/`
2. Double-click: **`run.bat`**

This will:
- ✓ Activate the virtual environment
- ✓ Load all required dependencies
- ✓ Start the backend server at: `http://localhost:5000`

## Step 3: Open the Website

Open this file:
```
website/index.html
```

**Recommended:**
Right-click → **Open with Live Server**

The website will load at:
```
http://127.0.0.1:5500/website/index.html
```

## Step 4: Deploy the Chrome Extension

### Extension Installation (Load Unpacked)

1. **Build or copy the extension folder:**
   - The extension folder is located at: `extension/`
   - Make sure you have all files in the `extension/` directory

2. **Open Chrome Extensions:**
   - Open Google Chrome
   - Navigate to: `chrome://extensions`

3. **Enable Developer Mode:**
   - Toggle "Developer mode" switch in the top-right corner

4. **Load the Extension:**
   - Click "Load unpacked" button
   - Select the `extension/` folder from your project directory
   - The extension should now appear in your Chrome toolbar

5. **Verify Installation:**
   - Look for the "URL Phishing Guard" extension icon in your Chrome toolbar
   - Click the icon to see the popup interface

### Testing the Extension

1. **Ensure Backend is Running:**
   - Make sure your backend server is running at `http://127.0.0.1:5000`
   - Use `start_backend.bat` or `run.bat` to start it

2. **Test in Gmail or Any Website:**
   - Open Gmail (or any webpage with links)
   - Hover over a link for ~500ms to trigger a prefetch analysis
   - Click on any link — navigation will be paused and a confirmation modal will appear
   - The modal shows:
     - **PHISHING** (red) — Block navigation for safety
     - **SAFE** (green) — Proceed to the link

3. **Extension Behavior:**
   - Click a link: Shows modal with real-time analysis
   - Hover over link: Prefetches analysis in background for faster UX
   - Modal options: "Block" to cancel navigation, "Proceed" to continue

### Extension Troubleshooting

- **Backend Offline:** If the backend server is not running, the modal will show: "Backend server is offline — cannot analyze URL." You can still choose to proceed or block manually.
- **Page Reload:** Content scripts re-inject automatically when you reload a page.
- **Debug Background Worker:** Open `chrome://extensions`, find the extension, click "service worker (background)" to inspect logs and console.
- **Debug Content Scripts:** Open DevTools for the webpage to see `content.js` console logs.
- **Manual Testing:** The extension exposes `window.__phishGuard.analyze(url)` in the browser console for manual testing.

### Extension API

The extension calls your backend API at:
```
http://127.0.0.1:5000/predict
```

The extension sends a POST request with JSON:
```json
{
  "url": "https://example.com"
}
```

## Important Notes

### Project Structure
- Do **NOT** change or rename folder structure
- Keep `my_model.keras` inside the **src** folder
- Backend **must** be running before using the website or extension

### Backend Server
- Default port: `5000`
- Must be running at `http://127.0.0.1:5000` for extension to work
- Internet is **NOT** required for running predictions (all processing is local)

### Extension Features
- Intercepts link clicks and hovers on webpages (including Gmail/Outlook)
- Sends URLs to local backend ML server for analysis
- Warns users before navigation if link appears to be phishing
- Stores last scan result in Chrome storage for popup display
- Works on all websites (`<all_urls>` permission)

### Security & Privacy
- URLs are sent to your local backend server only (`http://127.0.0.1:5000`)
- No data is sent to external servers
- Extension stores the most recent scan result in `chrome.storage.local`
- All analysis is performed locally using your ML model

### Files Overview

**Backend:**
- `backend/app.py` — Flask server with `/predict` and `/predict_batch` endpoints
- `src/predict_url.py` — ML prediction function
- `src/my_model.keras` — Trained phishing detection model

**Extension:**
- `extension/manifest.json` — Manifest V3 configuration
- `extension/background.js` — Service worker for API communication
- `extension/content.js` — Content script for link interception
- `extension/popup.html/css/js` — Extension popup interface
- `extension/icons/` — Extension icons

**Website:**
- `website/index.html` — Web interface for URL checking
- `website/script.js` — Frontend JavaScript
- `website/styles.css` — Styling

## Publishing Extension (Optional)

If you want to publish the extension to Chrome Web Store:
1. Review privacy policy and permissions in `manifest.json`
2. Prepare store listing materials (screenshots, descriptions)
3. Zip the `extension/` folder
4. Upload to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)

---

**Quick Start Checklist:**
- [ ] Python 3.10-3.12 installed
- [ ] Run `start_backend.bat` or `run.bat` to start backend
- [ ] Open `website/index.html` for web interface (optional)
- [ ] Load `extension/` folder in Chrome as unpacked extension
- [ ] Test by clicking links in Gmail or any website

