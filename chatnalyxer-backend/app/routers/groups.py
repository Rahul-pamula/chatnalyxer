from fastapi import APIRouter, Depends, HTTPException, Header, status
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models, schemas
from ..deps import get_current_user

router = APIRouter(prefix="/groups", tags=["Groups"])

# Dependency to check API Key for WhatsApp integration routes


def get_api_key(x_api_key: str = Header(...)):
    if x_api_key != "b6323763d2e0a563df26d3ff6392db8f3d82bfd05207f231874d6474cbc376d4":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid API Key")


@router.post("/", response_model=schemas.GroupOut)
def create_group(group: schemas.GroupCreate, db: Session = Depends(get_db)):
    g = models.Group(name=group.name, whatsapp_id=group.whatsapp_id)
    db.add(g)
    db.commit()
    db.refresh(g)
    return g


@router.get("/", response_model=list[schemas.GroupOut])
def list_groups(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Get groups that the current user is a member of
    user_groups = db.query(models.Group).join(models.GroupMember).filter(
        models.GroupMember.user_id == current_user.id).all()
    return user_groups


@router.put("/{group_id}/selection", response_model=schemas.GroupOut)
def update_group_selection(
    group_id: int,
    update: schemas.GroupUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Check if the user is a member of this group
    membership = db.query(models.GroupMember).filter(
        models.GroupMember.user_id == current_user.id,
        models.GroupMember.group_id == group_id
    ).first()
    if not membership:
        raise HTTPException(
            status_code=403, detail="You are not a member of this group")

    group = db.query(models.Group).filter(models.Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    group.is_selected = 1 if update.is_selected else 0
    db.commit()
    db.refresh(group)
    return group


@router.post("/sync-from-whatsapp", status_code=status.HTTP_201_CREATED)
def sync_groups_from_whatsapp(
    payload: schemas.WhatsAppGroupSync,
    db: Session = Depends(get_db),
    api_key_check: str = Depends(get_api_key)
):
    """Sync groups from WhatsApp integration service"""
    created_count = 0
    updated_count = 0

    for group_data in payload.groups:
        whatsapp_id = group_data.get('whatsapp_id')
        name = group_data.get('name')

        if not whatsapp_id or not name:
            continue

        # Check if group already exists
        existing_group = db.query(models.Group).filter(
            models.Group.whatsapp_id == whatsapp_id
        ).first()

        if existing_group:
            # Update name if changed
            if existing_group.name != name:
                existing_group.name = name
                updated_count += 1
            group = existing_group
        else:
            # Create new group
            new_group = models.Group(
                name=name,
                whatsapp_id=whatsapp_id,
                is_selected=0  # Default to not selected
            )
            db.add(new_group)
            db.commit()
            db.refresh(new_group)
            group = new_group
            created_count += 1

        # For sync, assign to all users for now, since integration doesn't specify user
        # In future, pass user_id in payload
        all_users = db.query(models.User).all()
        for user in all_users:
            membership = db.query(models.GroupMember).filter(
                models.GroupMember.user_id == user.id,
                models.GroupMember.group_id == group.id
            ).first()
            if not membership:
                new_membership = models.GroupMember(
                    user_id=user.id, group_id=group.id)
                db.add(new_membership)

    db.commit()

    return {
        "message": f"Synced groups: {created_count} created, {updated_count} updated",
        "created": created_count,
        "updated": updated_count
    }


@router.get("/selected", response_model=list[schemas.GroupOut])
def get_selected_groups(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get only selected groups for the current user"""
    user_groups = db.query(models.Group).join(models.GroupMember).filter(
        models.GroupMember.user_id == current_user.id,
        models.Group.is_selected == 1
    ).all()
    return user_groups


@router.get("/selected/{user_id}", response_model=list[schemas.GroupOut])
def get_selected_groups_for_user(
    user_id: int,
    db: Session = Depends(get_db),
    api_key_check: str = Depends(get_api_key)
):
    """Get selected groups for a specific user (for WhatsApp integration)"""
    user_groups = db.query(models.Group).join(models.GroupMember).filter(
        models.GroupMember.user_id == user_id,
        models.Group.is_selected == 1
    ).all()
    return user_groups
