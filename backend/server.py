from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File, BackgroundTasks
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import asyncio
import re
import imaplib
import email as email_lib
from email.header import decode_header
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any, Tuple
import uuid
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
from jose import JWTError, jwt
import base64
from cryptography.fernet import Fernet

# Email and SMS imports
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

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

SECRET_KEY = os.environ.get('SECRET_KEY', 'network-service-secret-key-change-in-production')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 480

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

class Contact(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    customer_id: str
    name: str
    title: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    is_primary: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ContactCreate(BaseModel):
    customer_id: str
    name: str
    title: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    is_primary: bool = False

class Location(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    customer_id: str
    name: str
    address: str
    city: Optional[str] = None
    parent_location_id: Optional[str] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class LocationCreate(BaseModel):
    customer_id: str
    name: str
    address: str
    city: Optional[str] = None
    parent_location_id: Optional[str] = None

class Customer(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    company: Optional[str] = None
    email: EmailStr
    phone: str
    address: Optional[str] = None
    tax_number: Optional[str] = None
    tax_office: Optional[str] = None
    contract_type: Optional[str] = "standard"
    sla_level: str = "standard"
    tags: List[str] = []
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CustomerCreate(BaseModel):
    name: str
    company: Optional[str] = None
    email: EmailStr
    phone: str
    address: Optional[str] = None
    tax_number: Optional[str] = None
    tax_office: Optional[str] = None
    contract_type: Optional[str] = "standard"
    sla_level: str = "standard"
    tags: List[str] = []
    notes: Optional[str] = None

class Asset(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    customer_id: str
    location_id: Optional[str] = None
    serial_number: str
    device_type: str
    brand: str
    model: str
    mac_address: Optional[str] = None
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
    mac_address: Optional[str] = None
    hostname: Optional[str] = None
    ip_address: Optional[str] = None
    location: Optional[str] = None
    purchase_date: Optional[str] = None
    warranty_end: Optional[str] = None
    support_end: Optional[str] = None
    support_contract_id: Optional[str] = None
    firmware_version: Optional[str] = None
    is_spare: bool = False
    notes: Optional[str] = None

class AssetUpdate(BaseModel):
    location_id: Optional[str] = None
    hostname: Optional[str] = None
    ip_address: Optional[str] = None
    location: Optional[str] = None
    warranty_end: Optional[str] = None
    support_end: Optional[str] = None
    support_contract_id: Optional[str] = None
    firmware_version: Optional[str] = None
    configuration: Optional[str] = None
    status: Optional[str] = None
    is_spare: Optional[bool] = None
    notes: Optional[str] = None

class TicketComment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    ticket_id: str
    user_id: str
    user_name: str
    comment: str
    is_internal: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TicketCommentCreate(BaseModel):
    ticket_id: str
    comment: str
    is_internal: bool = False

class Attachment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    related_to: str
    related_id: str
    filename: str
    file_type: str
    file_size: int
    file_data: str
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
    priority: str
    status: str = "open"
    channel: str = "phone"
    assigned_to: Optional[str] = None
    sla_profile_id: Optional[str] = None
    sla_deadline: Optional[datetime] = None
    sla_response_deadline: Optional[datetime] = None
    first_response_at: Optional[datetime] = None
    sla_paused: bool = False
    sla_pause_reason: Optional[str] = None
    total_pause_minutes: int = 0
    on_hold_reason: Optional[str] = None
    is_out_of_scope: bool = False
    out_of_scope_reason: Optional[str] = None
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
    priority: str
    channel: str = "phone"
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

class WorkOrderChecklistItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    task: str
    completed: bool = False
    completed_at: Optional[datetime] = None

class WorkOrder(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    ticket_id: str
    assigned_technician: str
    work_type: str = "onsite"
    scheduled_date: Optional[str] = None
    status: str = "scheduled"
    notes: Optional[str] = None
    service_report: Optional[str] = None
    parts_used: List[Dict[str, Any]] = []
    checklist: List[WorkOrderChecklistItem] = []
    time_spent_minutes: int = 0
    customer_signature: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    completed_at: Optional[datetime] = None

class WorkOrderCreate(BaseModel):
    ticket_id: str
    assigned_technician: str
    work_type: str = "onsite"
    scheduled_date: Optional[str] = None
    notes: Optional[str] = None
    checklist: List[WorkOrderChecklistItem] = []

class WorkOrderUpdate(BaseModel):
    status: Optional[str] = None
    service_report: Optional[str] = None
    time_spent_minutes: Optional[int] = None
    customer_signature: Optional[str] = None
    checklist: Optional[List[WorkOrderChecklistItem]] = None

class PartReservation(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    part_id: str
    work_order_id: str
    quantity: int
    status: str = "reserved"
    serial_numbers: List[str] = []
    reserved_by: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    used_at: Optional[datetime] = None
    cancelled_at: Optional[datetime] = None

class PartReservationCreate(BaseModel):
    part_id: str
    work_order_id: str
    quantity: int
    serial_numbers: List[str] = []

class Part(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    part_number: str
    name: str
    category: str
    description: Optional[str] = None
    brand: Optional[str] = None
    model: Optional[str] = None
    quantity: int = 0
    reserved_quantity: int = 0
    min_stock: int = 5
    max_stock: Optional[int] = None
    unit_price: float = 0.0
    currency: str = "TRY"
    supplier: Optional[str] = None
    supplier_part_number: Optional[str] = None
    location: Optional[str] = None
    shelf: Optional[str] = None
    has_serial: bool = False
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PartCreate(BaseModel):
    part_number: str
    name: str
    category: str
    description: Optional[str] = None
    brand: Optional[str] = None
    model: Optional[str] = None
    quantity: int = 0
    min_stock: int = 5
    max_stock: Optional[int] = None
    unit_price: float = 0.0
    currency: str = "TRY"
    supplier: Optional[str] = None
    supplier_part_number: Optional[str] = None
    location: Optional[str] = None
    shelf: Optional[str] = None
    has_serial: bool = False

class PartUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    brand: Optional[str] = None
    model: Optional[str] = None
    min_stock: Optional[int] = None
    max_stock: Optional[int] = None
    unit_price: Optional[float] = None
    currency: Optional[str] = None
    supplier: Optional[str] = None
    supplier_part_number: Optional[str] = None
    location: Optional[str] = None
    shelf: Optional[str] = None
    is_active: Optional[bool] = None

class SerializedPart(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    part_id: str
    serial_number: str
    status: str = "in_stock"
    condition: str = "new"
    purchase_date: Optional[str] = None
    warranty_end: Optional[str] = None
    supplier: Optional[str] = None
    purchase_price: Optional[float] = None
    notes: Optional[str] = None
    current_location: Optional[str] = None
    assigned_to_work_order: Optional[str] = None
    assigned_to_asset: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SerializedPartCreate(BaseModel):
    part_id: str
    serial_number: str
    condition: str = "new"
    purchase_date: Optional[str] = None
    warranty_end: Optional[str] = None
    supplier: Optional[str] = None
    purchase_price: Optional[float] = None
    notes: Optional[str] = None
    current_location: Optional[str] = None

class StockMovement(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    part_id: str
    movement_type: str
    quantity: int
    serial_numbers: List[str] = []
    reference_type: Optional[str] = None
    reference_id: Optional[str] = None
    reason: Optional[str] = None
    notes: Optional[str] = None
    unit_cost: Optional[float] = None
    supplier: Optional[str] = None
    invoice_number: Optional[str] = None
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StockMovementCreate(BaseModel):
    part_id: str
    movement_type: str
    quantity: int
    serial_numbers: List[str] = []
    reference_type: Optional[str] = None
    reference_id: Optional[str] = None
    reason: Optional[str] = None
    notes: Optional[str] = None
    unit_cost: Optional[float] = None
    supplier: Optional[str] = None
    invoice_number: Optional[str] = None

class PartUsage(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    part_id: str
    work_order_id: str
    ticket_id: str
    quantity: int
    serial_numbers: List[str] = []
    usage_type: str = "consumed"
    return_reason: Optional[str] = None
    condition_on_return: Optional[str] = None
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PartUsageCreate(BaseModel):
    part_id: str
    work_order_id: str
    quantity: int
    serial_numbers: List[str] = []
    usage_type: str = "consumed"

class PartReturn(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    part_id: str
    work_order_id: Optional[str] = None
    quantity: int
    serial_numbers: List[str] = []
    return_type: str = "return_to_stock"
    condition: str = "good"
    reason: Optional[str] = None
    notes: Optional[str] = None
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PartReturnCreate(BaseModel):
    part_id: str
    work_order_id: Optional[str] = None
    quantity: int
    serial_numbers: List[str] = []
    return_type: str = "return_to_stock"
    condition: str = "good"
    reason: Optional[str] = None
    notes: Optional[str] = None

class RMA(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    rma_number: str
    asset_id: str
    ticket_id: Optional[str] = None
    status: str = "pending"
    reason: str
    manufacturer: Optional[str] = None
    manufacturer_rma_number: Optional[str] = None
    tracking_number: Optional[str] = None
    replacement_serial: Optional[str] = None
    swap_device_id: Optional[str] = None
    sent_date: Optional[datetime] = None
    received_date: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    completed_at: Optional[datetime] = None

class RMACreate(BaseModel):
    asset_id: str
    ticket_id: Optional[str] = None
    reason: str
    manufacturer: Optional[str] = None

class RMAUpdate(BaseModel):
    status: Optional[str] = None
    manufacturer_rma_number: Optional[str] = None
    tracking_number: Optional[str] = None
    replacement_serial: Optional[str] = None
    swap_device_id: Optional[str] = None
    sent_date: Optional[str] = None
    received_date: Optional[str] = None
    notes: Optional[str] = None

# SLA Profile Models
class SLAProfile(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    code: str  # P1, P2, P3, P4
    description: Optional[str] = None
    response_time_hours: int  # İlk yanıt süresi
    resolution_time_hours: int  # Çözüm süresi
    is_default: bool = False
    is_active: bool = True
    color: str = "#3b82f6"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SLAProfileCreate(BaseModel):
    name: str
    code: str
    description: Optional[str] = None
    response_time_hours: int
    resolution_time_hours: int
    is_default: bool = False
    color: str = "#3b82f6"

class SLAProfileUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    response_time_hours: Optional[int] = None
    resolution_time_hours: Optional[int] = None
    is_default: Optional[bool] = None
    is_active: Optional[bool] = None
    color: Optional[str] = None

# Business Hours Calendar
class BusinessHours(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = None
    timezone: str = "Europe/Istanbul"
    monday: Dict[str, Any] = {"start": "09:00", "end": "18:00", "enabled": True}
    tuesday: Dict[str, Any] = {"start": "09:00", "end": "18:00", "enabled": True}
    wednesday: Dict[str, Any] = {"start": "09:00", "end": "18:00", "enabled": True}
    thursday: Dict[str, Any] = {"start": "09:00", "end": "18:00", "enabled": True}
    friday: Dict[str, Any] = {"start": "09:00", "end": "18:00", "enabled": True}
    saturday: Dict[str, Any] = {"start": "09:00", "end": "13:00", "enabled": False}
    sunday: Dict[str, Any] = {"start": "00:00", "end": "00:00", "enabled": False}
    holidays: List[str] = []  # ["2025-01-01", "2025-04-23"]
    is_default: bool = False
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class BusinessHoursCreate(BaseModel):
    name: str
    description: Optional[str] = None
    timezone: str = "Europe/Istanbul"
    monday: Dict[str, Any] = {"start": "09:00", "end": "18:00", "enabled": True}
    tuesday: Dict[str, Any] = {"start": "09:00", "end": "18:00", "enabled": True}
    wednesday: Dict[str, Any] = {"start": "09:00", "end": "18:00", "enabled": True}
    thursday: Dict[str, Any] = {"start": "09:00", "end": "18:00", "enabled": True}
    friday: Dict[str, Any] = {"start": "09:00", "end": "18:00", "enabled": True}
    saturday: Dict[str, Any] = {"start": "09:00", "end": "13:00", "enabled": False}
    sunday: Dict[str, Any] = {"start": "00:00", "end": "00:00", "enabled": False}
    holidays: List[str] = []
    is_default: bool = False

class BusinessHoursUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    timezone: Optional[str] = None
    monday: Optional[Dict[str, Any]] = None
    tuesday: Optional[Dict[str, Any]] = None
    wednesday: Optional[Dict[str, Any]] = None
    thursday: Optional[Dict[str, Any]] = None
    friday: Optional[Dict[str, Any]] = None
    saturday: Optional[Dict[str, Any]] = None
    sunday: Optional[Dict[str, Any]] = None
    holidays: Optional[List[str]] = None
    is_default: Optional[bool] = None
    is_active: Optional[bool] = None

# SLA Timer Pause/Resume
class SLAPause(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    ticket_id: str
    reason: str  # waiting_for_customer, waiting_for_parts, etc.
    paused_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    resumed_at: Optional[datetime] = None
    paused_by: str
    resumed_by: Optional[str] = None
    pause_duration_minutes: Optional[int] = None

# Role & Permission Models
class Permission(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    code: str
    name: str
    description: Optional[str] = None
    module: str  # tickets, customers, assets, etc.

class Role(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    code: str  # admin, manager, technician, viewer
    description: Optional[str] = None
    permissions: List[str] = []  # List of permission codes
    is_system: bool = False  # System roles can't be deleted
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class RoleCreate(BaseModel):
    name: str
    code: str
    description: Optional[str] = None
    permissions: List[str] = []

class RoleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    permissions: Optional[List[str]] = None
    is_active: Optional[bool] = None

# Asset History for tracking
class AssetHistory(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    asset_id: str
    event_type: str  # ticket_opened, maintenance, part_changed, rma, location_change
    event_description: str
    reference_type: Optional[str] = None  # ticket, work_order, rma
    reference_id: Optional[str] = None
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Default Permissions
DEFAULT_PERMISSIONS = [
    {"code": "tickets.view", "name": "Ticket Görüntüleme", "module": "tickets"},
    {"code": "tickets.create", "name": "Ticket Oluşturma", "module": "tickets"},
    {"code": "tickets.edit", "name": "Ticket Düzenleme", "module": "tickets"},
    {"code": "tickets.delete", "name": "Ticket Silme", "module": "tickets"},
    {"code": "tickets.assign", "name": "Ticket Atama", "module": "tickets"},
    {"code": "customers.view", "name": "Müşteri Görüntüleme", "module": "customers"},
    {"code": "customers.create", "name": "Müşteri Oluşturma", "module": "customers"},
    {"code": "customers.edit", "name": "Müşteri Düzenleme", "module": "customers"},
    {"code": "customers.delete", "name": "Müşteri Silme", "module": "customers"},
    {"code": "assets.view", "name": "Cihaz Görüntüleme", "module": "assets"},
    {"code": "assets.create", "name": "Cihaz Oluşturma", "module": "assets"},
    {"code": "assets.edit", "name": "Cihaz Düzenleme", "module": "assets"},
    {"code": "assets.delete", "name": "Cihaz Silme", "module": "assets"},
    {"code": "work_orders.view", "name": "İş Emri Görüntüleme", "module": "work_orders"},
    {"code": "work_orders.create", "name": "İş Emri Oluşturma", "module": "work_orders"},
    {"code": "work_orders.edit", "name": "İş Emri Düzenleme", "module": "work_orders"},
    {"code": "parts.view", "name": "Parça Görüntüleme", "module": "parts"},
    {"code": "parts.create", "name": "Parça Oluşturma", "module": "parts"},
    {"code": "parts.edit", "name": "Parça Düzenleme", "module": "parts"},
    {"code": "parts.stock", "name": "Stok Yönetimi", "module": "parts"},
    {"code": "rma.view", "name": "RMA Görüntüleme", "module": "rma"},
    {"code": "rma.create", "name": "RMA Oluşturma", "module": "rma"},
    {"code": "rma.edit", "name": "RMA Düzenleme", "module": "rma"},
    {"code": "reports.view", "name": "Rapor Görüntüleme", "module": "reports"},
    {"code": "settings.view", "name": "Ayarlar Görüntüleme", "module": "settings"},
    {"code": "settings.edit", "name": "Ayarlar Düzenleme", "module": "settings"},
    {"code": "users.view", "name": "Kullanıcı Görüntüleme", "module": "users"},
    {"code": "users.create", "name": "Kullanıcı Oluşturma", "module": "users"},
    {"code": "users.edit", "name": "Kullanıcı Düzenleme", "module": "users"},
]

# Default Roles
DEFAULT_ROLES = [
    {
        "name": "Sistem Yöneticisi",
        "code": "admin",
        "description": "Tüm yetkilere sahip sistem yöneticisi",
        "permissions": [p["code"] for p in DEFAULT_PERMISSIONS],
        "is_system": True
    },
    {
        "name": "Servis Müdürü",
        "code": "manager",
        "description": "Operasyonel yönetim yetkilerine sahip",
        "permissions": [
            "tickets.view", "tickets.create", "tickets.edit", "tickets.assign",
            "customers.view", "customers.create", "customers.edit",
            "assets.view", "assets.create", "assets.edit",
            "work_orders.view", "work_orders.create", "work_orders.edit",
            "parts.view", "parts.create", "parts.edit", "parts.stock",
            "rma.view", "rma.create", "rma.edit",
            "reports.view", "users.view"
        ],
        "is_system": True
    },
    {
        "name": "Teknisyen",
        "code": "technician",
        "description": "Saha servis teknisyeni",
        "permissions": [
            "tickets.view", "tickets.create", "tickets.edit",
            "customers.view",
            "assets.view",
            "work_orders.view", "work_orders.edit",
            "parts.view", "parts.stock",
            "rma.view"
        ],
        "is_system": True
    },
    {
        "name": "İzleyici",
        "code": "viewer",
        "description": "Sadece görüntüleme yetkisi",
        "permissions": [
            "tickets.view", "customers.view", "assets.view",
            "work_orders.view", "parts.view", "rma.view", "reports.view"
        ],
        "is_system": True
    }
]
class NotificationTemplate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    event_type: str
    subject_template: str
    body_template: str
    sms_template: Optional[str] = None
    is_active: bool = True
    channels: List[str] = ["email"]
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class NotificationTemplateCreate(BaseModel):
    name: str
    event_type: str
    subject_template: str
    body_template: str
    sms_template: Optional[str] = None
    channels: List[str] = ["email"]

class Notification(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    recipient_id: Optional[str] = None
    recipient_email: Optional[EmailStr] = None
    recipient_phone: Optional[str] = None
    notification_type: str
    channel: str
    subject: Optional[str] = None
    content: str
    reference_type: Optional[str] = None
    reference_id: Optional[str] = None
    status: str = "pending"
    sent_at: Optional[datetime] = None
    error_message: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class NotificationCreate(BaseModel):
    recipient_id: Optional[str] = None
    recipient_email: Optional[EmailStr] = None
    recipient_phone: Optional[str] = None
    notification_type: str
    channel: str = "email"
    subject: Optional[str] = None
    content: str
    reference_type: Optional[str] = None
    reference_id: Optional[str] = None

class NotificationSettings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email_enabled: bool = True
    sms_enabled: bool = False
    whatsapp_enabled: bool = False
    sender_email: str = "noreply@example.com"
    sender_name: str = "NetworkOps"
    netgsm_username: Optional[str] = None
    netgsm_password: Optional[str] = None
    netgsm_header: Optional[str] = None
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
    whatsapp_enabled: Optional[bool] = None
    sender_email: Optional[str] = None
    sender_name: Optional[str] = None
    netgsm_username: Optional[str] = None
    netgsm_password: Optional[str] = None
    netgsm_header: Optional[str] = None
    notify_on_ticket_created: Optional[bool] = None
    notify_on_ticket_assigned: Optional[bool] = None
    notify_on_ticket_updated: Optional[bool] = None
    notify_on_ticket_resolved: Optional[bool] = None
    notify_on_sla_risk: Optional[bool] = None
    notify_on_comment_mention: Optional[bool] = None

# ========== CUSTOMER PORTAL MODELS ==========
class CustomerPortalUser(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    customer_id: str
    email: EmailStr
    full_name: str
    phone: Optional[str] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CustomerPortalUserInDB(CustomerPortalUser):
    hashed_password: str

class CustomerPortalUserCreate(BaseModel):
    customer_id: str
    email: EmailStr
    password: str
    full_name: str
    phone: Optional[str] = None

class CustomerPortalLogin(BaseModel):
    email: EmailStr
    password: str

class CustomerPortalToken(BaseModel):
    access_token: str
    token_type: str
    user: CustomerPortalUser
    customer_id: str

class CustomerPortalTicketCreate(BaseModel):
    title: str
    description: str
    category: str
    priority: str = "medium"
    asset_id: Optional[str] = None

# ========== IMAP CONFIGURATION MODELS ==========
class IMAPConfig(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    server: str
    port: int = 993
    username: str
    password: str  # Will be encrypted
    encryption_type: str = "SSL"
    folder: str = "INBOX"
    polling_interval_minutes: int = 5
    auto_create_ticket: bool = True
    default_category: str = "email"
    default_priority: str = "medium"
    is_active: bool = True
    last_checked: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class IMAPConfigCreate(BaseModel):
    name: str
    server: str
    port: int = 993
    username: str
    password: str
    encryption_type: str = "SSL"
    folder: str = "INBOX"
    polling_interval_minutes: int = 5
    auto_create_ticket: bool = True
    default_category: str = "email"
    default_priority: str = "medium"

class IMAPConfigUpdate(BaseModel):
    name: Optional[str] = None
    server: Optional[str] = None
    port: Optional[int] = None
    username: Optional[str] = None
    password: Optional[str] = None
    encryption_type: Optional[str] = None
    folder: Optional[str] = None
    polling_interval_minutes: Optional[int] = None
    auto_create_ticket: Optional[bool] = None
    default_category: Optional[str] = None
    default_priority: Optional[str] = None
    is_active: Optional[bool] = None

class EmailTicket(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    imap_config_id: str
    email_message_id: str
    sender_email: str
    sender_name: Optional[str] = None
    subject: str
    body: str
    html_body: Optional[str] = None
    received_date: datetime
    ticket_id: Optional[str] = None
    status: str = "pending"  # pending, processed, ignored
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ========== WHATSAPP MODELS ==========
class WhatsAppConfig(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    is_connected: bool = False
    phone_number: Optional[str] = None
    connection_status: str = "disconnected"
    last_connected: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class WhatsAppMessage(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    phone_number: str
    message: str
    direction: str  # inbound, outbound
    message_type: str = "text"
    status: str = "pending"  # pending, sent, delivered, read, failed
    reference_type: Optional[str] = None
    reference_id: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ========== CONTRACT MODELS ==========
class Contract(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    contract_number: str
    customer_id: str
    name: str
    contract_type: str  # standard, premium, enterprise
    start_date: str
    end_date: str
    auto_renew: bool = False
    monthly_fee: float = 0.0
    currency: str = "TRY"
    sla_profile_id: Optional[str] = None
    max_tickets_per_month: Optional[int] = None
    max_response_hours: Optional[int] = None
    includes_remote_support: bool = True
    includes_onsite_support: bool = False
    includes_parts: bool = False
    terms: Optional[str] = None
    notes: Optional[str] = None
    status: str = "active"  # active, expired, cancelled, pending
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ContractCreate(BaseModel):
    customer_id: str
    name: str
    contract_type: str = "standard"
    start_date: str
    end_date: str
    auto_renew: bool = False
    monthly_fee: float = 0.0
    currency: str = "TRY"
    sla_profile_id: Optional[str] = None
    max_tickets_per_month: Optional[int] = None
    max_response_hours: Optional[int] = None
    includes_remote_support: bool = True
    includes_onsite_support: bool = False
    includes_parts: bool = False
    terms: Optional[str] = None
    notes: Optional[str] = None

class ContractUpdate(BaseModel):
    name: Optional[str] = None
    contract_type: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    auto_renew: Optional[bool] = None
    monthly_fee: Optional[float] = None
    currency: Optional[str] = None
    sla_profile_id: Optional[str] = None
    max_tickets_per_month: Optional[int] = None
    max_response_hours: Optional[int] = None
    includes_remote_support: Optional[bool] = None
    includes_onsite_support: Optional[bool] = None
    includes_parts: Optional[bool] = None
    terms: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None

# ========== QUOTE MODELS ==========
class QuoteItem(BaseModel):
    description: str
    quantity: int = 1
    unit: str = "adet"
    unit_price: float
    vat_rate: int = 20
    subtotal: float
    vat_amount: float
    total: float

class Quote(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    quote_number: str
    customer_id: str
    subject: Optional[str] = None
    validity_days: int = 30
    valid_until: str
    payment_terms: str = "pesin"
    payment_notes: Optional[str] = None
    notes: Optional[str] = None
    items: List[QuoteItem] = []
    subtotal: float = 0.0
    total_vat: float = 0.0
    grand_total: float = 0.0
    currency: str = "TRY"
    status: str = "draft"  # draft, sent, accepted, rejected, expired
    created_by: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    sent_at: Optional[str] = None
    accepted_at: Optional[str] = None
    rejected_at: Optional[str] = None

class QuoteCreate(BaseModel):
    customer_id: str
    subject: Optional[str] = None
    validity_days: int = 30
    payment_terms: str = "pesin"
    payment_notes: Optional[str] = None
    notes: Optional[str] = None
    items: List[dict] = []
    currency: str = "TRY"

class QuoteUpdate(BaseModel):
    customer_id: Optional[str] = None
    subject: Optional[str] = None
    validity_days: Optional[int] = None
    payment_terms: Optional[str] = None
    payment_notes: Optional[str] = None
    notes: Optional[str] = None
    items: Optional[List[dict]] = None
    status: Optional[str] = None

# Email Templates
EMAIL_TEMPLATES = {
    "ticket_created": {
        "subject": "Yeni Destek Talebi Oluşturuldu - {ticket_number}",
        "body": """
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #2563eb;">Yeni Destek Talebi</h2>
                <p>Sayın {customer_name},</p>
                <p>Destek talebiniz başarıyla oluşturulmuştur.</p>
                <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                    <tr style="background: #f3f4f6;">
                        <td style="padding: 10px; border: 1px solid #e5e7eb;"><strong>Talep No:</strong></td>
                        <td style="padding: 10px; border: 1px solid #e5e7eb;">{ticket_number}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; border: 1px solid #e5e7eb;"><strong>Konu:</strong></td>
                        <td style="padding: 10px; border: 1px solid #e5e7eb;">{title}</td>
                    </tr>
                    <tr style="background: #f3f4f6;">
                        <td style="padding: 10px; border: 1px solid #e5e7eb;"><strong>Öncelik:</strong></td>
                        <td style="padding: 10px; border: 1px solid #e5e7eb;">{priority}</td>
                    </tr>
                </table>
                <p>Talebiniz en kısa sürede değerlendirilecektir.</p>
                <p style="color: #6b7280; font-size: 12px;">Bu otomatik bir bildirimdir.</p>
            </div>
        </body>
        </html>
        """
    },
    "ticket_assigned": {
        "subject": "Destek Talebi Atandı - {ticket_number}",
        "body": """
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #2563eb;">Destek Talebi Atandı</h2>
                <p>Sayın {customer_name},</p>
                <p><strong>{ticket_number}</strong> numaralı destek talebiniz <strong>{assignee_name}</strong> tarafından üstlenilmiştir.</p>
                <p>Konu: {title}</p>
                <p>En kısa sürede sizinle iletişime geçilecektir.</p>
                <p style="color: #6b7280; font-size: 12px;">Bu otomatik bir bildirimdir.</p>
            </div>
        </body>
        </html>
        """
    },
    "ticket_resolved": {
        "subject": "Destek Talebi Çözümlendi - {ticket_number}",
        "body": """
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #16a34a;">Destek Talebi Çözümlendi</h2>
                <p>Sayın {customer_name},</p>
                <p><strong>{ticket_number}</strong> numaralı destek talebiniz çözümlenmiştir.</p>
                <p>Konu: {title}</p>
                <p>Hizmetimizden memnun kaldıysanız seviniriz. Herhangi bir sorunuz olursa bizimle iletişime geçebilirsiniz.</p>
                <p style="color: #6b7280; font-size: 12px;">Bu otomatik bir bildirimdir.</p>
            </div>
        </body>
        </html>
        """
    },
    "sla_risk": {
        "subject": "⚠️ SLA Risk Uyarısı - {ticket_number}",
        "body": """
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #dc2626;">SLA Risk Uyarısı</h2>
                <p><strong>{ticket_number}</strong> numaralı ticket SLA süresini aşmak üzere!</p>
                <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                    <tr style="background: #fef2f2;">
                        <td style="padding: 10px; border: 1px solid #fecaca;"><strong>Ticket:</strong></td>
                        <td style="padding: 10px; border: 1px solid #fecaca;">{ticket_number}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; border: 1px solid #fecaca;"><strong>Konu:</strong></td>
                        <td style="padding: 10px; border: 1px solid #fecaca;">{title}</td>
                    </tr>
                    <tr style="background: #fef2f2;">
                        <td style="padding: 10px; border: 1px solid #fecaca;"><strong>SLA Bitiş:</strong></td>
                        <td style="padding: 10px; border: 1px solid #fecaca;">{sla_deadline}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; border: 1px solid #fecaca;"><strong>Atanan:</strong></td>
                        <td style="padding: 10px; border: 1px solid #fecaca;">{assignee_name}</td>
                    </tr>
                </table>
                <p style="color: #dc2626;"><strong>Lütfen acil müdahale edin!</strong></p>
            </div>
        </body>
        </html>
        """
    },
    "comment_mention": {
        "subject": "Bir yorumda bahsedildiniz - {ticket_number}",
        "body": """
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #2563eb;">Yeni Bahsetme</h2>
                <p><strong>{mentioned_by}</strong> sizi <strong>{ticket_number}</strong> numaralı ticket'ta bir yorumda bahsetti:</p>
                <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 0;">{comment}</p>
                </div>
                <p style="color: #6b7280; font-size: 12px;">Bu otomatik bir bildirimdir.</p>
            </div>
        </body>
        </html>
        """
    }
}

SMS_TEMPLATES = {
    "ticket_created": "{ticket_number} numarali destek talebiniz olusturuldu. Konu: {title}",
    "ticket_assigned": "{ticket_number} no'lu talebiniz {assignee_name} tarafindan ustlenildi.",
    "ticket_resolved": "{ticket_number} no'lu destek talebiniz cozumlendi.",
    "sla_risk": "UYARI: {ticket_number} ticket SLA suresi dolmak uzere! Acil mudahale gerekli.",
}

# Notification Service Functions
async def get_notification_settings():
    settings = await db.notification_settings.find_one({}, {"_id": 0})
    if not settings:
        default_settings = NotificationSettings()
        doc = default_settings.model_dump()
        doc['updated_at'] = doc['updated_at'].isoformat()
        await db.notification_settings.insert_one(doc)
        return default_settings
    if isinstance(settings.get('updated_at'), str):
        settings['updated_at'] = datetime.fromisoformat(settings['updated_at'])
    return NotificationSettings(**settings)

async def send_email_notification(to_email: str, subject: str, html_content: str):
    if not RESEND_AVAILABLE:
        logging.warning("Resend not available, skipping email")
        return {"status": "skipped", "reason": "Resend not configured"}
    
    resend_api_key = os.environ.get('RESEND_API_KEY')
    if not resend_api_key:
        logging.warning("RESEND_API_KEY not set, skipping email")
        return {"status": "skipped", "reason": "API key not configured"}
    
    resend.api_key = resend_api_key
    sender_email = os.environ.get('SENDER_EMAIL', 'onboarding@resend.dev')
    
    params = {
        "from": sender_email,
        "to": [to_email],
        "subject": subject,
        "html": html_content
    }
    
    try:
        email = await asyncio.to_thread(resend.Emails.send, params)
        return {"status": "sent", "email_id": email.get("id")}
    except Exception as e:
        logging.error(f"Failed to send email: {str(e)}")
        return {"status": "failed", "error": str(e)}

async def send_sms_notification(to_phone: str, message: str):
    if not NETGSM_AVAILABLE:
        logging.warning("NetGSM not available, skipping SMS")
        return {"status": "skipped", "reason": "NetGSM not configured"}
    
    settings = await get_notification_settings()
    if not settings.netgsm_username or not settings.netgsm_password:
        logging.warning("NetGSM credentials not set, skipping SMS")
        return {"status": "skipped", "reason": "NetGSM credentials not configured"}
    
    try:
        netgsm = Netgsm(
            username=settings.netgsm_username,
            password=settings.netgsm_password
        )
        
        phone = to_phone.replace("+90", "").replace(" ", "").replace("-", "")
        if phone.startswith("0"):
            phone = phone[1:]
        
        response = netgsm.sms.send(
            msgheader=settings.netgsm_header or "NETWORKOPS",
            messages=[{"msg": message, "no": phone}]
        )
        
        return {"status": "sent", "job_id": response.get("jobid")}
    except Exception as e:
        logging.error(f"Failed to send SMS: {str(e)}")
        return {"status": "failed", "error": str(e)}

async def send_notification(
    notification_type: str,
    template_data: dict,
    recipient_email: Optional[str] = None,
    recipient_phone: Optional[str] = None,
    recipient_id: Optional[str] = None,
    reference_type: Optional[str] = None,
    reference_id: Optional[str] = None
):
    settings = await get_notification_settings()
    results = []
    
    email_template = EMAIL_TEMPLATES.get(notification_type)
    sms_template = SMS_TEMPLATES.get(notification_type)
    
    if settings.email_enabled and recipient_email and email_template:
        subject = email_template["subject"].format(**template_data)
        body = email_template["body"].format(**template_data)
        
        result = await send_email_notification(recipient_email, subject, body)
        
        notification = Notification(
            recipient_id=recipient_id,
            recipient_email=recipient_email,
            notification_type=notification_type,
            channel="email",
            subject=subject,
            content=body,
            reference_type=reference_type,
            reference_id=reference_id,
            status="sent" if result["status"] == "sent" else "failed",
            sent_at=datetime.now(timezone.utc) if result["status"] == "sent" else None,
            error_message=result.get("error")
        )
        doc = notification.model_dump()
        doc['created_at'] = doc['created_at'].isoformat()
        if doc['sent_at']:
            doc['sent_at'] = doc['sent_at'].isoformat()
        await db.notifications.insert_one(doc)
        results.append({"channel": "email", **result})
    
    if settings.sms_enabled and recipient_phone and sms_template:
        message = sms_template.format(**template_data)
        
        result = await send_sms_notification(recipient_phone, message)
        
        notification = Notification(
            recipient_id=recipient_id,
            recipient_phone=recipient_phone,
            notification_type=notification_type,
            channel="sms",
            content=message,
            reference_type=reference_type,
            reference_id=reference_id,
            status="sent" if result["status"] == "sent" else "failed",
            sent_at=datetime.now(timezone.utc) if result["status"] == "sent" else None,
            error_message=result.get("error")
        )
        doc = notification.model_dump()
        doc['created_at'] = doc['created_at'].isoformat()
        if doc['sent_at']:
            doc['sent_at'] = doc['sent_at'].isoformat()
        await db.notifications.insert_one(doc)
        results.append({"channel": "sms", **result})
    
    return results

def extract_mentions(text: str) -> List[str]:
    pattern = r'@(\w+)'
    return re.findall(pattern, text)
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return User(**user)

@api_router.post("/auth/register", response_model=User)
async def register(user: UserCreate):
    existing = await db.users.find_one({"email": user.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = get_password_hash(user.password)
    user_dict = user.model_dump()
    user_dict.pop("password")
    user_obj = UserInDB(**user_dict, hashed_password=hashed_password)
    
    doc = user_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.users.insert_one(doc)
    
    return User(**user_obj.model_dump())

@api_router.post("/auth/login", response_model=Token)
async def login(user_login: UserLogin):
    user = await db.users.find_one({"email": user_login.email}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(user_login.password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    access_token = create_access_token(data={"sub": user["id"]})
    user_obj = User(**user)
    return Token(access_token=access_token, token_type="bearer", user=user_obj)

@api_router.get("/auth/me", response_model=User)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@api_router.post("/customers", response_model=Customer)
async def create_customer(customer: CustomerCreate, current_user: User = Depends(get_current_user)):
    customer_obj = Customer(**customer.model_dump())
    doc = customer_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.customers.insert_one(doc)
    return customer_obj

@api_router.get("/customers", response_model=List[Customer])
async def get_customers(current_user: User = Depends(get_current_user)):
    customers = await db.customers.find({}, {"_id": 0}).to_list(1000)
    for c in customers:
        if isinstance(c['created_at'], str):
            c['created_at'] = datetime.fromisoformat(c['created_at'])
    return customers

@api_router.get("/customers/{customer_id}", response_model=Customer)
async def get_customer(customer_id: str, current_user: User = Depends(get_current_user)):
    customer = await db.customers.find_one({"id": customer_id}, {"_id": 0})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    if isinstance(customer['created_at'], str):
        customer['created_at'] = datetime.fromisoformat(customer['created_at'])
    return Customer(**customer)

@api_router.post("/contacts", response_model=Contact)
async def create_contact(contact: ContactCreate, current_user: User = Depends(get_current_user)):
    contact_obj = Contact(**contact.model_dump())
    doc = contact_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.contacts.insert_one(doc)
    return contact_obj

@api_router.get("/contacts", response_model=List[Contact])
async def get_contacts(customer_id: Optional[str] = None, current_user: User = Depends(get_current_user)):
    query = {} if not customer_id else {"customer_id": customer_id}
    contacts = await db.contacts.find(query, {"_id": 0}).to_list(1000)
    for c in contacts:
        if isinstance(c['created_at'], str):
            c['created_at'] = datetime.fromisoformat(c['created_at'])
    return contacts

@api_router.post("/locations", response_model=Location)
async def create_location(location: LocationCreate, current_user: User = Depends(get_current_user)):
    location_obj = Location(**location.model_dump())
    doc = location_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.locations.insert_one(doc)
    return location_obj

@api_router.get("/locations", response_model=List[Location])
async def get_locations(customer_id: Optional[str] = None, current_user: User = Depends(get_current_user)):
    query = {} if not customer_id else {"customer_id": customer_id}
    locations = await db.locations.find(query, {"_id": 0}).to_list(1000)
    for l in locations:
        if isinstance(l['created_at'], str):
            l['created_at'] = datetime.fromisoformat(l['created_at'])
    return locations

@api_router.post("/assets", response_model=Asset)
async def create_asset(asset: AssetCreate, current_user: User = Depends(get_current_user)):
    asset_obj = Asset(**asset.model_dump())
    doc = asset_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.assets.insert_one(doc)
    return asset_obj

@api_router.get("/assets", response_model=List[Asset])
async def get_assets(customer_id: Optional[str] = None, is_spare: Optional[bool] = None, current_user: User = Depends(get_current_user)):
    query = {}
    if customer_id:
        query["customer_id"] = customer_id
    if is_spare is not None:
        query["is_spare"] = is_spare
    assets = await db.assets.find(query, {"_id": 0}).to_list(1000)
    for a in assets:
        if isinstance(a['created_at'], str):
            a['created_at'] = datetime.fromisoformat(a['created_at'])
    return assets

@api_router.get("/assets/warranty-expiring")
async def get_warranty_expiring_assets(days: int = 30, current_user: User = Depends(get_current_user)):
    """Get assets with warranty or support expiring within specified days"""
    assets = await db.assets.find({"status": "active"}, {"_id": 0}).to_list(10000)
    
    now = datetime.now(timezone.utc)
    warning_date = now + timedelta(days=days)
    
    expiring = []
    for asset in assets:
        if asset.get('warranty_end'):
            try:
                warranty_end = datetime.fromisoformat(asset['warranty_end'].replace('Z', '+00:00'))
                if warranty_end.tzinfo is None:
                    warranty_end = warranty_end.replace(tzinfo=timezone.utc)
                
                if now <= warranty_end <= warning_date:
                    days_remaining = (warranty_end - now).days
                    expiring.append({**asset, "days_remaining": days_remaining, "expiry_type": "warranty"})
            except:
                pass
        
        if asset.get('support_end'):
            try:
                support_end = datetime.fromisoformat(asset['support_end'].replace('Z', '+00:00'))
                if support_end.tzinfo is None:
                    support_end = support_end.replace(tzinfo=timezone.utc)
                
                if now <= support_end <= warning_date:
                    days_remaining = (support_end - now).days
                    exists = next((e for e in expiring if e['id'] == asset['id']), None)
                    if not exists:
                        expiring.append({**asset, "days_remaining": days_remaining, "expiry_type": "support"})
            except:
                pass
    
    expiring.sort(key=lambda x: x['days_remaining'])
    return expiring

@api_router.get("/assets/{asset_id}", response_model=Asset)
async def get_asset(asset_id: str, current_user: User = Depends(get_current_user)):
    asset = await db.assets.find_one({"id": asset_id}, {"_id": 0})
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    if isinstance(asset['created_at'], str):
        asset['created_at'] = datetime.fromisoformat(asset['created_at'])
    return Asset(**asset)

@api_router.post("/tickets", response_model=Ticket)
async def create_ticket(ticket: TicketCreate, current_user: User = Depends(get_current_user)):
    ticket_count = await db.tickets.count_documents({})
    ticket_number = f"TKT-{ticket_count + 1:05d}"
    
    sla_hours = {"low": 48, "medium": 24, "high": 8, "critical": 4}
    hours = sla_hours.get(ticket.priority, 24)
    sla_deadline = datetime.now(timezone.utc) + timedelta(hours=hours)
    
    ticket_obj = Ticket(
        **ticket.model_dump(),
        ticket_number=ticket_number,
        created_by=current_user.id,
        sla_deadline=sla_deadline
    )
    
    doc = ticket_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    if doc['sla_deadline']:
        doc['sla_deadline'] = doc['sla_deadline'].isoformat()
    if doc['resolved_at']:
        doc['resolved_at'] = doc['resolved_at'].isoformat()
    
    await db.tickets.insert_one(doc)
    
    # Send notification to customer
    settings = await get_notification_settings()
    if settings.notify_on_ticket_created:
        customer = await db.customers.find_one({"id": ticket.customer_id}, {"_id": 0})
        if customer:
            priority_labels = {"low": "Düşük", "medium": "Orta", "high": "Yüksek", "critical": "Kritik"}
            template_data = {
                "ticket_number": ticket_number,
                "title": ticket.title,
                "priority": priority_labels.get(ticket.priority, ticket.priority),
                "customer_name": customer.get('name', 'Değerli Müşteri')
            }
            asyncio.create_task(send_notification(
                "ticket_created",
                template_data,
                recipient_email=customer.get('email'),
                recipient_phone=customer.get('phone'),
                reference_type="ticket",
                reference_id=ticket_obj.id
            ))
    
    return ticket_obj

@api_router.get("/tickets", response_model=List[Ticket])
async def get_tickets(status: Optional[str] = None, current_user: User = Depends(get_current_user)):
    query = {} if not status else {"status": status}
    tickets = await db.tickets.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    for t in tickets:
        if isinstance(t.get('created_at'), str):
            t['created_at'] = datetime.fromisoformat(t['created_at'])
        if isinstance(t.get('updated_at'), str):
            t['updated_at'] = datetime.fromisoformat(t['updated_at'])
        if t.get('sla_deadline') and isinstance(t['sla_deadline'], str):
            t['sla_deadline'] = datetime.fromisoformat(t['sla_deadline'])
        if t.get('resolved_at') and isinstance(t['resolved_at'], str):
            t['resolved_at'] = datetime.fromisoformat(t['resolved_at'])
    return tickets

@api_router.get("/tickets/{ticket_id}", response_model=Ticket)
async def get_ticket(ticket_id: str, current_user: User = Depends(get_current_user)):
    ticket = await db.tickets.find_one({"id": ticket_id}, {"_id": 0})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    if isinstance(ticket.get('created_at'), str):
        ticket['created_at'] = datetime.fromisoformat(ticket['created_at'])
    if isinstance(ticket.get('updated_at'), str):
        ticket['updated_at'] = datetime.fromisoformat(ticket['updated_at'])
    if ticket.get('sla_deadline') and isinstance(ticket['sla_deadline'], str):
        ticket['sla_deadline'] = datetime.fromisoformat(ticket['sla_deadline'])
    if ticket.get('resolved_at') and isinstance(ticket['resolved_at'], str):
        ticket['resolved_at'] = datetime.fromisoformat(ticket['resolved_at'])
    return Ticket(**ticket)

@api_router.patch("/tickets/{ticket_id}", response_model=Ticket)
async def update_ticket(ticket_id: str, update: TicketUpdate, current_user: User = Depends(get_current_user)):
    ticket = await db.tickets.find_one({"id": ticket_id}, {"_id": 0})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    old_status = ticket.get('status')
    old_assigned = ticket.get('assigned_to')
    
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    if update.status == "resolved" or update.status == "closed":
        update_data['resolved_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.tickets.update_one({"id": ticket_id}, {"$set": update_data})
    
    # Record status change history
    if update.status and update.status != old_status:
        await db.ticket_status_history.insert_one({
            "id": str(uuid.uuid4()),
            "ticket_id": ticket_id,
            "old_status": old_status,
            "new_status": update.status,
            "changed_by": current_user.id,
            "changed_at": datetime.now(timezone.utc).isoformat()
        })
    
    # Record assignment change history
    if update.assigned_to and update.assigned_to != old_assigned:
        await db.ticket_assignment_history.insert_one({
            "id": str(uuid.uuid4()),
            "ticket_id": ticket_id,
            "old_assignee": old_assigned,
            "new_assignee": update.assigned_to,
            "changed_by": current_user.id,
            "changed_at": datetime.now(timezone.utc).isoformat()
        })
    
    updated_ticket = await db.tickets.find_one({"id": ticket_id}, {"_id": 0})
    if isinstance(updated_ticket.get('created_at'), str):
        updated_ticket['created_at'] = datetime.fromisoformat(updated_ticket['created_at'])
    if isinstance(updated_ticket.get('updated_at'), str):
        updated_ticket['updated_at'] = datetime.fromisoformat(updated_ticket['updated_at'])
    if updated_ticket.get('sla_deadline') and isinstance(updated_ticket['sla_deadline'], str):
        updated_ticket['sla_deadline'] = datetime.fromisoformat(updated_ticket['sla_deadline'])
    if updated_ticket.get('resolved_at') and isinstance(updated_ticket['resolved_at'], str):
        updated_ticket['resolved_at'] = datetime.fromisoformat(updated_ticket['resolved_at'])
    
    # Send notifications based on update type
    settings = await get_notification_settings()
    customer = await db.customers.find_one({"id": ticket['customer_id']}, {"_id": 0})
    
    if customer:
        # Ticket assigned notification
        if settings.notify_on_ticket_assigned and update.assigned_to and update.assigned_to != old_assigned:
            assignee = await db.users.find_one({"id": update.assigned_to}, {"_id": 0})
            if assignee:
                template_data = {
                    "ticket_number": ticket['ticket_number'],
                    "title": ticket['title'],
                    "customer_name": customer.get('name', 'Değerli Müşteri'),
                    "assignee_name": assignee.get('full_name', 'Bilinmeyen')
                }
                asyncio.create_task(send_notification(
                    "ticket_assigned",
                    template_data,
                    recipient_email=customer.get('email'),
                    recipient_phone=customer.get('phone'),
                    reference_type="ticket",
                    reference_id=ticket_id
                ))
        
        # Ticket resolved notification
        if settings.notify_on_ticket_resolved and update.status in ["resolved", "closed"] and old_status not in ["resolved", "closed"]:
            template_data = {
                "ticket_number": ticket['ticket_number'],
                "title": ticket['title'],
                "customer_name": customer.get('name', 'Değerli Müşteri')
            }
            asyncio.create_task(send_notification(
                "ticket_resolved",
                template_data,
                recipient_email=customer.get('email'),
                recipient_phone=customer.get('phone'),
                reference_type="ticket",
                reference_id=ticket_id
            ))
    
    return Ticket(**updated_ticket)

@api_router.post("/tickets/{ticket_id}/comments", response_model=TicketComment)
async def add_ticket_comment(ticket_id: str, comment: TicketCommentCreate, current_user: User = Depends(get_current_user)):
    comment_obj = TicketComment(
        **comment.model_dump(),
        user_id=current_user.id,
        user_name=current_user.full_name
    )
    doc = comment_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.ticket_comments.insert_one(doc)
    
    # Check for mentions and send notifications
    settings = await get_notification_settings()
    if settings.notify_on_comment_mention:
        mentions = extract_mentions(comment.comment)
        if mentions:
            ticket = await db.tickets.find_one({"id": ticket_id}, {"_id": 0})
            users = await db.users.find({}, {"_id": 0}).to_list(1000)
            
            for mention in mentions:
                mentioned_user = next((u for u in users if u.get('full_name', '').lower().replace(' ', '_') == mention.lower() or u.get('email', '').split('@')[0].lower() == mention.lower()), None)
                if mentioned_user:
                    template_data = {
                        "ticket_number": ticket['ticket_number'] if ticket else ticket_id,
                        "mentioned_by": current_user.full_name,
                        "comment": comment.comment[:200] + "..." if len(comment.comment) > 200 else comment.comment
                    }
                    asyncio.create_task(send_notification(
                        "comment_mention",
                        template_data,
                        recipient_email=mentioned_user.get('email'),
                        recipient_id=mentioned_user.get('id'),
                        reference_type="ticket",
                        reference_id=ticket_id
                    ))
    
    return comment_obj

@api_router.get("/tickets/{ticket_id}/comments", response_model=List[TicketComment])
async def get_ticket_comments(ticket_id: str, current_user: User = Depends(get_current_user)):
    comments = await db.ticket_comments.find({"ticket_id": ticket_id}, {"_id": 0}).sort("created_at", 1).to_list(1000)
    for c in comments:
        if isinstance(c['created_at'], str):
            c['created_at'] = datetime.fromisoformat(c['created_at'])
    return comments

@api_router.post("/attachments", response_model=Attachment)
async def upload_attachment(attachment: AttachmentCreate, current_user: User = Depends(get_current_user)):
    attachment_obj = Attachment(**attachment.model_dump(), uploaded_by=current_user.id)
    doc = attachment_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.attachments.insert_one(doc)
    return attachment_obj

@api_router.get("/attachments", response_model=List[Attachment])
async def get_attachments(related_to: str, related_id: str, current_user: User = Depends(get_current_user)):
    attachments = await db.attachments.find({"related_to": related_to, "related_id": related_id}, {"_id": 0}).to_list(1000)
    for a in attachments:
        if isinstance(a['created_at'], str):
            a['created_at'] = datetime.fromisoformat(a['created_at'])
    return attachments

@api_router.post("/work-orders", response_model=WorkOrder)
async def create_work_order(work_order: WorkOrderCreate, current_user: User = Depends(get_current_user)):
    work_order_obj = WorkOrder(**work_order.model_dump())
    doc = work_order_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    if doc['completed_at']:
        doc['completed_at'] = doc['completed_at'].isoformat()
    # Serialize checklist items
    if doc.get('checklist'):
        for item in doc['checklist']:
            if item.get('completed_at') and hasattr(item['completed_at'], 'isoformat'):
                item['completed_at'] = item['completed_at'].isoformat()
    await db.work_orders.insert_one(doc)
    return work_order_obj

@api_router.get("/work-orders", response_model=List[WorkOrder])
async def get_work_orders(ticket_id: Optional[str] = None, current_user: User = Depends(get_current_user)):
    query = {} if not ticket_id else {"ticket_id": ticket_id}
    work_orders = await db.work_orders.find(query, {"_id": 0}).to_list(1000)
    for wo in work_orders:
        if isinstance(wo['created_at'], str):
            wo['created_at'] = datetime.fromisoformat(wo['created_at'])
        if wo.get('completed_at') and isinstance(wo['completed_at'], str):
            wo['completed_at'] = datetime.fromisoformat(wo['completed_at'])
    return work_orders

@api_router.get("/work-orders/{work_order_id}", response_model=WorkOrder)
async def get_work_order(work_order_id: str, current_user: User = Depends(get_current_user)):
    work_order = await db.work_orders.find_one({"id": work_order_id}, {"_id": 0})
    if not work_order:
        raise HTTPException(status_code=404, detail="Work order not found")
    if isinstance(work_order['created_at'], str):
        work_order['created_at'] = datetime.fromisoformat(work_order['created_at'])
    if work_order.get('completed_at') and isinstance(work_order['completed_at'], str):
        work_order['completed_at'] = datetime.fromisoformat(work_order['completed_at'])
    return WorkOrder(**work_order)

@api_router.patch("/work-orders/{work_order_id}", response_model=WorkOrder)
async def update_work_order(work_order_id: str, update: WorkOrderUpdate, current_user: User = Depends(get_current_user)):
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    
    if update.status == "completed":
        update_data['completed_at'] = datetime.now(timezone.utc).isoformat()
    
    # Serialize checklist items if present
    if update_data.get('checklist'):
        for item in update_data['checklist']:
            if item.get('completed_at') and hasattr(item['completed_at'], 'isoformat'):
                item['completed_at'] = item['completed_at'].isoformat()
    
    await db.work_orders.update_one({"id": work_order_id}, {"$set": update_data})
    
    work_order = await db.work_orders.find_one({"id": work_order_id}, {"_id": 0})
    if isinstance(work_order['created_at'], str):
        work_order['created_at'] = datetime.fromisoformat(work_order['created_at'])
    if work_order.get('completed_at') and isinstance(work_order['completed_at'], str):
        work_order['completed_at'] = datetime.fromisoformat(work_order['completed_at'])
    return WorkOrder(**work_order)

@api_router.post("/parts", response_model=Part)
async def create_part(part: PartCreate, current_user: User = Depends(get_current_user)):
    existing = await db.parts.find_one({"part_number": part.part_number}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Part number already exists")
    
    part_obj = Part(**part.model_dump())
    doc = part_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    await db.parts.insert_one(doc)
    return part_obj

@api_router.get("/parts", response_model=List[Part])
async def get_parts(
    category: Optional[str] = None,
    low_stock: Optional[bool] = None,
    has_serial: Optional[bool] = None,
    is_active: Optional[bool] = True,
    current_user: User = Depends(get_current_user)
):
    query = {}
    if category:
        query["category"] = category
    if has_serial is not None:
        query["has_serial"] = has_serial
    if is_active is not None:
        query["is_active"] = is_active
    
    parts = await db.parts.find(query, {"_id": 0}).to_list(1000)
    
    result = []
    for p in parts:
        if isinstance(p['created_at'], str):
            p['created_at'] = datetime.fromisoformat(p['created_at'])
        if isinstance(p.get('updated_at'), str):
            p['updated_at'] = datetime.fromisoformat(p['updated_at'])
        
        if low_stock and p['quantity'] > p['min_stock']:
            continue
        result.append(p)
    
    return result

@api_router.get("/parts/{part_id}", response_model=Part)
async def get_part(part_id: str, current_user: User = Depends(get_current_user)):
    part = await db.parts.find_one({"id": part_id}, {"_id": 0})
    if not part:
        raise HTTPException(status_code=404, detail="Part not found")
    if isinstance(part['created_at'], str):
        part['created_at'] = datetime.fromisoformat(part['created_at'])
    if isinstance(part.get('updated_at'), str):
        part['updated_at'] = datetime.fromisoformat(part['updated_at'])
    return Part(**part)

@api_router.patch("/parts/{part_id}", response_model=Part)
async def update_part(part_id: str, update: PartUpdate, current_user: User = Depends(get_current_user)):
    part = await db.parts.find_one({"id": part_id}, {"_id": 0})
    if not part:
        raise HTTPException(status_code=404, detail="Part not found")
    
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.parts.update_one({"id": part_id}, {"$set": update_data})
    
    updated_part = await db.parts.find_one({"id": part_id}, {"_id": 0})
    if isinstance(updated_part['created_at'], str):
        updated_part['created_at'] = datetime.fromisoformat(updated_part['created_at'])
    if isinstance(updated_part.get('updated_at'), str):
        updated_part['updated_at'] = datetime.fromisoformat(updated_part['updated_at'])
    return Part(**updated_part)

@api_router.get("/parts/categories/list")
async def get_part_categories(current_user: User = Depends(get_current_user)):
    parts = await db.parts.find({}, {"category": 1, "_id": 0}).to_list(1000)
    categories = list(set(p['category'] for p in parts if p.get('category')))
    return sorted(categories)

@api_router.post("/parts/{part_id}/serials", response_model=SerializedPart)
async def add_serialized_part(part_id: str, serial: SerializedPartCreate, current_user: User = Depends(get_current_user)):
    part = await db.parts.find_one({"id": part_id}, {"_id": 0})
    if not part:
        raise HTTPException(status_code=404, detail="Part not found")
    if not part.get('has_serial'):
        raise HTTPException(status_code=400, detail="This part does not track serial numbers")
    
    existing = await db.serialized_parts.find_one({"serial_number": serial.serial_number}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Serial number already exists")
    
    serial_obj = SerializedPart(**serial.model_dump())
    doc = serial_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    await db.serialized_parts.insert_one(doc)
    
    await db.parts.update_one({"id": part_id}, {"$inc": {"quantity": 1}})
    
    return serial_obj

@api_router.get("/parts/{part_id}/serials", response_model=List[SerializedPart])
async def get_serialized_parts(part_id: str, status: Optional[str] = None, current_user: User = Depends(get_current_user)):
    query = {"part_id": part_id}
    if status:
        query["status"] = status
    
    serials = await db.serialized_parts.find(query, {"_id": 0}).to_list(1000)
    for s in serials:
        if isinstance(s['created_at'], str):
            s['created_at'] = datetime.fromisoformat(s['created_at'])
        if isinstance(s.get('updated_at'), str):
            s['updated_at'] = datetime.fromisoformat(s['updated_at'])
    return serials

@api_router.get("/serialized-parts", response_model=List[SerializedPart])
async def get_all_serialized_parts(status: Optional[str] = None, current_user: User = Depends(get_current_user)):
    query = {}
    if status:
        query["status"] = status
    
    serials = await db.serialized_parts.find(query, {"_id": 0}).to_list(1000)
    for s in serials:
        if isinstance(s['created_at'], str):
            s['created_at'] = datetime.fromisoformat(s['created_at'])
        if isinstance(s.get('updated_at'), str):
            s['updated_at'] = datetime.fromisoformat(s['updated_at'])
    return serials

@api_router.post("/stock-movements", response_model=StockMovement)
async def create_stock_movement(movement: StockMovementCreate, current_user: User = Depends(get_current_user)):
    part = await db.parts.find_one({"id": movement.part_id}, {"_id": 0})
    if not part:
        raise HTTPException(status_code=404, detail="Part not found")
    
    if movement.movement_type in ["out", "usage", "scrap", "return_to_vendor"]:
        if part["quantity"] < movement.quantity:
            raise HTTPException(status_code=400, detail="Insufficient stock")
        quantity_change = -movement.quantity
    elif movement.movement_type in ["in", "purchase", "return_from_field", "adjustment_plus"]:
        quantity_change = movement.quantity
    elif movement.movement_type == "adjustment_minus":
        if part["quantity"] < movement.quantity:
            raise HTTPException(status_code=400, detail="Insufficient stock for adjustment")
        quantity_change = -movement.quantity
    else:
        raise HTTPException(status_code=400, detail="Invalid movement type")
    
    movement_obj = StockMovement(**movement.model_dump(), created_by=current_user.id)
    doc = movement_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.stock_movements.insert_one(doc)
    
    await db.parts.update_one(
        {"id": movement.part_id},
        {
            "$inc": {"quantity": quantity_change},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
        }
    )
    
    if part.get('has_serial') and movement.serial_numbers:
        if movement.movement_type in ["out", "usage", "scrap"]:
            await db.serialized_parts.update_many(
                {"serial_number": {"$in": movement.serial_numbers}},
                {"$set": {"status": "used" if movement.movement_type == "usage" else movement.movement_type, "updated_at": datetime.now(timezone.utc).isoformat()}}
            )
        elif movement.movement_type in ["return_from_field"]:
            await db.serialized_parts.update_many(
                {"serial_number": {"$in": movement.serial_numbers}},
                {"$set": {"status": "in_stock", "updated_at": datetime.now(timezone.utc).isoformat()}}
            )
    
    return movement_obj

@api_router.get("/stock-movements", response_model=List[StockMovement])
async def get_stock_movements(
    part_id: Optional[str] = None,
    movement_type: Optional[str] = None,
    reference_id: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    query = {}
    if part_id:
        query["part_id"] = part_id
    if movement_type:
        query["movement_type"] = movement_type
    if reference_id:
        query["reference_id"] = reference_id
    
    movements = await db.stock_movements.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    for m in movements:
        if isinstance(m['created_at'], str):
            m['created_at'] = datetime.fromisoformat(m['created_at'])
    return movements

@api_router.post("/part-reservations", response_model=PartReservation)
async def create_part_reservation(reservation: PartReservationCreate, current_user: User = Depends(get_current_user)):
    part = await db.parts.find_one({"id": reservation.part_id}, {"_id": 0})
    if not part:
        raise HTTPException(status_code=404, detail="Part not found")
    
    available = part["quantity"] - part.get("reserved_quantity", 0)
    if available < reservation.quantity:
        raise HTTPException(status_code=400, detail=f"Insufficient available stock. Available: {available}")
    
    reservation_obj = PartReservation(**reservation.model_dump(), reserved_by=current_user.id)
    doc = reservation_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    if doc.get('used_at'):
        doc['used_at'] = doc['used_at'].isoformat()
    if doc.get('cancelled_at'):
        doc['cancelled_at'] = doc['cancelled_at'].isoformat()
    await db.part_reservations.insert_one(doc)
    
    await db.parts.update_one(
        {"id": reservation.part_id},
        {"$inc": {"reserved_quantity": reservation.quantity}}
    )
    
    return reservation_obj

@api_router.get("/part-reservations", response_model=List[PartReservation])
async def get_part_reservations(
    work_order_id: Optional[str] = None,
    part_id: Optional[str] = None,
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    query = {}
    if work_order_id:
        query["work_order_id"] = work_order_id
    if part_id:
        query["part_id"] = part_id
    if status:
        query["status"] = status
    
    reservations = await db.part_reservations.find(query, {"_id": 0}).to_list(1000)
    for r in reservations:
        if isinstance(r['created_at'], str):
            r['created_at'] = datetime.fromisoformat(r['created_at'])
        if r.get('used_at') and isinstance(r['used_at'], str):
            r['used_at'] = datetime.fromisoformat(r['used_at'])
        if r.get('cancelled_at') and isinstance(r['cancelled_at'], str):
            r['cancelled_at'] = datetime.fromisoformat(r['cancelled_at'])
    return reservations

@api_router.patch("/part-reservations/{reservation_id}/use")
async def use_part_reservation(reservation_id: str, current_user: User = Depends(get_current_user)):
    reservation = await db.part_reservations.find_one({"id": reservation_id}, {"_id": 0})
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")
    
    if reservation["status"] != "reserved":
        raise HTTPException(status_code=400, detail="Reservation is not in reserved status")
    
    await db.part_reservations.update_one(
        {"id": reservation_id},
        {"$set": {"status": "used", "used_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    await db.parts.update_one(
        {"id": reservation["part_id"]},
        {"$inc": {"quantity": -reservation["quantity"], "reserved_quantity": -reservation["quantity"]}}
    )
    
    work_order = await db.work_orders.find_one({"id": reservation["work_order_id"]}, {"_id": 0})
    if work_order:
        usage_obj = PartUsage(
            part_id=reservation["part_id"],
            work_order_id=reservation["work_order_id"],
            ticket_id=work_order["ticket_id"],
            quantity=reservation["quantity"],
            serial_numbers=reservation.get("serial_numbers", []),
            created_by=current_user.id
        )
        doc = usage_obj.model_dump()
        doc['created_at'] = doc['created_at'].isoformat()
        await db.part_usage.insert_one(doc)
    
    return {"status": "success", "message": "Reservation used successfully"}

@api_router.patch("/part-reservations/{reservation_id}/cancel")
async def cancel_part_reservation(reservation_id: str, current_user: User = Depends(get_current_user)):
    reservation = await db.part_reservations.find_one({"id": reservation_id}, {"_id": 0})
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")
    
    if reservation["status"] != "reserved":
        raise HTTPException(status_code=400, detail="Reservation is not in reserved status")
    
    await db.part_reservations.update_one(
        {"id": reservation_id},
        {"$set": {"status": "cancelled", "cancelled_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    await db.parts.update_one(
        {"id": reservation["part_id"]},
        {"$inc": {"reserved_quantity": -reservation["quantity"]}}
    )
    
    return {"status": "success", "message": "Reservation cancelled successfully"}

@api_router.post("/part-returns", response_model=PartReturn)
async def create_part_return(part_return: PartReturnCreate, current_user: User = Depends(get_current_user)):
    part = await db.parts.find_one({"id": part_return.part_id}, {"_id": 0})
    if not part:
        raise HTTPException(status_code=404, detail="Part not found")
    
    return_obj = PartReturn(**part_return.model_dump(), created_by=current_user.id)
    doc = return_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.part_returns.insert_one(doc)
    
    if part_return.return_type == "return_to_stock" and part_return.condition in ["good", "new"]:
        await db.parts.update_one(
            {"id": part_return.part_id},
            {
                "$inc": {"quantity": part_return.quantity},
                "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
            }
        )
        
        if part.get('has_serial') and part_return.serial_numbers:
            await db.serialized_parts.update_many(
                {"serial_number": {"$in": part_return.serial_numbers}},
                {"$set": {"status": "in_stock", "condition": part_return.condition, "updated_at": datetime.now(timezone.utc).isoformat()}}
            )
    elif part_return.return_type == "scrap":
        if part.get('has_serial') and part_return.serial_numbers:
            await db.serialized_parts.update_many(
                {"serial_number": {"$in": part_return.serial_numbers}},
                {"$set": {"status": "scrapped", "updated_at": datetime.now(timezone.utc).isoformat()}}
            )
    
    return return_obj

@api_router.get("/part-returns", response_model=List[PartReturn])
async def get_part_returns(
    part_id: Optional[str] = None,
    work_order_id: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    query = {}
    if part_id:
        query["part_id"] = part_id
    if work_order_id:
        query["work_order_id"] = work_order_id
    
    returns = await db.part_returns.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    for r in returns:
        if isinstance(r['created_at'], str):
            r['created_at'] = datetime.fromisoformat(r['created_at'])
    return returns

@api_router.get("/parts/alerts/low-stock")
async def get_low_stock_alerts(current_user: User = Depends(get_current_user)):
    parts = await db.parts.find({"is_active": True}, {"_id": 0}).to_list(1000)
    
    alerts = []
    for part in parts:
        available = part["quantity"] - part.get("reserved_quantity", 0)
        if available <= part["min_stock"]:
            alerts.append({
                "part_id": part["id"],
                "part_number": part["part_number"],
                "name": part["name"],
                "category": part["category"],
                "current_quantity": part["quantity"],
                "reserved_quantity": part.get("reserved_quantity", 0),
                "available_quantity": available,
                "min_stock": part["min_stock"],
                "shortage": part["min_stock"] - available,
                "severity": "critical" if available <= 0 else "warning" if available <= part["min_stock"] / 2 else "info"
            })
    
    alerts.sort(key=lambda x: x["shortage"], reverse=True)
    return alerts

@api_router.post("/part-usage", response_model=PartUsage)
async def add_part_usage(usage: PartUsageCreate, current_user: User = Depends(get_current_user)):
    part = await db.parts.find_one({"id": usage.part_id}, {"_id": 0})
    if not part:
        raise HTTPException(status_code=404, detail="Part not found")
    
    available = part["quantity"] - part.get("reserved_quantity", 0)
    if available < usage.quantity:
        raise HTTPException(status_code=400, detail=f"Insufficient stock. Available: {available}")
    
    work_order = await db.work_orders.find_one({"id": usage.work_order_id}, {"_id": 0})
    if not work_order:
        raise HTTPException(status_code=404, detail="Work order not found")
    
    usage_obj = PartUsage(
        **usage.model_dump(),
        ticket_id=work_order["ticket_id"],
        created_by=current_user.id
    )
    doc = usage_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.part_usage.insert_one(doc)
    
    await db.parts.update_one(
        {"id": usage.part_id},
        {
            "$inc": {"quantity": -usage.quantity},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
        }
    )
    
    if part.get('has_serial') and usage.serial_numbers:
        await db.serialized_parts.update_many(
            {"serial_number": {"$in": usage.serial_numbers}},
            {
                "$set": {
                    "status": "used",
                    "assigned_to_work_order": usage.work_order_id,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
    
    movement_obj = StockMovement(
        part_id=usage.part_id,
        movement_type="usage",
        quantity=usage.quantity,
        serial_numbers=usage.serial_numbers,
        reference_type="work_order",
        reference_id=usage.work_order_id,
        reason=f"Used in work order",
        created_by=current_user.id
    )
    movement_doc = movement_obj.model_dump()
    movement_doc['created_at'] = movement_doc['created_at'].isoformat()
    await db.stock_movements.insert_one(movement_doc)
    
    return usage_obj

@api_router.get("/part-usage", response_model=List[PartUsage])
async def get_part_usage(
    work_order_id: Optional[str] = None,
    part_id: Optional[str] = None,
    ticket_id: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    query = {}
    if work_order_id:
        query["work_order_id"] = work_order_id
    if part_id:
        query["part_id"] = part_id
    if ticket_id:
        query["ticket_id"] = ticket_id
    
    usage_list = await db.part_usage.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    for u in usage_list:
        if isinstance(u['created_at'], str):
            u['created_at'] = datetime.fromisoformat(u['created_at'])
    return usage_list

@api_router.post("/rma", response_model=RMA)
async def create_rma(rma: RMACreate, current_user: User = Depends(get_current_user)):
    rma_count = await db.rma.count_documents({})
    rma_number = f"RMA-{rma_count + 1:05d}"
    
    rma_obj = RMA(**rma.model_dump(), rma_number=rma_number)
    doc = rma_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    if doc['completed_at']:
        doc['completed_at'] = doc['completed_at'].isoformat()
    if doc['sent_date']:
        doc['sent_date'] = doc['sent_date'].isoformat()
    if doc['received_date']:
        doc['received_date'] = doc['received_date'].isoformat()
    await db.rma.insert_one(doc)
    return rma_obj

@api_router.get("/rma", response_model=List[RMA])
async def get_rma_list(current_user: User = Depends(get_current_user)):
    rma_list = await db.rma.find({}, {"_id": 0}).to_list(1000)
    for r in rma_list:
        if isinstance(r['created_at'], str):
            r['created_at'] = datetime.fromisoformat(r['created_at'])
        if r.get('completed_at') and isinstance(r['completed_at'], str):
            r['completed_at'] = datetime.fromisoformat(r['completed_at'])
        if r.get('sent_date') and isinstance(r['sent_date'], str):
            r['sent_date'] = datetime.fromisoformat(r['sent_date'])
        if r.get('received_date') and isinstance(r['received_date'], str):
            r['received_date'] = datetime.fromisoformat(r['received_date'])
    return rma_list

@api_router.patch("/rma/{rma_id}", response_model=RMA)
async def update_rma(rma_id: str, update: RMAUpdate, current_user: User = Depends(get_current_user)):
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    
    if update.status == "completed":
        update_data['completed_at'] = datetime.now(timezone.utc).isoformat()
        update_data['received_date'] = datetime.now(timezone.utc).isoformat()
    elif update.status == "shipped":
        update_data['sent_date'] = datetime.now(timezone.utc).isoformat()
    
    await db.rma.update_one({"id": rma_id}, {"$set": update_data})
    
    rma = await db.rma.find_one({"id": rma_id}, {"_id": 0})
    if isinstance(rma['created_at'], str):
        rma['created_at'] = datetime.fromisoformat(rma['created_at'])
    if rma.get('completed_at') and isinstance(rma['completed_at'], str):
        rma['completed_at'] = datetime.fromisoformat(rma['completed_at'])
    if rma.get('sent_date') and isinstance(rma['sent_date'], str):
        rma['sent_date'] = datetime.fromisoformat(rma['sent_date'])
    if rma.get('received_date') and isinstance(rma['received_date'], str):
        rma['received_date'] = datetime.fromisoformat(rma['received_date'])
    return RMA(**rma)

# ========== CONTRACT ENDPOINTS ==========
@api_router.post("/contracts", response_model=Contract)
async def create_contract(contract: ContractCreate, current_user: User = Depends(get_current_user)):
    contract_count = await db.contracts.count_documents({})
    contract_number = f"CNT-{contract_count + 1:05d}"
    
    contract_obj = Contract(
        **contract.model_dump(),
        contract_number=contract_number
    )
    doc = contract_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    await db.contracts.insert_one(doc)
    return contract_obj

@api_router.get("/contracts", response_model=List[Contract])
async def get_contracts(customer_id: Optional[str] = None, status: Optional[str] = None, current_user: User = Depends(get_current_user)):
    query = {}
    if customer_id:
        query["customer_id"] = customer_id
    if status:
        query["status"] = status
    
    contracts = await db.contracts.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    for c in contracts:
        if isinstance(c['created_at'], str):
            c['created_at'] = datetime.fromisoformat(c['created_at'])
        if isinstance(c['updated_at'], str):
            c['updated_at'] = datetime.fromisoformat(c['updated_at'])
    return contracts

@api_router.get("/contracts/{contract_id}", response_model=Contract)
async def get_contract(contract_id: str, current_user: User = Depends(get_current_user)):
    contract = await db.contracts.find_one({"id": contract_id}, {"_id": 0})
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    if isinstance(contract['created_at'], str):
        contract['created_at'] = datetime.fromisoformat(contract['created_at'])
    if isinstance(contract['updated_at'], str):
        contract['updated_at'] = datetime.fromisoformat(contract['updated_at'])
    return Contract(**contract)

@api_router.patch("/contracts/{contract_id}", response_model=Contract)
async def update_contract(contract_id: str, update: ContractUpdate, current_user: User = Depends(get_current_user)):
    contract = await db.contracts.find_one({"id": contract_id}, {"_id": 0})
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.contracts.update_one({"id": contract_id}, {"$set": update_data})
    
    updated = await db.contracts.find_one({"id": contract_id}, {"_id": 0})
    if isinstance(updated['created_at'], str):
        updated['created_at'] = datetime.fromisoformat(updated['created_at'])
    if isinstance(updated['updated_at'], str):
        updated['updated_at'] = datetime.fromisoformat(updated['updated_at'])
    return Contract(**updated)

@api_router.delete("/contracts/{contract_id}")
async def delete_contract(contract_id: str, current_user: User = Depends(get_current_user)):
    result = await db.contracts.delete_one({"id": contract_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Contract not found")
    return {"message": "Contract deleted"}

@api_router.get("/contracts/expiring/list")
async def get_expiring_contracts(days: int = 30, current_user: User = Depends(get_current_user)):
    """Get contracts expiring within specified days"""
    contracts = await db.contracts.find({"status": "active"}, {"_id": 0}).to_list(10000)
    
    now = datetime.now(timezone.utc)
    warning_date = now + timedelta(days=days)
    
    expiring = []
    for c in contracts:
        if c.get('end_date'):
            try:
                end_date = datetime.fromisoformat(c['end_date'].replace('Z', '+00:00'))
                if end_date.tzinfo is None:
                    end_date = end_date.replace(tzinfo=timezone.utc)
                
                if now <= end_date <= warning_date:
                    days_remaining = (end_date - now).days
                    expiring.append({**c, "days_remaining": days_remaining})
            except:
                pass
    
    expiring.sort(key=lambda x: x['days_remaining'])
    return expiring

@api_router.get("/reports/dashboard")
async def get_dashboard_stats(current_user: User = Depends(get_current_user)):
    total_tickets = await db.tickets.count_documents({})
    open_tickets = await db.tickets.count_documents({"status": "open"})
    in_progress = await db.tickets.count_documents({"status": "in_progress"})
    on_hold = await db.tickets.count_documents({"status": "on_hold"})
    resolved = await db.tickets.count_documents({"status": "resolved"})
    
    now = datetime.now(timezone.utc).isoformat()
    sla_risk = await db.tickets.count_documents({
        "status": {"$nin": ["resolved", "closed"]},
        "sla_deadline": {"$lt": now}
    })
    
    out_of_scope = await db.tickets.count_documents({"is_out_of_scope": True})
    
    total_customers = await db.customers.count_documents({})
    total_assets = await db.assets.count_documents({"is_spare": False})
    spare_assets = await db.assets.count_documents({"is_spare": True})
    active_work_orders = await db.work_orders.count_documents({"status": {"$in": ["scheduled", "in_progress"]}})
    active_rmas = await db.rma.count_documents({"status": {"$nin": ["completed", "rejected"]}})
    
    low_stock_parts = await db.parts.count_documents({"$expr": {"$lte": ["$quantity", "$min_stock"]}})
    
    return {
        "total_tickets": total_tickets,
        "open_tickets": open_tickets,
        "in_progress_tickets": in_progress,
        "on_hold_tickets": on_hold,
        "resolved_tickets": resolved,
        "sla_risk_tickets": sla_risk,
        "out_of_scope_tickets": out_of_scope,
        "total_customers": total_customers,
        "total_assets": total_assets,
        "spare_assets": spare_assets,
        "active_work_orders": active_work_orders,
        "active_rmas": active_rmas,
        "low_stock_parts": low_stock_parts
    }

@api_router.get("/reports/sla-compliance")
async def get_sla_compliance(start_date: Optional[str] = None, end_date: Optional[str] = None, current_user: User = Depends(get_current_user)):
    query = {"status": {"$in": ["resolved", "closed"]}}
    
    if start_date:
        query["created_at"] = {"$gte": start_date}
    if end_date:
        if "created_at" in query:
            query["created_at"]["$lte"] = end_date
        else:
            query["created_at"] = {"$lte": end_date}
    
    resolved_tickets = await db.tickets.find(query, {"_id": 0}).to_list(10000)
    
    total_resolved = len(resolved_tickets)
    sla_met = 0
    sla_breached = 0
    
    for ticket in resolved_tickets:
        if ticket.get('resolved_at') and ticket.get('sla_deadline'):
            resolved_time = datetime.fromisoformat(ticket['resolved_at']) if isinstance(ticket['resolved_at'], str) else ticket['resolved_at']
            sla_time = datetime.fromisoformat(ticket['sla_deadline']) if isinstance(ticket['sla_deadline'], str) else ticket['sla_deadline']
            
            if resolved_time <= sla_time:
                sla_met += 1
            else:
                sla_breached += 1
    
    compliance_rate = (sla_met / total_resolved * 100) if total_resolved > 0 else 0
    
    return {
        "total_resolved": total_resolved,
        "sla_met": sla_met,
        "sla_breached": sla_breached,
        "compliance_rate": round(compliance_rate, 2)
    }

@api_router.get("/reports/mttr")
async def get_mttr_report(start_date: Optional[str] = None, end_date: Optional[str] = None, current_user: User = Depends(get_current_user)):
    query = {"status": {"$in": ["resolved", "closed"]}, "resolved_at": {"$ne": None}}
    
    if start_date:
        query["created_at"] = {"$gte": start_date}
    if end_date:
        if "created_at" in query:
            query["created_at"]["$lte"] = end_date
        else:
            query["created_at"] = {"$lte": end_date}
    
    resolved_tickets = await db.tickets.find(query, {"_id": 0}).to_list(10000)
    
    total_resolution_time = 0
    count = 0
    resolution_times_by_priority = {"critical": [], "high": [], "medium": [], "low": []}
    
    for ticket in resolved_tickets:
        created = datetime.fromisoformat(ticket['created_at']) if isinstance(ticket['created_at'], str) else ticket['created_at']
        resolved = datetime.fromisoformat(ticket['resolved_at']) if isinstance(ticket['resolved_at'], str) else ticket['resolved_at']
        
        resolution_time = (resolved - created).total_seconds() / 3600
        total_resolution_time += resolution_time
        count += 1
        
        priority = ticket.get('priority', 'medium')
        if priority in resolution_times_by_priority:
            resolution_times_by_priority[priority].append(resolution_time)
    
    avg_mttr = (total_resolution_time / count) if count > 0 else 0
    
    avg_by_priority = {}
    for priority, times in resolution_times_by_priority.items():
        avg_by_priority[priority] = (sum(times) / len(times)) if times else 0
    
    return {
        "average_mttr_hours": round(avg_mttr, 2),
        "total_tickets": count,
        "mttr_by_priority": {
            "critical": round(avg_by_priority["critical"], 2),
            "high": round(avg_by_priority["high"], 2),
            "medium": round(avg_by_priority["medium"], 2),
            "low": round(avg_by_priority["low"], 2)
        }
    }

@api_router.get("/reports/category-analysis")
async def get_category_analysis(start_date: Optional[str] = None, end_date: Optional[str] = None, current_user: User = Depends(get_current_user)):
    query = {}
    
    if start_date:
        query["created_at"] = {"$gte": start_date}
    if end_date:
        if "created_at" in query:
            query["created_at"]["$lte"] = end_date
        else:
            query["created_at"] = {"$lte": end_date}
    
    tickets = await db.tickets.find(query, {"_id": 0}).to_list(10000)
    
    category_counts = {}
    priority_counts = {"critical": 0, "high": 0, "medium": 0, "low": 0}
    
    for ticket in tickets:
        category = ticket.get('category', 'other')
        category_counts[category] = category_counts.get(category, 0) + 1
        
        priority = ticket.get('priority', 'medium')
        if priority in priority_counts:
            priority_counts[priority] += 1
    
    category_list = [{"category": k, "count": v} for k, v in category_counts.items()]
    category_list.sort(key=lambda x: x['count'], reverse=True)
    
    return {
        "by_category": category_list,
        "by_priority": priority_counts
    }

@api_router.get("/reports/technician-performance")
async def get_technician_performance(start_date: Optional[str] = None, end_date: Optional[str] = None, current_user: User = Depends(get_current_user)):
    query = {}
    
    if start_date:
        query["created_at"] = {"$gte": start_date}
    if end_date:
        if "created_at" in query:
            query["created_at"]["$lte"] = end_date
        else:
            query["created_at"] = {"$lte": end_date}
    
    work_orders = await db.work_orders.find(query, {"_id": 0}).to_list(10000)
    tickets = await db.tickets.find(query, {"_id": 0}).to_list(10000)
    users = await db.users.find({"role": {"$in": ["technician", "admin"]}}, {"_id": 0}).to_list(1000)
    
    technician_stats = {}
    
    for user in users:
        technician_stats[user['id']] = {
            "name": user['full_name'],
            "assigned_tickets": 0,
            "completed_work_orders": 0,
            "total_time_spent": 0,
            "avg_resolution_time": 0
        }
    
    for ticket in tickets:
        assigned_to = ticket.get('assigned_to')
        if assigned_to and assigned_to in technician_stats:
            technician_stats[assigned_to]["assigned_tickets"] += 1
    
    for wo in work_orders:
        tech_id = wo.get('assigned_technician')
        if tech_id and tech_id in technician_stats:
            if wo.get('status') == 'completed':
                technician_stats[tech_id]["completed_work_orders"] += 1
            time_spent = wo.get('time_spent_minutes', 0)
            technician_stats[tech_id]["total_time_spent"] += time_spent
    
    result = []
    for tech_id, stats in technician_stats.items():
        if stats["completed_work_orders"] > 0:
            stats["avg_resolution_time"] = round(stats["total_time_spent"] / stats["completed_work_orders"], 2)
        result.append({
            "technician_id": tech_id,
            **stats
        })
    
    result.sort(key=lambda x: x['completed_work_orders'], reverse=True)
    
    return result

@api_router.get("/reports/technician-performance/{technician_id}")
async def get_technician_performance_detail(technician_id: str, start_date: Optional[str] = None, end_date: Optional[str] = None, current_user: User = Depends(get_current_user)):
    """Get detailed performance metrics for a specific technician"""
    user = await db.users.find_one({"id": technician_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Technician not found")
    
    query = {"assigned_technician": technician_id}
    ticket_query = {"assigned_to": technician_id}
    
    if start_date:
        query["created_at"] = {"$gte": start_date}
        ticket_query["created_at"] = {"$gte": start_date}
    if end_date:
        if "created_at" in query:
            query["created_at"]["$lte"] = end_date
            ticket_query["created_at"]["$lte"] = end_date
        else:
            query["created_at"] = {"$lte": end_date}
            ticket_query["created_at"] = {"$lte": end_date}
    
    work_orders = await db.work_orders.find(query, {"_id": 0}).to_list(10000)
    tickets = await db.tickets.find(ticket_query, {"_id": 0}).to_list(10000)
    
    total_work_orders = len(work_orders)
    completed_work_orders = len([wo for wo in work_orders if wo.get('status') == 'completed'])
    in_progress_work_orders = len([wo for wo in work_orders if wo.get('status') == 'in_progress'])
    
    total_time_spent = sum(wo.get('time_spent_minutes', 0) for wo in work_orders)
    avg_time_per_wo = round(total_time_spent / completed_work_orders, 2) if completed_work_orders > 0 else 0
    
    # Work type breakdown
    work_type_counts = {"onsite": 0, "remote": 0, "workshop": 0}
    for wo in work_orders:
        wt = wo.get('work_type', 'onsite')
        if wt in work_type_counts:
            work_type_counts[wt] += 1
    
    # Monthly trend
    monthly_trend = {}
    for wo in work_orders:
        if wo.get('created_at'):
            month = wo['created_at'][:7] if isinstance(wo['created_at'], str) else wo['created_at'].strftime("%Y-%m")
            monthly_trend[month] = monthly_trend.get(month, 0) + 1
    
    # Checklist completion rate
    total_checklist_items = 0
    completed_checklist_items = 0
    for wo in work_orders:
        checklist = wo.get('checklist', [])
        total_checklist_items += len(checklist)
        completed_checklist_items += len([item for item in checklist if item.get('completed')])
    
    checklist_completion_rate = round((completed_checklist_items / total_checklist_items * 100), 1) if total_checklist_items > 0 else 0
    
    # Customer satisfaction (based on completed without issues)
    satisfaction_score = round((completed_work_orders / total_work_orders * 100), 1) if total_work_orders > 0 else 0
    
    # Recent work orders
    recent_work_orders = sorted(work_orders, key=lambda x: x.get('created_at', ''), reverse=True)[:10]
    
    return {
        "technician_id": technician_id,
        "technician_name": user['full_name'],
        "summary": {
            "total_work_orders": total_work_orders,
            "completed_work_orders": completed_work_orders,
            "in_progress_work_orders": in_progress_work_orders,
            "assigned_tickets": len(tickets),
            "total_time_spent_minutes": total_time_spent,
            "avg_time_per_work_order": avg_time_per_wo,
            "checklist_completion_rate": checklist_completion_rate,
            "completion_rate": satisfaction_score
        },
        "work_type_breakdown": work_type_counts,
        "monthly_trend": [{"month": k, "count": v} for k, v in sorted(monthly_trend.items())],
        "recent_work_orders": recent_work_orders
    }

@api_router.get("/reports/service-report/{ticket_id}")
async def get_service_report(ticket_id: str, current_user: User = Depends(get_current_user)):
    """Generate a printable service report for a ticket"""
    ticket = await db.tickets.find_one({"id": ticket_id}, {"_id": 0})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    customer = await db.customers.find_one({"id": ticket['customer_id']}, {"_id": 0})
    asset = None
    if ticket.get('asset_id'):
        asset = await db.assets.find_one({"id": ticket['asset_id']}, {"_id": 0})
    
    work_orders = await db.work_orders.find({"ticket_id": ticket_id}, {"_id": 0}).to_list(100)
    comments = await db.ticket_comments.find({"ticket_id": ticket_id, "is_internal": False}, {"_id": 0}).to_list(1000)
    attachments = await db.attachments.find({"related_to": "ticket", "related_id": ticket_id}, {"_id": 0, "file_data": 0}).to_list(100)
    
    users = await db.users.find({}, {"_id": 0, "id": 1, "full_name": 1}).to_list(1000)
    user_map = {u['id']: u['full_name'] for u in users}
    
    # Parts used across all work orders
    parts_used = []
    for wo in work_orders:
        for part in wo.get('parts_used', []):
            parts_used.append(part)
    
    total_time_spent = sum(wo.get('time_spent_minutes', 0) for wo in work_orders)
    
    return {
        "ticket": {
            "ticket_number": ticket['ticket_number'],
            "title": ticket['title'],
            "description": ticket['description'],
            "category": ticket.get('category'),
            "priority": ticket.get('priority'),
            "status": ticket.get('status'),
            "created_at": ticket.get('created_at'),
            "resolved_at": ticket.get('resolved_at'),
            "created_by": user_map.get(ticket.get('created_by'))
        },
        "customer": {
            "name": customer.get('name') if customer else None,
            "company": customer.get('company') if customer else None,
            "email": customer.get('email') if customer else None,
            "phone": customer.get('phone') if customer else None,
            "address": customer.get('address') if customer else None
        },
        "asset": {
            "device_type": asset.get('device_type') if asset else None,
            "brand": asset.get('brand') if asset else None,
            "model": asset.get('model') if asset else None,
            "serial_number": asset.get('serial_number') if asset else None,
            "hostname": asset.get('hostname') if asset else None,
            "ip_address": asset.get('ip_address') if asset else None
        } if asset else None,
        "work_orders": [{
            "work_type": wo.get('work_type'),
            "status": wo.get('status'),
            "scheduled_date": wo.get('scheduled_date'),
            "technician": user_map.get(wo.get('assigned_technician')),
            "service_report": wo.get('service_report'),
            "time_spent_minutes": wo.get('time_spent_minutes', 0),
            "checklist": wo.get('checklist', []),
            "completed_at": wo.get('completed_at')
        } for wo in work_orders],
        "comments": [{
            "user_name": c.get('user_name'),
            "comment": c.get('comment'),
            "created_at": c.get('created_at')
        } for c in comments],
        "attachments": [{
            "filename": a.get('filename'),
            "file_type": a.get('file_type')
        } for a in attachments],
        "summary": {
            "total_work_orders": len(work_orders),
            "total_time_spent_minutes": total_time_spent,
            "parts_used_count": len(parts_used)
        }
    }

@api_router.get("/reports/ticket-aging")
async def get_ticket_aging(current_user: User = Depends(get_current_user)):
    open_tickets = await db.tickets.find({"status": {"$nin": ["resolved", "closed"]}}, {"_id": 0}).to_list(10000)
    
    now = datetime.now(timezone.utc)
    age_groups = {
        "0-24h": 0,
        "1-3d": 0,
        "3-7d": 0,
        "7-14d": 0,
        "14d+": 0
    }
    
    for ticket in open_tickets:
        created = datetime.fromisoformat(ticket['created_at']) if isinstance(ticket['created_at'], str) else ticket['created_at']
        age_hours = (now - created).total_seconds() / 3600
        
        if age_hours <= 24:
            age_groups["0-24h"] += 1
        elif age_hours <= 72:
            age_groups["1-3d"] += 1
        elif age_hours <= 168:
            age_groups["3-7d"] += 1
        elif age_hours <= 336:
            age_groups["7-14d"] += 1
        else:
            age_groups["14d+"] += 1
    
    return age_groups

@api_router.get("/reports/trend-analysis")
async def get_trend_analysis(days: int = 30, current_user: User = Depends(get_current_user)):
    end_date = datetime.now(timezone.utc)
    start_date = end_date - timedelta(days=days)
    
    tickets = await db.tickets.find({
        "created_at": {"$gte": start_date.isoformat()}
    }, {"_id": 0}).to_list(10000)
    
    daily_counts = {}
    for i in range(days):
        date = (start_date + timedelta(days=i)).strftime("%Y-%m-%d")
        daily_counts[date] = {"created": 0, "resolved": 0}
    
    for ticket in tickets:
        created = datetime.fromisoformat(ticket['created_at']) if isinstance(ticket['created_at'], str) else ticket['created_at']
        created_date = created.strftime("%Y-%m-%d")
        
        if created_date in daily_counts:
            daily_counts[created_date]["created"] += 1
        
        if ticket.get('resolved_at'):
            resolved = datetime.fromisoformat(ticket['resolved_at']) if isinstance(ticket['resolved_at'], str) else ticket['resolved_at']
            resolved_date = resolved.strftime("%Y-%m-%d")
            if resolved_date in daily_counts:
                daily_counts[resolved_date]["resolved"] += 1
    
    trend_data = [{"date": k, **v} for k, v in sorted(daily_counts.items())]
    
    return trend_data

@api_router.get("/reports/customer-analysis")
async def get_customer_analysis(current_user: User = Depends(get_current_user)):
    customers = await db.customers.find({}, {"_id": 0}).to_list(1000)
    tickets = await db.tickets.find({}, {"_id": 0}).to_list(10000)
    
    customer_stats = {}
    
    for customer in customers:
        customer_stats[customer['id']] = {
            "name": customer['name'],
            "company": customer.get('company', ''),
            "total_tickets": 0,
            "open_tickets": 0,
            "sla_breaches": 0
        }
    
    now = datetime.now(timezone.utc).isoformat()
    
    for ticket in tickets:
        customer_id = ticket.get('customer_id')
        if customer_id and customer_id in customer_stats:
            customer_stats[customer_id]["total_tickets"] += 1
            
            if ticket['status'] not in ["resolved", "closed"]:
                customer_stats[customer_id]["open_tickets"] += 1
                
                if ticket.get('sla_deadline') and ticket['sla_deadline'] < now:
                    customer_stats[customer_id]["sla_breaches"] += 1
    
    result = [{"customer_id": k, **v} for k, v in customer_stats.items() if v["total_tickets"] > 0]
    result.sort(key=lambda x: x['total_tickets'], reverse=True)
    
    return result[:20]

@api_router.get("/reports/part-consumption")
async def get_part_consumption(start_date: Optional[str] = None, end_date: Optional[str] = None, current_user: User = Depends(get_current_user)):
    query = {}
    
    if start_date:
        query["created_at"] = {"$gte": start_date}
    if end_date:
        if "created_at" in query:
            query["created_at"]["$lte"] = end_date
        else:
            query["created_at"] = {"$lte": end_date}
    
    part_usage = await db.part_usage.find(query, {"_id": 0}).to_list(10000)
    parts = await db.parts.find({}, {"_id": 0}).to_list(1000)
    
    part_map = {p['id']: p for p in parts}
    consumption = {}
    
    for usage in part_usage:
        part_id = usage['part_id']
        if part_id in part_map:
            part_name = part_map[part_id]['name']
            part_number = part_map[part_id]['part_number']
            
            if part_id not in consumption:
                consumption[part_id] = {
                    "part_name": part_name,
                    "part_number": part_number,
                    "total_used": 0,
                    "usage_count": 0
                }
            
            consumption[part_id]["total_used"] += usage['quantity']
            consumption[part_id]["usage_count"] += 1
    
    result = [{"part_id": k, **v} for k, v in consumption.items()]
    result.sort(key=lambda x: x['total_used'], reverse=True)
    
    return result

@api_router.get("/users", response_model=List[User])
async def get_users(current_user: User = Depends(get_current_user)):
    users = await db.users.find({}, {"_id": 0, "hashed_password": 0}).to_list(1000)
    for u in users:
        if isinstance(u['created_at'], str):
            u['created_at'] = datetime.fromisoformat(u['created_at'])
    return users

# Notification Endpoints
@api_router.get("/notifications/settings")
async def get_notification_settings_endpoint(current_user: User = Depends(get_current_user)):
    settings = await get_notification_settings()
    return settings.model_dump()

@api_router.patch("/notifications/settings")
async def update_notification_settings(update: NotificationSettingsUpdate, current_user: User = Depends(get_current_user)):
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    existing = await db.notification_settings.find_one({}, {"_id": 0})
    if existing:
        await db.notification_settings.update_one({}, {"$set": update_data})
    else:
        default_settings = NotificationSettings()
        doc = default_settings.model_dump()
        doc.update(update_data)
        doc['updated_at'] = doc['updated_at'] if isinstance(doc['updated_at'], str) else doc['updated_at'].isoformat()
        await db.notification_settings.insert_one(doc)
    
    return await get_notification_settings_endpoint(current_user)

@api_router.get("/notifications", response_model=List[Notification])
async def get_notifications(
    recipient_id: Optional[str] = None,
    notification_type: Optional[str] = None,
    channel: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 100,
    current_user: User = Depends(get_current_user)
):
    query = {}
    if recipient_id:
        query["recipient_id"] = recipient_id
    if notification_type:
        query["notification_type"] = notification_type
    if channel:
        query["channel"] = channel
    if status:
        query["status"] = status
    
    notifications = await db.notifications.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    for n in notifications:
        if isinstance(n['created_at'], str):
            n['created_at'] = datetime.fromisoformat(n['created_at'])
        if n.get('sent_at') and isinstance(n['sent_at'], str):
            n['sent_at'] = datetime.fromisoformat(n['sent_at'])
    return notifications

@api_router.post("/notifications/send")
async def send_manual_notification(notification: NotificationCreate, current_user: User = Depends(get_current_user)):
    results = []
    
    if notification.channel == "email" and notification.recipient_email:
        result = await send_email_notification(
            notification.recipient_email,
            notification.subject or "Bildirim",
            notification.content
        )
        
        notification_obj = Notification(**notification.model_dump())
        notification_obj.status = "sent" if result["status"] == "sent" else "failed"
        notification_obj.sent_at = datetime.now(timezone.utc) if result["status"] == "sent" else None
        notification_obj.error_message = result.get("error")
        
        doc = notification_obj.model_dump()
        doc['created_at'] = doc['created_at'].isoformat()
        if doc['sent_at']:
            doc['sent_at'] = doc['sent_at'].isoformat()
        await db.notifications.insert_one(doc)
        
        results.append({"channel": "email", **result})
    
    if notification.channel == "sms" and notification.recipient_phone:
        result = await send_sms_notification(notification.recipient_phone, notification.content)
        
        notification_obj = Notification(**notification.model_dump())
        notification_obj.status = "sent" if result["status"] == "sent" else "failed"
        notification_obj.sent_at = datetime.now(timezone.utc) if result["status"] == "sent" else None
        notification_obj.error_message = result.get("error")
        
        doc = notification_obj.model_dump()
        doc['created_at'] = doc['created_at'].isoformat()
        if doc['sent_at']:
            doc['sent_at'] = doc['sent_at'].isoformat()
        await db.notifications.insert_one(doc)
        
        results.append({"channel": "sms", **result})
    
    return {"results": results}

@api_router.post("/notifications/test-email")
async def test_email_notification(current_user: User = Depends(get_current_user)):
    result = await send_email_notification(
        current_user.email,
        "NetworkOps Test E-postası",
        """
        <html>
        <body style="font-family: Arial, sans-serif; padding: 20px;">
            <h2 style="color: #2563eb;">Test E-postası</h2>
            <p>Bu bir test e-postasıdır. E-posta bildirimleri başarıyla çalışıyor!</p>
            <p style="color: #6b7280;">NetworkOps - Teknik Servis Yönetimi</p>
        </body>
        </html>
        """
    )
    return result

@api_router.post("/notifications/test-sms")
async def test_sms_notification(phone: str, current_user: User = Depends(get_current_user)):
    result = await send_sms_notification(phone, "NetworkOps test SMS mesaji. Bildirimler basariyla calisiyor!")
    return result

@api_router.get("/notifications/templates")
async def get_notification_templates(current_user: User = Depends(get_current_user)):
    return {
        "email_templates": list(EMAIL_TEMPLATES.keys()),
        "sms_templates": list(SMS_TEMPLATES.keys())
    }

@api_router.post("/notifications/sla-check")
async def check_sla_and_notify(current_user: User = Depends(get_current_user)):
    settings = await get_notification_settings()
    if not settings.notify_on_sla_risk:
        return {"message": "SLA notifications disabled", "notified": 0}
    
    now = datetime.now(timezone.utc)
    warning_time = now + timedelta(hours=2)
    
    at_risk_tickets = await db.tickets.find({
        "status": {"$nin": ["resolved", "closed"]},
        "sla_deadline": {"$lt": warning_time.isoformat(), "$gt": now.isoformat()}
    }, {"_id": 0}).to_list(100)
    
    notified = 0
    for ticket in at_risk_tickets:
        if ticket.get('assigned_to'):
            assignee = await db.users.find_one({"id": ticket['assigned_to']}, {"_id": 0})
            if assignee:
                customer = await db.customers.find_one({"id": ticket['customer_id']}, {"_id": 0})
                
                template_data = {
                    "ticket_number": ticket['ticket_number'],
                    "title": ticket['title'],
                    "sla_deadline": ticket.get('sla_deadline', 'N/A'),
                    "assignee_name": assignee.get('full_name', 'Bilinmeyen'),
                    "customer_name": customer.get('name', 'Bilinmeyen') if customer else 'Bilinmeyen'
                }
                
                await send_notification(
                    "sla_risk",
                    template_data,
                    recipient_email=assignee.get('email'),
                    recipient_id=assignee.get('id'),
                    reference_type="ticket",
                    reference_id=ticket['id']
                )
                notified += 1
    
    return {"message": f"SLA check completed", "notified": notified}

# SLA Profile Endpoints
@api_router.get("/sla-profiles", response_model=List[SLAProfile])
async def get_sla_profiles(current_user: User = Depends(get_current_user)):
    profiles = await db.sla_profiles.find({"is_active": True}, {"_id": 0}).to_list(100)
    for p in profiles:
        if isinstance(p['created_at'], str):
            p['created_at'] = datetime.fromisoformat(p['created_at'])
    return profiles

@api_router.post("/sla-profiles", response_model=SLAProfile)
async def create_sla_profile(profile: SLAProfileCreate, current_user: User = Depends(get_current_user)):
    existing = await db.sla_profiles.find_one({"code": profile.code}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="SLA profile code already exists")
    
    if profile.is_default:
        await db.sla_profiles.update_many({}, {"$set": {"is_default": False}})
    
    profile_obj = SLAProfile(**profile.model_dump())
    doc = profile_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.sla_profiles.insert_one(doc)
    return profile_obj

@api_router.patch("/sla-profiles/{profile_id}", response_model=SLAProfile)
async def update_sla_profile(profile_id: str, update: SLAProfileUpdate, current_user: User = Depends(get_current_user)):
    profile = await db.sla_profiles.find_one({"id": profile_id}, {"_id": 0})
    if not profile:
        raise HTTPException(status_code=404, detail="SLA profile not found")
    
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    
    if update.is_default:
        await db.sla_profiles.update_many({}, {"$set": {"is_default": False}})
    
    await db.sla_profiles.update_one({"id": profile_id}, {"$set": update_data})
    
    updated = await db.sla_profiles.find_one({"id": profile_id}, {"_id": 0})
    if isinstance(updated['created_at'], str):
        updated['created_at'] = datetime.fromisoformat(updated['created_at'])
    return SLAProfile(**updated)

@api_router.delete("/sla-profiles/{profile_id}")
async def delete_sla_profile(profile_id: str, current_user: User = Depends(get_current_user)):
    await db.sla_profiles.update_one({"id": profile_id}, {"$set": {"is_active": False}})
    return {"status": "success"}

# Business Hours Endpoints
@api_router.get("/business-hours", response_model=List[BusinessHours])
async def get_business_hours(current_user: User = Depends(get_current_user)):
    hours = await db.business_hours.find({"is_active": True}, {"_id": 0}).to_list(100)
    for h in hours:
        if isinstance(h['created_at'], str):
            h['created_at'] = datetime.fromisoformat(h['created_at'])
    return hours

@api_router.post("/business-hours", response_model=BusinessHours)
async def create_business_hours(hours: BusinessHoursCreate, current_user: User = Depends(get_current_user)):
    if hours.is_default:
        await db.business_hours.update_many({}, {"$set": {"is_default": False}})
    
    hours_obj = BusinessHours(**hours.model_dump())
    doc = hours_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.business_hours.insert_one(doc)
    return hours_obj

@api_router.patch("/business-hours/{hours_id}", response_model=BusinessHours)
async def update_business_hours(hours_id: str, update: BusinessHoursUpdate, current_user: User = Depends(get_current_user)):
    hours = await db.business_hours.find_one({"id": hours_id}, {"_id": 0})
    if not hours:
        raise HTTPException(status_code=404, detail="Business hours not found")
    
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    
    if update.is_default:
        await db.business_hours.update_many({}, {"$set": {"is_default": False}})
    
    await db.business_hours.update_one({"id": hours_id}, {"$set": update_data})
    
    updated = await db.business_hours.find_one({"id": hours_id}, {"_id": 0})
    if isinstance(updated['created_at'], str):
        updated['created_at'] = datetime.fromisoformat(updated['created_at'])
    return BusinessHours(**updated)

# SLA Pause/Resume Endpoints
@api_router.post("/tickets/{ticket_id}/pause-sla")
async def pause_ticket_sla(ticket_id: str, reason: str, current_user: User = Depends(get_current_user)):
    ticket = await db.tickets.find_one({"id": ticket_id}, {"_id": 0})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    if ticket.get('sla_paused'):
        raise HTTPException(status_code=400, detail="SLA already paused")
    
    pause = SLAPause(ticket_id=ticket_id, reason=reason, paused_by=current_user.id)
    doc = pause.model_dump()
    doc['paused_at'] = doc['paused_at'].isoformat()
    await db.sla_pauses.insert_one(doc)
    
    await db.tickets.update_one(
        {"id": ticket_id},
        {"$set": {"sla_paused": True, "sla_pause_reason": reason, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"status": "success", "message": "SLA paused", "pause_id": pause.id}

@api_router.post("/tickets/{ticket_id}/resume-sla")
async def resume_ticket_sla(ticket_id: str, current_user: User = Depends(get_current_user)):
    ticket = await db.tickets.find_one({"id": ticket_id}, {"_id": 0})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    if not ticket.get('sla_paused'):
        raise HTTPException(status_code=400, detail="SLA is not paused")
    
    active_pause = await db.sla_pauses.find_one({"ticket_id": ticket_id, "resumed_at": None}, {"_id": 0})
    
    if active_pause:
        paused_at = datetime.fromisoformat(active_pause['paused_at']) if isinstance(active_pause['paused_at'], str) else active_pause['paused_at']
        now = datetime.now(timezone.utc)
        pause_duration = int((now - paused_at).total_seconds() / 60)
        
        await db.sla_pauses.update_one(
            {"id": active_pause['id']},
            {"$set": {"resumed_at": now.isoformat(), "resumed_by": current_user.id, "pause_duration_minutes": pause_duration}}
        )
        
        total_pause = ticket.get('total_pause_minutes', 0) + pause_duration
        
        if ticket.get('sla_deadline'):
            old_deadline = datetime.fromisoformat(ticket['sla_deadline']) if isinstance(ticket['sla_deadline'], str) else ticket['sla_deadline']
            new_deadline = old_deadline + timedelta(minutes=pause_duration)
            
            await db.tickets.update_one(
                {"id": ticket_id},
                {"$set": {"sla_paused": False, "sla_pause_reason": None, "total_pause_minutes": total_pause, "sla_deadline": new_deadline.isoformat(), "updated_at": now.isoformat()}}
            )
        else:
            await db.tickets.update_one(
                {"id": ticket_id},
                {"$set": {"sla_paused": False, "sla_pause_reason": None, "total_pause_minutes": total_pause, "updated_at": now.isoformat()}}
            )
    
    return {"status": "success", "message": "SLA resumed"}

@api_router.get("/tickets/{ticket_id}/sla-history")
async def get_ticket_sla_history(ticket_id: str, current_user: User = Depends(get_current_user)):
    pauses = await db.sla_pauses.find({"ticket_id": ticket_id}, {"_id": 0}).sort("paused_at", -1).to_list(100)
    return pauses

# ========== TICKET TIMELINE/HISTORY ENDPOINT ==========
@api_router.get("/tickets/{ticket_id}/history")
async def get_ticket_history(ticket_id: str, current_user: User = Depends(get_current_user)):
    """Get chronological history of all events for a ticket"""
    ticket = await db.tickets.find_one({"id": ticket_id}, {"_id": 0})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    history_events = []
    
    # 1. Ticket Creation Event
    history_events.append({
        "id": f"created-{ticket_id}",
        "event_type": "created",
        "description": "Ticket oluşturuldu",
        "timestamp": ticket['created_at'],
        "user_id": ticket.get('created_by'),
        "user_name": None,
        "metadata": {
            "status": ticket.get('status'),
            "priority": ticket.get('priority'),
            "category": ticket.get('category')
        }
    })
    
    # Get user names for events
    users = await db.users.find({}, {"_id": 0, "id": 1, "full_name": 1}).to_list(1000)
    user_map = {u['id']: u['full_name'] for u in users}
    
    # 2. Comments
    comments = await db.ticket_comments.find({"ticket_id": ticket_id}, {"_id": 0}).to_list(1000)
    for comment in comments:
        history_events.append({
            "id": f"comment-{comment['id']}",
            "event_type": "comment",
            "description": "Yorum eklendi" if not comment.get('is_internal') else "İç not eklendi",
            "timestamp": comment['created_at'],
            "user_id": comment.get('user_id'),
            "user_name": comment.get('user_name'),
            "metadata": {
                "comment": comment['comment'],
                "is_internal": comment.get('is_internal', False)
            }
        })
    
    # 3. Status Changes (from ticket status history if stored, otherwise we just have current status)
    status_changes = await db.ticket_status_history.find({"ticket_id": ticket_id}, {"_id": 0}).to_list(1000)
    for change in status_changes:
        history_events.append({
            "id": f"status-{change.get('id', str(uuid.uuid4()))}",
            "event_type": "status_change",
            "description": f"Durum değişti: {change.get('old_status', '?')} → {change.get('new_status', '?')}",
            "timestamp": change['changed_at'],
            "user_id": change.get('changed_by'),
            "user_name": user_map.get(change.get('changed_by')),
            "metadata": {
                "old_status": change.get('old_status'),
                "new_status": change.get('new_status')
            }
        })
    
    # 4. Assignment Changes
    assignment_changes = await db.ticket_assignment_history.find({"ticket_id": ticket_id}, {"_id": 0}).to_list(1000)
    for change in assignment_changes:
        old_user = user_map.get(change.get('old_assignee'), 'Atanmamış')
        new_user = user_map.get(change.get('new_assignee'), 'Atanmamış')
        history_events.append({
            "id": f"assign-{change.get('id', str(uuid.uuid4()))}",
            "event_type": "assignment",
            "description": f"Atama değişti: {old_user} → {new_user}",
            "timestamp": change['changed_at'],
            "user_id": change.get('changed_by'),
            "user_name": user_map.get(change.get('changed_by')),
            "metadata": {
                "old_assignee": change.get('old_assignee'),
                "new_assignee": change.get('new_assignee'),
                "old_assignee_name": old_user,
                "new_assignee_name": new_user
            }
        })
    
    # 5. SLA Pause/Resume Events
    sla_pauses = await db.sla_pauses.find({"ticket_id": ticket_id}, {"_id": 0}).to_list(1000)
    for pause in sla_pauses:
        history_events.append({
            "id": f"sla-pause-{pause.get('id', str(uuid.uuid4()))}",
            "event_type": "sla_paused",
            "description": f"SLA duraklatıldı: {pause.get('reason', '')}",
            "timestamp": pause['paused_at'],
            "user_id": pause.get('paused_by'),
            "user_name": user_map.get(pause.get('paused_by')),
            "metadata": {"reason": pause.get('reason')}
        })
        if pause.get('resumed_at'):
            history_events.append({
                "id": f"sla-resume-{pause.get('id', str(uuid.uuid4()))}",
                "event_type": "sla_resumed",
                "description": f"SLA devam ettirildi ({pause.get('pause_duration_minutes', 0)} dakika)",
                "timestamp": pause['resumed_at'],
                "user_id": pause.get('resumed_by'),
                "user_name": user_map.get(pause.get('resumed_by')),
                "metadata": {"duration_minutes": pause.get('pause_duration_minutes')}
            })
    
    # 6. Attachments
    attachments = await db.attachments.find({"related_to": "ticket", "related_id": ticket_id}, {"_id": 0}).to_list(1000)
    for att in attachments:
        history_events.append({
            "id": f"attachment-{att['id']}",
            "event_type": "attachment",
            "description": f"Dosya eklendi: {att['filename']}",
            "timestamp": att['created_at'],
            "user_id": att.get('uploaded_by'),
            "user_name": user_map.get(att.get('uploaded_by')),
            "metadata": {
                "filename": att['filename'],
                "file_type": att['file_type'],
                "file_size": att['file_size']
            }
        })
    
    # 7. Work Orders Created
    work_orders = await db.work_orders.find({"ticket_id": ticket_id}, {"_id": 0}).to_list(100)
    for wo in work_orders:
        history_events.append({
            "id": f"wo-created-{wo['id']}",
            "event_type": "work_order_created",
            "description": f"İş emri oluşturuldu",
            "timestamp": wo['created_at'],
            "user_id": None,
            "user_name": None,
            "metadata": {
                "work_order_id": wo['id'],
                "work_type": wo.get('work_type'),
                "technician": user_map.get(wo.get('assigned_technician'))
            }
        })
        if wo.get('completed_at'):
            history_events.append({
                "id": f"wo-completed-{wo['id']}",
                "event_type": "work_order_completed",
                "description": f"İş emri tamamlandı",
                "timestamp": wo['completed_at'],
                "user_id": wo.get('assigned_technician'),
                "user_name": user_map.get(wo.get('assigned_technician')),
                "metadata": {
                    "work_order_id": wo['id'],
                    "time_spent_minutes": wo.get('time_spent_minutes', 0)
                }
            })
    
    # 8. Resolution Event (if resolved)
    if ticket.get('resolved_at'):
        history_events.append({
            "id": f"resolved-{ticket_id}",
            "event_type": "resolved",
            "description": "Ticket çözümlendi",
            "timestamp": ticket['resolved_at'],
            "user_id": None,
            "user_name": None,
            "metadata": {"final_status": ticket.get('status')}
        })
    
    # Sort by timestamp
    def get_timestamp(event):
        ts = event.get('timestamp')
        if isinstance(ts, str):
            return datetime.fromisoformat(ts.replace('Z', '+00:00'))
        return ts if ts else datetime.min.replace(tzinfo=timezone.utc)
    
    history_events.sort(key=get_timestamp)
    
    return history_events

# Role & Permission Endpoints
@api_router.get("/permissions")
async def get_permissions(current_user: User = Depends(get_current_user)):
    return DEFAULT_PERMISSIONS

@api_router.get("/roles", response_model=List[Role])
async def get_roles(current_user: User = Depends(get_current_user)):
    roles = await db.roles.find({"is_active": True}, {"_id": 0}).to_list(100)
    
    if not roles:
        for role_data in DEFAULT_ROLES:
            role = Role(**role_data)
            doc = role.model_dump()
            doc['created_at'] = doc['created_at'].isoformat()
            await db.roles.insert_one(doc)
        
        roles = await db.roles.find({"is_active": True}, {"_id": 0}).to_list(100)
    
    for r in roles:
        if isinstance(r['created_at'], str):
            r['created_at'] = datetime.fromisoformat(r['created_at'])
    return roles

@api_router.post("/roles", response_model=Role)
async def create_role(role: RoleCreate, current_user: User = Depends(get_current_user)):
    existing = await db.roles.find_one({"code": role.code}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Role code already exists")
    
    role_obj = Role(**role.model_dump())
    doc = role_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.roles.insert_one(doc)
    return role_obj

@api_router.patch("/roles/{role_id}", response_model=Role)
async def update_role(role_id: str, update: RoleUpdate, current_user: User = Depends(get_current_user)):
    role = await db.roles.find_one({"id": role_id}, {"_id": 0})
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    
    if role.get('is_system'):
        raise HTTPException(status_code=400, detail="System roles cannot be modified")
    
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    await db.roles.update_one({"id": role_id}, {"$set": update_data})
    
    updated = await db.roles.find_one({"id": role_id}, {"_id": 0})
    if isinstance(updated['created_at'], str):
        updated['created_at'] = datetime.fromisoformat(updated['created_at'])
    return Role(**updated)

@api_router.delete("/roles/{role_id}")
async def delete_role(role_id: str, current_user: User = Depends(get_current_user)):
    role = await db.roles.find_one({"id": role_id}, {"_id": 0})
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    
    if role.get('is_system'):
        raise HTTPException(status_code=400, detail="System roles cannot be deleted")
    
    await db.roles.update_one({"id": role_id}, {"$set": {"is_active": False}})
    return {"status": "success"}

# Asset Update and History Endpoints
@api_router.patch("/assets/{asset_id}")
async def update_asset(asset_id: str, update: AssetUpdate, current_user: User = Depends(get_current_user)):
    asset = await db.assets.find_one({"id": asset_id}, {"_id": 0})
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    
    for field, new_value in update_data.items():
        old_value = asset.get(field)
        if old_value != new_value and field not in ['notes']:
            history = AssetHistory(
                asset_id=asset_id,
                event_type="field_change",
                event_description=f"{field} değiştirildi",
                old_value=str(old_value) if old_value else None,
                new_value=str(new_value),
                created_by=current_user.id
            )
            doc = history.model_dump()
            doc['created_at'] = doc['created_at'].isoformat()
            await db.asset_history.insert_one(doc)
    
    await db.assets.update_one({"id": asset_id}, {"$set": update_data})
    
    updated = await db.assets.find_one({"id": asset_id}, {"_id": 0})
    if isinstance(updated['created_at'], str):
        updated['created_at'] = datetime.fromisoformat(updated['created_at'])
    return updated

@api_router.get("/assets/{asset_id}/history")
async def get_asset_history(asset_id: str, current_user: User = Depends(get_current_user)):
    history = await db.asset_history.find({"asset_id": asset_id}, {"_id": 0}).sort("created_at", -1).to_list(500)
    
    tickets = await db.tickets.find({"asset_id": asset_id}, {"_id": 0}).to_list(500)
    for t in tickets:
        history.append({
            "id": f"ticket-{t['id']}",
            "asset_id": asset_id,
            "event_type": "ticket_opened",
            "event_description": f"Ticket açıldı: {t['ticket_number']} - {t['title']}",
            "reference_type": "ticket",
            "reference_id": t['id'],
            "created_by": t.get('created_by'),
            "created_at": t['created_at']
        })
    
    history.sort(key=lambda x: x['created_at'] if isinstance(x['created_at'], str) else x['created_at'].isoformat(), reverse=True)
    
    return history

# ========== CUSTOMER PORTAL ENDPOINTS ==========

async def get_current_portal_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current customer portal user from JWT token"""
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        user_type: str = payload.get("type")
        
        if user_id is None or user_type != "portal":
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user = await db.portal_users.find_one({"id": user_id}, {"_id": 0})
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return CustomerPortalUser(**user)

@api_router.post("/portal/register", response_model=CustomerPortalUser)
async def register_portal_user(user: CustomerPortalUserCreate):
    """Register a new customer portal user"""
    # Check if customer exists
    customer = await db.customers.find_one({"id": user.customer_id}, {"_id": 0})
    if not customer:
        raise HTTPException(status_code=404, detail="Müşteri bulunamadı")
    
    # Check if email already registered
    existing = await db.portal_users.find_one({"email": user.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Bu e-posta adresi zaten kayıtlı")
    
    hashed_password = get_password_hash(user.password)
    user_dict = user.model_dump()
    user_dict.pop("password")
    user_obj = CustomerPortalUserInDB(**user_dict, hashed_password=hashed_password)
    
    doc = user_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.portal_users.insert_one(doc)
    
    return CustomerPortalUser(**user_obj.model_dump())

@api_router.post("/portal/login", response_model=CustomerPortalToken)
async def login_portal_user(user_login: CustomerPortalLogin):
    """Login customer portal user"""
    user = await db.portal_users.find_one({"email": user_login.email}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Geçersiz kimlik bilgileri")
    
    if not verify_password(user_login.password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Geçersiz kimlik bilgileri")
    
    if not user.get("is_active", True):
        raise HTTPException(status_code=401, detail="Hesabınız devre dışı bırakılmış")
    
    access_token = create_access_token(data={"sub": user["id"], "type": "portal"})
    user_obj = CustomerPortalUser(**user)
    return CustomerPortalToken(
        access_token=access_token,
        token_type="bearer",
        user=user_obj,
        customer_id=user["customer_id"]
    )

@api_router.get("/portal/me", response_model=CustomerPortalUser)
async def get_portal_me(current_user: CustomerPortalUser = Depends(get_current_portal_user)):
    """Get current portal user info"""
    return current_user

@api_router.get("/portal/tickets")
async def get_portal_tickets(current_user: CustomerPortalUser = Depends(get_current_portal_user)):
    """Get tickets for customer portal user"""
    tickets = await db.tickets.find(
        {"customer_id": current_user.customer_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    for t in tickets:
        if isinstance(t.get('created_at'), str):
            t['created_at'] = datetime.fromisoformat(t['created_at'])
        if isinstance(t.get('updated_at'), str):
            t['updated_at'] = datetime.fromisoformat(t['updated_at'])
        if t.get('sla_deadline') and isinstance(t['sla_deadline'], str):
            t['sla_deadline'] = datetime.fromisoformat(t['sla_deadline'])
        if t.get('resolved_at') and isinstance(t['resolved_at'], str):
            t['resolved_at'] = datetime.fromisoformat(t['resolved_at'])
    
    return tickets

@api_router.get("/portal/tickets/{ticket_id}")
async def get_portal_ticket(ticket_id: str, current_user: CustomerPortalUser = Depends(get_current_portal_user)):
    """Get specific ticket for customer portal user"""
    ticket = await db.tickets.find_one(
        {"id": ticket_id, "customer_id": current_user.customer_id},
        {"_id": 0}
    )
    
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket bulunamadı")
    
    if isinstance(ticket.get('created_at'), str):
        ticket['created_at'] = datetime.fromisoformat(ticket['created_at'])
    if isinstance(ticket.get('updated_at'), str):
        ticket['updated_at'] = datetime.fromisoformat(ticket['updated_at'])
    
    return ticket

@api_router.post("/portal/tickets")
async def create_portal_ticket(ticket: CustomerPortalTicketCreate, current_user: CustomerPortalUser = Depends(get_current_portal_user)):
    """Create a new ticket from customer portal"""
    ticket_count = await db.tickets.count_documents({})
    ticket_number = f"TKT-{ticket_count + 1:05d}"
    
    sla_hours = {"low": 48, "medium": 24, "high": 8, "critical": 4}
    hours = sla_hours.get(ticket.priority, 24)
    sla_deadline = datetime.now(timezone.utc) + timedelta(hours=hours)
    
    ticket_obj = Ticket(
        ticket_number=ticket_number,
        customer_id=current_user.customer_id,
        asset_id=ticket.asset_id,
        title=ticket.title,
        description=ticket.description,
        category=ticket.category,
        priority=ticket.priority,
        channel="portal",
        created_by=current_user.id,
        sla_deadline=sla_deadline
    )
    
    doc = ticket_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    if doc['sla_deadline']:
        doc['sla_deadline'] = doc['sla_deadline'].isoformat()
    
    await db.tickets.insert_one(doc)
    
    # Send notification
    settings = await get_notification_settings()
    if settings.notify_on_ticket_created:
        customer = await db.customers.find_one({"id": current_user.customer_id}, {"_id": 0})
        if customer:
            priority_labels = {"low": "Düşük", "medium": "Orta", "high": "Yüksek", "critical": "Kritik"}
            template_data = {
                "ticket_number": ticket_number,
                "title": ticket.title,
                "priority": priority_labels.get(ticket.priority, ticket.priority),
                "customer_name": customer.get('name', 'Değerli Müşteri')
            }
            asyncio.create_task(send_notification(
                "ticket_created",
                template_data,
                recipient_email=customer.get('email'),
                recipient_phone=customer.get('phone'),
                reference_type="ticket",
                reference_id=ticket_obj.id
            ))
    
    return ticket_obj

@api_router.get("/portal/tickets/{ticket_id}/comments")
async def get_portal_ticket_comments(ticket_id: str, current_user: CustomerPortalUser = Depends(get_current_portal_user)):
    """Get comments for a ticket (excluding internal comments)"""
    ticket = await db.tickets.find_one(
        {"id": ticket_id, "customer_id": current_user.customer_id},
        {"_id": 0}
    )
    
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket bulunamadı")
    
    comments = await db.ticket_comments.find(
        {"ticket_id": ticket_id, "is_internal": False},
        {"_id": 0}
    ).sort("created_at", 1).to_list(1000)
    
    for c in comments:
        if isinstance(c['created_at'], str):
            c['created_at'] = datetime.fromisoformat(c['created_at'])
    
    return comments

@api_router.post("/portal/tickets/{ticket_id}/comments")
async def add_portal_ticket_comment(ticket_id: str, comment: TicketCommentCreate, current_user: CustomerPortalUser = Depends(get_current_portal_user)):
    """Add a comment to a ticket from portal"""
    ticket = await db.tickets.find_one(
        {"id": ticket_id, "customer_id": current_user.customer_id},
        {"_id": 0}
    )
    
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket bulunamadı")
    
    comment_obj = TicketComment(
        ticket_id=ticket_id,
        user_id=current_user.id,
        user_name=current_user.full_name,
        comment=comment.comment,
        is_internal=False
    )
    
    doc = comment_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.ticket_comments.insert_one(doc)
    
    return comment_obj

@api_router.get("/portal/assets")
async def get_portal_assets(current_user: CustomerPortalUser = Depends(get_current_portal_user)):
    """Get assets for customer portal user"""
    assets = await db.assets.find(
        {"customer_id": current_user.customer_id, "is_spare": False},
        {"_id": 0}
    ).to_list(1000)
    
    for a in assets:
        if isinstance(a['created_at'], str):
            a['created_at'] = datetime.fromisoformat(a['created_at'])
    
    return assets

@api_router.get("/portal/customer")
async def get_portal_customer(current_user: CustomerPortalUser = Depends(get_current_portal_user)):
    """Get customer info for portal user"""
    customer = await db.customers.find_one(
        {"id": current_user.customer_id},
        {"_id": 0}
    )
    
    if not customer:
        raise HTTPException(status_code=404, detail="Müşteri bulunamadı")
    
    if isinstance(customer['created_at'], str):
        customer['created_at'] = datetime.fromisoformat(customer['created_at'])
    
    return customer

# ========== IMAP EMAIL INTEGRATION ENDPOINTS ==========

# Encryption key for IMAP passwords
ENCRYPTION_KEY = os.environ.get('ENCRYPTION_KEY', Fernet.generate_key().decode())

def encrypt_password(password: str) -> str:
    """Encrypt password for secure storage"""
    try:
        f = Fernet(ENCRYPTION_KEY.encode() if isinstance(ENCRYPTION_KEY, str) else ENCRYPTION_KEY)
        return f.encrypt(password.encode()).decode()
    except Exception:
        # Fallback: base64 encoding if Fernet key is invalid
        return base64.b64encode(password.encode()).decode()

def decrypt_password(encrypted_password: str) -> str:
    """Decrypt password from storage"""
    try:
        f = Fernet(ENCRYPTION_KEY.encode() if isinstance(ENCRYPTION_KEY, str) else ENCRYPTION_KEY)
        return f.decrypt(encrypted_password.encode()).decode()
    except Exception:
        # Fallback: base64 decoding
        try:
            return base64.b64decode(encrypted_password.encode()).decode()
        except:
            return encrypted_password

def decode_email_header(header: str) -> str:
    """Decode email header handling different encodings"""
    if not header:
        return ""
    try:
        decoded_parts = decode_header(header)
        decoded_string = ""
        for part, encoding in decoded_parts:
            if isinstance(part, bytes):
                decoded_string += part.decode(encoding or "utf-8", errors="ignore")
            else:
                decoded_string += str(part)
        return decoded_string
    except Exception:
        return str(header)

def parse_email_sender(sender: str) -> Tuple[str, Optional[str]]:
    """Extract email and name from sender field"""
    import re
    match = re.match(r"^([^<]*)<([^>]+)>$", sender.strip())
    if match:
        name = match.group(1).strip() or None
        email_addr = match.group(2).strip()
        return email_addr, name
    return sender.strip(), None

def extract_email_body(message) -> Tuple[str, Optional[str]]:
    """Extract plain text and HTML body from email"""
    body_text = ""
    body_html = ""
    
    if message.is_multipart():
        for part in message.walk():
            content_type = part.get_content_type()
            content_disposition = str(part.get("Content-Disposition", ""))
            
            if "attachment" not in content_disposition:
                try:
                    payload = part.get_payload(decode=True)
                    if payload:
                        charset = part.get_content_charset() or "utf-8"
                        decoded = payload.decode(charset, errors="ignore")
                        if content_type == "text/plain":
                            body_text = decoded
                        elif content_type == "text/html":
                            body_html = decoded
                except:
                    pass
    else:
        try:
            payload = message.get_payload(decode=True)
            if payload:
                charset = message.get_content_charset() or "utf-8"
                body_text = payload.decode(charset, errors="ignore")
        except:
            pass
    
    return body_text or body_html, body_html

async def fetch_emails_from_imap(config: dict) -> List[dict]:
    """Fetch unread emails from IMAP server"""
    emails = []
    connection = None
    
    try:
        decrypted_password = decrypt_password(config.get("password", ""))
        
        if config.get("encryption_type", "SSL").upper() == "SSL":
            connection = imaplib.IMAP4_SSL(config["server"], config.get("port", 993))
        else:
            connection = imaplib.IMAP4(config["server"], config.get("port", 143))
            connection.starttls()
        
        connection.login(config["username"], decrypted_password)
        connection.select(config.get("folder", "INBOX"))
        
        status, message_ids = connection.search(None, "UNSEEN")
        
        if status == "OK" and message_ids[0]:
            for msg_id in message_ids[0].split()[:50]:  # Limit to 50 emails
                try:
                    status, msg_data = connection.fetch(msg_id, "(RFC822)")
                    
                    if status == "OK":
                        email_message = email_lib.message_from_bytes(msg_data[0][1])
                        
                        subject = decode_email_header(email_message.get("Subject", "No Subject"))
                        sender = email_message.get("From", "")
                        received_date = email_message.get("Date", "")
                        message_id_header = email_message.get("Message-ID", str(msg_id.decode()))
                        
                        sender_email, sender_name = parse_email_sender(sender)
                        body_text, body_html = extract_email_body(email_message)
                        
                        # Parse date
                        try:
                            from email.utils import parsedate_to_datetime
                            parsed_date = parsedate_to_datetime(received_date)
                        except:
                            parsed_date = datetime.now(timezone.utc)
                        
                        emails.append({
                            "message_id": message_id_header,
                            "imap_message_id": msg_id.decode(),
                            "sender_email": sender_email,
                            "sender_name": sender_name,
                            "subject": subject,
                            "body": body_text,
                            "html_body": body_html,
                            "received_date": parsed_date
                        })
                        
                        # Mark as read
                        connection.store(msg_id, "+FLAGS", "\\Seen")
                except Exception as e:
                    logging.error(f"Error processing email {msg_id}: {str(e)}")
    
    except Exception as e:
        logging.error(f"IMAP connection error: {str(e)}")
    
    finally:
        if connection:
            try:
                connection.close()
                connection.logout()
            except:
                pass
    
    return emails

async def process_imap_emails():
    """Background task to process emails from all active IMAP configs"""
    try:
        configs = await db.imap_configs.find({"is_active": True}, {"_id": 0}).to_list(100)
        
        for config in configs:
            try:
                emails = await fetch_emails_from_imap(config)
                
                for email_data in emails:
                    # Check if email already processed
                    existing = await db.email_tickets.find_one(
                        {"email_message_id": email_data["message_id"]},
                        {"_id": 0}
                    )
                    
                    if not existing:
                        # Store email record
                        email_ticket = EmailTicket(
                            imap_config_id=config["id"],
                            email_message_id=email_data["message_id"],
                            sender_email=email_data["sender_email"],
                            sender_name=email_data.get("sender_name"),
                            subject=email_data["subject"],
                            body=email_data["body"],
                            html_body=email_data.get("html_body"),
                            received_date=email_data["received_date"]
                        )
                        
                        doc = email_ticket.model_dump()
                        doc['created_at'] = doc['created_at'].isoformat()
                        doc['received_date'] = doc['received_date'].isoformat()
                        
                        # Create ticket if auto_create_ticket is enabled
                        if config.get("auto_create_ticket", True):
                            # Find customer by email
                            customer = await db.customers.find_one(
                                {"email": email_data["sender_email"]},
                                {"_id": 0}
                            )
                            
                            if customer:
                                ticket_count = await db.tickets.count_documents({})
                                ticket_number = f"TKT-{ticket_count + 1:05d}"
                                
                                priority = config.get("default_priority", "medium")
                                sla_hours = {"low": 48, "medium": 24, "high": 8, "critical": 4}
                                hours = sla_hours.get(priority, 24)
                                sla_deadline = datetime.now(timezone.utc) + timedelta(hours=hours)
                                
                                ticket_obj = Ticket(
                                    ticket_number=ticket_number,
                                    customer_id=customer["id"],
                                    title=email_data["subject"][:200],
                                    description=email_data["body"][:5000],
                                    category=config.get("default_category", "email"),
                                    priority=priority,
                                    channel="email",
                                    created_by="system",
                                    sla_deadline=sla_deadline
                                )
                                
                                ticket_doc = ticket_obj.model_dump()
                                ticket_doc['created_at'] = ticket_doc['created_at'].isoformat()
                                ticket_doc['updated_at'] = ticket_doc['updated_at'].isoformat()
                                if ticket_doc['sla_deadline']:
                                    ticket_doc['sla_deadline'] = ticket_doc['sla_deadline'].isoformat()
                                
                                await db.tickets.insert_one(ticket_doc)
                                
                                doc['ticket_id'] = ticket_obj.id
                                doc['status'] = 'processed'
                                
                                logging.info(f"Created ticket {ticket_number} from email")
                        
                        await db.email_tickets.insert_one(doc)
                
                # Update last_checked
                await db.imap_configs.update_one(
                    {"id": config["id"]},
                    {"$set": {"last_checked": datetime.now(timezone.utc).isoformat()}}
                )
            
            except Exception as e:
                logging.error(f"Error processing IMAP config {config.get('id')}: {str(e)}")
    
    except Exception as e:
        logging.error(f"Error in process_imap_emails: {str(e)}")

@api_router.post("/imap-configs", response_model=IMAPConfig)
async def create_imap_config(config: IMAPConfigCreate, current_user: User = Depends(get_current_user)):
    """Create a new IMAP configuration"""
    config_dict = config.model_dump()
    config_dict["password"] = encrypt_password(config.password)
    
    config_obj = IMAPConfig(**config_dict)
    doc = config_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.imap_configs.insert_one(doc)
    
    # Return without password
    config_obj.password = "********"
    return config_obj

@api_router.get("/imap-configs")
async def get_imap_configs(current_user: User = Depends(get_current_user)):
    """Get all IMAP configurations"""
    configs = await db.imap_configs.find({}, {"_id": 0}).to_list(100)
    
    for c in configs:
        c["password"] = "********"
        if isinstance(c.get('created_at'), str):
            c['created_at'] = datetime.fromisoformat(c['created_at'])
        if c.get('last_checked') and isinstance(c['last_checked'], str):
            c['last_checked'] = datetime.fromisoformat(c['last_checked'])
    
    return configs

@api_router.get("/imap-configs/{config_id}")
async def get_imap_config(config_id: str, current_user: User = Depends(get_current_user)):
    """Get specific IMAP configuration"""
    config = await db.imap_configs.find_one({"id": config_id}, {"_id": 0})
    
    if not config:
        raise HTTPException(status_code=404, detail="IMAP yapılandırması bulunamadı")
    
    config["password"] = "********"
    return config

@api_router.patch("/imap-configs/{config_id}")
async def update_imap_config(config_id: str, update: IMAPConfigUpdate, current_user: User = Depends(get_current_user)):
    """Update IMAP configuration"""
    existing = await db.imap_configs.find_one({"id": config_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="IMAP yapılandırması bulunamadı")
    
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    
    if "password" in update_data:
        update_data["password"] = encrypt_password(update_data["password"])
    
    await db.imap_configs.update_one({"id": config_id}, {"$set": update_data})
    
    updated = await db.imap_configs.find_one({"id": config_id}, {"_id": 0})
    updated["password"] = "********"
    return updated

@api_router.delete("/imap-configs/{config_id}")
async def delete_imap_config(config_id: str, current_user: User = Depends(get_current_user)):
    """Delete IMAP configuration"""
    result = await db.imap_configs.delete_one({"id": config_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="IMAP yapılandırması bulunamadı")
    
    return {"message": "IMAP yapılandırması silindi"}

@api_router.post("/imap-configs/{config_id}/test")
async def test_imap_config(config_id: str, current_user: User = Depends(get_current_user)):
    """Test IMAP connection"""
    config = await db.imap_configs.find_one({"id": config_id}, {"_id": 0})
    
    if not config:
        raise HTTPException(status_code=404, detail="IMAP yapılandırması bulunamadı")
    
    try:
        decrypted_password = decrypt_password(config.get("password", ""))
        
        if config.get("encryption_type", "SSL").upper() == "SSL":
            connection = imaplib.IMAP4_SSL(config["server"], config.get("port", 993))
        else:
            connection = imaplib.IMAP4(config["server"], config.get("port", 143))
            connection.starttls()
        
        connection.login(config["username"], decrypted_password)
        connection.select(config.get("folder", "INBOX"))
        
        # Get mailbox status
        status, data = connection.status(config.get("folder", "INBOX"), "(MESSAGES UNSEEN)")
        
        connection.close()
        connection.logout()
        
        return {
            "success": True,
            "message": "IMAP bağlantısı başarılı",
            "mailbox_status": data[0].decode() if data else None
        }
    
    except Exception as e:
        return {
            "success": False,
            "message": f"IMAP bağlantı hatası: {str(e)}"
        }

@api_router.post("/imap-configs/check-emails")
async def trigger_email_check(background_tasks: BackgroundTasks, current_user: User = Depends(get_current_user)):
    """Manually trigger email check for all active IMAP configs"""
    background_tasks.add_task(process_imap_emails)
    return {"message": "E-posta kontrolü başlatıldı"}

@api_router.get("/email-tickets")
async def get_email_tickets(
    status: Optional[str] = None,
    imap_config_id: Optional[str] = None,
    limit: int = 100,
    current_user: User = Depends(get_current_user)
):
    """Get email tickets"""
    query = {}
    if status:
        query["status"] = status
    if imap_config_id:
        query["imap_config_id"] = imap_config_id
    
    tickets = await db.email_tickets.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    
    for t in tickets:
        if isinstance(t.get('created_at'), str):
            t['created_at'] = datetime.fromisoformat(t['created_at'])
        if isinstance(t.get('received_date'), str):
            t['received_date'] = datetime.fromisoformat(t['received_date'])
    
    return tickets

# ========== PORTAL USER MANAGEMENT (Admin) ==========

@api_router.get("/portal-users")
async def get_portal_users(customer_id: Optional[str] = None, current_user: User = Depends(get_current_user)):
    """Get all portal users (admin only)"""
    query = {}
    if customer_id:
        query["customer_id"] = customer_id
    
    users = await db.portal_users.find(query, {"_id": 0, "hashed_password": 0}).to_list(1000)
    
    for u in users:
        if isinstance(u.get('created_at'), str):
            u['created_at'] = datetime.fromisoformat(u['created_at'])
    
    return users

@api_router.patch("/portal-users/{user_id}/toggle-active")
async def toggle_portal_user_active(user_id: str, current_user: User = Depends(get_current_user)):
    """Toggle portal user active status"""
    user = await db.portal_users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Portal kullanıcısı bulunamadı")
    
    new_status = not user.get("is_active", True)
    await db.portal_users.update_one({"id": user_id}, {"$set": {"is_active": new_status}})
    
    return {"message": f"Kullanıcı {'aktif' if new_status else 'devre dışı'}", "is_active": new_status}

class PortalUserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    customer_id: Optional[str] = None

class PortalUserPasswordReset(BaseModel):
    new_password: str

@api_router.patch("/portal-users/{user_id}")
async def update_portal_user(user_id: str, update: PortalUserUpdate, current_user: User = Depends(get_current_user)):
    """Update portal user details"""
    user = await db.portal_users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Portal kullanıcısı bulunamadı")
    
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    
    if "email" in update_data and update_data["email"] != user.get("email"):
        existing = await db.portal_users.find_one({"email": update_data["email"], "id": {"$ne": user_id}})
        if existing:
            raise HTTPException(status_code=400, detail="Bu e-posta adresi zaten kullanımda")
    
    if update_data:
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        await db.portal_users.update_one({"id": user_id}, {"$set": update_data})
    
    updated = await db.portal_users.find_one({"id": user_id}, {"_id": 0, "hashed_password": 0})
    return updated

@api_router.post("/portal-users/{user_id}/reset-password")
async def reset_portal_user_password(user_id: str, data: PortalUserPasswordReset, current_user: User = Depends(get_current_user)):
    """Reset portal user password"""
    user = await db.portal_users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Portal kullanıcısı bulunamadı")
    
    if len(data.new_password) < 6:
        raise HTTPException(status_code=400, detail="Şifre en az 6 karakter olmalı")
    
    hashed = pwd_context.hash(data.new_password)
    await db.portal_users.update_one(
        {"id": user_id}, 
        {"$set": {"hashed_password": hashed, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "Şifre başarıyla değiştirildi"}

@api_router.delete("/portal-users/{user_id}")
async def delete_portal_user(user_id: str, current_user: User = Depends(get_current_user)):
    """Delete portal user"""
    result = await db.portal_users.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Portal kullanıcısı bulunamadı")
    
    return {"message": "Kullanıcı silindi"}

# ========== WHATSAPP INTEGRATION ENDPOINTS ==========

WHATSAPP_SERVICE_URL = os.environ.get('WHATSAPP_SERVICE_URL', 'http://localhost:3002')

class WhatsAppSendMessage(BaseModel):
    phone_number: str
    message: str

class WhatsAppIncomingMessage(BaseModel):
    phone_number: str
    message: str
    message_id: str
    timestamp: int

@api_router.get("/whatsapp/status")
async def get_whatsapp_status(current_user: User = Depends(get_current_user)):
    """Get WhatsApp connection status"""
    try:
        import httpx
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{WHATSAPP_SERVICE_URL}/status")
            return response.json()
    except Exception as e:
        return {"connected": False, "status": "service_unavailable", "error": str(e)}

@api_router.get("/whatsapp/qr")
async def get_whatsapp_qr(current_user: User = Depends(get_current_user)):
    """Get WhatsApp QR code for authentication"""
    try:
        import httpx
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(f"{WHATSAPP_SERVICE_URL}/qr")
            return response.json()
    except Exception as e:
        return {"qr": None, "status": "service_unavailable", "error": str(e)}

@api_router.post("/whatsapp/send")
async def send_whatsapp_message(msg: WhatsAppSendMessage, current_user: User = Depends(get_current_user)):
    """Send WhatsApp message"""
    try:
        import httpx
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{WHATSAPP_SERVICE_URL}/send",
                json={"phone_number": msg.phone_number, "message": msg.message}
            )
            result = response.json()
            
            # Log the message
            wa_message = WhatsAppMessage(
                phone_number=msg.phone_number,
                message=msg.message,
                direction="outbound",
                status="sent" if result.get("success") else "failed"
            )
            doc = wa_message.model_dump()
            doc['created_at'] = doc['created_at'].isoformat()
            await db.whatsapp_messages.insert_one(doc)
            
            return result
    except Exception as e:
        return {"success": False, "error": str(e)}

@api_router.post("/whatsapp/incoming")
async def handle_whatsapp_incoming(msg: WhatsAppIncomingMessage):
    """Handle incoming WhatsApp message (called by WhatsApp service)"""
    try:
        # Log the incoming message
        wa_message = WhatsAppMessage(
            phone_number=msg.phone_number,
            message=msg.message,
            direction="inbound",
            status="received"
        )
        doc = wa_message.model_dump()
        doc['created_at'] = doc['created_at'].isoformat()
        await db.whatsapp_messages.insert_one(doc)
        
        # Try to find customer by phone
        customer = await db.customers.find_one({"phone": {"$regex": msg.phone_number[-10:]}}, {"_id": 0})
        
        # Auto-reply based on message content
        message_lower = msg.message.lower()
        
        if any(word in message_lower for word in ["destek", "yardım", "help", "sorun", "arıza"]):
            if customer:
                return {
                    "reply": f"Merhaba {customer.get('name', '')}! Destek talebinizi aldık. En kısa sürede size dönüş yapacağız. Acil durumlar için 0850 XXX XX XX numarasını arayabilirsiniz."
                }
            else:
                return {
                    "reply": "Merhaba! Destek talebinizi aldık. Müşteri kaydınız bulunamadı. Lütfen firma adınızı ve iletişim bilgilerinizi paylaşır mısınız?"
                }
        
        elif any(word in message_lower for word in ["durum", "ticket", "talep"]):
            if customer:
                # Get open tickets for customer
                tickets = await db.tickets.find(
                    {"customer_id": customer["id"], "status": {"$nin": ["resolved", "closed"]}},
                    {"_id": 0}
                ).to_list(5)
                
                if tickets:
                    ticket_list = "\n".join([f"• {t['ticket_number']}: {t['title'][:30]}..." for t in tickets])
                    return {
                        "reply": f"Açık talepleriniz:\n{ticket_list}\n\nDetay için ticket numarasını yazabilirsiniz."
                    }
                else:
                    return {"reply": "Şu anda açık destek talebiniz bulunmuyor."}
            else:
                return {"reply": "Müşteri kaydınız bulunamadı. Lütfen firma adınızı paylaşır mısınız?"}
        
        else:
            return {
                "reply": "NetworkOps Destek Hattına hoş geldiniz!\n\n'destek' - Yeni talep oluştur\n'durum' - Açık talepleri görüntüle\n\nNasıl yardımcı olabiliriz?"
            }
    
    except Exception as e:
        logging.error(f"WhatsApp incoming error: {str(e)}")
        return {"reply": None}

@api_router.post("/whatsapp/disconnect")
async def disconnect_whatsapp(current_user: User = Depends(get_current_user)):
    """Disconnect WhatsApp"""
    try:
        import httpx
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(f"{WHATSAPP_SERVICE_URL}/disconnect")
            return response.json()
    except Exception as e:
        return {"success": False, "error": str(e)}

@api_router.post("/whatsapp/reconnect")
async def reconnect_whatsapp(current_user: User = Depends(get_current_user)):
    """Reconnect WhatsApp"""
    try:
        import httpx
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(f"{WHATSAPP_SERVICE_URL}/reconnect")
            return response.json()
    except Exception as e:
        return {"success": False, "error": str(e)}

@api_router.get("/whatsapp/messages")
async def get_whatsapp_messages(
    phone_number: Optional[str] = None,
    direction: Optional[str] = None,
    limit: int = 100,
    current_user: User = Depends(get_current_user)
):
    """Get WhatsApp message history"""
    query = {}
    if phone_number:
        query["phone_number"] = {"$regex": phone_number}
    if direction:
        query["direction"] = direction
    
    messages = await db.whatsapp_messages.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    
    for m in messages:
        if isinstance(m.get('created_at'), str):
            m['created_at'] = datetime.fromisoformat(m['created_at'])
    
    return messages

# ========== SYSTEM SETTINGS ENDPOINTS ==========

class SystemSettings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = "system_settings"
    # Company Info
    company_name: str = "NetOps Pro"
    company_slogan: str = "Teknik Servis Yönetimi"
    company_phone: Optional[str] = None
    company_email: Optional[str] = None
    company_address: Optional[str] = None
    company_website: Optional[str] = None
    # Logo & Branding
    logo_url: Optional[str] = None
    logo_dark_url: Optional[str] = None
    favicon_url: Optional[str] = None
    # Theme
    primary_color: str = "blue"  # blue, green, purple, orange, cyan
    # Portal Settings
    portal_title: str = "Müşteri Portalı"
    portal_welcome_message: str = "Destek taleplerinizi takip edin ve yönetin"
    portal_logo_url: Optional[str] = None
    # Footer
    footer_text: Optional[str] = None
    # Updated
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SystemSettingsUpdate(BaseModel):
    company_name: Optional[str] = None
    company_slogan: Optional[str] = None
    company_phone: Optional[str] = None
    company_email: Optional[str] = None
    company_address: Optional[str] = None
    company_website: Optional[str] = None
    logo_url: Optional[str] = None
    logo_dark_url: Optional[str] = None
    favicon_url: Optional[str] = None
    primary_color: Optional[str] = None
    portal_title: Optional[str] = None
    portal_welcome_message: Optional[str] = None
    portal_logo_url: Optional[str] = None
    footer_text: Optional[str] = None

@api_router.get("/settings/system")
async def get_system_settings():
    """Get system settings (public endpoint for frontend)"""
    settings = await db.system_settings.find_one({"id": "system_settings"}, {"_id": 0})
    
    if not settings:
        # Return default settings
        default = SystemSettings()
        return default.model_dump()
    
    return settings

@api_router.patch("/settings/system")
async def update_system_settings(update: SystemSettingsUpdate, current_user: User = Depends(get_current_user)):
    """Update system settings (admin only)"""
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    existing = await db.system_settings.find_one({"id": "system_settings"}, {"_id": 0})
    
    if existing:
        await db.system_settings.update_one(
            {"id": "system_settings"},
            {"$set": update_data}
        )
    else:
        # Create with defaults + updates
        default = SystemSettings()
        doc = default.model_dump()
        doc.update(update_data)
        doc['updated_at'] = datetime.now(timezone.utc).isoformat()
        await db.system_settings.insert_one(doc)
    
    updated = await db.system_settings.find_one({"id": "system_settings"}, {"_id": 0})
    return updated

@api_router.post("/settings/upload-logo")
async def upload_logo(file: UploadFile = File(...), logo_type: str = "main", current_user: User = Depends(get_current_user)):
    """Upload logo image"""
    # Validate file type
    allowed_types = ["image/png", "image/jpeg", "image/svg+xml", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Sadece PNG, JPEG, SVG veya WebP dosyaları yüklenebilir")
    
    # Read file content
    content = await file.read()
    
    # Max 2MB
    if len(content) > 2 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Dosya boyutu 2MB'dan küçük olmalı")
    
    # Convert to base64 data URL
    base64_content = base64.b64encode(content).decode('utf-8')
    data_url = f"data:{file.content_type};base64,{base64_content}"
    
    # Update settings based on logo type
    field_map = {
        "main": "logo_url",
        "dark": "logo_dark_url",
        "favicon": "favicon_url",
        "portal": "portal_logo_url"
    }
    
    field = field_map.get(logo_type, "logo_url")
    
    existing = await db.system_settings.find_one({"id": "system_settings"}, {"_id": 0})
    
    if existing:
        await db.system_settings.update_one(
            {"id": "system_settings"},
            {"$set": {field: data_url, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
    else:
        default = SystemSettings()
        doc = default.model_dump()
        doc[field] = data_url
        doc['updated_at'] = datetime.now(timezone.utc).isoformat()
        await db.system_settings.insert_one(doc)
    
    return {"success": True, "field": field, "message": "Logo yüklendi"}

@api_router.delete("/settings/remove-logo")
async def remove_logo(logo_type: str = "main", current_user: User = Depends(get_current_user)):
    """Remove logo"""
    field_map = {
        "main": "logo_url",
        "dark": "logo_dark_url",
        "favicon": "favicon_url",
        "portal": "portal_logo_url"
    }
    
    field = field_map.get(logo_type, "logo_url")
    
    await db.system_settings.update_one(
        {"id": "system_settings"},
        {"$set": {field: None, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"success": True, "message": "Logo kaldırıldı"}

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
