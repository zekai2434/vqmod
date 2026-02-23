"""
Customer routes
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List
from datetime import datetime, timezone
import uuid

from database import db
from models.user import User
from models.customer import Customer, CustomerCreate, Contact, ContactCreate, Location, LocationCreate
from services.auth import get_current_user

router = APIRouter(prefix="/customers", tags=["Customers"])

@router.post("", response_model=Customer)
async def create_customer(customer: CustomerCreate, current_user: User = Depends(get_current_user)):
    customer_dict = customer.model_dump()
    customer_dict["id"] = str(uuid.uuid4())
    customer_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.customers.insert_one(customer_dict)
    return Customer(**{k: v for k, v in customer_dict.items() if k != "_id"})

@router.get("", response_model=List[Customer])
async def get_customers(current_user: User = Depends(get_current_user)):
    customers = await db.customers.find({}, {"_id": 0}).to_list(1000)
    return [Customer(**c) for c in customers]

@router.get("/{customer_id}", response_model=Customer)
async def get_customer(customer_id: str, current_user: User = Depends(get_current_user)):
    customer = await db.customers.find_one({"id": customer_id}, {"_id": 0})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return Customer(**customer)


# Contact routes
contacts_router = APIRouter(prefix="/contacts", tags=["Contacts"])

@contacts_router.post("", response_model=Contact)
async def create_contact(contact: ContactCreate, current_user: User = Depends(get_current_user)):
    contact_dict = contact.model_dump()
    contact_dict["id"] = str(uuid.uuid4())
    contact_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.contacts.insert_one(contact_dict)
    return Contact(**{k: v for k, v in contact_dict.items() if k != "_id"})

@contacts_router.get("", response_model=List[Contact])
async def get_contacts(customer_id: str = None, current_user: User = Depends(get_current_user)):
    query = {"customer_id": customer_id} if customer_id else {}
    contacts = await db.contacts.find(query, {"_id": 0}).to_list(1000)
    return [Contact(**c) for c in contacts]


# Location routes
locations_router = APIRouter(prefix="/locations", tags=["Locations"])

@locations_router.post("", response_model=Location)
async def create_location(location: LocationCreate, current_user: User = Depends(get_current_user)):
    location_dict = location.model_dump()
    location_dict["id"] = str(uuid.uuid4())
    location_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.locations.insert_one(location_dict)
    return Location(**{k: v for k, v in location_dict.items() if k != "_id"})

@locations_router.get("", response_model=List[Location])
async def get_locations(customer_id: str = None, current_user: User = Depends(get_current_user)):
    query = {"customer_id": customer_id} if customer_id else {}
    locations = await db.locations.find(query, {"_id": 0}).to_list(1000)
    return [Location(**loc) for loc in locations]
