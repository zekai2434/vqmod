"""
Test Portal User Management and Service Report/Quote Features
- Portal user CRUD (edit, delete, password reset)
- Service Report endpoint
- Quote creation page data
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestPortalUserManagement:
    """Test portal user CRUD operations"""
    
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
        
        # Get or create a customer for portal user tests
        customers_response = self.session.get(f"{BASE_URL}/api/customers")
        assert customers_response.status_code == 200
        customers = customers_response.json()
        
        if customers:
            self.customer_id = customers[0]["id"]
        else:
            # Create a test customer
            customer_response = self.session.post(f"{BASE_URL}/api/customers", json={
                "name": "TEST_Portal_Customer",
                "email": "test_portal_customer@test.com",
                "phone": "5551234567"
            })
            assert customer_response.status_code == 200
            self.customer_id = customer_response.json()["id"]
        
        yield
        
        # Cleanup - delete test portal users
        users_response = self.session.get(f"{BASE_URL}/api/portal-users")
        if users_response.status_code == 200:
            for user in users_response.json():
                if user.get("email", "").startswith("TEST_"):
                    self.session.delete(f"{BASE_URL}/api/portal-users/{user['id']}")
    
    def test_get_portal_users_list(self):
        """Test GET /api/portal-users - List all portal users"""
        response = self.session.get(f"{BASE_URL}/api/portal-users")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
        print(f"PASS: GET /api/portal-users - Found {len(response.json())} portal users")
    
    def test_get_portal_users_by_customer(self):
        """Test GET /api/portal-users?customer_id=xxx - Filter by customer"""
        response = self.session.get(f"{BASE_URL}/api/portal-users", params={"customer_id": self.customer_id})
        assert response.status_code == 200
        assert isinstance(response.json(), list)
        print(f"PASS: GET /api/portal-users?customer_id - Filtered portal users")
    
    def test_create_portal_user(self):
        """Test POST /api/portal/register - Create portal user"""
        unique_email = f"TEST_{uuid.uuid4().hex[:8]}@test.com"
        response = self.session.post(f"{BASE_URL}/api/portal/register", json={
            "customer_id": self.customer_id,
            "email": unique_email,
            "password": "TestPass123!",
            "full_name": "TEST_Portal_User",
            "phone": "5559876543"
        })
        assert response.status_code == 200, f"Create portal user failed: {response.text}"
        data = response.json()
        assert data["email"] == unique_email
        assert data["full_name"] == "TEST_Portal_User"
        assert "id" in data
        print(f"PASS: POST /api/portal/register - Created portal user {data['id']}")
        return data["id"]
    
    def test_update_portal_user(self):
        """Test PATCH /api/portal-users/{id} - Update portal user"""
        # First create a user
        unique_email = f"TEST_{uuid.uuid4().hex[:8]}@test.com"
        create_response = self.session.post(f"{BASE_URL}/api/portal/register", json={
            "customer_id": self.customer_id,
            "email": unique_email,
            "password": "TestPass123!",
            "full_name": "TEST_Update_User"
        })
        assert create_response.status_code == 200
        user_id = create_response.json()["id"]
        
        # Update the user
        update_response = self.session.patch(f"{BASE_URL}/api/portal-users/{user_id}", json={
            "full_name": "TEST_Updated_Name",
            "phone": "5551112233"
        })
        assert update_response.status_code == 200, f"Update failed: {update_response.text}"
        updated_data = update_response.json()
        assert updated_data["full_name"] == "TEST_Updated_Name"
        assert updated_data["phone"] == "5551112233"
        print(f"PASS: PATCH /api/portal-users/{user_id} - Updated portal user")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/portal-users/{user_id}")
    
    def test_update_portal_user_email_conflict(self):
        """Test PATCH /api/portal-users/{id} - Email conflict check"""
        # Create two users
        email1 = f"TEST_{uuid.uuid4().hex[:8]}@test.com"
        email2 = f"TEST_{uuid.uuid4().hex[:8]}@test.com"
        
        user1_response = self.session.post(f"{BASE_URL}/api/portal/register", json={
            "customer_id": self.customer_id,
            "email": email1,
            "password": "TestPass123!",
            "full_name": "TEST_User1"
        })
        user1_id = user1_response.json()["id"]
        
        user2_response = self.session.post(f"{BASE_URL}/api/portal/register", json={
            "customer_id": self.customer_id,
            "email": email2,
            "password": "TestPass123!",
            "full_name": "TEST_User2"
        })
        user2_id = user2_response.json()["id"]
        
        # Try to update user2's email to user1's email
        conflict_response = self.session.patch(f"{BASE_URL}/api/portal-users/{user2_id}", json={
            "email": email1
        })
        assert conflict_response.status_code == 400
        assert "kullanımda" in conflict_response.json()["detail"].lower() or "already" in conflict_response.json()["detail"].lower()
        print(f"PASS: PATCH /api/portal-users - Email conflict detected correctly")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/portal-users/{user1_id}")
        self.session.delete(f"{BASE_URL}/api/portal-users/{user2_id}")
    
    def test_reset_portal_user_password(self):
        """Test POST /api/portal-users/{id}/reset-password - Reset password"""
        # Create a user
        unique_email = f"TEST_{uuid.uuid4().hex[:8]}@test.com"
        create_response = self.session.post(f"{BASE_URL}/api/portal/register", json={
            "customer_id": self.customer_id,
            "email": unique_email,
            "password": "OldPassword123!",
            "full_name": "TEST_Password_Reset_User"
        })
        user_id = create_response.json()["id"]
        
        # Reset password
        reset_response = self.session.post(f"{BASE_URL}/api/portal-users/{user_id}/reset-password", json={
            "new_password": "NewPassword456!"
        })
        assert reset_response.status_code == 200, f"Password reset failed: {reset_response.text}"
        assert "başarıyla" in reset_response.json()["message"].lower() or "success" in reset_response.json()["message"].lower()
        print(f"PASS: POST /api/portal-users/{user_id}/reset-password - Password reset successful")
        
        # Verify new password works
        login_response = requests.post(f"{BASE_URL}/api/portal/login", json={
            "email": unique_email,
            "password": "NewPassword456!"
        })
        assert login_response.status_code == 200, "Login with new password failed"
        print(f"PASS: Portal user can login with new password")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/portal-users/{user_id}")
    
    def test_reset_password_short_password(self):
        """Test POST /api/portal-users/{id}/reset-password - Short password validation"""
        # Create a user
        unique_email = f"TEST_{uuid.uuid4().hex[:8]}@test.com"
        create_response = self.session.post(f"{BASE_URL}/api/portal/register", json={
            "customer_id": self.customer_id,
            "email": unique_email,
            "password": "TestPass123!",
            "full_name": "TEST_Short_Password_User"
        })
        user_id = create_response.json()["id"]
        
        # Try to reset with short password
        reset_response = self.session.post(f"{BASE_URL}/api/portal-users/{user_id}/reset-password", json={
            "new_password": "12345"  # Less than 6 characters
        })
        assert reset_response.status_code == 400
        assert "6" in reset_response.json()["detail"]
        print(f"PASS: Password reset validation - Short password rejected")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/portal-users/{user_id}")
    
    def test_delete_portal_user(self):
        """Test DELETE /api/portal-users/{id} - Delete portal user"""
        # Create a user
        unique_email = f"TEST_{uuid.uuid4().hex[:8]}@test.com"
        create_response = self.session.post(f"{BASE_URL}/api/portal/register", json={
            "customer_id": self.customer_id,
            "email": unique_email,
            "password": "TestPass123!",
            "full_name": "TEST_Delete_User"
        })
        user_id = create_response.json()["id"]
        
        # Delete the user
        delete_response = self.session.delete(f"{BASE_URL}/api/portal-users/{user_id}")
        assert delete_response.status_code == 200, f"Delete failed: {delete_response.text}"
        assert "silindi" in delete_response.json()["message"].lower() or "deleted" in delete_response.json()["message"].lower()
        print(f"PASS: DELETE /api/portal-users/{user_id} - Portal user deleted")
        
        # Verify user is deleted
        get_response = self.session.get(f"{BASE_URL}/api/portal-users")
        users = get_response.json()
        assert not any(u["id"] == user_id for u in users), "User still exists after deletion"
        print(f"PASS: Portal user no longer in list after deletion")
    
    def test_delete_nonexistent_user(self):
        """Test DELETE /api/portal-users/{id} - Delete non-existent user"""
        fake_id = str(uuid.uuid4())
        response = self.session.delete(f"{BASE_URL}/api/portal-users/{fake_id}")
        assert response.status_code == 404
        print(f"PASS: DELETE non-existent user returns 404")
    
    def test_toggle_portal_user_active(self):
        """Test PATCH /api/portal-users/{id}/toggle-active - Toggle active status"""
        # Create a user
        unique_email = f"TEST_{uuid.uuid4().hex[:8]}@test.com"
        create_response = self.session.post(f"{BASE_URL}/api/portal/register", json={
            "customer_id": self.customer_id,
            "email": unique_email,
            "password": "TestPass123!",
            "full_name": "TEST_Toggle_User"
        })
        user_id = create_response.json()["id"]
        initial_status = create_response.json()["is_active"]
        
        # Toggle active status
        toggle_response = self.session.patch(f"{BASE_URL}/api/portal-users/{user_id}/toggle-active")
        assert toggle_response.status_code == 200, f"Toggle failed: {toggle_response.text}"
        print(f"PASS: PATCH /api/portal-users/{user_id}/toggle-active - Status toggled")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/portal-users/{user_id}")


class TestServiceReport:
    """Test Service Report endpoint"""
    
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
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]
        self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    def test_get_service_report_existing_ticket(self):
        """Test GET /api/reports/service-report/{ticket_id} - Get service report for existing ticket"""
        # Use the existing test ticket ID
        ticket_id = "36db4c29-3992-4fbd-bd3c-1560002efda9"
        
        response = self.session.get(f"{BASE_URL}/api/reports/service-report/{ticket_id}")
        
        if response.status_code == 404:
            # Ticket might not exist, create one
            print("INFO: Test ticket not found, creating a new one")
            
            # Get a customer first
            customers_response = self.session.get(f"{BASE_URL}/api/customers")
            customers = customers_response.json()
            if not customers:
                pytest.skip("No customers available for test")
            
            customer_id = customers[0]["id"]
            
            # Create a ticket
            ticket_response = self.session.post(f"{BASE_URL}/api/tickets", json={
                "customer_id": customer_id,
                "title": "TEST_Service_Report_Ticket",
                "description": "Test ticket for service report",
                "category": "hardware",
                "priority": "medium"
            })
            assert ticket_response.status_code == 200
            ticket_id = ticket_response.json()["id"]
            
            # Now get the service report
            response = self.session.get(f"{BASE_URL}/api/reports/service-report/{ticket_id}")
        
        assert response.status_code == 200, f"Service report failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "ticket" in data
        assert "customer" in data
        assert "work_orders" in data
        assert "summary" in data
        
        # Verify ticket data
        assert "ticket_number" in data["ticket"]
        assert "title" in data["ticket"]
        assert "description" in data["ticket"]
        assert "status" in data["ticket"]
        
        # Verify summary data
        assert "total_work_orders" in data["summary"]
        assert "total_time_spent_minutes" in data["summary"]
        assert "parts_used_count" in data["summary"]
        
        print(f"PASS: GET /api/reports/service-report/{ticket_id} - Service report retrieved")
        print(f"  - Ticket: {data['ticket']['ticket_number']}")
        print(f"  - Work Orders: {data['summary']['total_work_orders']}")
        print(f"  - Total Time: {data['summary']['total_time_spent_minutes']} minutes")
    
    def test_get_service_report_nonexistent_ticket(self):
        """Test GET /api/reports/service-report/{ticket_id} - Non-existent ticket"""
        fake_id = str(uuid.uuid4())
        response = self.session.get(f"{BASE_URL}/api/reports/service-report/{fake_id}")
        assert response.status_code == 404
        print(f"PASS: Service report for non-existent ticket returns 404")


class TestQuoteData:
    """Test data endpoints needed for Quote creation"""
    
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
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]
        self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    def test_get_customers_for_quote(self):
        """Test GET /api/customers - Get customers for quote selection"""
        response = self.session.get(f"{BASE_URL}/api/customers")
        assert response.status_code == 200
        customers = response.json()
        assert isinstance(customers, list)
        print(f"PASS: GET /api/customers - Found {len(customers)} customers for quote")
    
    def test_get_parts_for_quote(self):
        """Test GET /api/parts - Get parts for quote items"""
        response = self.session.get(f"{BASE_URL}/api/parts")
        assert response.status_code == 200
        parts = response.json()
        assert isinstance(parts, list)
        print(f"PASS: GET /api/parts - Found {len(parts)} parts for quote")
    
    def test_get_system_settings_for_quote(self):
        """Test GET /api/system-settings - Get company info for quote header"""
        response = self.session.get(f"{BASE_URL}/api/system-settings")
        # System settings might not exist, which is OK
        assert response.status_code in [200, 404]
        if response.status_code == 200:
            data = response.json()
            print(f"PASS: GET /api/system-settings - Company: {data.get('company_name', 'Not set')}")
        else:
            print(f"PASS: GET /api/system-settings - No settings configured (404)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
