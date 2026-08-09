"""
FarmSaathi AI — Disease Detection Model Training
EfficientNet-B0 fine-tuned on PlantVillage dataset

Dataset: PlantVillage
Download: https://www.kaggle.com/datasets/emmarex/plantdisease
Or: https://github.com/spMohanty/PlantVillage-Dataset

Expected directory structure:
    data/disease/
    ├── train/
    │   ├── Tomato___Early_blight/
    │   ├── Tomato___Late_blight/
    │   ├── Tomato___healthy/
    │   └── ... (other classes)
    └── val/
        └── ... (same structure)

Usage:
    python train.py --data data/disease/ --output models/ --epochs 15
"""
import argparse
import json
from pathlib import Path

import torch
import torch.nn as nn
from torch.utils.data import DataLoader
from torchvision import datasets, transforms
from torchvision.models import EfficientNet_B0_Weights, efficientnet_b0

import warnings
warnings.filterwarnings("ignore")


def get_transforms():
    """Data augmentation transforms for training robustness."""
    train_transform = transforms.Compose([
        transforms.Resize((256, 256)),
        transforms.RandomCrop(224),
        transforms.RandomHorizontalFlip(),
        transforms.RandomVerticalFlip(),
        transforms.RandomRotation(20),
        transforms.ColorJitter(brightness=0.3, contrast=0.3, saturation=0.2, hue=0.1),
        transforms.RandomGrayscale(p=0.05),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])

    val_transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])

    return train_transform, val_transform


def build_model(num_classes: int, freeze_backbone: bool = False) -> nn.Module:
    """Build EfficientNet-B0 with custom classification head."""
    weights = EfficientNet_B0_Weights.DEFAULT
    model = efficientnet_b0(weights=weights)

    if freeze_backbone:
        for param in model.features.parameters():
            param.requires_grad = False
        print("Backbone frozen — only classifier will train")

    # Replace classifier
    in_features = model.classifier[1].in_features
    model.classifier = nn.Sequential(
        nn.Dropout(p=0.3, inplace=True),
        nn.Linear(in_features, num_classes),
    )
    return model


def train_epoch(model, loader, criterion, optimizer, device, scaler):
    model.train()
    total_loss = 0.0
    correct = 0
    total = 0

    for images, labels in loader:
        images, labels = images.to(device), labels.to(device)
        optimizer.zero_grad()

        with torch.cuda.amp.autocast(enabled=(device.type == "cuda")):
            outputs = model(images)
            loss = criterion(outputs, labels)

        scaler.scale(loss).backward()
        scaler.step(optimizer)
        scaler.update()

        total_loss += loss.item()
        _, predicted = outputs.max(1)
        total += labels.size(0)
        correct += predicted.eq(labels).sum().item()

    return total_loss / len(loader), 100.0 * correct / total


@torch.no_grad()
def validate(model, loader, criterion, device):
    model.eval()
    total_loss = 0.0
    correct = 0
    total = 0

    for images, labels in loader:
        images, labels = images.to(device), labels.to(device)
        outputs = model(images)
        loss = criterion(outputs, labels)

        total_loss += loss.item()
        _, predicted = outputs.max(1)
        total += labels.size(0)
        correct += predicted.eq(labels).sum().item()

    return total_loss / len(loader), 100.0 * correct / total


def export_to_onnx(model, output_dir: Path, device: torch.device):
    """Export trained PyTorch model to ONNX for fast inference."""
    model.eval()
    dummy_input = torch.randn(1, 3, 224, 224).to(device)
    onnx_path = output_dir / "disease_model.onnx"

    torch.onnx.export(
        model,
        dummy_input,
        str(onnx_path),
        export_params=True,
        opset_version=17,
        do_constant_folding=True,
        input_names=["input"],
        output_names=["output"],
        dynamic_axes={"input": {0: "batch_size"}, "output": {0: "batch_size"}},
    )
    print(f"✅ ONNX model exported: {onnx_path}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", default="data/disease/", help="Root data directory")
    parser.add_argument("--output", default="models/", help="Output directory")
    parser.add_argument("--epochs", type=int, default=15)
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument("--lr", type=float, default=1e-4)
    parser.add_argument("--freeze-backbone", action="store_true", help="Freeze EfficientNet backbone")
    args = parser.parse_args()

    print("🌿 FarmSaathi Disease Detection Model Training")
    print("=" * 50)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Device: {device}")
    if device.type == "cuda":
        print(f"GPU: {torch.cuda.get_device_name(0)}")

    output_dir = Path(args.output)
    output_dir.mkdir(parents=True, exist_ok=True)

    # Datasets
    train_tf, val_tf = get_transforms()
    train_dataset = datasets.ImageFolder(Path(args.data) / "train", transform=train_tf)
    val_dataset = datasets.ImageFolder(Path(args.data) / "val", transform=val_tf)

    num_classes = len(train_dataset.classes)
    print(f"\nClasses: {num_classes}")
    print(f"Train samples: {len(train_dataset)}")
    print(f"Val samples: {len(val_dataset)}")

    train_loader = DataLoader(train_dataset, batch_size=args.batch_size, shuffle=True, num_workers=4, pin_memory=True)
    val_loader = DataLoader(val_dataset, batch_size=args.batch_size, shuffle=False, num_workers=4, pin_memory=True)

    # Save class names
    classes_path = output_dir / "classes.json"
    with open(classes_path, "w") as f:
        json.dump(train_dataset.classes, f, indent=2)
    print(f"Classes saved to {classes_path}")

    # Model
    model = build_model(num_classes, freeze_backbone=args.freeze_backbone)
    model = model.to(device)

    # Training setup
    criterion = nn.CrossEntropyLoss(label_smoothing=0.1)
    optimizer = torch.optim.AdamW(model.parameters(), lr=args.lr, weight_decay=1e-4)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=args.epochs)
    scaler = torch.cuda.amp.GradScaler(enabled=(device.type == "cuda"))

    # Train
    best_val_acc = 0.0
    for epoch in range(args.epochs):
        train_loss, train_acc = train_epoch(model, train_loader, criterion, optimizer, device, scaler)
        val_loss, val_acc = validate(model, val_loader, criterion, device)
        scheduler.step()

        lr = optimizer.param_groups[0]["lr"]
        print(
            f"Epoch {epoch+1:2d}/{args.epochs} | "
            f"Train: loss={train_loss:.4f} acc={train_acc:.2f}% | "
            f"Val: loss={val_loss:.4f} acc={val_acc:.2f}% | "
            f"LR: {lr:.2e}"
        )

        if val_acc > best_val_acc:
            best_val_acc = val_acc
            torch.save(model.state_dict(), output_dir / "disease_model_best.pth")
            print(f"  ✅ Best model saved (val_acc={val_acc:.2f}%)")

    print(f"\nTraining complete. Best val accuracy: {best_val_acc:.2f}%")

    # Load best model and export to ONNX
    model.load_state_dict(torch.load(output_dir / "disease_model_best.pth"))
    export_to_onnx(model, output_dir, device)

    # Model card
    model_card = f"""# FarmSaathi Disease Detection Model

## Model
EfficientNet-B0 (fine-tuned from ImageNet weights)

## Dataset
PlantVillage Dataset
- {num_classes} classes
- Classes: {train_dataset.classes}

## Performance
- Best Validation Accuracy: {best_val_acc:.2f}%

## Confidence Threshold
Predictions below 70% confidence are marked as "uncertain" and the farmer is asked to re-upload a clearer image.

## Known Limitations
- Trained on PlantVillage (mostly lab/controlled images)
- Field performance may differ from laboratory benchmark
- Not validated for all Indian crop varieties
- NOT a substitute for expert agronomist diagnosis

## Augmentations
Horizontal flip, vertical flip, rotation, color jitter, random crop for better field image generalization.

## Version
1.0.0
"""
    with open(output_dir / "model_card.md", "w") as f:
        f.write(model_card)

    print(f"Model card saved to {output_dir}/model_card.md")


if __name__ == "__main__":
    main()
