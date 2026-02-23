"""
Asset models
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime, timezone
import uuid

class Asset(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    customer_id: str
    location_id: Optional[str] = None
    serial_number: str
    device_type: str
    brand: str
    model: str
    hostname: Optional[str] = None
    ip_address: Optional[str] = None
    location: Optional[str] = None
    purchase_date: Optional[str] = None
    warranty_end: Optional[str] = None
    support_end: Optional[str] = None
    support_contract_id: Optional[str] = None
    firmware_version: Optional[str] = None
    configuration: Optional[str] = None
    status: str = "active"
    is_spare: bool = False
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AssetCreate(BaseModel):
    customer_id: str
    location_id: Optional[str] = None
    serial_number: str
    device_type: str
    brand: str
    model: str
    hostname: Optional[str] = None
    ip_address: Optional[str] = None
    location: Optional[str] = None
    purchase_date: Optional[str] = None
    warranty_end: Optional[str] = None
    support_end: Optional[str] = None
    support_contract_id: Optional[str] = None
    firmware_version: Optional[str] = None
    configuration: Optional[str] = None
    is_spare: bool = False
    notes: Optional[str] = None

class AssetUpdate(BaseModel):
    customer_id: Optional[str] = None
    serial_number: Optional[str] = None
    device_type: Optional[str] = None
    brand: Optional[str] = None
    model: Optional[str] = None
    location_id: Optional[str] = None
    hostname: Optional[str] = None
    ip_address: Optional[str] = None
    location: Optional[str] = None
    purchase_date: Optional[str] = None
    warranty_end: Optional[str] = None
    support_end: Optional[str] = None
    support_contract_id: Optional[str] = None
    firmware_version: Optional[str] = None
    configuration: Optional[str] = None
    status: Optional[str] = None
    is_spare: Optional[bool] = None
    notes: Optional[str] = None

class AssetHistory(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    asset_id: str
    event_type: str
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    changed_by: str
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
