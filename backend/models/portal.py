"""
Portal user models
"""
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import Optional
from datetime import datetime, timezone
import uuid

class CustomerPortalUser(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    customer_id: str
    email: EmailStr
    full_name: str
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CustomerPortalUserInDB(CustomerPortalUser):
    hashed_password: str

class CustomerPortalUserCreate(BaseModel):
    customer_id: str
    email: EmailStr
    password: str
    full_name: str

class CustomerPortalLogin(BaseModel):
    email: EmailStr
    password: str

class CustomerPortalToken(BaseModel):
    access_token: str
    token_type: str
    user: CustomerPortalUser

class CustomerPortalTicketCreate(BaseModel):
    asset_id: Optional[str] = None
    title: str
    description: str
    category: str
    priority: str = "medium"
