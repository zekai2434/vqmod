"""
Test suite for SLA Management and Role & Permission features
- SLA Profiles (P1/P2/P3/P4)
- Business Hours Calendar
- SLA Pause/Resume
- Role & Permission Management
- Asset Warranty/Support Expiry Tracking
"""
import pytest
import requests
import os
import uuid
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAuth:
    """Authentication tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@network.com",
            "password": "Test123!"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        return response.json()["access_token"]
    
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


class TestSLAProfiles:
    """SLA Profile CRUD tests"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@network.com",
            "password": "Test123!"
        })
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    @pytest.fixture(scope="class")
    def test_profile_code(self):
        """Generate unique profile code for testing"""
        return f"TEST_{uuid.uuid4().hex[:6].upper()}"
    
    def test_get_sla_profiles(self, auth_headers):
        """Test GET /api/sla-profiles - List all SLA profiles"""
        response = requests.get(f"{BASE_URL}/api/sla-profiles", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} SLA profiles")
    
    def test_get_sla_profiles_requires_auth(self):
        """Test GET /api/sla-profiles requires authentication"""
        response = requests.get(f"{BASE_URL}/api/sla-profiles")
        assert response.status_code in [401, 403]
    
    def test_create_sla_profile(self, auth_headers, test_profile_code):
        """Test POST /api/sla-profiles - Create new SLA profile"""
        profile_data = {
            "name": "Test SLA Profile",
            "code": test_profile_code,
            "description": "Test profile for automated testing",
            "response_time_hours": 2,
            "resolution_time_hours": 8,
            "is_default": False,
            "color": "#ef4444"
        }
        response = requests.post(f"{BASE_URL}/api/sla-profiles", json=profile_data, headers=auth_headers)
        assert response.status_code == 200, f"Create failed: {response.text}"
        data = response.json()
        assert data["name"] == "Test SLA Profile"
        assert data["code"] == test_profile_code
        assert data["response_time_hours"] == 2
        assert data["resolution_time_hours"] == 8
        assert "id" in data
        print(f"Created SLA profile: {data['id']}")
        return data["id"]
    
    def test_create_duplicate_profile_fails(self, auth_headers, test_profile_code):
        """Test POST /api/sla-profiles - Duplicate code should fail"""
        profile_data = {
            "name": "Duplicate Profile",
            "code": test_profile_code,
            "response_time_hours": 4,
            "resolution_time_hours": 24
        }
        response = requests.post(f"{BASE_URL}/api/sla-profiles", json=profile_data, headers=auth_headers)
        assert response.status_code == 400
        assert "already exists" in response.json().get("detail", "").lower()
    
    def test_update_sla_profile(self, auth_headers, test_profile_code):
        """Test PATCH /api/sla-profiles/{id} - Update SLA profile"""
        # First get the profile
        response = requests.get(f"{BASE_URL}/api/sla-profiles", headers=auth_headers)
        profiles = response.json()
        test_profile = next((p for p in profiles if p["code"] == test_profile_code), None)
        
        if test_profile:
            update_data = {
                "name": "Updated Test Profile",
                "response_time_hours": 3
            }
            response = requests.patch(f"{BASE_URL}/api/sla-profiles/{test_profile['id']}", json=update_data, headers=auth_headers)
            assert response.status_code == 200
            data = response.json()
            assert data["name"] == "Updated Test Profile"
            assert data["response_time_hours"] == 3
            print(f"Updated SLA profile: {test_profile['id']}")
    
    def test_delete_sla_profile(self, auth_headers, test_profile_code):
        """Test DELETE /api/sla-profiles/{id} - Delete SLA profile"""
        # First get the profile
        response = requests.get(f"{BASE_URL}/api/sla-profiles", headers=auth_headers)
        profiles = response.json()
        test_profile = next((p for p in profiles if p["code"] == test_profile_code), None)
        
        if test_profile:
            response = requests.delete(f"{BASE_URL}/api/sla-profiles/{test_profile['id']}", headers=auth_headers)
            assert response.status_code == 200
            assert response.json()["status"] == "success"
            print(f"Deleted SLA profile: {test_profile['id']}")


class TestBusinessHours:
    """Business Hours CRUD tests"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@network.com",
            "password": "Test123!"
        })
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    @pytest.fixture(scope="class")
    def test_hours_name(self):
        """Generate unique name for testing"""
        return f"TEST_Hours_{uuid.uuid4().hex[:6]}"
    
    def test_get_business_hours(self, auth_headers):
        """Test GET /api/business-hours - List all business hours"""
        response = requests.get(f"{BASE_URL}/api/business-hours", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} business hours calendars")
    
    def test_get_business_hours_requires_auth(self):
        """Test GET /api/business-hours requires authentication"""
        response = requests.get(f"{BASE_URL}/api/business-hours")
        assert response.status_code in [401, 403]
    
    def test_create_business_hours(self, auth_headers, test_hours_name):
        """Test POST /api/business-hours - Create new business hours"""
        hours_data = {
            "name": test_hours_name,
            "description": "Test business hours for automated testing",
            "timezone": "Europe/Istanbul",
            "monday": {"start": "09:00", "end": "18:00", "enabled": True},
            "tuesday": {"start": "09:00", "end": "18:00", "enabled": True},
            "wednesday": {"start": "09:00", "end": "18:00", "enabled": True},
            "thursday": {"start": "09:00", "end": "18:00", "enabled": True},
            "friday": {"start": "09:00", "end": "18:00", "enabled": True},
            "saturday": {"start": "09:00", "end": "13:00", "enabled": False},
            "sunday": {"start": "00:00", "end": "00:00", "enabled": False},
            "holidays": ["2026-01-01", "2026-04-23"],
            "is_default": False
        }
        response = requests.post(f"{BASE_URL}/api/business-hours", json=hours_data, headers=auth_headers)
        assert response.status_code == 200, f"Create failed: {response.text}"
        data = response.json()
        assert data["name"] == test_hours_name
        assert data["timezone"] == "Europe/Istanbul"
        assert data["monday"]["enabled"] == True
        assert data["saturday"]["enabled"] == False
        assert "id" in data
        print(f"Created business hours: {data['id']}")
        return data["id"]
    
    def test_update_business_hours(self, auth_headers, test_hours_name):
        """Test PATCH /api/business-hours/{id} - Update business hours"""
        # First get the hours
        response = requests.get(f"{BASE_URL}/api/business-hours", headers=auth_headers)
        hours_list = response.json()
        test_hours = next((h for h in hours_list if h["name"] == test_hours_name), None)
        
        if test_hours:
            update_data = {
                "description": "Updated description",
                "saturday": {"start": "10:00", "end": "14:00", "enabled": True}
            }
            response = requests.patch(f"{BASE_URL}/api/business-hours/{test_hours['id']}", json=update_data, headers=auth_headers)
            assert response.status_code == 200
            data = response.json()
            assert data["description"] == "Updated description"
            assert data["saturday"]["enabled"] == True
            print(f"Updated business hours: {test_hours['id']}")


class TestSLAPauseResume:
    """SLA Pause/Resume functionality tests"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@network.com",
            "password": "Test123!"
        })
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    @pytest.fixture(scope="class")
    def test_ticket(self, auth_headers):
        """Create a test ticket for SLA pause/resume testing"""
        # First get or create a customer
        customers_response = requests.get(f"{BASE_URL}/api/customers", headers=auth_headers)
        customers = customers_response.json()
        
        if customers:
            customer_id = customers[0]["id"]
        else:
            customer_data = {
                "name": "TEST_SLA_Customer",
                "email": "test_sla@example.com",
                "phone": "5551234567"
            }
            customer_response = requests.post(f"{BASE_URL}/api/customers", json=customer_data, headers=auth_headers)
            customer_id = customer_response.json()["id"]
        
        # Create ticket
        ticket_data = {
            "customer_id": customer_id,
            "title": f"TEST_SLA_Ticket_{uuid.uuid4().hex[:6]}",
            "description": "Test ticket for SLA pause/resume testing",
            "priority": "high",
            "category": "network"
        }
        response = requests.post(f"{BASE_URL}/api/tickets", json=ticket_data, headers=auth_headers)
        assert response.status_code == 200
        return response.json()
    
    def test_pause_sla(self, auth_headers, test_ticket):
        """Test POST /api/tickets/{id}/pause-sla - Pause SLA timer"""
        ticket_id = test_ticket["id"]
        response = requests.post(
            f"{BASE_URL}/api/tickets/{ticket_id}/pause-sla",
            params={"reason": "Müşteri yanıtı bekleniyor"},
            headers=auth_headers
        )
        assert response.status_code == 200, f"Pause failed: {response.text}"
        data = response.json()
        assert data["status"] == "success"
        assert "pause_id" in data
        print(f"SLA paused for ticket: {ticket_id}")
    
    def test_pause_already_paused_fails(self, auth_headers, test_ticket):
        """Test POST /api/tickets/{id}/pause-sla - Already paused should fail"""
        ticket_id = test_ticket["id"]
        response = requests.post(
            f"{BASE_URL}/api/tickets/{ticket_id}/pause-sla",
            params={"reason": "Another reason"},
            headers=auth_headers
        )
        assert response.status_code == 400
        assert "already paused" in response.json().get("detail", "").lower()
    
    def test_resume_sla(self, auth_headers, test_ticket):
        """Test POST /api/tickets/{id}/resume-sla - Resume SLA timer"""
        ticket_id = test_ticket["id"]
        response = requests.post(
            f"{BASE_URL}/api/tickets/{ticket_id}/resume-sla",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Resume failed: {response.text}"
        data = response.json()
        assert data["status"] == "success"
        print(f"SLA resumed for ticket: {ticket_id}")
    
    def test_resume_not_paused_fails(self, auth_headers, test_ticket):
        """Test POST /api/tickets/{id}/resume-sla - Not paused should fail"""
        ticket_id = test_ticket["id"]
        response = requests.post(
            f"{BASE_URL}/api/tickets/{ticket_id}/resume-sla",
            headers=auth_headers
        )
        assert response.status_code == 400
        assert "not paused" in response.json().get("detail", "").lower()
    
    def test_get_sla_history(self, auth_headers, test_ticket):
        """Test GET /api/tickets/{id}/sla-history - Get SLA pause history"""
        ticket_id = test_ticket["id"]
        response = requests.get(
            f"{BASE_URL}/api/tickets/{ticket_id}/sla-history",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1  # Should have at least one pause record
        print(f"SLA history has {len(data)} records")


class TestRolesAndPermissions:
    """Role & Permission management tests"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@network.com",
            "password": "Test123!"
        })
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    @pytest.fixture(scope="class")
    def test_role_code(self):
        """Generate unique role code for testing"""
        return f"test_{uuid.uuid4().hex[:6]}"
    
    def test_get_permissions(self, auth_headers):
        """Test GET /api/permissions - List all permissions"""
        response = requests.get(f"{BASE_URL}/api/permissions", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        
        # Verify permission structure
        perm = data[0]
        assert "code" in perm
        assert "name" in perm
        assert "module" in perm
        
        # Check for expected modules
        modules = set(p["module"] for p in data)
        expected_modules = {"tickets", "customers", "assets", "work_orders", "parts", "rma", "reports", "settings", "users"}
        assert expected_modules.issubset(modules), f"Missing modules: {expected_modules - modules}"
        print(f"Found {len(data)} permissions across {len(modules)} modules")
    
    def test_get_permissions_requires_auth(self):
        """Test GET /api/permissions requires authentication"""
        response = requests.get(f"{BASE_URL}/api/permissions")
        assert response.status_code in [401, 403]
    
    def test_get_roles(self, auth_headers):
        """Test GET /api/roles - List all roles"""
        response = requests.get(f"{BASE_URL}/api/roles", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 4  # Should have at least 4 default system roles
        
        # Verify default system roles exist
        role_codes = [r["code"] for r in data]
        expected_roles = ["admin", "manager", "technician", "viewer"]
        for expected in expected_roles:
            assert expected in role_codes, f"Missing system role: {expected}"
        
        # Verify role structure
        admin_role = next(r for r in data if r["code"] == "admin")
        assert admin_role["is_system"] == True
        assert "permissions" in admin_role
        assert len(admin_role["permissions"]) > 0
        print(f"Found {len(data)} roles including system roles")
    
    def test_get_roles_requires_auth(self):
        """Test GET /api/roles requires authentication"""
        response = requests.get(f"{BASE_URL}/api/roles")
        assert response.status_code in [401, 403]
    
    def test_create_custom_role(self, auth_headers, test_role_code):
        """Test POST /api/roles - Create custom role"""
        role_data = {
            "name": "Test Custom Role",
            "code": test_role_code,
            "description": "Test role for automated testing",
            "permissions": ["tickets.view", "tickets.create", "customers.view"]
        }
        response = requests.post(f"{BASE_URL}/api/roles", json=role_data, headers=auth_headers)
        assert response.status_code == 200, f"Create failed: {response.text}"
        data = response.json()
        assert data["name"] == "Test Custom Role"
        assert data["code"] == test_role_code
        assert data["is_system"] == False
        assert "tickets.view" in data["permissions"]
        assert "id" in data
        print(f"Created custom role: {data['id']}")
    
    def test_create_duplicate_role_fails(self, auth_headers, test_role_code):
        """Test POST /api/roles - Duplicate code should fail"""
        role_data = {
            "name": "Duplicate Role",
            "code": test_role_code,
            "permissions": []
        }
        response = requests.post(f"{BASE_URL}/api/roles", json=role_data, headers=auth_headers)
        assert response.status_code == 400
        assert "already exists" in response.json().get("detail", "").lower()
    
    def test_update_custom_role(self, auth_headers, test_role_code):
        """Test PATCH /api/roles/{id} - Update custom role"""
        # First get the role
        response = requests.get(f"{BASE_URL}/api/roles", headers=auth_headers)
        roles = response.json()
        test_role = next((r for r in roles if r["code"] == test_role_code), None)
        
        if test_role:
            update_data = {
                "name": "Updated Test Role",
                "permissions": ["tickets.view", "tickets.create", "tickets.edit", "customers.view", "assets.view"]
            }
            response = requests.patch(f"{BASE_URL}/api/roles/{test_role['id']}", json=update_data, headers=auth_headers)
            assert response.status_code == 200
            data = response.json()
            assert data["name"] == "Updated Test Role"
            assert "tickets.edit" in data["permissions"]
            print(f"Updated custom role: {test_role['id']}")
    
    def test_update_system_role_fails(self, auth_headers):
        """Test PATCH /api/roles/{id} - System roles cannot be modified"""
        # Get admin role
        response = requests.get(f"{BASE_URL}/api/roles", headers=auth_headers)
        roles = response.json()
        admin_role = next((r for r in roles if r["code"] == "admin"), None)
        
        if admin_role:
            update_data = {"name": "Modified Admin"}
            response = requests.patch(f"{BASE_URL}/api/roles/{admin_role['id']}", json=update_data, headers=auth_headers)
            assert response.status_code == 400
            assert "system roles" in response.json().get("detail", "").lower()
    
    def test_delete_custom_role(self, auth_headers, test_role_code):
        """Test DELETE /api/roles/{id} - Delete custom role"""
        # First get the role
        response = requests.get(f"{BASE_URL}/api/roles", headers=auth_headers)
        roles = response.json()
        test_role = next((r for r in roles if r["code"] == test_role_code), None)
        
        if test_role:
            response = requests.delete(f"{BASE_URL}/api/roles/{test_role['id']}", headers=auth_headers)
            assert response.status_code == 200
            assert response.json()["status"] == "success"
            print(f"Deleted custom role: {test_role['id']}")
    
    def test_delete_system_role_fails(self, auth_headers):
        """Test DELETE /api/roles/{id} - System roles cannot be deleted"""
        # Get admin role
        response = requests.get(f"{BASE_URL}/api/roles", headers=auth_headers)
        roles = response.json()
        admin_role = next((r for r in roles if r["code"] == "admin"), None)
        
        if admin_role:
            response = requests.delete(f"{BASE_URL}/api/roles/{admin_role['id']}", headers=auth_headers)
            assert response.status_code == 400
            assert "system roles" in response.json().get("detail", "").lower()


class TestAssetWarrantyExpiry:
    """Asset warranty/support expiry tracking tests"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@network.com",
            "password": "Test123!"
        })
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    @pytest.fixture(scope="class")
    def test_asset_with_warranty(self, auth_headers):
        """Create a test asset with warranty expiring soon"""
        # First get or create a customer
        customers_response = requests.get(f"{BASE_URL}/api/customers", headers=auth_headers)
        customers = customers_response.json()
        
        if customers:
            customer_id = customers[0]["id"]
        else:
            customer_data = {
                "name": "TEST_Warranty_Customer",
                "email": "test_warranty@example.com",
                "phone": "5551234567"
            }
            customer_response = requests.post(f"{BASE_URL}/api/customers", json=customer_data, headers=auth_headers)
            customer_id = customer_response.json()["id"]
        
        # Create asset with warranty expiring in 15 days
        warranty_end = (datetime.now() + timedelta(days=15)).strftime("%Y-%m-%d")
        support_end = (datetime.now() + timedelta(days=45)).strftime("%Y-%m-%d")
        
        asset_data = {
            "customer_id": customer_id,
            "serial_number": f"TEST_SN_{uuid.uuid4().hex[:8]}",
            "device_type": "router",
            "brand": "Cisco",
            "model": "ISR 4321",
            "warranty_end": warranty_end,
            "support_end": support_end
        }
        response = requests.post(f"{BASE_URL}/api/assets", json=asset_data, headers=auth_headers)
        assert response.status_code == 200
        return response.json()
    
    def test_get_warranty_expiring_assets(self, auth_headers, test_asset_with_warranty):
        """Test GET /api/assets/warranty-expiring - Get assets with expiring warranty"""
        response = requests.get(
            f"{BASE_URL}/api/assets/warranty-expiring",
            params={"days": 30},
            headers=auth_headers
        )
        assert response.status_code == 200, f"Request failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        
        # Check if our test asset is in the list
        test_asset_id = test_asset_with_warranty["id"]
        found = any(a["id"] == test_asset_id for a in data)
        assert found, "Test asset with expiring warranty not found in results"
        
        # Verify response structure
        if data:
            asset = data[0]
            assert "days_remaining" in asset
            assert "expiry_type" in asset
            assert asset["expiry_type"] in ["warranty", "support"]
        
        print(f"Found {len(data)} assets with expiring warranty/support")
    
    def test_get_warranty_expiring_requires_auth(self):
        """Test GET /api/assets/warranty-expiring requires authentication"""
        response = requests.get(f"{BASE_URL}/api/assets/warranty-expiring")
        assert response.status_code in [401, 403]


class TestAssetHistory:
    """Asset history tracking tests"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@network.com",
            "password": "Test123!"
        })
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    @pytest.fixture(scope="class")
    def test_asset(self, auth_headers):
        """Create a test asset for history testing"""
        # First get or create a customer
        customers_response = requests.get(f"{BASE_URL}/api/customers", headers=auth_headers)
        customers = customers_response.json()
        
        if customers:
            customer_id = customers[0]["id"]
        else:
            customer_data = {
                "name": "TEST_History_Customer",
                "email": "test_history@example.com",
                "phone": "5551234567"
            }
            customer_response = requests.post(f"{BASE_URL}/api/customers", json=customer_data, headers=auth_headers)
            customer_id = customer_response.json()["id"]
        
        # Create asset
        asset_data = {
            "customer_id": customer_id,
            "serial_number": f"TEST_HIST_{uuid.uuid4().hex[:8]}",
            "device_type": "switch",
            "brand": "HP",
            "model": "Aruba 2930F"
        }
        response = requests.post(f"{BASE_URL}/api/assets", json=asset_data, headers=auth_headers)
        assert response.status_code == 200
        return response.json()
    
    def test_get_asset_history(self, auth_headers, test_asset):
        """Test GET /api/assets/{id}/history - Get asset history"""
        asset_id = test_asset["id"]
        response = requests.get(
            f"{BASE_URL}/api/assets/{asset_id}/history",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Request failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"Asset history has {len(data)} records")
    
    def test_asset_update_creates_history(self, auth_headers, test_asset):
        """Test that updating asset creates history record"""
        asset_id = test_asset["id"]
        
        # Update asset
        update_data = {
            "firmware_version": "v2.0.1",
            "ip_address": "192.168.1.100"
        }
        response = requests.patch(
            f"{BASE_URL}/api/assets/{asset_id}",
            json=update_data,
            headers=auth_headers
        )
        assert response.status_code == 200
        
        # Check history
        history_response = requests.get(
            f"{BASE_URL}/api/assets/{asset_id}/history",
            headers=auth_headers
        )
        assert history_response.status_code == 200
        history = history_response.json()
        
        # Should have field_change records
        field_changes = [h for h in history if h.get("event_type") == "field_change"]
        assert len(field_changes) >= 1, "No field change history records found"
        print(f"Found {len(field_changes)} field change records in history")
    
    def test_get_asset_history_requires_auth(self, test_asset):
        """Test GET /api/assets/{id}/history requires authentication"""
        asset_id = test_asset["id"]
        response = requests.get(f"{BASE_URL}/api/assets/{asset_id}/history")
        assert response.status_code in [401, 403]


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
