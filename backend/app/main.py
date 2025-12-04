from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import Base, engine, get_db, SessionLocal
from .config import get_settings
from . import models
from .routers import auth, transactions, admin

settings = get_settings()

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Budget Manager", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def ensure_admin_user():
    """Guarantee the default admin account exists for first-time logins."""
    db = SessionLocal()
    try:
        auth.ensure_admin_exists(db)
    finally:
        db.close()

app.include_router(auth.router)
app.include_router(transactions.router)
app.include_router(admin.router)


@app.get("/")
def root():
    return {"message": "Budget API running", "docs": "/docs"}
