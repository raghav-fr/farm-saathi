"""
FarmSaathi AI — Disease detection router
Accepts leaf/plant image upload → EfficientNet ONNX inference → LLM explanation.
"""
import io
from typing import Optional

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status

from app.core.deps import FarmerDep
from app.core.firestore_service import save_disease_scan, list_disease_scans
from app.schemas import DiseaseDetectionResponse

router = APIRouter(prefix="/disease", tags=["Disease Detection"])

ALLOWED_MIME_TYPES = {"image/jpeg", "image/jpg", "image/png", "image/webp"}
MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB


@router.post("/predict", response_model=DiseaseDetectionResponse)
async def predict_disease(
    image: UploadFile = File(..., description="Leaf or plant image (JPG/PNG/WebP)"),
    farm_id: Optional[str] = Form(None),
    crop_name: Optional[str] = Form(None),
    language: str = Form("en"),
    farmer: FarmerDep = None,
):
    """
    Disease detection pipeline:
    1. Validate image (type + size)
    2. Run EfficientNet-B0 ONNX inference
    3. Apply confidence threshold (< 70% → uncertain response)
    4. Look up verified disease knowledge (no hallucination)
    5. Generate farmer-friendly explanation via LLM
    6. Save scan result to Firestore
    7. Upload image to Firebase Storage
    """
    # Validate mime type
    if image.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type '{image.content_type}'. Upload JPG, PNG, or WebP.",
        )

    contents = await image.read()

    # Validate file size
    if len(contents) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Image too large. Maximum 10 MB allowed.",
        )

    from app.ai.disease_engine import DiseaseEngine
    from app.services.storage_service import upload_image_to_firebase

    engine = DiseaseEngine()
    result = await engine.predict(
        image_bytes=contents,
        crop_hint=crop_name,
        language=language,
    )

    # Upload image to Firebase Storage and save scan record
    image_url = None
    if farmer:
        image_url = await upload_image_to_firebase(
            contents,
            path=f"disease_scans/{farmer.uid}/{result.get('scan_id', 'scan')}.jpg",
            content_type=image.content_type,
        )
        await save_disease_scan(
            farmer.uid,
            {
                "farmId": farm_id,
                "cropName": crop_name,
                "imageUrl": image_url,
                "disease": result.get("disease"),
                "confidence": result.get("confidence"),
                "severity": result.get("severity"),
                "status": result.get("status"),
            },
        )

    return result


@router.get("/history", response_model=list[DiseaseDetectionResponse])
async def get_disease_history(
    farm_id: Optional[str] = None,
    farmer: FarmerDep = None,
):
    """Get disease scan history for the farmer."""
    return await list_disease_scans(farmer.uid, farm_id)
