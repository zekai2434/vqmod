"""
Invoice, Ledger and Payment models
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from enum import Enum
import uuid

# ========== CARİ (LEDGER) MODELS ==========
class LedgerEntryType(str, Enum):
    INVOICE = "invoice"
    PAYMENT = "payment"
    REFUND = "refund"
    OPENING = "opening"

class LedgerEntry(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    customer_id: str
    entry_type: str
    reference_id: Optional[str] = None
    reference_number: Optional[str] = None
    description: str
    debit: float = 0
    credit: float = 0
    balance: float = 0
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class LedgerEntryCreate(BaseModel):
    customer_id: str
    entry_type: str
    description: str
    debit: float = 0
    credit: float = 0

# ========== FATURA (INVOICE) MODELS ==========
class InvoiceStatus(str, Enum):
    DRAFT = "draft"
    PENDING = "pending"
    PAID = "paid"
    PARTIAL = "partial"
    CANCELLED = "cancelled"
    OVERDUE = "overdue"

class InvoiceItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    description: str
    quantity: float = 1
    unit_price: float
    tax_rate: float = 20
    discount: float = 0
    total: float = 0

class Invoice(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    invoice_number: str
    customer_id: str
    work_order_id: Optional[str] = None
    ticket_id: Optional[str] = None
    status: str = "draft"
    items: List[Dict[str, Any]] = []
    subtotal: float = 0
    tax_total: float = 0
    discount_total: float = 0
    grand_total: float = 0
    paid_amount: float = 0
    due_date: Optional[str] = None
    notes: Optional[str] = None
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class InvoiceCreate(BaseModel):
    customer_id: str
    work_order_id: Optional[str] = None
    ticket_id: Optional[str] = None
    items: List[Dict[str, Any]]
    due_date: Optional[str] = None
    notes: Optional[str] = None

class InvoiceUpdate(BaseModel):
    status: Optional[str] = None
    items: Optional[List[Dict[str, Any]]] = None
    due_date: Optional[str] = None
    notes: Optional[str] = None
    paid_amount: Optional[float] = None

# ========== ÖDEME (PAYMENT) MODELS ==========
class PaymentMethod(str, Enum):
    CASH = "cash"
    BANK_TRANSFER = "bank_transfer"
    CREDIT_CARD = "credit_card"
    IYZICO = "iyzico"

class PaymentStatus(str, Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"
    REFUNDED = "refunded"

class Payment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    payment_number: str
    customer_id: str
    invoice_id: Optional[str] = None
    amount: float
    payment_method: str = "cash"
    status: str = "completed"
    iyzico_payment_id: Optional[str] = None
    iyzico_conversation_id: Optional[str] = None
    notes: Optional[str] = None
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PaymentCreate(BaseModel):
    customer_id: str
    invoice_id: Optional[str] = None
    amount: float
    payment_method: str = "cash"
    notes: Optional[str] = None
