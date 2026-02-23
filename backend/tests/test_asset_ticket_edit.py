"""
Test Asset CRUD (Edit/Delete) and Ticket Edit with Asset Selection
Tests for:
- PATCH /api/assets/{asset_id} - Edit asset
- DELETE /api/assets/{asset_id} - Delete asset (should fail if open tickets exist)
- PATCH /api/tickets/{ticket_id} - Extended fields (title, description, category, priority, asset_id)
- Asset change recording in ticket history
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAssetCRUD:
    """Asset CRUD operations - Edit and Delete"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test data"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@network.com",
            "password": "Test123!"
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        token = login_response.json()["access_token"]
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        # Get or create a test customer
        customers_response = self.session.get(f"{BASE_URL}/api/customers")
        assert customers_response.status_code == 200
        customers = customers_response.json()
        
        if customers:
            self.customer_id = customers[0]["id"]
        else:
            # Create a test customer
            customer_response = self.session.post(f"{BASE_URL}/api/customers", json={
                "name": "TEST_Customer",
                "email": "test_customer@test.com",
                "phone": "5551234567"
            })
            assert customer_response.status_code == 200
            self.customer_id = customer_response.json()["id"]
        
        yield
        
        # Cleanup - delete test assets
        assets_response = self.session.get(f"{BASE_URL}/api/assets")
        if assets_response.status_code == 200:
            for asset in assets_response.json():
                if asset.get("serial_number", "").startswith("TEST_"):
                    try:
                        self.session.delete(f"{BASE_URL}/api/assets/{asset['id']}")
                    except:
                        pass
    
    def test_create_asset(self):
        """Test creating an asset for subsequent tests"""
        response = self.session.post(f"{BASE_URL}/api/assets", json={
            "customer_id": self.customer_id,
            "serial_number": f"TEST_SN_{uuid.uuid4().hex[:8]}",
            "device_type": "Switch",
            "brand": "Cisco",
            "model": "Catalyst 2960"
        })
        assert response.status_code == 200, f"Create asset failed: {response.text}"
        data = response.json()
        assert "id" in data
        assert data["brand"] == "Cisco"
        print(f"PASS: Asset created with ID {data['id']}")
        return data["id"]
    
    def test_update_asset_brand(self):
        """Test updating asset brand via PATCH"""
        # Create asset first
        asset_id = self.test_create_asset()
        
        # Update brand
        response = self.session.patch(f"{BASE_URL}/api/assets/{asset_id}", json={
            "brand": "HP"
        })
        assert response.status_code == 200, f"Update asset failed: {response.text}"
        data = response.json()
        assert data["brand"] == "HP"
        print(f"PASS: Asset brand updated to HP")
        
        # Verify with GET
        get_response = self.session.get(f"{BASE_URL}/api/assets/{asset_id}")
        assert get_response.status_code == 200
        assert get_response.json()["brand"] == "HP"
        print(f"PASS: Asset brand verified via GET")
    
    def test_update_asset_model(self):
        """Test updating asset model via PATCH"""
        asset_id = self.test_create_asset()
        
        response = self.session.patch(f"{BASE_URL}/api/assets/{asset_id}", json={
            "model": "ProCurve 2920"
        })
        assert response.status_code == 200
        assert response.json()["model"] == "ProCurve 2920"
        print(f"PASS: Asset model updated")
    
    def test_update_asset_location(self):
        """Test updating asset location via PATCH"""
        asset_id = self.test_create_asset()
        
        response = self.session.patch(f"{BASE_URL}/api/assets/{asset_id}", json={
            "location": "Server Room A"
        })
        assert response.status_code == 200
        assert response.json()["location"] == "Server Room A"
        print(f"PASS: Asset location updated")
    
    def test_update_asset_multiple_fields(self):
        """Test updating multiple asset fields at once"""
        asset_id = self.test_create_asset()
        
        response = self.session.patch(f"{BASE_URL}/api/assets/{asset_id}", json={
            "brand": "Juniper",
            "model": "EX2300",
            "location": "Data Center B",
            "hostname": "sw-dc-b-01",
            "ip_address": "192.168.1.100"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["brand"] == "Juniper"
        assert data["model"] == "EX2300"
        assert data["location"] == "Data Center B"
        assert data["hostname"] == "sw-dc-b-01"
        assert data["ip_address"] == "192.168.1.100"
        print(f"PASS: Multiple asset fields updated")
    
    def test_update_asset_not_found(self):
        """Test updating non-existent asset returns 404"""
        response = self.session.patch(f"{BASE_URL}/api/assets/nonexistent-id-12345", json={
            "brand": "Test"
        })
        assert response.status_code == 404
        print(f"PASS: 404 returned for non-existent asset")
    
    def test_delete_asset_success(self):
        """Test deleting an asset without open tickets"""
        asset_id = self.test_create_asset()
        
        response = self.session.delete(f"{BASE_URL}/api/assets/{asset_id}")
        assert response.status_code == 200, f"Delete asset failed: {response.text}"
        data = response.json()
        assert data["status"] == "success"
        print(f"PASS: Asset deleted successfully")
        
        # Verify asset is gone
        get_response = self.session.get(f"{BASE_URL}/api/assets/{asset_id}")
        assert get_response.status_code == 404
        print(f"PASS: Asset no longer exists")
    
    def test_delete_asset_not_found(self):
        """Test deleting non-existent asset returns 404"""
        response = self.session.delete(f"{BASE_URL}/api/assets/nonexistent-id-12345")
        assert response.status_code == 404
        print(f"PASS: 404 returned for non-existent asset delete")
    
    def test_delete_asset_with_open_ticket_fails(self):
        """Test that deleting an asset with open tickets fails"""
        # Create asset
        asset_id = self.test_create_asset()
        
        # Create a ticket linked to this asset
        ticket_response = self.session.post(f"{BASE_URL}/api/tickets", json={
            "customer_id": self.customer_id,
            "asset_id": asset_id,
            "title": "TEST_Ticket for asset delete test",
            "description": "Testing asset deletion with open ticket",
            "category": "hardware",
            "priority": "medium"
        })
        assert ticket_response.status_code == 200, f"Create ticket failed: {ticket_response.text}"
        ticket_id = ticket_response.json()["id"]
        
        # Try to delete asset - should fail
        delete_response = self.session.delete(f"{BASE_URL}/api/assets/{asset_id}")
        assert delete_response.status_code == 400, f"Expected 400, got {delete_response.status_code}"
        assert "açık ticket" in delete_response.json()["detail"].lower() or "open" in delete_response.json()["detail"].lower()
        print(f"PASS: Asset deletion blocked due to open ticket")
        
        # Cleanup - close the ticket first
        self.session.patch(f"{BASE_URL}/api/tickets/{ticket_id}", json={"status": "closed"})
        
        # Now delete should work
        delete_response2 = self.session.delete(f"{BASE_URL}/api/assets/{asset_id}")
        assert delete_response2.status_code == 200
        print(f"PASS: Asset deleted after ticket closed")
        
        # Cleanup ticket
        self.session.delete(f"{BASE_URL}/api/tickets/{ticket_id}")


class TestTicketEdit:
    """Ticket Edit with extended fields including asset selection"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test data"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@network.com",
            "password": "Test123!"
        })
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        # Get customer
        customers_response = self.session.get(f"{BASE_URL}/api/customers")
        assert customers_response.status_code == 200
        customers = customers_response.json()
        self.customer_id = customers[0]["id"] if customers else None
        
        yield
        
        # Cleanup test tickets
        tickets_response = self.session.get(f"{BASE_URL}/api/tickets")
        if tickets_response.status_code == 200:
            for ticket in tickets_response.json():
                if ticket.get("title", "").startswith("TEST_"):
                    try:
                        self.session.delete(f"{BASE_URL}/api/tickets/{ticket['id']}")
                    except:
                        pass
    
    def create_test_ticket(self, asset_id=None):
        """Helper to create a test ticket"""
        response = self.session.post(f"{BASE_URL}/api/tickets", json={
            "customer_id": self.customer_id,
            "asset_id": asset_id,
            "title": f"TEST_Ticket_{uuid.uuid4().hex[:8]}",
            "description": "Test ticket description",
            "category": "network",
            "priority": "medium"
        })
        assert response.status_code == 200
        return response.json()
    
    def create_test_asset(self):
        """Helper to create a test asset"""
        response = self.session.post(f"{BASE_URL}/api/assets", json={
            "customer_id": self.customer_id,
            "serial_number": f"TEST_SN_{uuid.uuid4().hex[:8]}",
            "device_type": "Router",
            "brand": "Cisco",
            "model": "ISR 4321"
        })
        assert response.status_code == 200
        return response.json()["id"]
    
    def test_update_ticket_title(self):
        """Test updating ticket title via PATCH"""
        ticket = self.create_test_ticket()
        
        response = self.session.patch(f"{BASE_URL}/api/tickets/{ticket['id']}", json={
            "title": "TEST_Updated Title"
        })
        assert response.status_code == 200
        assert response.json()["title"] == "TEST_Updated Title"
        print(f"PASS: Ticket title updated")
    
    def test_update_ticket_description(self):
        """Test updating ticket description via PATCH"""
        ticket = self.create_test_ticket()
        
        response = self.session.patch(f"{BASE_URL}/api/tickets/{ticket['id']}", json={
            "description": "Updated description with more details"
        })
        assert response.status_code == 200
        assert response.json()["description"] == "Updated description with more details"
        print(f"PASS: Ticket description updated")
    
    def test_update_ticket_category(self):
        """Test updating ticket category via PATCH"""
        ticket = self.create_test_ticket()
        
        response = self.session.patch(f"{BASE_URL}/api/tickets/{ticket['id']}", json={
            "category": "hardware"
        })
        assert response.status_code == 200
        assert response.json()["category"] == "hardware"
        print(f"PASS: Ticket category updated")
    
    def test_update_ticket_priority(self):
        """Test updating ticket priority via PATCH"""
        ticket = self.create_test_ticket()
        
        response = self.session.patch(f"{BASE_URL}/api/tickets/{ticket['id']}", json={
            "priority": "high"
        })
        assert response.status_code == 200
        assert response.json()["priority"] == "high"
        print(f"PASS: Ticket priority updated")
    
    def test_add_asset_to_ticket(self):
        """Test adding an asset to a ticket that didn't have one"""
        ticket = self.create_test_ticket(asset_id=None)
        asset_id = self.create_test_asset()
        
        response = self.session.patch(f"{BASE_URL}/api/tickets/{ticket['id']}", json={
            "asset_id": asset_id
        })
        assert response.status_code == 200
        assert response.json()["asset_id"] == asset_id
        print(f"PASS: Asset added to ticket")
        
        # Cleanup
        self.session.patch(f"{BASE_URL}/api/tickets/{ticket['id']}", json={"status": "closed"})
        self.session.delete(f"{BASE_URL}/api/assets/{asset_id}")
    
    def test_change_asset_on_ticket(self):
        """Test changing the asset on a ticket"""
        asset_id_1 = self.create_test_asset()
        asset_id_2 = self.create_test_asset()
        ticket = self.create_test_ticket(asset_id=asset_id_1)
        
        response = self.session.patch(f"{BASE_URL}/api/tickets/{ticket['id']}", json={
            "asset_id": asset_id_2
        })
        assert response.status_code == 200
        assert response.json()["asset_id"] == asset_id_2
        print(f"PASS: Asset changed on ticket")
        
        # Cleanup
        self.session.patch(f"{BASE_URL}/api/tickets/{ticket['id']}", json={"status": "closed"})
        self.session.delete(f"{BASE_URL}/api/assets/{asset_id_1}")
        self.session.delete(f"{BASE_URL}/api/assets/{asset_id_2}")
    
    def test_remove_asset_from_ticket(self):
        """Test removing an asset from a ticket"""
        asset_id = self.create_test_asset()
        ticket = self.create_test_ticket(asset_id=asset_id)
        
        response = self.session.patch(f"{BASE_URL}/api/tickets/{ticket['id']}", json={
            "asset_id": None
        })
        assert response.status_code == 200
        assert response.json()["asset_id"] is None
        print(f"PASS: Asset removed from ticket")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/assets/{asset_id}")
    
    def test_update_multiple_ticket_fields(self):
        """Test updating multiple ticket fields at once"""
        ticket = self.create_test_ticket()
        
        response = self.session.patch(f"{BASE_URL}/api/tickets/{ticket['id']}", json={
            "title": "TEST_Multi-field Update",
            "description": "Updated via multi-field test",
            "category": "security",
            "priority": "critical"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "TEST_Multi-field Update"
        assert data["description"] == "Updated via multi-field test"
        assert data["category"] == "security"
        assert data["priority"] == "critical"
        print(f"PASS: Multiple ticket fields updated")
    
    def test_asset_change_recorded_in_history(self):
        """Test that asset change is recorded in ticket history"""
        asset_id_1 = self.create_test_asset()
        asset_id_2 = self.create_test_asset()
        ticket = self.create_test_ticket(asset_id=asset_id_1)
        
        # Change asset
        self.session.patch(f"{BASE_URL}/api/tickets/{ticket['id']}", json={
            "asset_id": asset_id_2
        })
        
        # Check ticket history
        history_response = self.session.get(f"{BASE_URL}/api/tickets/{ticket['id']}/history")
        assert history_response.status_code == 200
        history = history_response.json()
        
        # Find asset_change event
        asset_change_events = [h for h in history if h.get("event_type") == "asset_change"]
        assert len(asset_change_events) > 0, "Asset change not recorded in history"
        print(f"PASS: Asset change recorded in ticket history")
        
        # Cleanup
        self.session.patch(f"{BASE_URL}/api/tickets/{ticket['id']}", json={"status": "closed"})
        self.session.delete(f"{BASE_URL}/api/assets/{asset_id_1}")
        self.session.delete(f"{BASE_URL}/api/assets/{asset_id_2}")


class TestAssetHistory:
    """Test asset history tracking"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test data"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@network.com",
            "password": "Test123!"
        })
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        # Get customer
        customers_response = self.session.get(f"{BASE_URL}/api/customers")
        self.customer_id = customers_response.json()[0]["id"] if customers_response.json() else None
        
        yield
    
    def test_asset_update_creates_history(self):
        """Test that updating an asset creates history entries"""
        # Create asset
        create_response = self.session.post(f"{BASE_URL}/api/assets", json={
            "customer_id": self.customer_id,
            "serial_number": f"TEST_HIST_{uuid.uuid4().hex[:8]}",
            "device_type": "Switch",
            "brand": "Cisco",
            "model": "Catalyst 2960"
        })
        assert create_response.status_code == 200
        asset_id = create_response.json()["id"]
        
        # Update asset
        self.session.patch(f"{BASE_URL}/api/assets/{asset_id}", json={
            "brand": "HP",
            "model": "ProCurve 2920"
        })
        
        # Check history
        history_response = self.session.get(f"{BASE_URL}/api/assets/{asset_id}/history")
        assert history_response.status_code == 200
        history = history_response.json()
        
        # Should have field_change events
        field_changes = [h for h in history if h.get("event_type") == "field_change"]
        assert len(field_changes) >= 2, f"Expected at least 2 field changes, got {len(field_changes)}"
        print(f"PASS: Asset update created {len(field_changes)} history entries")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/assets/{asset_id}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
