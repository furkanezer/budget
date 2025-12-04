from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from .. import models, schemas
from ..auth import get_current_admin
from ..database import get_db

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/users")
def list_users(db: Session = Depends(get_db), admin: models.User = Depends(get_current_admin)):
    users = db.query(models.User).all()
    return [
        {"id": u.id, "email": u.email, "full_name": u.full_name, "is_admin": u.is_admin, "created_at": u.created_at}
        for u in users
    ]


@router.get("/overview")
def overview(db: Session = Depends(get_db), admin: models.User = Depends(get_current_admin)):
    totals = (
        db.query(
            models.Transaction.type,
            func.coalesce(func.sum(models.Transaction.amount), 0).label("total"),
        )
        .group_by(models.Transaction.type)
        .all()
    )
    total_income = next((t.total for t in totals if t.type == models.TransactionType.income), 0.0)
    total_expense = next((t.total for t in totals if t.type == models.TransactionType.expense), 0.0)
    user_count = db.query(func.count(models.User.id)).scalar() or 0
    latest = db.query(models.Transaction).order_by(models.Transaction.created_at.desc()).limit(5).all()
    return {
        "user_count": user_count,
        "total_income": total_income,
        "total_expense": total_expense,
        "balance": total_income - total_expense,
        "recent_transactions": [
            {
                "user": tx.owner.email,
                "amount": tx.amount,
                "type": tx.type.value,
                "category": tx.category,
                "occurred_at": tx.occurred_at,
            }
            for tx in latest
        ],
    }
