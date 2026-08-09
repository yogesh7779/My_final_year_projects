import os, json, threading

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, "adaptive_db.json")

_lock = threading.Lock()

def _load_db():
    if not os.path.exists(DB_PATH):
        return {}
    try:
        with open(DB_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except:
        return {}

def _save_db(db):
    with open(DB_PATH, "w", encoding="utf-8") as f:
        json.dump(db, f, indent=4)

def get_override(url: str):
    db = _load_db()
    entry = db.get(url)
    if isinstance(entry, dict):
        return entry.get("label")  # return label only
    return entry  # backward compatible

def save_override(url: str, label: str, source="user"):
    label = label.strip().lower()
    if label not in ("phishing", "legitimate"):
        raise ValueError("Invalid label")

    url = url.strip()
    if not url:
        raise ValueError("URL cannot be empty")

    with _lock:
        db = _load_db()
        db[url] = {
            "label": label,
            "source": source
        }
        _save_db(db)
