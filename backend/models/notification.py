"""
Notification models
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Dict, Any
from datetime import datetime, timezone
import uuid

class NotificationTemplate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    event_type: str
    channel: str
    subject: Optional[str] = None
    body: str
    variables: list = []
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class NotificationTemplateCreate(BaseModel):
    name: str
    event_type: str
    channel: str
    subject: Optional[str] = None
    body: str
    variables: list = []
    is_active: bool = True

class Notification(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    type: str
    title: str
    message: str
    data: Dict[str, Any] = {}
    is_read: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class NotificationCreate(BaseModel):
    user_id: str
    type: str
    title: str
    message: str
    data: Dict[str, Any] = {}

class NotificationSettings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    email_enabled: bool = True
    sms_enabled: bool = False
    push_enabled: bool = True
    notify_on_ticket_created: bool = True
    notify_on_ticket_assigned: bool = True
    notify_on_ticket_updated: bool = True
    notify_on_ticket_resolved: bool = True
    notify_on_sla_risk: bool = True
    notify_on_comment_mention: bool = True
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class NotificationSettingsUpdate(BaseModel):
    email_enabled: Optional[bool] = None
    sms_enabled: Optional[bool] = None
    push_enabled: Optional[bool] = None
    notify_on_ticket_created: Optional[bool] = None
    notify_on_ticket_assigned: Optional[bool] = None
    notify_on_ticket_updated: Optional[bool] = None
    notify_on_ticket_resolved: Optional[bool] = None
    notify_on_sla_risk: Optional[bool] = None
    notify_on_comment_mention: Optional[bool] = None
