"""
Test User CRUD Operations and Ticket Delete
- PATCH /api/users/{id} - User update
- POST /api/users/{id}/reset-password - Password reset
- DELETE /api/users/{id} - User delete
- DELETE /api/tickets/{id} - Ticket delete
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestUserCRUD:
    """Test User CRUD operations"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - login as admin"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@network.com",
            "password": "Test123!"
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        token = login_response.json()["access_token"]
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        self.admin_user = login_response.json()["user"]
        
        yield
        
        # Cleanup - delete test users
        users_response = self.session.get(f"{BASE_URL}/api/users")
        if users_response.status_code == 200:
            for user in users_response.json():
                if user.get("email", "").startswith("TEST_"):
                    self.session.delete(f"{BASE_URL}/api/users/{user['id']}")
    
    def test_get_users_list(self):
        """Test GET /api/users - List all users"""
        response = self.session.get(f"{BASE_URL}/api/users")
        assert response.status_code == 200
        users = response.json()
        assert isinstance(users, list)
        print(f"✓ GET /api/users - Found {len(users)} users")
    
    def test_create_user_for_crud_tests(self):
        """Create a test user for CRUD operations"""
        unique_id = str(uuid.uuid4())[:8]
        user_data = {
            "email": f"TEST_user_{unique_id}@test.com",
            "password": "TestPass123!",
            "full_name": f"TEST User {unique_id}",
            "role": "operator"
        }
        
        response = self.session.post(f"{BASE_URL}/api/auth/register", json=user_data)
        assert response.status_code == 200, f"Failed to create user: {response.text}"
        created_user = response.json()
        assert created_user["email"] == user_data["email"]
        assert created_user["full_name"] == user_data["full_name"]
        assert created_user["role"] == user_data["role"]
        print(f"✓ Created test user: {created_user['email']}")
        return created_user
    
    def test_update_user_full_name(self):
        """Test PATCH /api/users/{id} - Update user full name"""
        # Create test user
        created_user = self.test_create_user_for_crud_tests()
        user_id = created_user["id"]
        
        # Update full name
        update_data = {"full_name": "Updated Name TEST"}
        response = self.session.patch(f"{BASE_URL}/api/users/{user_id}", json=update_data)
        assert response.status_code == 200, f"Update failed: {response.text}"
        
        updated_user = response.json()
        assert updated_user["full_name"] == "Updated Name TEST"
        print(f"✓ PATCH /api/users/{user_id} - Full name updated")
        
        # Verify with GET
        get_response = self.session.get(f"{BASE_URL}/api/users/{user_id}")
        assert get_response.status_code == 200
        assert get_response.json()["full_name"] == "Updated Name TEST"
        print(f"✓ GET /api/users/{user_id} - Verified update persisted")
    
    def test_update_user_email(self):
        """Test PATCH /api/users/{id} - Update user email"""
        created_user = self.test_create_user_for_crud_tests()
        user_id = created_user["id"]
        
        unique_id = str(uuid.uuid4())[:8]
        new_email = f"TEST_updated_{unique_id}@test.com"
        update_data = {"email": new_email}
        
        response = self.session.patch(f"{BASE_URL}/api/users/{user_id}", json=update_data)
        assert response.status_code == 200, f"Update failed: {response.text}"
        
        updated_user = response.json()
        assert updated_user["email"] == new_email
        print(f"✓ PATCH /api/users/{user_id} - Email updated to {new_email}")
    
    def test_update_user_role(self):
        """Test PATCH /api/users/{id} - Update user role (admin only)"""
        created_user = self.test_create_user_for_crud_tests()
        user_id = created_user["id"]
        
        update_data = {"role": "technician"}
        response = self.session.patch(f"{BASE_URL}/api/users/{user_id}", json=update_data)
        assert response.status_code == 200, f"Update failed: {response.text}"
        
        updated_user = response.json()
        assert updated_user["role"] == "technician"
        print(f"✓ PATCH /api/users/{user_id} - Role updated to technician")
    
    def test_update_nonexistent_user(self):
        """Test PATCH /api/users/{id} - Update non-existent user returns 404"""
        fake_id = str(uuid.uuid4())
        update_data = {"full_name": "Test"}
        
        response = self.session.patch(f"{BASE_URL}/api/users/{fake_id}", json=update_data)
        assert response.status_code == 404
        print(f"✓ PATCH /api/users/{fake_id} - Returns 404 for non-existent user")
    
    def test_update_duplicate_email(self):
        """Test PATCH /api/users/{id} - Duplicate email returns 400"""
        # Create two test users
        user1 = self.test_create_user_for_crud_tests()
        user2 = self.test_create_user_for_crud_tests()
        
        # Try to update user2's email to user1's email
        update_data = {"email": user1["email"]}
        response = self.session.patch(f"{BASE_URL}/api/users/{user2['id']}", json=update_data)
        assert response.status_code == 400
        assert "zaten kullanımda" in response.json().get("detail", "").lower() or "already" in response.json().get("detail", "").lower()
        print(f"✓ PATCH /api/users - Duplicate email returns 400")
    
    def test_reset_password(self):
        """Test POST /api/users/{id}/reset-password - Reset user password"""
        created_user = self.test_create_user_for_crud_tests()
        user_id = created_user["id"]
        
        new_password = "NewPass456!"
        response = self.session.post(
            f"{BASE_URL}/api/users/{user_id}/reset-password",
            json={"new_password": new_password}
        )
        assert response.status_code == 200, f"Password reset failed: {response.text}"
        assert "başarıyla" in response.json().get("message", "").lower() or "success" in response.json().get("message", "").lower()
        print(f"✓ POST /api/users/{user_id}/reset-password - Password reset successful")
        
        # Verify new password works
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": created_user["email"],
            "password": new_password
        })
        assert login_response.status_code == 200, "Login with new password failed"
        print(f"✓ Verified new password works for login")
    
    def test_reset_password_too_short(self):
        """Test POST /api/users/{id}/reset-password - Short password returns 400"""
        created_user = self.test_create_user_for_crud_tests()
        user_id = created_user["id"]
        
        response = self.session.post(
            f"{BASE_URL}/api/users/{user_id}/reset-password",
            json={"new_password": "12345"}  # Less than 6 chars
        )
        assert response.status_code == 400
        print(f"✓ POST /api/users/{user_id}/reset-password - Short password returns 400")
    
    def test_reset_password_nonexistent_user(self):
        """Test POST /api/users/{id}/reset-password - Non-existent user returns 404"""
        fake_id = str(uuid.uuid4())
        response = self.session.post(
            f"{BASE_URL}/api/users/{fake_id}/reset-password",
            json={"new_password": "NewPass123!"}
        )
        assert response.status_code == 404
        print(f"✓ POST /api/users/{fake_id}/reset-password - Returns 404 for non-existent user")
    
    def test_delete_user(self):
        """Test DELETE /api/users/{id} - Delete user"""
        created_user = self.test_create_user_for_crud_tests()
        user_id = created_user["id"]
        
        response = self.session.delete(f"{BASE_URL}/api/users/{user_id}")
        assert response.status_code == 200, f"Delete failed: {response.text}"
        assert "silindi" in response.json().get("message", "").lower() or "deleted" in response.json().get("message", "").lower()
        print(f"✓ DELETE /api/users/{user_id} - User deleted")
        
        # Verify user no longer exists
        get_response = self.session.get(f"{BASE_URL}/api/users/{user_id}")
        assert get_response.status_code == 404
        print(f"✓ GET /api/users/{user_id} - Verified user no longer exists")
    
    def test_delete_nonexistent_user(self):
        """Test DELETE /api/users/{id} - Non-existent user returns 404"""
        fake_id = str(uuid.uuid4())
        response = self.session.delete(f"{BASE_URL}/api/users/{fake_id}")
        assert response.status_code == 404
        print(f"✓ DELETE /api/users/{fake_id} - Returns 404 for non-existent user")
    
    def test_delete_self_not_allowed(self):
        """Test DELETE /api/users/{id} - Cannot delete self"""
        admin_id = self.admin_user["id"]
        response = self.session.delete(f"{BASE_URL}/api/users/{admin_id}")
        assert response.status_code == 400
        assert "kendinizi" in response.json().get("detail", "").lower() or "yourself" in response.json().get("detail", "").lower()
        print(f"✓ DELETE /api/users/{admin_id} - Cannot delete self returns 400")


class TestTicketDelete:
    """Test Ticket Delete operations"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - login as admin"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@network.com",
            "password": "Test123!"
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        token = login_response.json()["access_token"]
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        yield
        
        # Cleanup - delete test tickets
        tickets_response = self.session.get(f"{BASE_URL}/api/tickets")
        if tickets_response.status_code == 200:
            for ticket in tickets_response.json():
                if ticket.get("title", "").startswith("TEST_"):
                    self.session.delete(f"{BASE_URL}/api/tickets/{ticket['id']}")
    
    def create_test_customer(self):
        """Create a test customer for ticket creation"""
        unique_id = str(uuid.uuid4())[:8]
        customer_data = {
            "name": f"TEST_Customer_{unique_id}",
            "email": f"TEST_customer_{unique_id}@test.com",
            "phone": "5551234567"
        }
        response = self.session.post(f"{BASE_URL}/api/customers", json=customer_data)
        assert response.status_code == 200, f"Failed to create customer: {response.text}"
        return response.json()
    
    def create_test_ticket(self):
        """Create a test ticket"""
        customer = self.create_test_customer()
        unique_id = str(uuid.uuid4())[:8]
        ticket_data = {
            "customer_id": customer["id"],
            "title": f"TEST_Ticket_{unique_id}",
            "description": "Test ticket for delete testing",
            "category": "network",
            "priority": "medium"
        }
        response = self.session.post(f"{BASE_URL}/api/tickets", json=ticket_data)
        assert response.status_code == 200, f"Failed to create ticket: {response.text}"
        return response.json()
    
    def test_get_tickets_list(self):
        """Test GET /api/tickets - List all tickets"""
        response = self.session.get(f"{BASE_URL}/api/tickets")
        assert response.status_code == 200
        tickets = response.json()
        assert isinstance(tickets, list)
        print(f"✓ GET /api/tickets - Found {len(tickets)} tickets")
    
    def test_delete_ticket(self):
        """Test DELETE /api/tickets/{id} - Delete ticket"""
        ticket = self.create_test_ticket()
        ticket_id = ticket["id"]
        ticket_number = ticket["ticket_number"]
        
        response = self.session.delete(f"{BASE_URL}/api/tickets/{ticket_id}")
        assert response.status_code == 200, f"Delete failed: {response.text}"
        assert "silindi" in response.json().get("message", "").lower() or "deleted" in response.json().get("message", "").lower()
        print(f"✓ DELETE /api/tickets/{ticket_id} - Ticket {ticket_number} deleted")
        
        # Verify ticket no longer exists
        get_response = self.session.get(f"{BASE_URL}/api/tickets/{ticket_id}")
        assert get_response.status_code == 404
        print(f"✓ GET /api/tickets/{ticket_id} - Verified ticket no longer exists")
    
    def test_delete_ticket_with_comments(self):
        """Test DELETE /api/tickets/{id} - Delete ticket with comments"""
        ticket = self.create_test_ticket()
        ticket_id = ticket["id"]
        
        # Add a comment
        comment_response = self.session.post(
            f"{BASE_URL}/api/tickets/{ticket_id}/comments",
            json={"ticket_id": ticket_id, "comment": "Test comment for delete"}
        )
        assert comment_response.status_code == 200, f"Failed to add comment: {comment_response.text}"
        print(f"✓ Added comment to ticket {ticket_id}")
        
        # Delete ticket
        response = self.session.delete(f"{BASE_URL}/api/tickets/{ticket_id}")
        assert response.status_code == 200, f"Delete failed: {response.text}"
        print(f"✓ DELETE /api/tickets/{ticket_id} - Ticket with comments deleted")
        
        # Verify ticket no longer exists
        get_response = self.session.get(f"{BASE_URL}/api/tickets/{ticket_id}")
        assert get_response.status_code == 404
        print(f"✓ Verified ticket and related data deleted")
    
    def test_delete_nonexistent_ticket(self):
        """Test DELETE /api/tickets/{id} - Non-existent ticket returns 404"""
        fake_id = str(uuid.uuid4())
        response = self.session.delete(f"{BASE_URL}/api/tickets/{fake_id}")
        assert response.status_code == 404
        print(f"✓ DELETE /api/tickets/{fake_id} - Returns 404 for non-existent ticket")


class TestNonAdminPermissions:
    """Test permission restrictions for non-admin users"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - create and login as non-admin user"""
        self.admin_session = requests.Session()
        self.admin_session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin first
        login_response = self.admin_session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@network.com",
            "password": "Test123!"
        })
        assert login_response.status_code == 200
        admin_token = login_response.json()["access_token"]
        self.admin_session.headers.update({"Authorization": f"Bearer {admin_token}"})
        
        # Create a non-admin test user
        unique_id = str(uuid.uuid4())[:8]
        self.test_user_email = f"TEST_operator_{unique_id}@test.com"
        self.test_user_password = "TestPass123!"
        
        user_data = {
            "email": self.test_user_email,
            "password": self.test_user_password,
            "full_name": f"TEST Operator {unique_id}",
            "role": "operator"
        }
        
        create_response = self.admin_session.post(f"{BASE_URL}/api/auth/register", json=user_data)
        assert create_response.status_code == 200
        self.test_user = create_response.json()
        
        # Login as non-admin user
        self.user_session = requests.Session()
        self.user_session.headers.update({"Content-Type": "application/json"})
        
        login_response = self.user_session.post(f"{BASE_URL}/api/auth/login", json={
            "email": self.test_user_email,
            "password": self.test_user_password
        })
        assert login_response.status_code == 200
        user_token = login_response.json()["access_token"]
        self.user_session.headers.update({"Authorization": f"Bearer {user_token}"})
        
        yield
        
        # Cleanup
        self.admin_session.delete(f"{BASE_URL}/api/users/{self.test_user['id']}")
    
    def test_non_admin_cannot_delete_other_users(self):
        """Test non-admin cannot delete other users"""
        # Create another user to try to delete
        unique_id = str(uuid.uuid4())[:8]
        other_user_data = {
            "email": f"TEST_other_{unique_id}@test.com",
            "password": "TestPass123!",
            "full_name": f"TEST Other {unique_id}",
            "role": "operator"
        }
        create_response = self.admin_session.post(f"{BASE_URL}/api/auth/register", json=other_user_data)
        assert create_response.status_code == 200
        other_user = create_response.json()
        
        # Try to delete as non-admin
        response = self.user_session.delete(f"{BASE_URL}/api/users/{other_user['id']}")
        assert response.status_code == 403
        print(f"✓ Non-admin cannot delete other users - returns 403")
        
        # Cleanup
        self.admin_session.delete(f"{BASE_URL}/api/users/{other_user['id']}")
    
    def test_non_admin_cannot_update_other_users(self):
        """Test non-admin cannot update other users"""
        # Create another user
        unique_id = str(uuid.uuid4())[:8]
        other_user_data = {
            "email": f"TEST_other2_{unique_id}@test.com",
            "password": "TestPass123!",
            "full_name": f"TEST Other2 {unique_id}",
            "role": "operator"
        }
        create_response = self.admin_session.post(f"{BASE_URL}/api/auth/register", json=other_user_data)
        assert create_response.status_code == 200
        other_user = create_response.json()
        
        # Try to update as non-admin
        response = self.user_session.patch(
            f"{BASE_URL}/api/users/{other_user['id']}",
            json={"full_name": "Hacked Name"}
        )
        assert response.status_code == 403
        print(f"✓ Non-admin cannot update other users - returns 403")
        
        # Cleanup
        self.admin_session.delete(f"{BASE_URL}/api/users/{other_user['id']}")
    
    def test_user_can_update_own_profile(self):
        """Test user can update their own profile"""
        response = self.user_session.patch(
            f"{BASE_URL}/api/users/{self.test_user['id']}",
            json={"full_name": "Updated Own Name"}
        )
        assert response.status_code == 200
        assert response.json()["full_name"] == "Updated Own Name"
        print(f"✓ User can update own profile")
    
    def test_user_can_reset_own_password(self):
        """Test user can reset their own password"""
        new_password = "NewOwnPass123!"
        response = self.user_session.post(
            f"{BASE_URL}/api/users/{self.test_user['id']}/reset-password",
            json={"new_password": new_password}
        )
        assert response.status_code == 200
        print(f"✓ User can reset own password")
        
        # Verify new password works
        login_response = self.user_session.post(f"{BASE_URL}/api/auth/login", json={
            "email": self.test_user_email,
            "password": new_password
        })
        assert login_response.status_code == 200
        print(f"✓ Verified new password works")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
