from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, EmailStr, Field

from .models import TransactionType


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    email: Optional[str] = None


class UserBase(BaseModel):
    email: EmailStr
    full_name: str


class UserCreate(UserBase):
    password: str = Field(min_length=8)


class UserRead(UserBase):
    id: int
    is_admin: bool
    created_at: datetime

    class Config:
        orm_mode = True


class TransactionBase(BaseModel):
    type: TransactionType
    amount: float
    category: str = "general"
    note: Optional[str] = None
    occurred_at: datetime = Field(default_factory=datetime.utcnow)


class TransactionCreate(TransactionBase):
    pass


class TransactionRead(TransactionBase):
    id: int
    created_at: datetime

    class Config:
        orm_mode = True


class AnalyticsSummary(BaseModel):
    total_income: float
    total_expense: float
    balance: float
    monthly_trend: List[dict]
    top_categories: List[dict]
    savings_rate: float
    suggestions: List[str]
