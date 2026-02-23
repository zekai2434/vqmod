"""
All API routers combined
This file contains all the routes for the application
"""
from fastapi import APIRouter, HTTPException, Depends, status, UploadFile, File, BackgroundTasks
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
from jose import JWTError, jwt
from pydantic import BaseModel, Field, ConfigDict, EmailStr
import uuid
import os
import base64
import imaplib
import email as email_lib
from email.header import decode_header
from cryptography.fernet import Fernet
from enum import Enum

# Database
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()
SECRET_KEY = os.environ.get('SECRET_KEY', 'network-service-secret-key-change-in-production')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 480

# Email imports
try:
    import resend
    RESEND_AVAILABLE = True
except ImportError:
    RESEND_AVAILABLE = False

try:
    from netgsm import Netgsm
    NETGSM_AVAILABLE = True
except ImportError:
    NETGSM_AVAILABLE = False

# ==================== MODELS ====================

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    full_name: str
    role: str = "operator"
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserInDB(User):
    hashed_password: str

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: str = "operator"

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: User

class Customer(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    company: Optional[str] = None
    email: EmailStr
    phone: Optional[str] = None
    address: Optional[str] = None
    tax_number: Optional[str] = None
    tax_office: Optional[str] = None
    industry: Optional[str] = None
    size: Optional[str] = None
    source: Optional[str] = None
    status: str = "active"
    assigned_to: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CustomerCreate(BaseModel):
    name: str
    company: Optional[str] = None
    email: EmailStr
    phone: Optional[str] = None
    address: Optional[str] = None
    tax_number: Optional[str] = None
    tax_office: Optional[str] = None
    industry: Optional[str] = None
    size: Optional[str] = None
    source: Optional[str] = None

class Contact(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    customer_id: str
    name: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    role: Optional[str] = None
    is_primary: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ContactCreate(BaseModel):
    customer_id: str
    name: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    role: Optional[str] = None
    is_primary: bool = False

class Location(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    customer_id: str
    name: str
    address: Optional[str] = None
    city: Optional[str] = None
    country: str = "Turkey"
    is_primary: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class LocationCreate(BaseModel):
    customer_id: str
    name: str
    address: Optional[str] = None
    city: Optional[str] = None
    is_primary: bool = False

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
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    subcategory: Optional[str] = None
    asset_id: Optional[str] = None
    customer_id: Optional[str] = None
    channel: Optional[str] = None

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

# Parts Models
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

# RMA Model
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

# Contract Model
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

# Quote Models
class Quote(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    quote_number: str
    customer_id: str
    ticket_id: Optional[str] = None
    status: str = "draft"
    valid_until: Optional[str] = None
    items: List[Dict[str, Any]] = []
    subtotal: float = 0
    tax_total: float = 0
    discount_total: float = 0
    grand_total: float = 0
    notes: Optional[str] = None
    terms: Optional[str] = None
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class QuoteCreate(BaseModel):
    customer_id: str
    ticket_id: Optional[str] = None
    valid_until: Optional[str] = None
    items: List[Dict[str, Any]]
    notes: Optional[str] = None
    terms: Optional[str] = None

class QuoteUpdate(BaseModel):
    status: Optional[str] = None
    valid_until: Optional[str] = None
    items: Optional[List[Dict[str, Any]]] = None
    notes: Optional[str] = None
    terms: Optional[str] = None

# SLA Models
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

# Role Models
class Permission(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    description: Optional[str] = None
    module: str

class Role(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = None
    permissions: List[str] = []
    is_system: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class RoleCreate(BaseModel):
    name: str
    description: Optional[str] = None
    permissions: List[str] = []

class RoleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    permissions: Optional[List[str]] = None

# Asset History
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

# Notification Models
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

# Invoice Models
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

# Portal Models
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

# IMAP Models
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

# ==================== HELPER FUNCTIONS ====================

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "hashed_password": 0})
    if user is None:
        raise credentials_exception
    return User(**user)

async def get_current_portal_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        user_type: str = payload.get("type")
        if user_id is None or user_type != "portal":
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = await db.portal_users.find_one({"id": user_id}, {"_id": 0, "hashed_password": 0})
    if user is None:
        raise credentials_exception
    return CustomerPortalUser(**user)

# Create router
router = APIRouter()
