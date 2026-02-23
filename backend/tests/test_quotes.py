"""
Test suite for Quote Management System
Tests: CRUD operations, status management, duplication
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestQuoteManagement:
    """Quote CRUD and status management tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@network.com",
            "password": "Test123!"
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        token = login_response.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        # Get a customer for testing
        customers_response = self.session.get(f"{BASE_URL}/api/customers")
        assert customers_response.status_code == 200
        customers = customers_response.json()
        if customers:
            self.customer_id = customers[0]['id']
        else:
            # Create a test customer if none exists
            customer_response = self.session.post(f"{BASE_URL}/api/customers", json={
                "name": "TEST_Quote_Customer",
                "email": "test_quote@example.com",
                "phone": "5551234567"
            })
            assert customer_response.status_code == 200
            self.customer_id = customer_response.json()['id']
        
        yield
        
        # Cleanup: Delete test quotes
        quotes_response = self.session.get(f"{BASE_URL}/api/quotes")
        if quotes_response.status_code == 200:
            for quote in quotes_response.json():
                if quote.get('subject', '').startswith('TEST_'):
                    self.session.delete(f"{BASE_URL}/api/quotes/{quote['id']}")
    
    # ========== GET /api/quotes - List Quotes ==========
    def test_get_quotes_list(self):
        """Test GET /api/quotes returns list of quotes"""
        response = self.session.get(f"{BASE_URL}/api/quotes")
        assert response.status_code == 200, f"Failed to get quotes: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"PASS: GET /api/quotes returned {len(data)} quotes")
    
    def test_get_quotes_filter_by_status(self):
        """Test GET /api/quotes with status filter"""
        response = self.session.get(f"{BASE_URL}/api/quotes?status=draft")
        assert response.status_code == 200, f"Failed to filter quotes: {response.text}"
        data = response.json()
        # All returned quotes should have draft status
        for quote in data:
            assert quote.get('status') == 'draft', f"Quote {quote.get('quote_number')} has status {quote.get('status')}, expected draft"
        print(f"PASS: GET /api/quotes?status=draft returned {len(data)} draft quotes")
    
    # ========== POST /api/quotes - Create Quote ==========
    def test_create_quote_success(self):
        """Test POST /api/quotes creates a new quote"""
        payload = {
            "customer_id": self.customer_id,
            "subject": "TEST_New_Quote",
            "validity_days": 30,
            "payment_terms": "pesin",
            "payment_notes": "Test payment notes",
            "notes": "Test notes",
            "items": [
                {
                    "description": "Test Item 1",
                    "quantity": 2,
                    "unit": "adet",
                    "unit_price": 100.0,
                    "vat_rate": 20,
                    "subtotal": 200.0,
                    "vat_amount": 40.0,
                    "total": 240.0
                }
            ],
            "currency": "TRY"
        }
        
        response = self.session.post(f"{BASE_URL}/api/quotes", json=payload)
        assert response.status_code == 200, f"Failed to create quote: {response.text}"
        
        data = response.json()
        assert "id" in data, "Response should contain id"
        assert "quote_number" in data, "Response should contain quote_number"
        assert data["quote_number"].startswith("TKL-"), f"Quote number should start with TKL-, got {data['quote_number']}"
        assert data["customer_id"] == self.customer_id, "Customer ID mismatch"
        assert data["subject"] == "TEST_New_Quote", "Subject mismatch"
        assert data["status"] == "draft", f"New quote should have draft status, got {data['status']}"
        assert data["payment_terms"] == "pesin", "Payment terms mismatch"
        assert len(data["items"]) == 1, "Items count mismatch"
        assert data["subtotal"] == 200.0, f"Subtotal mismatch: expected 200.0, got {data['subtotal']}"
        assert data["total_vat"] == 40.0, f"Total VAT mismatch: expected 40.0, got {data['total_vat']}"
        assert data["grand_total"] == 240.0, f"Grand total mismatch: expected 240.0, got {data['grand_total']}"
        
        # Verify persistence with GET
        get_response = self.session.get(f"{BASE_URL}/api/quotes/{data['id']}")
        assert get_response.status_code == 200, f"Failed to get created quote: {get_response.text}"
        fetched = get_response.json()
        assert fetched["quote_number"] == data["quote_number"], "Quote number not persisted correctly"
        
        print(f"PASS: POST /api/quotes created quote {data['quote_number']}")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/quotes/{data['id']}")
    
    def test_create_quote_with_multiple_items(self):
        """Test creating quote with multiple items"""
        payload = {
            "customer_id": self.customer_id,
            "subject": "TEST_Multi_Item_Quote",
            "validity_days": 15,
            "payment_terms": "vadeli_30",
            "items": [
                {
                    "description": "Item 1",
                    "quantity": 1,
                    "unit": "adet",
                    "unit_price": 500.0,
                    "vat_rate": 20,
                    "subtotal": 500.0,
                    "vat_amount": 100.0,
                    "total": 600.0
                },
                {
                    "description": "Item 2",
                    "quantity": 3,
                    "unit": "adet",
                    "unit_price": 200.0,
                    "vat_rate": 10,
                    "subtotal": 600.0,
                    "vat_amount": 60.0,
                    "total": 660.0
                }
            ]
        }
        
        response = self.session.post(f"{BASE_URL}/api/quotes", json=payload)
        assert response.status_code == 200, f"Failed to create multi-item quote: {response.text}"
        
        data = response.json()
        assert len(data["items"]) == 2, f"Expected 2 items, got {len(data['items'])}"
        assert data["subtotal"] == 1100.0, f"Subtotal mismatch: expected 1100.0, got {data['subtotal']}"
        assert data["total_vat"] == 160.0, f"Total VAT mismatch: expected 160.0, got {data['total_vat']}"
        assert data["grand_total"] == 1260.0, f"Grand total mismatch: expected 1260.0, got {data['grand_total']}"
        
        print(f"PASS: Created quote with multiple items, grand_total={data['grand_total']}")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/quotes/{data['id']}")
    
    # ========== GET /api/quotes/{id} - Get Single Quote ==========
    def test_get_single_quote(self):
        """Test GET /api/quotes/{id} returns single quote"""
        # First create a quote
        create_response = self.session.post(f"{BASE_URL}/api/quotes", json={
            "customer_id": self.customer_id,
            "subject": "TEST_Single_Quote",
            "validity_days": 30,
            "payment_terms": "pesin",
            "items": [{"description": "Test", "quantity": 1, "unit": "adet", "unit_price": 100, "vat_rate": 20, "subtotal": 100, "vat_amount": 20, "total": 120}]
        })
        assert create_response.status_code == 200
        quote_id = create_response.json()['id']
        
        # Get the quote
        response = self.session.get(f"{BASE_URL}/api/quotes/{quote_id}")
        assert response.status_code == 200, f"Failed to get quote: {response.text}"
        
        data = response.json()
        assert data["id"] == quote_id, "ID mismatch"
        assert data["subject"] == "TEST_Single_Quote", "Subject mismatch"
        
        print(f"PASS: GET /api/quotes/{quote_id} returned correct quote")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/quotes/{quote_id}")
    
    def test_get_nonexistent_quote(self):
        """Test GET /api/quotes/{id} returns 404 for non-existent quote"""
        fake_id = str(uuid.uuid4())
        response = self.session.get(f"{BASE_URL}/api/quotes/{fake_id}")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print(f"PASS: GET /api/quotes/{fake_id} returned 404 as expected")
    
    # ========== PATCH /api/quotes/{id} - Update Quote ==========
    def test_update_quote_subject(self):
        """Test PATCH /api/quotes/{id} updates quote subject"""
        # Create a quote
        create_response = self.session.post(f"{BASE_URL}/api/quotes", json={
            "customer_id": self.customer_id,
            "subject": "TEST_Original_Subject",
            "validity_days": 30,
            "payment_terms": "pesin",
            "items": [{"description": "Test", "quantity": 1, "unit": "adet", "unit_price": 100, "vat_rate": 20, "subtotal": 100, "vat_amount": 20, "total": 120}]
        })
        assert create_response.status_code == 200
        quote_id = create_response.json()['id']
        
        # Update the quote
        update_response = self.session.patch(f"{BASE_URL}/api/quotes/{quote_id}", json={
            "subject": "TEST_Updated_Subject"
        })
        assert update_response.status_code == 200, f"Failed to update quote: {update_response.text}"
        
        # Verify update with GET
        get_response = self.session.get(f"{BASE_URL}/api/quotes/{quote_id}")
        assert get_response.status_code == 200
        data = get_response.json()
        assert data["subject"] == "TEST_Updated_Subject", f"Subject not updated: {data['subject']}"
        
        print(f"PASS: PATCH /api/quotes/{quote_id} updated subject successfully")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/quotes/{quote_id}")
    
    def test_update_quote_status_to_sent(self):
        """Test PATCH /api/quotes/{id} changes status from draft to sent"""
        # Create a quote
        create_response = self.session.post(f"{BASE_URL}/api/quotes", json={
            "customer_id": self.customer_id,
            "subject": "TEST_Status_Change",
            "validity_days": 30,
            "payment_terms": "pesin",
            "items": [{"description": "Test", "quantity": 1, "unit": "adet", "unit_price": 100, "vat_rate": 20, "subtotal": 100, "vat_amount": 20, "total": 120}]
        })
        assert create_response.status_code == 200
        quote_id = create_response.json()['id']
        assert create_response.json()['status'] == 'draft'
        
        # Update status to sent
        update_response = self.session.patch(f"{BASE_URL}/api/quotes/{quote_id}", json={
            "status": "sent"
        })
        assert update_response.status_code == 200, f"Failed to update status: {update_response.text}"
        
        # Verify status change
        get_response = self.session.get(f"{BASE_URL}/api/quotes/{quote_id}")
        data = get_response.json()
        assert data["status"] == "sent", f"Status not updated: {data['status']}"
        assert data.get("sent_at") is not None, "sent_at should be set when status changes to sent"
        
        print(f"PASS: Quote status changed from draft to sent")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/quotes/{quote_id}")
    
    def test_update_quote_status_to_accepted(self):
        """Test PATCH /api/quotes/{id} changes status to accepted"""
        # Create and send a quote
        create_response = self.session.post(f"{BASE_URL}/api/quotes", json={
            "customer_id": self.customer_id,
            "subject": "TEST_Accept_Quote",
            "validity_days": 30,
            "payment_terms": "pesin",
            "items": [{"description": "Test", "quantity": 1, "unit": "adet", "unit_price": 100, "vat_rate": 20, "subtotal": 100, "vat_amount": 20, "total": 120}]
        })
        quote_id = create_response.json()['id']
        
        # Change to sent first
        self.session.patch(f"{BASE_URL}/api/quotes/{quote_id}", json={"status": "sent"})
        
        # Change to accepted
        update_response = self.session.patch(f"{BASE_URL}/api/quotes/{quote_id}", json={
            "status": "accepted"
        })
        assert update_response.status_code == 200
        
        # Verify
        get_response = self.session.get(f"{BASE_URL}/api/quotes/{quote_id}")
        data = get_response.json()
        assert data["status"] == "accepted", f"Status not updated to accepted: {data['status']}"
        
        print(f"PASS: Quote status changed to accepted")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/quotes/{quote_id}")
    
    def test_update_quote_status_to_rejected(self):
        """Test PATCH /api/quotes/{id} changes status to rejected"""
        # Create and send a quote
        create_response = self.session.post(f"{BASE_URL}/api/quotes", json={
            "customer_id": self.customer_id,
            "subject": "TEST_Reject_Quote",
            "validity_days": 30,
            "payment_terms": "pesin",
            "items": [{"description": "Test", "quantity": 1, "unit": "adet", "unit_price": 100, "vat_rate": 20, "subtotal": 100, "vat_amount": 20, "total": 120}]
        })
        quote_id = create_response.json()['id']
        
        # Change to sent first
        self.session.patch(f"{BASE_URL}/api/quotes/{quote_id}", json={"status": "sent"})
        
        # Change to rejected
        update_response = self.session.patch(f"{BASE_URL}/api/quotes/{quote_id}", json={
            "status": "rejected"
        })
        assert update_response.status_code == 200
        
        # Verify
        get_response = self.session.get(f"{BASE_URL}/api/quotes/{quote_id}")
        data = get_response.json()
        assert data["status"] == "rejected", f"Status not updated to rejected: {data['status']}"
        
        print(f"PASS: Quote status changed to rejected")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/quotes/{quote_id}")
    
    # ========== POST /api/quotes/{id}/duplicate - Duplicate Quote ==========
    def test_duplicate_quote(self):
        """Test POST /api/quotes/{id}/duplicate creates a copy"""
        # Create original quote
        create_response = self.session.post(f"{BASE_URL}/api/quotes", json={
            "customer_id": self.customer_id,
            "subject": "TEST_Original_For_Duplicate",
            "validity_days": 30,
            "payment_terms": "vadeli_30",
            "notes": "Original notes",
            "items": [
                {"description": "Item 1", "quantity": 2, "unit": "adet", "unit_price": 150, "vat_rate": 20, "subtotal": 300, "vat_amount": 60, "total": 360}
            ]
        })
        assert create_response.status_code == 200
        original_id = create_response.json()['id']
        original_number = create_response.json()['quote_number']
        
        # Duplicate the quote
        dup_response = self.session.post(f"{BASE_URL}/api/quotes/{original_id}/duplicate")
        assert dup_response.status_code == 200, f"Failed to duplicate quote: {dup_response.text}"
        
        dup_data = dup_response.json()
        assert dup_data["id"] != original_id, "Duplicate should have different ID"
        assert dup_data["quote_number"] != original_number, "Duplicate should have different quote number"
        assert dup_data["quote_number"].startswith("TKL-"), "Duplicate quote number should start with TKL-"
        assert dup_data["customer_id"] == self.customer_id, "Customer ID should be copied"
        assert dup_data["subject"] == "TEST_Original_For_Duplicate", "Subject should be copied"
        assert dup_data["payment_terms"] == "vadeli_30", "Payment terms should be copied"
        assert dup_data["status"] == "draft", "Duplicate should have draft status"
        assert len(dup_data["items"]) == 1, "Items should be copied"
        assert dup_data["grand_total"] == 360, "Grand total should be copied"
        
        print(f"PASS: Duplicated quote {original_number} to {dup_data['quote_number']}")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/quotes/{original_id}")
        self.session.delete(f"{BASE_URL}/api/quotes/{dup_data['id']}")
    
    def test_duplicate_nonexistent_quote(self):
        """Test POST /api/quotes/{id}/duplicate returns 404 for non-existent quote"""
        fake_id = str(uuid.uuid4())
        response = self.session.post(f"{BASE_URL}/api/quotes/{fake_id}/duplicate")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print(f"PASS: Duplicate non-existent quote returned 404")
    
    # ========== DELETE /api/quotes/{id} - Delete Quote ==========
    def test_delete_quote(self):
        """Test DELETE /api/quotes/{id} removes quote"""
        # Create a quote
        create_response = self.session.post(f"{BASE_URL}/api/quotes", json={
            "customer_id": self.customer_id,
            "subject": "TEST_Delete_Quote",
            "validity_days": 30,
            "payment_terms": "pesin",
            "items": [{"description": "Test", "quantity": 1, "unit": "adet", "unit_price": 100, "vat_rate": 20, "subtotal": 100, "vat_amount": 20, "total": 120}]
        })
        assert create_response.status_code == 200
        quote_id = create_response.json()['id']
        
        # Delete the quote
        delete_response = self.session.delete(f"{BASE_URL}/api/quotes/{quote_id}")
        assert delete_response.status_code == 200, f"Failed to delete quote: {delete_response.text}"
        
        # Verify deletion with GET
        get_response = self.session.get(f"{BASE_URL}/api/quotes/{quote_id}")
        assert get_response.status_code == 404, f"Quote should be deleted, got {get_response.status_code}"
        
        print(f"PASS: DELETE /api/quotes/{quote_id} removed quote successfully")
    
    def test_delete_nonexistent_quote(self):
        """Test DELETE /api/quotes/{id} returns 404 for non-existent quote"""
        fake_id = str(uuid.uuid4())
        response = self.session.delete(f"{BASE_URL}/api/quotes/{fake_id}")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print(f"PASS: DELETE non-existent quote returned 404")
    
    # ========== Existing Quote Verification ==========
    def test_existing_quote_tkl_000001(self):
        """Test that existing quote TKL-000001 exists and is accessible"""
        response = self.session.get(f"{BASE_URL}/api/quotes")
        assert response.status_code == 200
        
        quotes = response.json()
        tkl_001 = next((q for q in quotes if q.get('quote_number') == 'TKL-000001'), None)
        
        if tkl_001:
            assert tkl_001.get('customer_id'), "Quote should have customer_id"
            assert tkl_001.get('status'), "Quote should have status"
            print(f"PASS: Found existing quote TKL-000001 with status={tkl_001.get('status')}")
        else:
            print(f"INFO: Quote TKL-000001 not found in current quotes list (may have been deleted)")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
