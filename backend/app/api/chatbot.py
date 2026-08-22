"""
FarmSaathi AI — Chat router
Conversational AI endpoint with intent routing + RAG + local LLM.
"""
from fastapi import APIRouter, HTTPException, status

from app.core.deps import FarmerDep
from app.core.firestore_service import (
    add_message,
    create_conversation,
    get_farmer_profile,
    list_conversations,
    list_messages,
)
from app.schemas import ChatRequest, ChatResponse

router = APIRouter(prefix="/chat", tags=["Chat"])


@router.post("", response_model=ChatResponse)
async def chat(request: ChatRequest, farmer: FarmerDep):
    """
    Main conversational endpoint:
    1. Classify intent (crop/disease/weather/market/scheme/general)
    2. Route to appropriate service (NOT the LLM)
    3. Gather verified context
    4. Generate explanation via local LLM (Qwen3:4B)
    5. Save conversation to Firestore
    6. Return structured response
    """
    from app.ai.query_router import QueryRouter

    # Ensure or create conversation
    conv_id = request.conversation_id
    if not conv_id:
        conv = await create_conversation(
            farmer.uid,
            title=request.message[:50] + ("..." if len(request.message) > 50 else ""),
        )
        conv_id = conv["id"]

    # Save user message
    user_msg_content = request.message
    if request.image:
        user_msg_content = request.message + "\n[Image Attached]"

    await add_message(
        farmer.uid,
        conv_id,
        {"role": "user", "content": user_msg_content, "language": request.language},
    )

    # Load farmer profile and conversation history for context
    profile = await get_farmer_profile(farmer.uid)
    chat_history = await list_messages(farmer.uid, conv_id)

    # Route and respond
    router_svc = QueryRouter()
    result = await router_svc.route(
        message=request.message,
        farmer_uid=farmer.uid,
        farm_id=request.farm_id,
        language=request.language,
        farmer_profile=profile,
        chat_history=chat_history,
        image_base64=request.image,
    )

    # Save assistant message
    msg = await add_message(
        farmer.uid,
        conv_id,
        {
            "role": "assistant",
            "content": result["answer"],
            "intent": result["intent"],
            "sources": result.get("sources", []),
            "language": request.language,
        },
    )

    return ChatResponse(
        conversation_id=conv_id,
        message_id=msg["id"],
        intent=result["intent"],
        answer=result["answer"],
        sources=result.get("sources", []),
        language=request.language,
    )


@router.get("/conversations", response_model=list[dict])
async def get_conversations(farmer: FarmerDep):
    """List all chat conversations for the farmer."""
    return await list_conversations(farmer.uid)


@router.get("/conversations/{conv_id}/messages", response_model=list[dict])
async def get_messages(conv_id: str, farmer: FarmerDep):
    """Get all messages in a conversation."""
    return await list_messages(farmer.uid, conv_id)


@router.delete("/conversations/{conv_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_conversation(conv_id: str, farmer: FarmerDep):
    """Delete a conversation (soft delete via Firestore update)."""
    from app.core.firebase import get_firestore_client
    db = get_firestore_client()
    from app.core.firestore_service import _now
    db.collection("farmers").document(farmer.uid).collection("conversations").document(conv_id).update({"deletedAt": _now()})
