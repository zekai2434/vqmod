"""
Models package - All Pydantic models
"""
from models.user import User, UserInDB, UserCreate, UserLogin, Token
from models.customer import Customer, CustomerCreate, Contact, ContactCreate, Location, LocationCreate
from models.asset import Asset, AssetCreate, AssetUpdate, AssetHistory
from models.ticket import Ticket, TicketCreate, TicketUpdate, TicketComment, TicketCommentCreate, Attachment, AttachmentCreate
from models.invoice import (
    LedgerEntry, LedgerEntryCreate, LedgerEntryType,
    Invoice, InvoiceCreate, InvoiceUpdate, InvoiceStatus, InvoiceItem,
    Payment, PaymentCreate, PaymentMethod, PaymentStatus
)
from models.portal import (
    CustomerPortalUser, CustomerPortalUserInDB, CustomerPortalUserCreate,
    CustomerPortalLogin, CustomerPortalToken, CustomerPortalTicketCreate
)

__all__ = [
    # User
    'User', 'UserInDB', 'UserCreate', 'UserLogin', 'Token',
    # Customer
    'Customer', 'CustomerCreate', 'Contact', 'ContactCreate', 'Location', 'LocationCreate',
    # Asset
    'Asset', 'AssetCreate', 'AssetUpdate', 'AssetHistory',
    # Ticket
    'Ticket', 'TicketCreate', 'TicketUpdate', 'TicketComment', 'TicketCommentCreate', 'Attachment', 'AttachmentCreate',
    # Invoice & Finance
    'LedgerEntry', 'LedgerEntryCreate', 'LedgerEntryType',
    'Invoice', 'InvoiceCreate', 'InvoiceUpdate', 'InvoiceStatus', 'InvoiceItem',
    'Payment', 'PaymentCreate', 'PaymentMethod', 'PaymentStatus',
    # Portal
    'CustomerPortalUser', 'CustomerPortalUserInDB', 'CustomerPortalUserCreate',
    'CustomerPortalLogin', 'CustomerPortalToken', 'CustomerPortalTicketCreate',
]
