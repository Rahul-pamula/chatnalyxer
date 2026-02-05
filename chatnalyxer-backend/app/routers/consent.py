from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime

from ..database import get_db
from ..models import User
from ..deps import get_current_user
from .. import schemas

router = APIRouter(prefix="/consent", tags=["Consent"])


@router.get("/status", response_model=schemas.ConsentStatus)
def get_consent_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    db.refresh(current_user)
    return schemas.ConsentStatus(
        consent_accepted=bool(getattr(current_user, "consent_accepted", False)),
        consent_accepted_at=getattr(current_user, "consent_accepted_at", None),
        consent_version=getattr(current_user, "consent_version", "v1") or "v1",
        consent_whatsapp=bool(getattr(current_user, "consent_whatsapp", False)),
        consent_email=bool(getattr(current_user, "consent_email", False)),
    )


@router.post("/accept", response_model=schemas.ConsentStatus)
def accept_consent(
    request: schemas.ConsentAcceptRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    current_user.consent_accepted = True
    current_user.consent_accepted_at = datetime.utcnow()
    current_user.consent_version = request.consent_version
    current_user.consent_whatsapp = bool(request.consent_whatsapp)
    current_user.consent_email = bool(request.consent_email)

    db.commit()
    db.refresh(current_user)

    return schemas.ConsentStatus(
        consent_accepted=True,
        consent_accepted_at=current_user.consent_accepted_at,
        consent_version=current_user.consent_version,
        consent_whatsapp=current_user.consent_whatsapp,
        consent_email=current_user.consent_email,
    )


def require_consent_for_whatsapp(current_user: User):
    if not getattr(current_user, "consent_accepted", False) or not getattr(current_user, "consent_whatsapp", False):
        raise HTTPException(
            status_code=403,
            detail="Consent required to access WhatsApp data. Please accept Terms & Privacy Policy.",
        )


def require_consent_for_email(current_user: User):
    if not getattr(current_user, "consent_accepted", False) or not getattr(current_user, "consent_email", False):
        raise HTTPException(
            status_code=403,
            detail="Consent required to access Email data. Please accept Terms & Privacy Policy.",
        )
