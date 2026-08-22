import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
import xgboost as xgb
import joblib
import os

def train_real_model():
    print("Loading real dataset...")
    df = pd.read_excel('models/Crop Recommendation Dataset.xlsx')
    
    # Check if necessary columns exist
    expected_cols = ['Temperature', 'Humidity', 'pH', 'Rainfall', 'Label']
    for col in expected_cols:
        if col not in df.columns:
            raise ValueError(f"Missing column {col} in dataset")
            
    # Clean any NaNs
    df = df.dropna(subset=expected_cols)
            
    print("Encoding labels...")
    le = LabelEncoder()
    df['label_encoded'] = le.fit_transform(df['Label'])
    
    # Use exact column names as defined in the feature_order in crop_engine.py
    X = df[['Temperature', 'Humidity', 'pH', 'Rainfall']]
    y = df['label_encoded']
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    print("Training XGBoost Classifier...")
    model = xgb.XGBClassifier(
        n_estimators=100, 
        max_depth=6, 
        learning_rate=0.1, 
        eval_metric='mlogloss',
        use_label_encoder=False
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
    train_real_model()
