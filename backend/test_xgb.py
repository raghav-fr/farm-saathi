import json
import xgboost as xgb
import os

model_path = r"P:\PROJECTS\FARMSAATHI\backend\ml\crop_recommendation\models\crop_model.json"
encoder_path = r"P:\PROJECTS\FARMSAATHI\backend\ml\crop_recommendation\models\crop_encoder.json"

print("Loading model using XGBClassifier...")
model = xgb.XGBClassifier()
model.load_model(model_path)

print("Loading encoder...")
with open(encoder_path, "r") as f:
    classes = json.load(f)

print("Classes:", classes)

row = [25.0, 65.0, 6.5, 100.0]
# Add N, P, K because the original training script uses N, P, K, temperature, humidity, rainfall, ph!
# Wait! In train.py:
# columns=["N", "P", "K", "temperature", "humidity", "rainfall", "ph", "label"]
# But crop_engine.py says:
# feature_order = ["Temperature", "Humidity", "pH", "Rainfall"]
# That means there is a mismatch between train.py and crop_engine.py, or train_real.py is different.
# Let's check crop_engine.py again!
