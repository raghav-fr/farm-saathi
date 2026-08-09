"""
FarmSaathi AI — FastAPI dependency injection
Provides authenticated farmer context for all protected routes.
"""
from typing import Annotated

from fastapi import Depends, Header, HTTPException, status
from firebase_admin import auth as firebase_auth
from loguru import logger

from app.core.firebase import get_firestore_client, verify_firebase_token


class FarmerContext:
    """Decoded Firebase token + Firestore profile loaded per-request."""

    def __init__(self, uid: str, email: str | None, phone: str | None, claims: dict):
        self.uid = uid
        self.email = email
        self.phone = phone
        self.claims = claims
        self._profile: dict | None = None

    @property
    def is_admin(self) -> bool:
        return self.claims.get("admin", False)


async def get_current_farmer(
    authorization: Annotated[str | None, Header()] = None,
) -> FarmerContext:
    """
    Dependency: extracts Bearer token from Authorization header,
    verifies with Firebase Auth, returns FarmerContext.

    Usage:
        @router.get("/me")
        async def me(farmer: FarmerDep):
            return {"uid": farmer.uid}
    """
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header missing",
            headers={"WWW-Authenticate": "Bearer"},
        )

    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization format. Expected: Bearer <token>",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        claims = await verify_firebase_token(token)
    except firebase_auth.ExpiredIdTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expired. Please sign in again.",
        )
    except firebase_auth.InvalidIdTokenError as e:
        logger.warning(f"Invalid Firebase token: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )
    except Exception as e:
        logger.error(f"Token verification failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentication service error",
        )

    return FarmerContext(
        uid=claims["uid"],
        email=claims.get("email"),
        phone=claims.get("phone_number"),
        claims=claims,
    )


async def get_current_admin(
    farmer: Annotated[FarmerContext, Depends(get_current_farmer)],
) -> FarmerContext:
    """Dependency: same as get_current_farmer but also requires admin claim."""
    if not farmer.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return farmer


# Shorthand type aliases
FarmerDep = Annotated[FarmerContext, Depends(get_current_farmer)]
AdminDep = Annotated[FarmerContext, Depends(get_current_admin)]
