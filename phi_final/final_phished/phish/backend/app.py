from flask import Flask, request, jsonify
from flask_cors import CORS
import os, sys, requests, uuid
from datetime import datetime

BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
BASE_DIR = os.path.dirname(BACKEND_DIR)
SRC_DIR = os.path.join(BASE_DIR, "src")

sys.path.append(SRC_DIR)

from predict_url import predict_url
from adaptive_store import get_override, save_override

# Admin feedback collector (global learning server)
# Make sure this matches your admin Flask server URL.
ADMIN_SERVER_URL = "http://127.0.0.1:6000/submit-feedback"

app = Flask(__name__)
CORS(app)


def send_feedback_to_admin(url, user_label, model_label):
    data = {
        "url": url,
        "user_label": user_label,
        "model_label": model_label,
        "timestamp": str(datetime.now()),
        "device_id": str(uuid.uuid4())
    }

    try:
        requests.post(ADMIN_SERVER_URL, json=data, timeout=2)
    except:
        pass


@app.post("/predict")
def predict():
    data = request.get_json() or {}
    url = (data.get("url") or "").strip()

    override = get_override(url)
    if override:
        return jsonify({
            "url": url,
            "prediction": override,
            "is_phishing": (override == "phishing"),
            "probability": 1.0,
            "source": "adaptive_db"
        })

    result = predict_url(url)
    result["source"] = "model"
    return jsonify(result)


@app.post("/adapt")
def adapt():
    data = request.get_json() or {}
    url = (data.get("url") or "").strip()
    label = (data.get("label") or "").strip().lower()

    # Accept both "model_label" and older "model_prediction" key from clients
    model_pred = (data.get("model_label") or data.get("model_prediction") or "").strip().lower()

    save_override(url, label, source="user_feedback")
    send_feedback_to_admin(url, label, model_pred)

    return jsonify({"success": True, "url": url, "label": label})


if __name__ == "__main__":
    app.run(debug=True)
