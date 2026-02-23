"""
SLA (Service Level Agreement) models
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Dict, Any
from datetime import datetime, timezone
import uuid

class SLAProfile(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = None
    priority: str
    response_time_hours: int
    resolution_time_hours: int
    business_hours_only: bool = True
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SLAProfileCreate(BaseModel):
    name: str
    description: Optional[str] = None
    priority: str
    response_time_hours: int
    resolution_time_hours: int
    business_hours_only: bool = True

class SLAProfileUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    response_time_hours: Optional[int] = None
    resolution_time_hours: Optional[int] = None
    business_hours_only: Optional[bool] = None
    is_active: Optional[bool] = None

class BusinessHours(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    timezone: str = "Europe/Istanbul"
    monday: Dict[str, Any] = {"enabled": True, "start": "09:00", "end": "18:00"}
    tuesday: Dict[str, Any] = {"enabled": True, "start": "09:00", "end": "18:00"}
    wednesday: Dict[str, Any] = {"enabled": True, "start": "09:00", "end": "18:00"}
    thursday: Dict[str, Any] = {"enabled": True, "start": "09:00", "end": "18:00"}
    friday: Dict[str, Any] = {"enabled": True, "start": "09:00", "end": "18:00"}
    saturday: Dict[str, Any] = {"enabled": False, "start": "09:00", "end": "18:00"}
    sunday: Dict[str, Any] = {"enabled": False, "start": "09:00", "end": "18:00"}
    holidays: list = []
    is_default: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class BusinessHoursCreate(BaseModel):
    name: str
    timezone: str = "Europe/Istanbul"
    monday: Dict[str, Any] = {"enabled": True, "start": "09:00", "end": "18:00"}
    tuesday: Dict[str, Any] = {"enabled": True, "start": "09:00", "end": "18:00"}
    wednesday: Dict[str, Any] = {"enabled": True, "start": "09:00", "end": "18:00"}
    thursday: Dict[str, Any] = {"enabled": True, "start": "09:00", "end": "18:00"}
    friday: Dict[str, Any] = {"enabled": True, "start": "09:00", "end": "18:00"}
    saturday: Dict[str, Any] = {"enabled": False, "start": "09:00", "end": "18:00"}
    sunday: Dict[str, Any] = {"enabled": False, "start": "09:00", "end": "18:00"}
    holidays: list = []
    is_default: bool = False

class BusinessHoursUpdate(BaseModel):
    name: Optional[str] = None
    timezone: Optional[str] = None
    monday: Optional[Dict[str, Any]] = None
    tuesday: Optional[Dict[str, Any]] = None
    wednesday: Optional[Dict[str, Any]] = None
    thursday: Optional[Dict[str, Any]] = None
    friday: Optional[Dict[str, Any]] = None
    saturday: Optional[Dict[str, Any]] = None
    sunday: Optional[Dict[str, Any]] = None
    holidays: Optional[list] = None
    is_default: Optional[bool] = None

class SLAPause(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    ticket_id: str
    reason: str
    paused_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    resumed_at: Optional[datetime] = None
    paused_by: str
