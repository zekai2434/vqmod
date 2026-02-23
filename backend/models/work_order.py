"""
Work Order models
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import uuid

class WorkOrderChecklistItem(BaseModel):
    task: str
    completed: bool = False
    notes: Optional[str] = None

class WorkOrder(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    work_order_number: str
    ticket_id: str
    work_type: str
    assigned_technician: str
    scheduled_date: str
    scheduled_time: Optional[str] = None
    status: str = "scheduled"
    checklist: List[Dict[str, Any]] = []
    notes: Optional[str] = None
    parts_used: List[Dict[str, Any]] = []
    labor_hours: float = 0
    completion_notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    completed_at: Optional[datetime] = None

class WorkOrderCreate(BaseModel):
    ticket_id: str
    work_type: str
    assigned_technician: str
    scheduled_date: str
    scheduled_time: Optional[str] = None
    notes: Optional[str] = None

class WorkOrderUpdate(BaseModel):
    status: Optional[str] = None
    scheduled_date: Optional[str] = None
    scheduled_time: Optional[str] = None
    notes: Optional[str] = None
    completion_notes: Optional[str] = None
    labor_hours: Optional[float] = None
