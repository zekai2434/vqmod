"""
Parts/Inventory Management API Tests - Testing Parça/Depo/Sarf Yönetimi features
Tests: Parts CRUD, Stock Movements, Part Reservations, Part Usage, Low Stock Alerts
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


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


class TestPartsCRUD:
    """Parts CRUD operations tests"""
    
    def test_create_part_sfp(self, headers):
        """Test creating a SFP part with serial tracking"""
        part_number = f"TEST-SFP-{uuid.uuid4().hex[:6].upper()}"
        response = requests.post(f"{BASE_URL}/api/parts", headers=headers, json={
            "part_number": part_number,
            "name": "TEST_SFP Module 10G",
            "category": "SFP/GBIC",
            "description": "10 Gigabit SFP+ Module",
            "brand": "Cisco",
            "model": "SFP-10G-SR",
            "quantity": 10,
            "min_stock": 5,
            "unit_price": 150.00,
            "currency": "TRY",
            "supplier": "Test Supplier",
            "location": "Raf A-1",
            "has_serial": True
        })
        
        assert response.status_code == 200, f"Failed to create part: {response.text}"
        data = response.json()
        assert data["part_number"] == part_number
        assert data["name"] == "TEST_SFP Module 10G"
        assert data["category"] == "SFP/GBIC"
        assert data["has_serial"] == True
        assert data["quantity"] == 10
        assert data["min_stock"] == 5
        return data
    
    def test_create_part_psu(self, headers):
        """Test creating a PSU part"""
        part_number = f"TEST-PSU-{uuid.uuid4().hex[:6].upper()}"
        response = requests.post(f"{BASE_URL}/api/parts", headers=headers, json={
            "part_number": part_number,
            "name": "TEST_Power Supply Unit 500W",
            "category": "Güç Kaynağı (PSU)",
            "description": "500W Redundant Power Supply",
            "brand": "HP",
            "model": "PSU-500W-RD",
            "quantity": 3,
            "min_stock": 2,
            "unit_price": 500.00,
            "currency": "TRY",
            "supplier": "HP Distributor",
            "location": "Raf B-2",
            "has_serial": True
        })
        
        assert response.status_code == 200, f"Failed to create part: {response.text}"
        data = response.json()
        assert data["category"] == "Güç Kaynağı (PSU)"
        assert data["has_serial"] == True
        return data
    
    def test_create_part_cable(self, headers):
        """Test creating a cable part without serial tracking"""
        part_number = f"TEST-CBL-{uuid.uuid4().hex[:6].upper()}"
        response = requests.post(f"{BASE_URL}/api/parts", headers=headers, json={
            "part_number": part_number,
            "name": "TEST_Cat6 Patch Cable 1m",
            "category": "Kablo/Bağlantı",
            "description": "Category 6 Ethernet Patch Cable",
            "brand": "Generic",
            "quantity": 50,
            "min_stock": 20,
            "unit_price": 15.00,
            "currency": "TRY",
            "location": "Raf C-1",
            "has_serial": False
        })
        
        assert response.status_code == 200, f"Failed to create part: {response.text}"
        data = response.json()
        assert data["has_serial"] == False
        return data
    
    def test_create_part_duplicate_number_fails(self, headers):
        """Test that duplicate part numbers are rejected"""
        part_number = f"TEST-DUP-{uuid.uuid4().hex[:6].upper()}"
        
        # Create first part
        response1 = requests.post(f"{BASE_URL}/api/parts", headers=headers, json={
            "part_number": part_number,
            "name": "TEST_First Part",
            "category": "Diğer",
            "quantity": 1,
            "min_stock": 1,
            "unit_price": 10.00
        })
        assert response1.status_code == 200
        
        # Try to create duplicate
        response2 = requests.post(f"{BASE_URL}/api/parts", headers=headers, json={
            "part_number": part_number,
            "name": "TEST_Duplicate Part",
            "category": "Diğer",
            "quantity": 1,
            "min_stock": 1,
            "unit_price": 10.00
        })
        assert response2.status_code == 400
        assert "already exists" in response2.json().get("detail", "").lower()
    
    def test_get_parts_list(self, headers):
        """Test fetching parts list"""
        response = requests.get(f"{BASE_URL}/api/parts", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Should have at least the parts we created
        assert len(data) >= 1
    
    def test_get_part_by_id(self, headers):
        """Test fetching a specific part"""
        # First get list of parts
        list_response = requests.get(f"{BASE_URL}/api/parts", headers=headers)
        parts = list_response.json()
        
        if not parts:
            pytest.skip("No parts available")
        
        part_id = parts[0]["id"]
        response = requests.get(f"{BASE_URL}/api/parts/{part_id}", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == part_id
    
    def test_update_part(self, headers):
        """Test updating a part"""
        # Get a part
        list_response = requests.get(f"{BASE_URL}/api/parts", headers=headers)
        parts = list_response.json()
        
        if not parts:
            pytest.skip("No parts available")
        
        part = parts[0]
        
        response = requests.patch(f"{BASE_URL}/api/parts/{part['id']}", headers=headers, json={
            "min_stock": 10,
            "unit_price": 200.00
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data["min_stock"] == 10
        assert data["unit_price"] == 200.00
    
    def test_filter_parts_by_category(self, headers):
        """Test filtering parts by category"""
        response = requests.get(f"{BASE_URL}/api/parts?category=SFP/GBIC", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        for part in data:
            assert part["category"] == "SFP/GBIC"


class TestStockMovements:
    """Stock Movement operations tests"""
    
    @pytest.fixture(scope="class")
    def test_part(self, headers):
        """Create a test part for stock movement testing"""
        part_number = f"TEST-STK-{uuid.uuid4().hex[:6].upper()}"
        response = requests.post(f"{BASE_URL}/api/parts", headers=headers, json={
            "part_number": part_number,
            "name": "TEST_Stock Movement Part",
            "category": "Diğer",
            "quantity": 20,
            "min_stock": 5,
            "unit_price": 100.00,
            "has_serial": False
        })
        if response.status_code == 200:
            return response.json()
        return None
    
    def test_stock_in_general(self, headers, test_part):
        """Test general stock in movement"""
        if not test_part:
            pytest.skip("No test part available")
        
        response = requests.post(f"{BASE_URL}/api/stock-movements", headers=headers, json={
            "part_id": test_part["id"],
            "movement_type": "in",
            "quantity": 5,
            "reason": "TEST_General stock in"
        })
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data["movement_type"] == "in"
        assert data["quantity"] == 5
        
        # Verify stock increased
        part_response = requests.get(f"{BASE_URL}/api/parts/{test_part['id']}", headers=headers)
        updated_part = part_response.json()
        assert updated_part["quantity"] == test_part["quantity"] + 5
    
    def test_stock_out_general(self, headers, test_part):
        """Test general stock out movement"""
        if not test_part:
            pytest.skip("No test part available")
        
        # Get current quantity
        part_response = requests.get(f"{BASE_URL}/api/parts/{test_part['id']}", headers=headers)
        current_quantity = part_response.json()["quantity"]
        
        response = requests.post(f"{BASE_URL}/api/stock-movements", headers=headers, json={
            "part_id": test_part["id"],
            "movement_type": "out",
            "quantity": 3,
            "reason": "TEST_General stock out"
        })
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data["movement_type"] == "out"
        
        # Verify stock decreased
        part_response = requests.get(f"{BASE_URL}/api/parts/{test_part['id']}", headers=headers)
        updated_part = part_response.json()
        assert updated_part["quantity"] == current_quantity - 3
    
    def test_stock_purchase(self, headers, test_part):
        """Test purchase stock movement"""
        if not test_part:
            pytest.skip("No test part available")
        
        response = requests.post(f"{BASE_URL}/api/stock-movements", headers=headers, json={
            "part_id": test_part["id"],
            "movement_type": "purchase",
            "quantity": 10,
            "supplier": "Test Vendor",
            "unit_cost": 95.00,
            "invoice_number": "INV-2026-001",
            "reason": "TEST_Purchase from vendor"
        })
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data["movement_type"] == "purchase"
        assert data["supplier"] == "Test Vendor"
    
    def test_stock_scrap(self, headers, test_part):
        """Test scrap stock movement"""
        if not test_part:
            pytest.skip("No test part available")
        
        response = requests.post(f"{BASE_URL}/api/stock-movements", headers=headers, json={
            "part_id": test_part["id"],
            "movement_type": "scrap",
            "quantity": 1,
            "reason": "TEST_Defective unit - scrapped"
        })
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data["movement_type"] == "scrap"
    
    def test_stock_adjustment_plus(self, headers, test_part):
        """Test positive stock adjustment"""
        if not test_part:
            pytest.skip("No test part available")
        
        response = requests.post(f"{BASE_URL}/api/stock-movements", headers=headers, json={
            "part_id": test_part["id"],
            "movement_type": "adjustment_plus",
            "quantity": 2,
            "reason": "TEST_Inventory count adjustment"
        })
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data["movement_type"] == "adjustment_plus"
    
    def test_stock_out_insufficient_fails(self, headers, test_part):
        """Test that stock out with insufficient quantity fails"""
        if not test_part:
            pytest.skip("No test part available")
        
        response = requests.post(f"{BASE_URL}/api/stock-movements", headers=headers, json={
            "part_id": test_part["id"],
            "movement_type": "out",
            "quantity": 9999,
            "reason": "TEST_Should fail - insufficient stock"
        })
        
        assert response.status_code == 400
        assert "insufficient" in response.json().get("detail", "").lower()
    
    def test_get_stock_movements(self, headers):
        """Test fetching stock movements list"""
        response = requests.get(f"{BASE_URL}/api/stock-movements", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_get_stock_movements_by_part(self, headers, test_part):
        """Test fetching stock movements for specific part"""
        if not test_part:
            pytest.skip("No test part available")
        
        response = requests.get(f"{BASE_URL}/api/stock-movements?part_id={test_part['id']}", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        for movement in data:
            assert movement["part_id"] == test_part["id"]


class TestPartReservations:
    """Part Reservation operations tests"""
    
    @pytest.fixture(scope="class")
    def test_part_for_reservation(self, headers):
        """Create a test part for reservation testing"""
        part_number = f"TEST-RES-{uuid.uuid4().hex[:6].upper()}"
        response = requests.post(f"{BASE_URL}/api/parts", headers=headers, json={
            "part_number": part_number,
            "name": "TEST_Reservation Part",
            "category": "Modül/Kart",
            "quantity": 15,
            "min_stock": 3,
            "unit_price": 250.00,
            "has_serial": False
        })
        if response.status_code == 200:
            return response.json()
        return None
    
    @pytest.fixture(scope="class")
    def test_work_order(self, headers):
        """Get or create a work order for reservation testing"""
        # Get existing work orders
        wo_response = requests.get(f"{BASE_URL}/api/work-orders", headers=headers)
        work_orders = wo_response.json()
        
        if work_orders:
            return work_orders[0]
        
        # Create a new work order if none exists
        tickets_response = requests.get(f"{BASE_URL}/api/tickets", headers=headers)
        tickets = tickets_response.json()
        
        users_response = requests.get(f"{BASE_URL}/api/users", headers=headers)
        users = users_response.json()
        
        if not tickets or not users:
            return None
        
        technician = next((u for u in users if u.get("role") in ["technician", "admin"]), None)
        if not technician:
            return None
        
        wo_create_response = requests.post(f"{BASE_URL}/api/work-orders", headers=headers, json={
            "ticket_id": tickets[0]["id"],
            "assigned_technician": technician["id"],
            "work_type": "onsite",
            "notes": "TEST_Work order for reservation testing"
        })
        
        if wo_create_response.status_code == 200:
            return wo_create_response.json()
        return None
    
    def test_create_reservation(self, headers, test_part_for_reservation, test_work_order):
        """Test creating a part reservation"""
        if not test_part_for_reservation or not test_work_order:
            pytest.skip("No test part or work order available")
        
        response = requests.post(f"{BASE_URL}/api/part-reservations", headers=headers, json={
            "part_id": test_part_for_reservation["id"],
            "work_order_id": test_work_order["id"],
            "quantity": 2
        })
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data["part_id"] == test_part_for_reservation["id"]
        assert data["work_order_id"] == test_work_order["id"]
        assert data["quantity"] == 2
        assert data["status"] == "reserved"
        
        # Verify reserved_quantity increased on part
        part_response = requests.get(f"{BASE_URL}/api/parts/{test_part_for_reservation['id']}", headers=headers)
        updated_part = part_response.json()
        assert updated_part.get("reserved_quantity", 0) >= 2
    
    def test_get_reservations_by_work_order(self, headers, test_work_order):
        """Test fetching reservations for a work order"""
        if not test_work_order:
            pytest.skip("No test work order available")
        
        response = requests.get(f"{BASE_URL}/api/part-reservations?work_order_id={test_work_order['id']}", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_cancel_reservation(self, headers, test_part_for_reservation, test_work_order):
        """Test cancelling a reservation"""
        if not test_part_for_reservation or not test_work_order:
            pytest.skip("No test part or work order available")
        
        # Create a reservation to cancel
        create_response = requests.post(f"{BASE_URL}/api/part-reservations", headers=headers, json={
            "part_id": test_part_for_reservation["id"],
            "work_order_id": test_work_order["id"],
            "quantity": 1
        })
        
        if create_response.status_code != 200:
            pytest.skip("Could not create reservation to cancel")
        
        reservation = create_response.json()
        
        # Cancel the reservation
        cancel_response = requests.patch(f"{BASE_URL}/api/part-reservations/{reservation['id']}/cancel", headers=headers)
        
        assert cancel_response.status_code == 200
        assert cancel_response.json()["status"] == "success"
    
    def test_use_reservation(self, headers, test_part_for_reservation, test_work_order):
        """Test using a reservation (converting to actual usage)"""
        if not test_part_for_reservation or not test_work_order:
            pytest.skip("No test part or work order available")
        
        # Create a reservation to use
        create_response = requests.post(f"{BASE_URL}/api/part-reservations", headers=headers, json={
            "part_id": test_part_for_reservation["id"],
            "work_order_id": test_work_order["id"],
            "quantity": 1
        })
        
        if create_response.status_code != 200:
            pytest.skip("Could not create reservation to use")
        
        reservation = create_response.json()
        
        # Use the reservation
        use_response = requests.patch(f"{BASE_URL}/api/part-reservations/{reservation['id']}/use", headers=headers)
        
        assert use_response.status_code == 200
        assert use_response.json()["status"] == "success"
    
    def test_reservation_insufficient_stock_fails(self, headers, test_part_for_reservation, test_work_order):
        """Test that reservation with insufficient available stock fails"""
        if not test_part_for_reservation or not test_work_order:
            pytest.skip("No test part or work order available")
        
        response = requests.post(f"{BASE_URL}/api/part-reservations", headers=headers, json={
            "part_id": test_part_for_reservation["id"],
            "work_order_id": test_work_order["id"],
            "quantity": 9999
        })
        
        assert response.status_code == 400
        assert "insufficient" in response.json().get("detail", "").lower()


class TestPartUsage:
    """Part Usage (direct usage without reservation) tests"""
    
    @pytest.fixture(scope="class")
    def test_part_for_usage(self, headers):
        """Create a test part for usage testing"""
        part_number = f"TEST-USE-{uuid.uuid4().hex[:6].upper()}"
        response = requests.post(f"{BASE_URL}/api/parts", headers=headers, json={
            "part_number": part_number,
            "name": "TEST_Usage Part",
            "category": "Fan/Soğutma",
            "quantity": 10,
            "min_stock": 2,
            "unit_price": 75.00,
            "has_serial": False
        })
        if response.status_code == 200:
            return response.json()
        return None
    
    @pytest.fixture(scope="class")
    def test_work_order_for_usage(self, headers):
        """Get a work order for usage testing"""
        wo_response = requests.get(f"{BASE_URL}/api/work-orders", headers=headers)
        work_orders = wo_response.json()
        
        if work_orders:
            return work_orders[0]
        return None
    
    def test_add_part_usage(self, headers, test_part_for_usage, test_work_order_for_usage):
        """Test adding part usage to work order"""
        if not test_part_for_usage or not test_work_order_for_usage:
            pytest.skip("No test part or work order available")
        
        initial_quantity = test_part_for_usage["quantity"]
        
        response = requests.post(f"{BASE_URL}/api/part-usage", headers=headers, json={
            "part_id": test_part_for_usage["id"],
            "work_order_id": test_work_order_for_usage["id"],
            "quantity": 2
        })
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data["part_id"] == test_part_for_usage["id"]
        assert data["work_order_id"] == test_work_order_for_usage["id"]
        assert data["quantity"] == 2
        
        # Verify stock decreased
        part_response = requests.get(f"{BASE_URL}/api/parts/{test_part_for_usage['id']}", headers=headers)
        updated_part = part_response.json()
        assert updated_part["quantity"] == initial_quantity - 2
    
    def test_get_part_usage_by_work_order(self, headers, test_work_order_for_usage):
        """Test fetching part usage for a work order"""
        if not test_work_order_for_usage:
            pytest.skip("No test work order available")
        
        response = requests.get(f"{BASE_URL}/api/part-usage?work_order_id={test_work_order_for_usage['id']}", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_part_usage_insufficient_stock_fails(self, headers, test_part_for_usage, test_work_order_for_usage):
        """Test that part usage with insufficient stock fails"""
        if not test_part_for_usage or not test_work_order_for_usage:
            pytest.skip("No test part or work order available")
        
        response = requests.post(f"{BASE_URL}/api/part-usage", headers=headers, json={
            "part_id": test_part_for_usage["id"],
            "work_order_id": test_work_order_for_usage["id"],
            "quantity": 9999
        })
        
        assert response.status_code == 400
        assert "insufficient" in response.json().get("detail", "").lower()


class TestLowStockAlerts:
    """Low Stock Alerts tests"""
    
    @pytest.fixture(scope="class")
    def low_stock_part(self, headers):
        """Create a part with low stock for alert testing"""
        part_number = f"TEST-LOW-{uuid.uuid4().hex[:6].upper()}"
        response = requests.post(f"{BASE_URL}/api/parts", headers=headers, json={
            "part_number": part_number,
            "name": "TEST_Low Stock Part",
            "category": "Bellek (RAM)",
            "quantity": 2,  # Below min_stock
            "min_stock": 5,
            "unit_price": 300.00,
            "has_serial": False
        })
        if response.status_code == 200:
            return response.json()
        return None
    
    def test_get_low_stock_alerts(self, headers, low_stock_part):
        """Test fetching low stock alerts"""
        response = requests.get(f"{BASE_URL}/api/parts/alerts/low-stock", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        # Should include our low stock part
        if low_stock_part:
            part_ids = [alert["part_id"] for alert in data]
            assert low_stock_part["id"] in part_ids
    
    def test_low_stock_alert_structure(self, headers):
        """Test low stock alert response structure"""
        response = requests.get(f"{BASE_URL}/api/parts/alerts/low-stock", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        if data:
            alert = data[0]
            assert "part_id" in alert
            assert "part_number" in alert
            assert "name" in alert
            assert "current_quantity" in alert
            assert "min_stock" in alert
            assert "available_quantity" in alert
            assert "severity" in alert


class TestSerializedParts:
    """Serialized Parts (SFP, PSU etc.) tests"""
    
    @pytest.fixture(scope="class")
    def serial_tracked_part(self, headers):
        """Create a serial-tracked part"""
        part_number = f"TEST-SER-{uuid.uuid4().hex[:6].upper()}"
        response = requests.post(f"{BASE_URL}/api/parts", headers=headers, json={
            "part_number": part_number,
            "name": "TEST_Serial Tracked SFP",
            "category": "SFP/GBIC",
            "quantity": 0,  # Will add via serialized parts
            "min_stock": 2,
            "unit_price": 200.00,
            "has_serial": True
        })
        if response.status_code == 200:
            return response.json()
        return None
    
    def test_add_serialized_part(self, headers, serial_tracked_part):
        """Test adding a serialized part"""
        if not serial_tracked_part:
            pytest.skip("No serial tracked part available")
        
        serial_number = f"SN-{uuid.uuid4().hex[:8].upper()}"
        response = requests.post(f"{BASE_URL}/api/parts/{serial_tracked_part['id']}/serials", headers=headers, json={
            "part_id": serial_tracked_part["id"],
            "serial_number": serial_number,
            "condition": "new",
            "purchase_date": "2026-01-15",
            "warranty_end": "2028-01-15",
            "notes": "TEST_New SFP module"
        })
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data["serial_number"] == serial_number
        assert data["status"] == "in_stock"
        
        # Verify part quantity increased
        part_response = requests.get(f"{BASE_URL}/api/parts/{serial_tracked_part['id']}", headers=headers)
        updated_part = part_response.json()
        assert updated_part["quantity"] >= 1
    
    def test_get_serialized_parts(self, headers, serial_tracked_part):
        """Test fetching serialized parts for a part"""
        if not serial_tracked_part:
            pytest.skip("No serial tracked part available")
        
        response = requests.get(f"{BASE_URL}/api/parts/{serial_tracked_part['id']}/serials", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_duplicate_serial_fails(self, headers, serial_tracked_part):
        """Test that duplicate serial numbers are rejected"""
        if not serial_tracked_part:
            pytest.skip("No serial tracked part available")
        
        serial_number = f"SN-DUP-{uuid.uuid4().hex[:6].upper()}"
        
        # Add first serial
        response1 = requests.post(f"{BASE_URL}/api/parts/{serial_tracked_part['id']}/serials", headers=headers, json={
            "part_id": serial_tracked_part["id"],
            "serial_number": serial_number
        })
        
        if response1.status_code != 200:
            pytest.skip("Could not create first serial")
        
        # Try to add duplicate
        response2 = requests.post(f"{BASE_URL}/api/parts/{serial_tracked_part['id']}/serials", headers=headers, json={
            "part_id": serial_tracked_part["id"],
            "serial_number": serial_number
        })
        
        assert response2.status_code == 400
        assert "already exists" in response2.json().get("detail", "").lower()


class TestPartReturns:
    """Part Returns (return to stock, scrap) tests"""
    
    @pytest.fixture(scope="class")
    def return_test_part(self, headers):
        """Create a part for return testing"""
        part_number = f"TEST-RET-{uuid.uuid4().hex[:6].upper()}"
        response = requests.post(f"{BASE_URL}/api/parts", headers=headers, json={
            "part_number": part_number,
            "name": "TEST_Return Part",
            "category": "Diğer",
            "quantity": 5,
            "min_stock": 2,
            "unit_price": 50.00,
            "has_serial": False
        })
        if response.status_code == 200:
            return response.json()
        return None
    
    def test_return_to_stock(self, headers, return_test_part):
        """Test returning part to stock"""
        if not return_test_part:
            pytest.skip("No return test part available")
        
        initial_quantity = return_test_part["quantity"]
        
        response = requests.post(f"{BASE_URL}/api/part-returns", headers=headers, json={
            "part_id": return_test_part["id"],
            "quantity": 2,
            "return_type": "return_to_stock",
            "condition": "good",
            "reason": "TEST_Unused parts returned from field"
        })
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data["return_type"] == "return_to_stock"
        assert data["condition"] == "good"
        
        # Verify stock increased
        part_response = requests.get(f"{BASE_URL}/api/parts/{return_test_part['id']}", headers=headers)
        updated_part = part_response.json()
        assert updated_part["quantity"] == initial_quantity + 2
    
    def test_scrap_return(self, headers, return_test_part):
        """Test scrapping a part"""
        if not return_test_part:
            pytest.skip("No return test part available")
        
        response = requests.post(f"{BASE_URL}/api/part-returns", headers=headers, json={
            "part_id": return_test_part["id"],
            "quantity": 1,
            "return_type": "scrap",
            "condition": "defective",
            "reason": "TEST_Defective unit - scrapped"
        })
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data["return_type"] == "scrap"
    
    def test_get_part_returns(self, headers):
        """Test fetching part returns list"""
        response = requests.get(f"{BASE_URL}/api/part-returns", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


class TestDashboardWithParts:
    """Dashboard stats including parts data"""
    
    def test_dashboard_includes_low_stock(self, headers):
        """Test that dashboard includes low stock parts count"""
        response = requests.get(f"{BASE_URL}/api/reports/dashboard", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "low_stock_parts" in data
