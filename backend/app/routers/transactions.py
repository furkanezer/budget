from collections import defaultdict
from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from .. import models, schemas
from ..auth import get_current_user
from ..database import get_db

router = APIRouter(prefix="/transactions", tags=["transactions"])


@router.post("/", response_model=schemas.TransactionRead)
def create_transaction(
    transaction: schemas.TransactionCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    db_tx = models.Transaction(**transaction.dict(), owner=current_user)
    db.add(db_tx)
    db.commit()
    db.refresh(db_tx)
    return db_tx


@router.get("/", response_model=List[schemas.TransactionRead])
def list_transactions(
    db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)
):
    return (
        db.query(models.Transaction)
        .filter(models.Transaction.user_id == current_user.id)
        .order_by(models.Transaction.occurred_at.desc())
        .all()
    )


@router.delete("/{transaction_id}")
def delete_transaction(
    transaction_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)
):
    tx = (
        db.query(models.Transaction)
        .filter(models.Transaction.id == transaction_id, models.Transaction.user_id == current_user.id)
        .first()
    )
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    db.delete(tx)
    db.commit()
    return {"status": "deleted"}


def _suggestions(total_income: float, total_expense: float, top_categories: List[dict]) -> List[str]:
    suggestions: List[str] = []
    balance = total_income - total_expense
    if balance < 0:
        suggestions.append("Harcamalar gelirleri aşıyor, abonelikleri gözden geçirin.")
    elif balance < total_income * 0.1:
        suggestions.append("Tasarruf oranı düşük, aylık birikim hedefi koyun.")
    if top_categories:
        dominant = max(top_categories, key=lambda c: c["total"])
        suggestions.append(f"{dominant['category']} kategorisinde yüksek harcama var, sınırlamayı deneyin.")
    if total_income > 0:
        savings_rate = balance / total_income
        if savings_rate > 0.2:
            suggestions.append("Tasarruf oranı iyi, uzun vadeli yatırım planlayın.")
    return suggestions


@router.get("/analytics", response_model=schemas.AnalyticsSummary)
def analytics(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    totals = (
        db.query(
            models.Transaction.type,
            func.coalesce(func.sum(models.Transaction.amount), 0).label("total"),
        )
        .filter(models.Transaction.user_id == current_user.id)
        .group_by(models.Transaction.type)
        .all()
    )
    total_income = next((t.total for t in totals if t.type == models.TransactionType.income), 0.0)
    total_expense = next((t.total for t in totals if t.type == models.TransactionType.expense), 0.0)

    monthly = (
        db.query(
            func.date_trunc("month", models.Transaction.occurred_at).label("month"),
            func.sum(models.Transaction.amount).label("total"),
            models.Transaction.type,
        )
        .filter(models.Transaction.user_id == current_user.id)
        .group_by("month", models.Transaction.type)
        .order_by("month")
        .all()
    )
    monthly_trend = []
    for row in monthly:
        monthly_trend.append(
            {"month": row.month.strftime("%Y-%m"), "total": float(row.total), "type": row.type.value}
        )

    top_categories = (
        db.query(models.Transaction.category, func.sum(models.Transaction.amount).label("total"))
        .filter(models.Transaction.user_id == current_user.id, models.Transaction.type == models.TransactionType.expense)
        .group_by(models.Transaction.category)
        .order_by(func.sum(models.Transaction.amount).desc())
        .limit(5)
        .all()
    )
    top_categories_dict = [{"category": row.category, "total": float(row.total)} for row in top_categories]

    savings_rate = 0.0
    if total_income > 0:
        savings_rate = (total_income - total_expense) / total_income

    return schemas.AnalyticsSummary(
        total_income=total_income,
        total_expense=total_expense,
        balance=total_income - total_expense,
        monthly_trend=monthly_trend,
        top_categories=top_categories_dict,
        savings_rate=savings_rate,
        suggestions=_suggestions(total_income, total_expense, top_categories_dict),
    )
