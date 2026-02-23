"""
RMA and Contract models
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime, timezone
import uuid

class RMA(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    rma_number: str
    asset_id: str
    customer_id: str
    ticket_id: Optional[str] = None
    issue_description: str
    status: str = "pending"
    vendor_rma_number: Optional[str] = None
    shipped_date: Optional[str] = None
    received_date: Optional[str] = None
    resolution: Optional[str] = None
    notes: Optional[str] = None
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class RMACreate(BaseModel):
    asset_id: str
    ticket_id: Optional[str] = None
    issue_description: str

class RMAUpdate(BaseModel):
    status: Optional[str] = None
    vendor_rma_number: Optional[str] = None
    shipped_date: Optional[str] = None
    received_date: Optional[str] = None
    resolution: Optional[str] = None
    notes: Optional[str] = None

class Contract(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    contract_number: str
    customer_id: str
    name: str
    description: Optional[str] = None
    contract_type: str = "maintenance"
    start_date: str
    end_date: str
    value: float = 0
    status: str = "active"
    auto_renew: bool = False
    terms: Optional[str] = None
    notes: Optional[str] = None
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ContractCreate(BaseModel):
    customer_id: str
    name: str
    description: Optional[str] = None
    contract_type: str = "maintenance"
    start_date: str
    end_date: str
    value: float = 0
    auto_renew: bool = False
    terms: Optional[str] = None
    notes: Optional[str] = None

class ContractUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    contract_type: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    value: Optional[float] = None
    status: Optional[str] = None
    auto_renew: Optional[bool] = None
    terms: Optional[str] = None
    notes: Optional[str] = None
