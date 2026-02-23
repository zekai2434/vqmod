"""
Parts/Inventory models
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime, timezone
import uuid

class Part(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    part_number: str
    name: str
    description: Optional[str] = None
    category: str
    brand: Optional[str] = None
    model: Optional[str] = None
    unit: str = "piece"
    quantity: int = 0
    min_quantity: int = 0
    max_quantity: Optional[int] = None
    unit_cost: float = 0
    unit_price: float = 0
    location: Optional[str] = None
    is_serialized: bool = False
    warranty_months: Optional[int] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PartCreate(BaseModel):
    part_number: str
    name: str
    description: Optional[str] = None
    category: str
    brand: Optional[str] = None
    model: Optional[str] = None
    unit: str = "piece"
    quantity: int = 0
    min_quantity: int = 0
    max_quantity: Optional[int] = None
    unit_cost: float = 0
    unit_price: float = 0
    location: Optional[str] = None
    is_serialized: bool = False
    warranty_months: Optional[int] = None

class PartUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    brand: Optional[str] = None
    model: Optional[str] = None
    unit: Optional[str] = None
    quantity: Optional[int] = None
    min_quantity: Optional[int] = None
    max_quantity: Optional[int] = None
    unit_cost: Optional[float] = None
    unit_price: Optional[float] = None
    location: Optional[str] = None
    is_serialized: Optional[bool] = None
    warranty_months: Optional[int] = None
    is_active: Optional[bool] = None

class SerializedPart(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    part_id: str
    serial_number: str
    status: str = "in_stock"
    location: Optional[str] = None
    purchase_date: Optional[str] = None
    warranty_end: Optional[str] = None
    assigned_to_asset: Optional[str] = None
    assigned_to_customer: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SerializedPartCreate(BaseModel):
    part_id: str
    serial_number: str
    location: Optional[str] = None
    purchase_date: Optional[str] = None
    warranty_end: Optional[str] = None
    notes: Optional[str] = None

class StockMovement(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    part_id: str
    movement_type: str
    quantity: int
    serial_numbers: List[str] = []
    reference_type: Optional[str] = None
    reference_id: Optional[str] = None
    from_location: Optional[str] = None
    to_location: Optional[str] = None
    unit_cost: Optional[float] = None
    notes: Optional[str] = None
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StockMovementCreate(BaseModel):
    part_id: str
    movement_type: str
    quantity: int
    serial_numbers: List[str] = []
    reference_type: Optional[str] = None
    reference_id: Optional[str] = None
    from_location: Optional[str] = None
    to_location: Optional[str] = None
    unit_cost: Optional[float] = None
    notes: Optional[str] = None

class PartReservation(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    part_id: str
    work_order_id: str
    quantity: int
    serial_numbers: List[str] = []
    status: str = "reserved"
    reserved_by: str
    reserved_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    used_at: Optional[datetime] = None
    cancelled_at: Optional[datetime] = None

class PartReservationCreate(BaseModel):
    part_id: str
    work_order_id: str
    quantity: int
    serial_numbers: List[str] = []

class PartUsage(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    part_id: str
    work_order_id: str
    quantity: int
    serial_numbers: List[str] = []
    unit_price: float
    total_price: float
    notes: Optional[str] = None
    used_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PartUsageCreate(BaseModel):
    part_id: str
    work_order_id: str
    quantity: int
    serial_numbers: List[str] = []
    notes: Optional[str] = None

class PartReturn(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    part_usage_id: str
    part_id: str
    work_order_id: str
    quantity: int
    serial_numbers: List[str] = []
    reason: str
    condition: str
    notes: Optional[str] = None
    returned_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PartReturnCreate(BaseModel):
    part_usage_id: str
    quantity: int
    serial_numbers: List[str] = []
    reason: str
    condition: str
    notes: Optional[str] = None
