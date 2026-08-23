import joblib
import json
import os

model_path = r"P:\PROJECTS\FARMSAATHI\backend\ml\crop_recommendation\models\crop_model.pkl"
encoder_path = r"P:\PROJECTS\FARMSAATHI\backend\ml\crop_recommendation\models\crop_encoder.pkl"

if not os.path.exists(model_path):
    print("Model not found at", model_path)
    exit(1)

print("Loading model and encoder...")
model = joblib.load(model_path)
encoder = joblib.load(encoder_path)

print("Saving model to JSON...")
model.save_model(r"P:\PROJECTS\FARMSAATHI\backend\ml\crop_recommendation\models\crop_model.json")

print("Saving encoder classes to JSON...")
classes = encoder.classes_.tolist()
with open(r"P:\PROJECTS\FARMSAATHI\backend\ml\crop_recommendation\models\crop_encoder.json", "w") as f:
    json.dump(classes, f)

print("Done! Saved crop_model.json and crop_encoder.json")
