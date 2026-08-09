import numpy as np
import tensorflow as tf
from extract_features import extract_features
import os
from urllib.parse import urlparse, urlunparse

# === Normalize URL safely (Option 1) ===
def clean_url(url):
    url = url.strip()

    # If missing scheme, add http://
    if not url.startswith("http://") and not url.startswith("https://"):
        url = "http://" + url

    parsed = urlparse(url)

    # Convert to http (model was trained mostly on http)
    scheme = "http"

    hostname = parsed.netloc.lower()

    # Remove leading "www."
    if hostname.startswith("www."):
        hostname = hostname[4:]

    # Rebuild URL without touching path, params, query, fragment
    cleaned = urlunparse((
        scheme,
        hostname,
        parsed.path,
        parsed.params,
        parsed.query,
        parsed.fragment
    ))

    return cleaned


# === Load model safely ===
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "my_model.keras")
model = tf.keras.models.load_model(MODEL_PATH)


# === Main predict function ===
def predict_url(url):
    cleaned = clean_url(url)

    X = extract_features(cleaned).reshape(1, -1)
    prediction = model.predict(X)

    predicted_class = int(np.argmax(prediction))
    probability = float(prediction[0][predicted_class])

    return {
        "input_url": url,
        "analyzed_url": cleaned,
        "is_phishing": bool(predicted_class),
        "prediction": "phishing" if predicted_class == 1 else "legitimate",
        "probability": probability
    }
