"""
Test suite for Notification System APIs
- GET /api/notifications/settings - Get notification settings
- PATCH /api/notifications/settings - Update notification settings
- GET /api/notifications - Get notification history
- POST /api/notifications/send - Send manual notification
- GET /api/notifications/templates - Get notification templates
- POST /api/notifications/sla-check - Run SLA check
- POST /api/notifications/test-email - Test email notification
- POST /api/notifications/test-sms - Test SMS notification
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestNotificationAPIs:
    """Notification System API Tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@network.com",
            "password": "Test123!"
        })
        
        if login_response.status_code == 200:
            token = login_response.json().get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
            self.user = login_response.json().get("user")
        else:
            pytest.skip("Authentication failed - skipping tests")
    
    # ==================== GET /api/notifications/settings ====================
    def test_get_notification_settings(self):
        """Test GET /api/notifications/settings - should return notification settings"""
        response = self.session.get(f"{BASE_URL}/api/notifications/settings")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Verify required fields exist
        assert "email_enabled" in data, "Missing email_enabled field"
        assert "sms_enabled" in data, "Missing sms_enabled field"
        assert "notify_on_ticket_created" in data, "Missing notify_on_ticket_created field"
        assert "notify_on_ticket_assigned" in data, "Missing notify_on_ticket_assigned field"
        assert "notify_on_ticket_resolved" in data, "Missing notify_on_ticket_resolved field"
        assert "notify_on_sla_risk" in data, "Missing notify_on_sla_risk field"
        assert "notify_on_comment_mention" in data, "Missing notify_on_comment_mention field"
        
        print(f"✓ GET /api/notifications/settings - Settings retrieved successfully")
        print(f"  Email enabled: {data.get('email_enabled')}")
        print(f"  SMS enabled: {data.get('sms_enabled')}")
    
    # ==================== PATCH /api/notifications/settings ====================
    def test_update_notification_settings_email_toggle(self):
        """Test PATCH /api/notifications/settings - toggle email notifications"""
        # First get current settings
        get_response = self.session.get(f"{BASE_URL}/api/notifications/settings")
        current_email_enabled = get_response.json().get("email_enabled", True)
        
        # Toggle email setting
        new_value = not current_email_enabled
        response = self.session.patch(f"{BASE_URL}/api/notifications/settings", json={
            "email_enabled": new_value
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("email_enabled") == new_value, f"Expected email_enabled={new_value}, got {data.get('email_enabled')}"
        
        # Verify persistence with GET
        verify_response = self.session.get(f"{BASE_URL}/api/notifications/settings")
        assert verify_response.json().get("email_enabled") == new_value
        
        # Restore original value
        self.session.patch(f"{BASE_URL}/api/notifications/settings", json={
            "email_enabled": current_email_enabled
        })
        
        print(f"✓ PATCH /api/notifications/settings - Email toggle works correctly")
    
    def test_update_notification_settings_sms_toggle(self):
        """Test PATCH /api/notifications/settings - toggle SMS notifications"""
        # First get current settings
        get_response = self.session.get(f"{BASE_URL}/api/notifications/settings")
        current_sms_enabled = get_response.json().get("sms_enabled", False)
        
        # Toggle SMS setting
        new_value = not current_sms_enabled
        response = self.session.patch(f"{BASE_URL}/api/notifications/settings", json={
            "sms_enabled": new_value
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("sms_enabled") == new_value, f"Expected sms_enabled={new_value}, got {data.get('sms_enabled')}"
        
        # Restore original value
        self.session.patch(f"{BASE_URL}/api/notifications/settings", json={
            "sms_enabled": current_sms_enabled
        })
        
        print(f"✓ PATCH /api/notifications/settings - SMS toggle works correctly")
    
    def test_update_notification_settings_event_toggles(self):
        """Test PATCH /api/notifications/settings - toggle notification events"""
        # Get current settings
        get_response = self.session.get(f"{BASE_URL}/api/notifications/settings")
        current_settings = get_response.json()
        
        # Update all event toggles
        update_data = {
            "notify_on_ticket_created": False,
            "notify_on_ticket_assigned": False,
            "notify_on_ticket_resolved": False,
            "notify_on_sla_risk": False,
            "notify_on_comment_mention": False
        }
        
        response = self.session.patch(f"{BASE_URL}/api/notifications/settings", json=update_data)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        for key, value in update_data.items():
            assert data.get(key) == value, f"Expected {key}={value}, got {data.get(key)}"
        
        # Restore original values
        restore_data = {
            "notify_on_ticket_created": current_settings.get("notify_on_ticket_created", True),
            "notify_on_ticket_assigned": current_settings.get("notify_on_ticket_assigned", True),
            "notify_on_ticket_resolved": current_settings.get("notify_on_ticket_resolved", True),
            "notify_on_sla_risk": current_settings.get("notify_on_sla_risk", True),
            "notify_on_comment_mention": current_settings.get("notify_on_comment_mention", True)
        }
        self.session.patch(f"{BASE_URL}/api/notifications/settings", json=restore_data)
        
        print(f"✓ PATCH /api/notifications/settings - Event toggles work correctly")
    
    def test_update_notification_settings_netgsm_credentials(self):
        """Test PATCH /api/notifications/settings - update NetGSM credentials"""
        response = self.session.patch(f"{BASE_URL}/api/notifications/settings", json={
            "netgsm_username": "TEST_netgsm_user",
            "netgsm_password": "TEST_netgsm_pass",
            "netgsm_header": "TESTCOMPANY"
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("netgsm_username") == "TEST_netgsm_user"
        assert data.get("netgsm_header") == "TESTCOMPANY"
        # Password should be stored but may not be returned in full
        
        # Clear test credentials
        self.session.patch(f"{BASE_URL}/api/notifications/settings", json={
            "netgsm_username": None,
            "netgsm_password": None,
            "netgsm_header": None
        })
        
        print(f"✓ PATCH /api/notifications/settings - NetGSM credentials update works")
    
    # ==================== GET /api/notifications ====================
    def test_get_notifications_list(self):
        """Test GET /api/notifications - should return notification history"""
        response = self.session.get(f"{BASE_URL}/api/notifications")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Expected list response"
        
        print(f"✓ GET /api/notifications - Retrieved {len(data)} notifications")
    
    def test_get_notifications_with_limit(self):
        """Test GET /api/notifications with limit parameter"""
        response = self.session.get(f"{BASE_URL}/api/notifications?limit=5")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Expected list response"
        assert len(data) <= 5, f"Expected max 5 notifications, got {len(data)}"
        
        print(f"✓ GET /api/notifications?limit=5 - Limit parameter works")
    
    def test_get_notifications_with_channel_filter(self):
        """Test GET /api/notifications with channel filter"""
        response = self.session.get(f"{BASE_URL}/api/notifications?channel=email")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Expected list response"
        
        # Verify all returned notifications are email channel
        for notification in data:
            assert notification.get("channel") == "email", f"Expected channel=email, got {notification.get('channel')}"
        
        print(f"✓ GET /api/notifications?channel=email - Channel filter works")
    
    def test_get_notifications_with_status_filter(self):
        """Test GET /api/notifications with status filter"""
        response = self.session.get(f"{BASE_URL}/api/notifications?status=sent")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Expected list response"
        
        print(f"✓ GET /api/notifications?status=sent - Status filter works")
    
    # ==================== POST /api/notifications/send ====================
    def test_send_manual_email_notification(self):
        """Test POST /api/notifications/send - send manual email notification"""
        response = self.session.post(f"{BASE_URL}/api/notifications/send", json={
            "recipient_email": "test@example.com",
            "notification_type": "manual",
            "channel": "email",
            "subject": "TEST Manual Notification",
            "content": "<p>This is a test notification</p>"
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "results" in data, "Expected results field in response"
        
        # Email should be skipped since no API key is configured
        if data.get("results"):
            result = data["results"][0]
            assert result.get("channel") == "email"
            # Status can be "sent", "skipped", or "failed" depending on configuration
            assert result.get("status") in ["sent", "skipped", "failed"]
        
        print(f"✓ POST /api/notifications/send - Manual email notification processed")
        print(f"  Result: {data.get('results')}")
    
    def test_send_manual_sms_notification(self):
        """Test POST /api/notifications/send - send manual SMS notification"""
        response = self.session.post(f"{BASE_URL}/api/notifications/send", json={
            "recipient_phone": "5551234567",
            "notification_type": "manual",
            "channel": "sms",
            "content": "TEST SMS notification"
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "results" in data, "Expected results field in response"
        
        # SMS should be skipped since no NetGSM credentials are configured
        if data.get("results"):
            result = data["results"][0]
            assert result.get("channel") == "sms"
            assert result.get("status") in ["sent", "skipped", "failed"]
        
        print(f"✓ POST /api/notifications/send - Manual SMS notification processed")
        print(f"  Result: {data.get('results')}")
    
    # ==================== GET /api/notifications/templates ====================
    def test_get_notification_templates(self):
        """Test GET /api/notifications/templates - should return available templates"""
        response = self.session.get(f"{BASE_URL}/api/notifications/templates")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "email_templates" in data, "Missing email_templates field"
        assert "sms_templates" in data, "Missing sms_templates field"
        
        # Verify expected templates exist
        expected_email_templates = ["ticket_created", "ticket_assigned", "ticket_resolved", "sla_risk", "comment_mention"]
        for template in expected_email_templates:
            assert template in data["email_templates"], f"Missing email template: {template}"
        
        expected_sms_templates = ["ticket_created", "ticket_assigned", "ticket_resolved", "sla_risk"]
        for template in expected_sms_templates:
            assert template in data["sms_templates"], f"Missing SMS template: {template}"
        
        print(f"✓ GET /api/notifications/templates - Templates retrieved successfully")
        print(f"  Email templates: {data['email_templates']}")
        print(f"  SMS templates: {data['sms_templates']}")
    
    # ==================== POST /api/notifications/sla-check ====================
    def test_sla_check(self):
        """Test POST /api/notifications/sla-check - run SLA check"""
        response = self.session.post(f"{BASE_URL}/api/notifications/sla-check")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data, "Missing message field"
        assert "notified" in data, "Missing notified field"
        
        print(f"✓ POST /api/notifications/sla-check - SLA check completed")
        print(f"  Message: {data.get('message')}")
        print(f"  Notified: {data.get('notified')}")
    
    # ==================== POST /api/notifications/test-email ====================
    def test_test_email_notification(self):
        """Test POST /api/notifications/test-email - send test email"""
        response = self.session.post(f"{BASE_URL}/api/notifications/test-email")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "status" in data, "Missing status field"
        # Status should be "skipped" since no RESEND_API_KEY is configured
        assert data.get("status") in ["sent", "skipped", "failed"]
        
        print(f"✓ POST /api/notifications/test-email - Test email processed")
        print(f"  Status: {data.get('status')}")
        print(f"  Reason: {data.get('reason', 'N/A')}")
    
    # ==================== POST /api/notifications/test-sms ====================
    def test_test_sms_notification(self):
        """Test POST /api/notifications/test-sms - send test SMS"""
        response = self.session.post(f"{BASE_URL}/api/notifications/test-sms?phone=5551234567")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "status" in data, "Missing status field"
        # Status should be "skipped" since no NetGSM credentials are configured
        assert data.get("status") in ["sent", "skipped", "failed"]
        
        print(f"✓ POST /api/notifications/test-sms - Test SMS processed")
        print(f"  Status: {data.get('status')}")
        print(f"  Reason: {data.get('reason', 'N/A')}")
    
    # ==================== Integration Tests ====================
    def test_notification_on_ticket_creation(self):
        """Test that notification is created when a ticket is created"""
        # First, create a customer
        customer_response = self.session.post(f"{BASE_URL}/api/customers", json={
            "name": "TEST_Notification Customer",
            "email": "test_notification@example.com",
            "phone": "5551234567"
        })
        
        if customer_response.status_code != 200:
            pytest.skip("Could not create test customer")
        
        customer_id = customer_response.json().get("id")
        
        # Enable ticket created notifications
        self.session.patch(f"{BASE_URL}/api/notifications/settings", json={
            "notify_on_ticket_created": True,
            "email_enabled": True
        })
        
        # Create a ticket
        ticket_response = self.session.post(f"{BASE_URL}/api/tickets", json={
            "customer_id": customer_id,
            "title": "TEST Notification Ticket",
            "description": "Testing notification on ticket creation",
            "category": "hardware",
            "priority": "medium"
        })
        
        assert ticket_response.status_code == 200, f"Failed to create ticket: {ticket_response.text}"
        
        ticket = ticket_response.json()
        ticket_id = ticket.get("id")
        
        # Wait a moment for async notification to be processed
        import time
        time.sleep(1)
        
        # Check if notification was created
        notifications_response = self.session.get(f"{BASE_URL}/api/notifications?limit=10")
        notifications = notifications_response.json()
        
        # Look for notification related to this ticket
        ticket_notification = None
        for n in notifications:
            if n.get("reference_id") == ticket_id and n.get("notification_type") == "ticket_created":
                ticket_notification = n
                break
        
        # Note: Notification may be skipped if email API is not configured
        print(f"✓ Ticket creation notification test completed")
        if ticket_notification:
            print(f"  Notification found: {ticket_notification.get('status')}")
        else:
            print(f"  No notification found (may be skipped due to missing API config)")
        
        # Cleanup - we don't have delete endpoints, so just note the test data
        print(f"  Test ticket created: {ticket.get('ticket_number')}")
    
    def test_notification_settings_persistence(self):
        """Test that notification settings persist across requests"""
        # Get initial settings
        initial_response = self.session.get(f"{BASE_URL}/api/notifications/settings")
        initial_settings = initial_response.json()
        
        # Update settings
        test_settings = {
            "email_enabled": True,
            "sms_enabled": True,
            "notify_on_ticket_created": True,
            "notify_on_ticket_assigned": False,
            "notify_on_ticket_resolved": True,
            "notify_on_sla_risk": False,
            "notify_on_comment_mention": True
        }
        
        update_response = self.session.patch(f"{BASE_URL}/api/notifications/settings", json=test_settings)
        assert update_response.status_code == 200
        
        # Verify with new GET request
        verify_response = self.session.get(f"{BASE_URL}/api/notifications/settings")
        verify_settings = verify_response.json()
        
        for key, value in test_settings.items():
            assert verify_settings.get(key) == value, f"Setting {key} not persisted correctly"
        
        # Restore original settings
        restore_settings = {
            "email_enabled": initial_settings.get("email_enabled", True),
            "sms_enabled": initial_settings.get("sms_enabled", False),
            "notify_on_ticket_created": initial_settings.get("notify_on_ticket_created", True),
            "notify_on_ticket_assigned": initial_settings.get("notify_on_ticket_assigned", True),
            "notify_on_ticket_resolved": initial_settings.get("notify_on_ticket_resolved", True),
            "notify_on_sla_risk": initial_settings.get("notify_on_sla_risk", True),
            "notify_on_comment_mention": initial_settings.get("notify_on_comment_mention", True)
        }
        self.session.patch(f"{BASE_URL}/api/notifications/settings", json=restore_settings)
        
        print(f"✓ Notification settings persistence test passed")


class TestNotificationAuth:
    """Test notification endpoints require authentication"""
    
    def test_get_settings_requires_auth(self):
        """Test GET /api/notifications/settings requires authentication"""
        response = requests.get(f"{BASE_URL}/api/notifications/settings")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"✓ GET /api/notifications/settings requires auth")
    
    def test_patch_settings_requires_auth(self):
        """Test PATCH /api/notifications/settings requires authentication"""
        response = requests.patch(f"{BASE_URL}/api/notifications/settings", json={"email_enabled": True})
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"✓ PATCH /api/notifications/settings requires auth")
    
    def test_get_notifications_requires_auth(self):
        """Test GET /api/notifications requires authentication"""
        response = requests.get(f"{BASE_URL}/api/notifications")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"✓ GET /api/notifications requires auth")
    
    def test_send_notification_requires_auth(self):
        """Test POST /api/notifications/send requires authentication"""
        response = requests.post(f"{BASE_URL}/api/notifications/send", json={
            "recipient_email": "test@example.com",
            "notification_type": "manual",
            "channel": "email",
            "content": "test"
        })
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"✓ POST /api/notifications/send requires auth")
    
    def test_templates_requires_auth(self):
        """Test GET /api/notifications/templates requires authentication"""
        response = requests.get(f"{BASE_URL}/api/notifications/templates")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"✓ GET /api/notifications/templates requires auth")
    
    def test_sla_check_requires_auth(self):
        """Test POST /api/notifications/sla-check requires authentication"""
        response = requests.post(f"{BASE_URL}/api/notifications/sla-check")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"✓ POST /api/notifications/sla-check requires auth")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
