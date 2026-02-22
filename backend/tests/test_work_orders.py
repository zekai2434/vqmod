"""
Work Order API Tests - Testing İş Emri ve Saha Servis Yönetimi features
Tests: Work order CRUD, checklist, service report, status updates
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAuth:
    """Authentication tests"""
    
    def test_login_success(self):
        """Test login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@network.com",
            "password": "Test123!"
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["email"] == "test@network.com"
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "wrong@example.com",
            "password": "wrongpass"
        })
        assert response.status_code == 401


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "test@network.com",
        "password": "Test123!"
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Authentication failed - skipping authenticated tests")


@pytest.fixture(scope="module")
def headers(auth_token):
    """Get headers with auth token"""
    return {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }


class TestWorkOrderList:
    """Work Order List API tests"""
    
    def test_get_work_orders(self, headers):
        """Test fetching work orders list"""
        response = requests.get(f"{BASE_URL}/api/work-orders", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_get_tickets(self, headers):
        """Test fetching tickets list (needed for work order creation)"""
        response = requests.get(f"{BASE_URL}/api/tickets", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_get_users(self, headers):
        """Test fetching users list (needed for technician assignment)"""
        response = requests.get(f"{BASE_URL}/api/users", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_get_customers(self, headers):
        """Test fetching customers list"""
        response = requests.get(f"{BASE_URL}/api/customers", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


class TestWorkOrderCRUD:
    """Work Order CRUD operations tests"""
    
    @pytest.fixture(scope="class")
    def test_ticket(self, headers):
        """Create a test ticket for work order testing"""
        # First get a customer
        customers_response = requests.get(f"{BASE_URL}/api/customers", headers=headers)
        customers = customers_response.json()
        
        if not customers:
            # Create a test customer
            customer_response = requests.post(f"{BASE_URL}/api/customers", headers=headers, json={
                "name": "TEST_Customer",
                "company": "Test Company",
                "email": "test_customer@test.com",
                "phone": "1234567890"
            })
            customer_id = customer_response.json()["id"]
        else:
            customer_id = customers[0]["id"]
        
        # Create a test ticket
        ticket_response = requests.post(f"{BASE_URL}/api/tickets", headers=headers, json={
            "customer_id": customer_id,
            "title": "TEST_Ticket for Work Order",
            "description": "Test ticket description",
            "category": "hardware",
            "priority": "medium"
        })
        
        if ticket_response.status_code == 200:
            return ticket_response.json()
        return None
    
    @pytest.fixture(scope="class")
    def test_technician(self, headers):
        """Get a technician for work order assignment"""
        users_response = requests.get(f"{BASE_URL}/api/users", headers=headers)
        users = users_response.json()
        
        # Find a technician or admin
        for user in users:
            if user.get("role") in ["technician", "admin"]:
                return user
        return None
    
    def test_create_work_order_onsite(self, headers, test_ticket, test_technician):
        """Test creating an onsite work order"""
        if not test_ticket or not test_technician:
            pytest.skip("No test ticket or technician available")
        
        checklist = [
            {"id": str(uuid.uuid4()), "task": "Müşteri ile randevu onayı", "completed": False},
            {"id": str(uuid.uuid4()), "task": "Cihaz fiziksel kontrolü", "completed": False},
            {"id": str(uuid.uuid4()), "task": "Arıza tespiti ve analiz", "completed": False}
        ]
        
        response = requests.post(f"{BASE_URL}/api/work-orders", headers=headers, json={
            "ticket_id": test_ticket["id"],
            "assigned_technician": test_technician["id"],
            "work_type": "onsite",
            "scheduled_date": "2026-02-25T10:00:00",
            "notes": "TEST_Onsite work order",
            "checklist": checklist
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data["ticket_id"] == test_ticket["id"]
        assert data["assigned_technician"] == test_technician["id"]
        assert data["work_type"] == "onsite"
        assert data["status"] == "scheduled"
        assert len(data["checklist"]) == 3
    
    def test_create_work_order_remote(self, headers, test_ticket, test_technician):
        """Test creating a remote work order"""
        if not test_ticket or not test_technician:
            pytest.skip("No test ticket or technician available")
        
        response = requests.post(f"{BASE_URL}/api/work-orders", headers=headers, json={
            "ticket_id": test_ticket["id"],
            "assigned_technician": test_technician["id"],
            "work_type": "remote",
            "notes": "TEST_Remote work order"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data["work_type"] == "remote"
    
    def test_create_work_order_workshop(self, headers, test_ticket, test_technician):
        """Test creating a workshop work order"""
        if not test_ticket or not test_technician:
            pytest.skip("No test ticket or technician available")
        
        response = requests.post(f"{BASE_URL}/api/work-orders", headers=headers, json={
            "ticket_id": test_ticket["id"],
            "assigned_technician": test_technician["id"],
            "work_type": "workshop",
            "notes": "TEST_Workshop work order"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data["work_type"] == "workshop"
    
    def test_get_work_order_by_id(self, headers):
        """Test fetching a specific work order"""
        # First get list of work orders
        list_response = requests.get(f"{BASE_URL}/api/work-orders", headers=headers)
        work_orders = list_response.json()
        
        if not work_orders:
            pytest.skip("No work orders available")
        
        work_order_id = work_orders[0]["id"]
        response = requests.get(f"{BASE_URL}/api/work-orders/{work_order_id}", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == work_order_id


class TestWorkOrderChecklist:
    """Work Order Checklist functionality tests"""
    
    def test_update_checklist(self, headers):
        """Test updating checklist items"""
        # Get a work order
        list_response = requests.get(f"{BASE_URL}/api/work-orders", headers=headers)
        work_orders = list_response.json()
        
        if not work_orders:
            pytest.skip("No work orders available")
        
        # Find a work order with checklist
        work_order = None
        for wo in work_orders:
            if wo.get("checklist") and len(wo["checklist"]) > 0:
                work_order = wo
                break
        
        if not work_order:
            pytest.skip("No work order with checklist available")
        
        # Update checklist - mark first item as completed
        updated_checklist = work_order["checklist"].copy()
        updated_checklist[0]["completed"] = True
        updated_checklist[0]["completed_at"] = "2026-02-22T12:00:00"
        
        response = requests.patch(f"{BASE_URL}/api/work-orders/{work_order['id']}", headers=headers, json={
            "checklist": updated_checklist
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data["checklist"][0]["completed"] == True


class TestWorkOrderServiceReport:
    """Work Order Service Report functionality tests"""
    
    def test_save_service_report(self, headers):
        """Test saving service report"""
        # Get a work order
        list_response = requests.get(f"{BASE_URL}/api/work-orders", headers=headers)
        work_orders = list_response.json()
        
        if not work_orders:
            pytest.skip("No work orders available")
        
        work_order = work_orders[0]
        
        response = requests.patch(f"{BASE_URL}/api/work-orders/{work_order['id']}", headers=headers, json={
            "service_report": "TEST_Service report: Cihaz kontrolü yapıldı, arıza tespit edildi ve onarıldı.",
            "time_spent_minutes": 120
        })
        
        assert response.status_code == 200
        data = response.json()
        assert "TEST_Service report" in data["service_report"]
        assert data["time_spent_minutes"] == 120
    
    def test_save_customer_signature(self, headers):
        """Test saving customer signature"""
        list_response = requests.get(f"{BASE_URL}/api/work-orders", headers=headers)
        work_orders = list_response.json()
        
        if not work_orders:
            pytest.skip("No work orders available")
        
        work_order = work_orders[0]
        
        response = requests.patch(f"{BASE_URL}/api/work-orders/{work_order['id']}", headers=headers, json={
            "customer_signature": "TEST_Customer Signature Data"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data["customer_signature"] == "TEST_Customer Signature Data"


class TestWorkOrderStatusUpdate:
    """Work Order Status Update tests"""
    
    def test_update_status_to_in_progress(self, headers):
        """Test updating work order status to in_progress"""
        list_response = requests.get(f"{BASE_URL}/api/work-orders", headers=headers)
        work_orders = list_response.json()
        
        # Find a scheduled work order
        work_order = None
        for wo in work_orders:
            if wo.get("status") == "scheduled":
                work_order = wo
                break
        
        if not work_order:
            pytest.skip("No scheduled work order available")
        
        response = requests.patch(f"{BASE_URL}/api/work-orders/{work_order['id']}", headers=headers, json={
            "status": "in_progress"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "in_progress"
    
    def test_update_status_to_completed(self, headers):
        """Test updating work order status to completed"""
        list_response = requests.get(f"{BASE_URL}/api/work-orders", headers=headers)
        work_orders = list_response.json()
        
        # Find an in_progress work order
        work_order = None
        for wo in work_orders:
            if wo.get("status") == "in_progress":
                work_order = wo
                break
        
        if not work_order:
            pytest.skip("No in_progress work order available")
        
        response = requests.patch(f"{BASE_URL}/api/work-orders/{work_order['id']}", headers=headers, json={
            "status": "completed"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "completed"
        assert data["completed_at"] is not None


class TestWorkOrderFiltering:
    """Work Order Filtering tests"""
    
    def test_filter_by_ticket_id(self, headers):
        """Test filtering work orders by ticket_id"""
        # Get tickets first
        tickets_response = requests.get(f"{BASE_URL}/api/tickets", headers=headers)
        tickets = tickets_response.json()
        
        if not tickets:
            pytest.skip("No tickets available")
        
        ticket_id = tickets[0]["id"]
        response = requests.get(f"{BASE_URL}/api/work-orders?ticket_id={ticket_id}", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # All returned work orders should have the specified ticket_id
        for wo in data:
            assert wo["ticket_id"] == ticket_id


class TestAttachments:
    """Attachment (Photo upload) tests"""
    
    def test_upload_attachment(self, headers):
        """Test uploading an attachment to work order"""
        list_response = requests.get(f"{BASE_URL}/api/work-orders", headers=headers)
        work_orders = list_response.json()
        
        if not work_orders:
            pytest.skip("No work orders available")
        
        work_order = work_orders[0]
        
        # Create a simple base64 encoded test image (1x1 pixel PNG)
        test_image_base64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        
        response = requests.post(f"{BASE_URL}/api/attachments", headers=headers, json={
            "related_to": "work_order",
            "related_id": work_order["id"],
            "filename": "TEST_photo.png",
            "file_type": "image/png",
            "file_size": 100,
            "file_data": test_image_base64
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data["related_to"] == "work_order"
        assert data["related_id"] == work_order["id"]
        assert data["filename"] == "TEST_photo.png"
    
    def test_get_attachments(self, headers):
        """Test fetching attachments for work order"""
        list_response = requests.get(f"{BASE_URL}/api/work-orders", headers=headers)
        work_orders = list_response.json()
        
        if not work_orders:
            pytest.skip("No work orders available")
        
        work_order = work_orders[0]
        
        response = requests.get(f"{BASE_URL}/api/attachments?related_to=work_order&related_id={work_order['id']}", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


class TestTicketWorkOrderIntegration:
    """Ticket to Work Order integration tests"""
    
    def test_get_ticket_details(self, headers):
        """Test fetching ticket details"""
        tickets_response = requests.get(f"{BASE_URL}/api/tickets", headers=headers)
        tickets = tickets_response.json()
        
        if not tickets:
            pytest.skip("No tickets available")
        
        ticket_id = tickets[0]["id"]
        response = requests.get(f"{BASE_URL}/api/tickets/{ticket_id}", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == ticket_id
        assert "ticket_number" in data
        assert "title" in data
    
    def test_create_work_order_from_ticket(self, headers):
        """Test creating work order from ticket (simulating TicketDetail page flow)"""
        # Get tickets
        tickets_response = requests.get(f"{BASE_URL}/api/tickets", headers=headers)
        tickets = tickets_response.json()
        
        # Get users
        users_response = requests.get(f"{BASE_URL}/api/users", headers=headers)
        users = users_response.json()
        
        if not tickets or not users:
            pytest.skip("No tickets or users available")
        
        # Find an open ticket
        ticket = None
        for t in tickets:
            if t.get("status") not in ["closed", "resolved"]:
                ticket = t
                break
        
        if not ticket:
            pytest.skip("No open ticket available")
        
        # Find a technician
        technician = None
        for u in users:
            if u.get("role") in ["technician", "admin"]:
                technician = u
                break
        
        if not technician:
            pytest.skip("No technician available")
        
        # Create work order from ticket
        response = requests.post(f"{BASE_URL}/api/work-orders", headers=headers, json={
            "ticket_id": ticket["id"],
            "assigned_technician": technician["id"],
            "work_type": "onsite",
            "scheduled_date": "2026-02-28T14:00:00",
            "notes": "TEST_Work order created from ticket detail page",
            "checklist": [
                {"id": str(uuid.uuid4()), "task": "Müşteri ile randevu onayı", "completed": False},
                {"id": str(uuid.uuid4()), "task": "Cihaz fiziksel kontrolü", "completed": False}
            ]
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data["ticket_id"] == ticket["id"]


class TestDashboardReports:
    """Dashboard and Reports API tests"""
    
    def test_dashboard_stats(self, headers):
        """Test dashboard statistics endpoint"""
        response = requests.get(f"{BASE_URL}/api/reports/dashboard", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "total_tickets" in data
        assert "active_work_orders" in data
    
    def test_technician_performance(self, headers):
        """Test technician performance report"""
        response = requests.get(f"{BASE_URL}/api/reports/technician-performance", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
