from flask import Flask, request, jsonify
from flask_cors import CORS
import json, os

app = Flask(__name__)
CORS(app)

DB_PATH = "global_submissions.json"

# Create database if not exists
if not os.path.exists(DB_PATH):
    with open(DB_PATH, "w") as f:
        json.dump([], f)

@app.post("/submit-feedback")
def submit_feedback():
    data = request.get_json() or {}

    with open(DB_PATH, "r") as f:
        db = json.load(f)

    db.append(data)

    with open(DB_PATH, "w") as f:
        json.dump(db, f, indent=4)

    return jsonify({"status": "received"}), 200


@app.get("/all-submissions")
def all_submissions():
    with open(DB_PATH, "r") as f:
        db = json.load(f)
    return jsonify(db)


if __name__ == "__main__":
    print("🚀 Admin Feedback Server Running on http://127.0.0.1:6000")
    app.run(host="0.0.0.0", port=6000, debug=True)
