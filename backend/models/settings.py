"""
System Settings and IMAP models
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime, timezone
import uuid

class SystemSettings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = "system_settings"
    company_name: str = "Network Service"
    company_address: Optional[str] = None
    company_phone: Optional[str] = None
    company_email: Optional[str] = None
    logo_url: Optional[str] = None
    logo_dark_url: Optional[str] = None
    favicon_url: Optional[str] = None
    portal_logo_url: Optional[str] = None
    primary_color: str = "#3B82F6"
    theme: str = "light"
    default_language: str = "tr"
    date_format: str = "DD/MM/YYYY"
    time_format: str = "24h"
    timezone: str = "Europe/Istanbul"
    # Email settings
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = None
    smtp_user: Optional[str] = None
    smtp_password: Optional[str] = None
    smtp_from_email: Optional[str] = None
    smtp_from_name: Optional[str] = None
    resend_api_key: Optional[str] = None
    # SMS settings
    netgsm_username: Optional[str] = None
    netgsm_password: Optional[str] = None
    netgsm_header: Optional[str] = None
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class IMAPConfig(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    host: str
    port: int = 993
    username: str
    password: str
    use_ssl: bool = True
    folder: str = "INBOX"
    is_active: bool = True
    auto_create_tickets: bool = True
    default_category: str = "email"
    default_priority: str = "medium"
    last_check: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class IMAPConfigCreate(BaseModel):
    name: str
    host: str
    port: int = 993
    username: str
    password: str
    use_ssl: bool = True
    folder: str = "INBOX"
    auto_create_tickets: bool = True
    default_category: str = "email"
    default_priority: str = "medium"

class IMAPConfigUpdate(BaseModel):
    name: Optional[str] = None
    host: Optional[str] = None
    port: Optional[int] = None
    username: Optional[str] = None
    password: Optional[str] = None
    use_ssl: Optional[bool] = None
    folder: Optional[str] = None
    is_active: Optional[bool] = None
    auto_create_tickets: Optional[bool] = None
    default_category: Optional[str] = None
    default_priority: Optional[str] = None
