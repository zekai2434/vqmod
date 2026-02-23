"""
Ticket models
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import uuid

class TicketComment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    ticket_id: str
    user_id: str
    user_name: str
    content: str
    is_internal: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TicketCommentCreate(BaseModel):
    content: str
    is_internal: bool = False

class Attachment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    related_to: str
    related_id: str
    filename: str
    file_type: str
    file_size: int
    file_data: Optional[str] = None
    uploaded_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AttachmentCreate(BaseModel):
    related_to: str
    related_id: str
    filename: str
    file_type: str
    file_size: int
    file_data: str

class Ticket(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    ticket_number: str
    customer_id: str
    asset_id: Optional[str] = None
    title: str
    description: str
    category: str
    subcategory: Optional[str] = None
    priority: str = "medium"
    status: str = "open"
    channel: str = "web"
    assigned_to: Optional[str] = None
    sla_profile_id: Optional[str] = None
    sla_deadline: Optional[datetime] = None
    first_response_at: Optional[datetime] = None
    on_hold_reason: Optional[str] = None
    is_out_of_scope: bool = False
    out_of_scope_reason: Optional[str] = None
    resolution: Optional[str] = None
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    resolved_at: Optional[datetime] = None

class TicketCreate(BaseModel):
    customer_id: str
    asset_id: Optional[str] = None
    title: str
    description: str
    category: str
    subcategory: Optional[str] = None
    priority: str = "medium"
    channel: str = "web"
    assigned_to: Optional[str] = None
    sla_profile_id: Optional[str] = None

class TicketUpdate(BaseModel):
    status: Optional[str] = None
    assigned_to: Optional[str] = None
    priority: Optional[str] = None
    sla_profile_id: Optional[str] = None
    on_hold_reason: Optional[str] = None
    is_out_of_scope: Optional[bool] = None
    out_of_scope_reason: Optional[str] = None
    # Extended fields for full ticket editing
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    subcategory: Optional[str] = None
    asset_id: Optional[str] = None
    customer_id: Optional[str] = None
    channel: Optional[str] = None
