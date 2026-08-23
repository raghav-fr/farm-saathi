import m2cgen as m2c
import joblib

print("Loading model...")
model = joblib.load(r"P:\PROJECTS\FARMSAATHI\backend\ml\crop_recommendation\models\crop_model.pkl")

print("Converting to Python...")
# Export the model to pure Python code
code = m2c.export_to_python(model)

with open(r"P:\PROJECTS\FARMSAATHI\backend\app\ai\xgboost_model_code.py", "w") as f:
    f.write(code)

print("Saved pure python model to xgboost_model_code.py")
