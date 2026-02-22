from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
from jose import JWTError, jwt
import base64

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
    is_spare: bool = False
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
    sla_deadline: Optional[datetime] = None
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

class TicketUpdate(BaseModel):
    status: Optional[str] = None
    assigned_to: Optional[str] = None
    priority: Optional[str] = None
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
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Part(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    part_number: str
    name: str
    category: str
    quantity: int = 0
    reserved_quantity: int = 0
    min_stock: int = 5
    unit_price: float = 0.0
    supplier: Optional[str] = None
    has_serial: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PartCreate(BaseModel):
    part_number: str
    name: str
    category: str
    quantity: int = 0
    min_stock: int = 5
    unit_price: float = 0.0
    supplier: Optional[str] = None
    has_serial: bool = False

class PartUsage(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    part_id: str
    work_order_id: str
    ticket_id: str
    quantity: int
    serial_numbers: List[str] = []
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PartUsageCreate(BaseModel):
    part_id: str
    work_order_id: str
    quantity: int
    serial_numbers: List[str] = []

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

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

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
    
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    if update.status == "resolved" or update.status == "closed":
        update_data['resolved_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.tickets.update_one({"id": ticket_id}, {"$set": update_data})
    
    updated_ticket = await db.tickets.find_one({"id": ticket_id}, {"_id": 0})
    if isinstance(updated_ticket.get('created_at'), str):
        updated_ticket['created_at'] = datetime.fromisoformat(updated_ticket['created_at'])
    if isinstance(updated_ticket.get('updated_at'), str):
        updated_ticket['updated_at'] = datetime.fromisoformat(updated_ticket['updated_at'])
    if updated_ticket.get('sla_deadline') and isinstance(updated_ticket['sla_deadline'], str):
        updated_ticket['sla_deadline'] = datetime.fromisoformat(updated_ticket['sla_deadline'])
    if updated_ticket.get('resolved_at') and isinstance(updated_ticket['resolved_at'], str):
        updated_ticket['resolved_at'] = datetime.fromisoformat(updated_ticket['resolved_at'])
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
    
    await db.work_orders.update_one({"id": work_order_id}, {"$set": update_data})
    
    work_order = await db.work_orders.find_one({"id": work_order_id}, {"_id": 0})
    if isinstance(work_order['created_at'], str):
        work_order['created_at'] = datetime.fromisoformat(work_order['created_at'])
    if work_order.get('completed_at') and isinstance(work_order['completed_at'], str):
        work_order['completed_at'] = datetime.fromisoformat(work_order['completed_at'])
    return WorkOrder(**work_order)

@api_router.post("/parts", response_model=Part)
async def create_part(part: PartCreate, current_user: User = Depends(get_current_user)):
    part_obj = Part(**part.model_dump())
    doc = part_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.parts.insert_one(doc)
    return part_obj

@api_router.get("/parts", response_model=List[Part])
async def get_parts(current_user: User = Depends(get_current_user)):
    parts = await db.parts.find({}, {"_id": 0}).to_list(1000)
    for p in parts:
        if isinstance(p['created_at'], str):
            p['created_at'] = datetime.fromisoformat(p['created_at'])
    return parts

@api_router.post("/part-usage", response_model=PartUsage)
async def add_part_usage(usage: PartUsageCreate, current_user: User = Depends(get_current_user)):
    part = await db.parts.find_one({"id": usage.part_id}, {"_id": 0})
    if not part:
        raise HTTPException(status_code=404, detail="Part not found")
    
    if part["quantity"] < usage.quantity:
        raise HTTPException(status_code=400, detail="Insufficient stock")
    
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
        {"$inc": {"quantity": -usage.quantity}}
    )
    
    return usage_obj

@api_router.get("/part-usage", response_model=List[PartUsage])
async def get_part_usage(work_order_id: Optional[str] = None, current_user: User = Depends(get_current_user)):
    query = {} if not work_order_id else {"work_order_id": work_order_id}
    usage_list = await db.part_usage.find(query, {"_id": 0}).to_list(1000)
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

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
