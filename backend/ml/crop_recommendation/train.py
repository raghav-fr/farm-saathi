import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
import xgboost as xgb
import joblib
import os

CROPS = [
    "rice", "wheat", "maize", "cotton", "sugarcane", "groundnut", 
    "soybean", "bajra", "jowar", "chickpea", "mustard", "potato", 
    "tomato", "banana", "mango", "jute", "coffee"
]

def generate_synthetic_data(num_samples=5000):
    data = []
    
    for _ in range(num_samples):
        crop = np.random.choice(CROPS)
        
        # Base stats
        n = np.random.uniform(20, 120)
        p = np.random.uniform(10, 80)
        k = np.random.uniform(10, 80)
        temp = np.random.uniform(15, 35)
        hum = np.random.uniform(40, 90)
        rain = np.random.uniform(40, 200) # mm per month
        ph = np.random.uniform(5.5, 8.5)
        
        # Adjust stats based on crop
        if crop in ["rice", "sugarcane", "jute"]:
            temp = np.random.uniform(22, 35)
            hum = np.random.uniform(70, 95)
            rain = np.random.uniform(150, 300)
            n = np.random.uniform(80, 140)
            
        elif crop in ["wheat", "mustard", "chickpea"]:
            temp = np.random.uniform(10, 25)
            hum = np.random.uniform(40, 70)
            rain = np.random.uniform(30, 80)
            
        elif crop in ["cotton"]:
            temp = np.random.uniform(25, 40)
            hum = np.random.uniform(40, 75)
            rain = np.random.uniform(50, 100)
            p = np.random.uniform(40, 90)
            
        elif crop in ["coffee", "tea"]:
            temp = np.random.uniform(15, 28)
            hum = np.random.uniform(60, 90)
            rain = np.random.uniform(150, 250)
            ph = np.random.uniform(5.0, 6.5)

        data.append([n, p, k, temp, hum, rain, ph, crop])
        
    df = pd.DataFrame(data, columns=["N", "P", "K", "temperature", "humidity", "rainfall", "ph", "label"])
    return df

def train_model():
    print("Generating synthetic crop dataset...")
    df = generate_synthetic_data(10000)
    
    print("Encoding labels...")
    le = LabelEncoder()
    df['label_encoded'] = le.fit_transform(df['label'])
    
    X = df.drop(['label', 'label_encoded'], axis=1)
    y = df['label_encoded']
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    print("Training XGBoost Classifier...")
    model = xgb.XGBClassifier(
        n_estimators=100, 
        max_depth=6, 
        learning_rate=0.1, 
        eval_metric='mlogloss'
    )
    
    model.fit(X_train, y_train)
    
    acc = model.score(X_test, y_test)
    print(f"Model Accuracy on Test Set: {acc * 100:.2f}%")
    
    # Save the model and encoder
    os.makedirs('models', exist_ok=True)
    joblib.dump(model, 'models/crop_model.pkl')
    joblib.dump(le, 'models/crop_encoder.pkl')
    
    print("Saved crop_model.pkl and crop_encoder.pkl successfully.")

if __name__ == "__main__":
    train_model()
