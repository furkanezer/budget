from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from .. import schemas, models
from ..auth import (
    authenticate_user,
    create_access_token,
    get_current_user,
    get_password_hash,
    verify_password,
)
from ..database import get_db
from ..config import get_settings

router = APIRouter(prefix="/auth", tags=["auth"])

settings = get_settings()


def ensure_admin_exists(db: Session):
    if settings.admin_email and settings.admin_password:
        admin = db.query(models.User).filter(models.User.email == settings.admin_email).first()
        hashed_password = get_password_hash(settings.admin_password)

        if not admin:
            admin = models.User(
                email=settings.admin_email,
                full_name="Admin",
                hashed_password=hashed_password,
                is_admin=True,
            )
            db.add(admin)
            db.commit()
            db.refresh(admin)
            return admin

        updated = False
        if not admin.is_admin:
            admin.is_admin = True
            updated = True
        if not verify_password(settings.admin_password, admin.hashed_password):
            admin.hashed_password = hashed_password
            updated = True

        if updated:
            db.commit()
            db.refresh(admin)
    return admin


@router.post("/register", response_model=schemas.UserRead)
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(models.User.email == user.email).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")
    new_user = models.User(
        email=user.email,
        full_name=user.full_name,
        hashed_password=get_password_hash(user.password),
        is_admin=False,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@router.post("/token", response_model=schemas.Token)
def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)
):
    ensure_admin_exists(db)
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")
    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
    access_token = create_access_token(
        data={"sub": user.email, "is_admin": user.is_admin}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=schemas.UserRead)
def read_users_me(current_user: models.User = Depends(get_current_user)):
    return current_user
