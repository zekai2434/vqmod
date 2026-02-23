"""
Quote models
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import uuid

class QuoteItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    description: str
    quantity: float = 1
    unit_price: float
    tax_rate: float = 20
    discount: float = 0
    total: float = 0

class Quote(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    quote_number: str
    customer_id: str
    ticket_id: Optional[str] = None
    status: str = "draft"
    valid_until: Optional[str] = None
    items: List[Dict[str, Any]] = []
    subtotal: float = 0
    tax_total: float = 0
    discount_total: float = 0
    grand_total: float = 0
    notes: Optional[str] = None
    terms: Optional[str] = None
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class QuoteCreate(BaseModel):
    customer_id: str
    ticket_id: Optional[str] = None
    valid_until: Optional[str] = None
    items: List[Dict[str, Any]]
    notes: Optional[str] = None
    terms: Optional[str] = None

class QuoteUpdate(BaseModel):
    status: Optional[str] = None
    valid_until: Optional[str] = None
    items: Optional[List[Dict[str, Any]]] = None
    notes: Optional[str] = None
    terms: Optional[str] = None
