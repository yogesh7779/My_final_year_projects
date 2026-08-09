from predict_url import predict_url

print("\n=== URL PHISHING DETECTION SYSTEM ===")

while True:
    url = input("\nEnter URL (type 'exit' to quit): ")

    if url.lower() == "exit":
        break

    result = predict_url(url)

    print("\nURL:", result["url"])
    print("Prediction:", result["prediction"])
    print("Probability:", round(result["probability"], 4))

    if result["is_phishing"]:
        print("⚠ WARNING: This link is likely PHISHING!")
