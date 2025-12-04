from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import Base, engine, get_db
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

app.include_router(auth.router)
app.include_router(transactions.router)
app.include_router(admin.router)


@app.get("/")
def root():
    return {"message": "Budget API running", "docs": "/docs"}
