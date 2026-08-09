"""
FarmSaathi AI — Crop Recommendation Model Training
XGBoost classifier trained on N, P, K, temperature, humidity, rainfall, pH

Dataset: Kaggle Crop Recommendation Dataset
Download: https://www.kaggle.com/datasets/atharvaingle/crop-recommendation-dataset

Usage:
    python train.py --data data/crop_recommendation.csv --output models/
"""
import argparse
import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from xgboost import XGBClassifier

import warnings
warnings.filterwarnings("ignore")


def load_data(data_path: str) -> tuple[pd.DataFrame, pd.Series]:
    """Load and validate the crop recommendation dataset."""
    df = pd.read_csv(data_path)
    print(f"Dataset shape: {df.shape}")
    print(f"Columns: {list(df.columns)}")
    print(f"Unique crops: {df['label'].nunique()}")
    print(f"Crop distribution:\n{df['label'].value_counts()}\n")

    # Expected columns
    required = ["N", "P", "K", "temperature", "humidity", "rainfall", "ph", "label"]
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValueError(f"Missing columns: {missing}")

    X = df[["N", "P", "K", "temperature", "humidity", "rainfall", "ph"]]
    y = df["label"]
    return X, y


def train_model(X_train, y_train_enc, X_test, y_test_enc):
    """Train XGBoost classifier with good hyperparameters."""
    model = XGBClassifier(
        n_estimators=300,
        max_depth=7,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        min_child_weight=3,
        gamma=0.1,
        reg_alpha=0.1,
        reg_lambda=1.0,
        random_state=42,
        eval_metric="mlogloss",
        early_stopping_rounds=20,
        n_jobs=-1,
        verbosity=1,
    )

    model.fit(
        X_train,
        y_train_enc,
        eval_set=[(X_test, y_test_enc)],
        verbose=50,
    )
    return model


def evaluate(model, encoder, X_test, y_test_enc, class_names):
    """Evaluate model and print detailed metrics."""
    y_pred = model.predict(X_test)
    y_proba = model.predict_proba(X_test)

    # Top-1 accuracy
    acc = accuracy_score(y_test_enc, y_pred)
    print(f"\n=== Model Evaluation ===")
    print(f"Top-1 Accuracy: {acc:.4f} ({acc:.2%})")

    # Top-3 accuracy
    top3_correct = sum(
        1 for i, true in enumerate(y_test_enc)
        if true in np.argsort(y_proba[i])[-3:]
    )
    top3_acc = top3_correct / len(y_test_enc)
    print(f"Top-3 Accuracy: {top3_acc:.4f} ({top3_acc:.2%})")

    # Per-class report
    print(f"\nClassification Report:")
    print(classification_report(y_test_enc, y_pred, target_names=class_names))

    # Feature importance
    feature_names = ["N", "P", "K", "temperature", "humidity", "rainfall", "ph"]
    importance = model.feature_importances_
    print("\nFeature Importance:")
    for name, imp in sorted(zip(feature_names, importance), key=lambda x: x[1], reverse=True):
        print(f"  {name}: {imp:.4f}")

    return {
        "top1_accuracy": round(acc, 4),
        "top3_accuracy": round(top3_acc, 4),
    }


def save_artifacts(model, encoder, output_dir: str, metrics: dict):
    """Save model, encoder, class list, and model card."""
    output = Path(output_dir)
    output.mkdir(parents=True, exist_ok=True)

    # Save model and encoder
    joblib.dump(model, output / "crop_model.pkl")
    joblib.dump(encoder, output / "crop_encoder.pkl")

    # Save class names as JSON
    classes = encoder.classes_.tolist()
    with open(output / "classes.json", "w") as f:
        json.dump(classes, f, indent=2)

    # Save model card
    model_card = f"""# FarmSaathi Crop Recommendation Model

## Model
XGBoost Classifier

## Dataset
Kaggle Crop Recommendation Dataset
- Features: N, P, K, temperature, humidity, rainfall, pH
- Classes: {len(classes)} crops
- Classes: {classes}

## Performance
- Top-1 Accuracy: {metrics['top1_accuracy']:.2%}
- Top-3 Accuracy: {metrics['top3_accuracy']:.2%}

## Hyperparameters
- n_estimators: 300
- max_depth: 7
- learning_rate: 0.05
- subsample: 0.8
- colsample_bytree: 0.8

## Usage
This model provides crop probability scores as INPUT to the composite scoring engine.
The final recommendation = 0.40 × ml_score + 0.20 × weather + 0.20 × soil + 0.10 × water + 0.10 × season

## Known Limitations
- Trained on historical dataset; may not capture recent crop pattern shifts
- Does not account for local market conditions
- Soil type feature not included in this version (handled by composite scorer)

## Version
1.0.0
"""
    with open(output / "model_card.md", "w") as f:
        f.write(model_card)

    print(f"\n✅ Artifacts saved to {output}/")
    print(f"   crop_model.pkl, crop_encoder.pkl, classes.json, model_card.md")


def main():
    parser = argparse.ArgumentParser(description="Train FarmSaathi crop recommendation model")
    parser.add_argument("--data", default="data/crop_recommendation.csv", help="Path to CSV dataset")
    parser.add_argument("--output", default="models/", help="Output directory for model artifacts")
    parser.add_argument("--test-size", type=float, default=0.2)
    args = parser.parse_args()

    print("🌾 FarmSaathi Crop Recommendation Model Training")
    print("=" * 50)

    # Load data
    X, y = load_data(args.data)

    # Encode labels
    encoder = LabelEncoder()
    y_enc = encoder.fit_transform(y)
    classes = encoder.classes_.tolist()

    # Split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y_enc,
        test_size=args.test_size,
        random_state=42,
        stratify=y_enc,
    )
    print(f"\nTrain samples: {len(X_train)}")
    print(f"Test samples: {len(X_test)}")

    # Train
    print("\nTraining XGBoost model...")
    model = train_model(X_train, y_train, X_test, y_test)

    # Evaluate
    metrics = evaluate(model, encoder, X_test, y_test, classes)

    # Save
    save_artifacts(model, encoder, args.output, metrics)


if __name__ == "__main__":
    main()
