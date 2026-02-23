"""
Test suite for Ledger, Invoice, and Payment APIs
Tests the full flow: Create invoice -> Finalize -> Create payment -> Check ledger balance
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestLedgerInvoicePayment:
    """Test Ledger, Invoice, and Payment endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@network.com",
            "password": "Test123!"
        })
        
        if login_response.status_code != 200:
            pytest.skip("Authentication failed - skipping tests")
        
        token = login_response.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        # Store test data IDs for cleanup
        self.test_customer_id = None
        self.test_invoice_id = None
        self.test_payment_id = None
        
        yield
        
        # Cleanup test data
        self._cleanup()
    
    def _cleanup(self):
        """Clean up test data"""
        # Delete test invoice if exists
        if self.test_invoice_id:
            try:
                self.session.delete(f"{BASE_URL}/api/invoices/{self.test_invoice_id}")
            except:
                pass
    
    def _get_or_create_customer(self):
        """Get existing customer or create test customer"""
        # First try to get existing customers
        response = self.session.get(f"{BASE_URL}/api/customers")
        if response.status_code == 200 and len(response.json()) > 0:
            return response.json()[0]["id"]
        
        # Create test customer if none exists
        customer_data = {
            "name": "TEST_Ledger Customer",
            "email": "test_ledger@example.com",
            "phone": "5551234567",
            "company": "TEST Company"
        }
        response = self.session.post(f"{BASE_URL}/api/customers", json=customer_data)
        if response.status_code in [200, 201]:
            self.test_customer_id = response.json()["id"]
            return self.test_customer_id
        return None
    
    # ========== LEDGER TESTS ==========
    
    def test_ledger_summary(self):
        """Test GET /api/ledger/summary - list all customer balances"""
        response = self.session.get(f"{BASE_URL}/api/ledger/summary")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "total_receivable" in data, "Response should have total_receivable"
        assert "total_payable" in data, "Response should have total_payable"
        assert "net_balance" in data, "Response should have net_balance"
        assert "customers" in data, "Response should have customers list"
        
        print(f"Ledger Summary: Total Receivable={data['total_receivable']}, Net Balance={data['net_balance']}")
    
    def test_ledger_customer_detail(self):
        """Test GET /api/ledger/customer/{id} - get customer ledger details"""
        customer_id = self._get_or_create_customer()
        assert customer_id is not None, "Failed to get/create customer"
        
        response = self.session.get(f"{BASE_URL}/api/ledger/customer/{customer_id}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "customer" in data, "Response should have customer info"
        assert "entries" in data, "Response should have entries list"
        assert "balance" in data, "Response should have balance"
        assert "total_debit" in data, "Response should have total_debit"
        assert "total_credit" in data, "Response should have total_credit"
        
        print(f"Customer Ledger: Balance={data['balance']}, Entries={len(data['entries'])}")
    
    def test_ledger_customer_not_found(self):
        """Test GET /api/ledger/customer/{id} with non-existent customer"""
        response = self.session.get(f"{BASE_URL}/api/ledger/customer/non-existent-id")
        
        # Should return 200 with empty entries or 404
        assert response.status_code in [200, 404], f"Expected 200 or 404, got {response.status_code}"
    
    def test_ledger_opening_balance(self):
        """Test POST /api/ledger/opening-balance - add opening balance"""
        customer_id = self._get_or_create_customer()
        assert customer_id is not None, "Failed to get/create customer"
        
        # Add opening balance
        response = self.session.post(
            f"{BASE_URL}/api/ledger/opening-balance",
            params={"customer_id": customer_id, "amount": 1000.00}
        )
        
        # May return 200 or 400 if opening balance already exists
        assert response.status_code in [200, 400], f"Expected 200 or 400, got {response.status_code}"
        
        if response.status_code == 200:
            data = response.json()
            assert "id" in data, "Response should have entry id"
            assert data.get("entry_type") == "opening", "Entry type should be 'opening'"
            print(f"Opening balance added: {data.get('debit', 0)} TL")
        else:
            print(f"Opening balance already exists for customer: {response.json().get('detail')}")
    
    # ========== INVOICE TESTS ==========
    
    def test_invoice_list(self):
        """Test GET /api/invoices - list invoices"""
        response = self.session.get(f"{BASE_URL}/api/invoices")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        print(f"Found {len(data)} invoices")
    
    def test_invoice_list_with_customer_filter(self):
        """Test GET /api/invoices with customer_id filter"""
        customer_id = self._get_or_create_customer()
        assert customer_id is not None, "Failed to get/create customer"
        
        response = self.session.get(f"{BASE_URL}/api/invoices", params={"customer_id": customer_id})
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        # All invoices should belong to the customer
        for inv in data:
            assert inv.get("customer_id") == customer_id, "Invoice should belong to filtered customer"
        
        print(f"Found {len(data)} invoices for customer {customer_id}")
    
    def test_invoice_create(self):
        """Test POST /api/invoices - create invoice with items"""
        customer_id = self._get_or_create_customer()
        assert customer_id is not None, "Failed to get/create customer"
        
        invoice_data = {
            "customer_id": customer_id,
            "items": [
                {
                    "description": "TEST Service Item 1",
                    "quantity": 2,
                    "unit_price": 100.00,
                    "tax_rate": 20,
                    "discount": 0
                },
                {
                    "description": "TEST Service Item 2",
                    "quantity": 1,
                    "unit_price": 250.00,
                    "tax_rate": 20,
                    "discount": 10
                }
            ],
            "due_date": (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d"),
            "notes": "TEST invoice for testing"
        }
        
        response = self.session.post(f"{BASE_URL}/api/invoices", json=invoice_data)
        
        assert response.status_code in [200, 201], f"Expected 200/201, got {response.status_code}"
        
        data = response.json()
        assert "id" in data, "Response should have invoice id"
        assert "invoice_number" in data, "Response should have invoice_number"
        assert data.get("status") == "draft", "New invoice should be in draft status"
        assert data.get("customer_id") == customer_id, "Invoice should belong to customer"
        assert len(data.get("items", [])) == 2, "Invoice should have 2 items"
        assert data.get("subtotal") > 0, "Subtotal should be calculated"
        assert data.get("grand_total") > 0, "Grand total should be calculated"
        
        self.test_invoice_id = data["id"]
        print(f"Created invoice: {data['invoice_number']}, Total: {data['grand_total']} TL")
        
        return data
    
    def test_invoice_get_detail(self):
        """Test GET /api/invoices/{id} - get invoice details"""
        # First create an invoice
        invoice = self.test_invoice_create()
        invoice_id = invoice["id"]
        
        response = self.session.get(f"{BASE_URL}/api/invoices/{invoice_id}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("id") == invoice_id, "Invoice ID should match"
        assert "customer" in data, "Response should include customer info"
        assert "items" in data, "Response should include items"
        
        print(f"Invoice detail: {data['invoice_number']}, Customer: {data['customer'].get('name')}")
    
    def test_invoice_not_found(self):
        """Test GET /api/invoices/{id} with non-existent invoice"""
        response = self.session.get(f"{BASE_URL}/api/invoices/non-existent-id")
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
    
    def test_invoice_finalize(self):
        """Test POST /api/invoices/{id}/finalize - finalize draft and add to ledger"""
        # First create an invoice
        invoice = self.test_invoice_create()
        invoice_id = invoice["id"]
        
        # Get ledger balance before finalize
        customer_id = invoice["customer_id"]
        ledger_before = self.session.get(f"{BASE_URL}/api/ledger/customer/{customer_id}").json()
        balance_before = ledger_before.get("balance", 0)
        
        # Finalize the invoice
        response = self.session.post(f"{BASE_URL}/api/invoices/{invoice_id}/finalize")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("status") == "pending", "Finalized invoice should be in pending status"
        
        # Verify ledger was updated
        ledger_after = self.session.get(f"{BASE_URL}/api/ledger/customer/{customer_id}").json()
        balance_after = ledger_after.get("balance", 0)
        
        # Balance should increase by invoice amount (debit)
        expected_increase = invoice["grand_total"]
        actual_increase = balance_after - balance_before
        
        assert abs(actual_increase - expected_increase) < 0.01, \
            f"Ledger balance should increase by {expected_increase}, but increased by {actual_increase}"
        
        print(f"Invoice finalized: {invoice['invoice_number']}, Ledger balance: {balance_before} -> {balance_after}")
        
        # Clear test_invoice_id since we can't delete finalized invoice
        self.test_invoice_id = None
        
        return data
    
    def test_invoice_finalize_already_finalized(self):
        """Test POST /api/invoices/{id}/finalize on already finalized invoice"""
        # First create and finalize an invoice
        invoice = self.test_invoice_finalize()
        invoice_id = invoice["id"]
        
        # Try to finalize again
        response = self.session.post(f"{BASE_URL}/api/invoices/{invoice_id}/finalize")
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("Correctly rejected re-finalization of invoice")
    
    def test_invoice_delete_draft(self):
        """Test DELETE /api/invoices/{id} - delete draft invoice"""
        # First create an invoice
        invoice = self.test_invoice_create()
        invoice_id = invoice["id"]
        
        # Delete the draft invoice
        response = self.session.delete(f"{BASE_URL}/api/invoices/{invoice_id}")
        
        assert response.status_code in [200, 204], f"Expected 200/204, got {response.status_code}"
        
        # Verify invoice is deleted
        get_response = self.session.get(f"{BASE_URL}/api/invoices/{invoice_id}")
        assert get_response.status_code == 404, "Deleted invoice should not be found"
        
        self.test_invoice_id = None
        print(f"Draft invoice deleted: {invoice['invoice_number']}")
    
    def test_invoice_delete_finalized_fails(self):
        """Test DELETE /api/invoices/{id} on finalized invoice should fail"""
        # First create and finalize an invoice
        invoice = self.test_invoice_finalize()
        invoice_id = invoice["id"]
        
        # Try to delete finalized invoice
        response = self.session.delete(f"{BASE_URL}/api/invoices/{invoice_id}")
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("Correctly rejected deletion of finalized invoice")
    
    # ========== INVOICE STATS TESTS ==========
    
    def test_invoice_stats_summary(self):
        """Test GET /api/invoices/stats/summary"""
        response = self.session.get(f"{BASE_URL}/api/invoices/stats/summary")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "total_invoiced" in data, "Response should have total_invoiced"
        assert "total_paid" in data, "Response should have total_paid"
        assert "total_pending" in data, "Response should have total_pending"
        assert "total_overdue" in data, "Response should have total_overdue"
        assert "collection_rate" in data, "Response should have collection_rate"
        
        print(f"Invoice Stats: Total={data['total_invoiced']}, Paid={data['total_paid']}, Rate={data['collection_rate']}%")
    
    # ========== PAYMENT TESTS ==========
    
    def test_payment_create(self):
        """Test POST /api/payments - create payment and update ledger"""
        # First create and finalize an invoice
        invoice = self.test_invoice_finalize()
        invoice_id = invoice["id"]
        customer_id = invoice["customer_id"]
        
        # Get ledger balance before payment
        ledger_before = self.session.get(f"{BASE_URL}/api/ledger/customer/{customer_id}").json()
        balance_before = ledger_before.get("balance", 0)
        
        # Create payment
        payment_amount = invoice["grand_total"]
        payment_data = {
            "customer_id": customer_id,
            "invoice_id": invoice_id,
            "amount": payment_amount,
            "payment_method": "cash",
            "notes": "TEST payment"
        }
        
        response = self.session.post(f"{BASE_URL}/api/payments", json=payment_data)
        
        assert response.status_code in [200, 201], f"Expected 200/201, got {response.status_code}"
        
        data = response.json()
        assert "id" in data, "Response should have payment id"
        assert "payment_number" in data, "Response should have payment_number"
        assert data.get("amount") == payment_amount, "Payment amount should match"
        assert data.get("status") == "completed", "Payment should be completed"
        
        self.test_payment_id = data["id"]
        
        # Verify ledger was updated (credit reduces balance)
        ledger_after = self.session.get(f"{BASE_URL}/api/ledger/customer/{customer_id}").json()
        balance_after = ledger_after.get("balance", 0)
        
        expected_decrease = payment_amount
        actual_decrease = balance_before - balance_after
        
        assert abs(actual_decrease - expected_decrease) < 0.01, \
            f"Ledger balance should decrease by {expected_decrease}, but decreased by {actual_decrease}"
        
        # Verify invoice status updated
        invoice_after = self.session.get(f"{BASE_URL}/api/invoices/{invoice_id}").json()
        assert invoice_after.get("status") == "paid", "Invoice should be marked as paid"
        assert invoice_after.get("paid_amount") == payment_amount, "Invoice paid_amount should match"
        
        print(f"Payment created: {data['payment_number']}, Amount: {payment_amount} TL")
        print(f"Ledger balance: {balance_before} -> {balance_after}")
        print(f"Invoice status: {invoice_after['status']}")
        
        return data
    
    def test_payment_partial(self):
        """Test partial payment updates invoice to 'partial' status"""
        # First create and finalize an invoice
        invoice = self.test_invoice_finalize()
        invoice_id = invoice["id"]
        customer_id = invoice["customer_id"]
        
        # Create partial payment (50% of total)
        partial_amount = invoice["grand_total"] / 2
        payment_data = {
            "customer_id": customer_id,
            "invoice_id": invoice_id,
            "amount": partial_amount,
            "payment_method": "bank_transfer",
            "notes": "TEST partial payment"
        }
        
        response = self.session.post(f"{BASE_URL}/api/payments", json=payment_data)
        
        assert response.status_code in [200, 201], f"Expected 200/201, got {response.status_code}"
        
        # Verify invoice status is partial
        invoice_after = self.session.get(f"{BASE_URL}/api/invoices/{invoice_id}").json()
        assert invoice_after.get("status") == "partial", "Invoice should be in partial status"
        assert abs(invoice_after.get("paid_amount", 0) - partial_amount) < 0.01, "Paid amount should match"
        
        print(f"Partial payment: {partial_amount} TL, Invoice status: {invoice_after['status']}")
    
    def test_payment_list(self):
        """Test GET /api/payments - list payments"""
        response = self.session.get(f"{BASE_URL}/api/payments")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        print(f"Found {len(data)} payments")
    
    def test_payment_get_detail(self):
        """Test GET /api/payments/{id} - get payment details"""
        # First create a payment
        payment = self.test_payment_create()
        payment_id = payment["id"]
        
        response = self.session.get(f"{BASE_URL}/api/payments/{payment_id}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("id") == payment_id, "Payment ID should match"
        assert "customer" in data, "Response should include customer info"
        
        print(f"Payment detail: {data['payment_number']}, Amount: {data['amount']} TL")
    
    # ========== FULL FLOW TEST ==========
    
    def test_full_invoice_payment_flow(self):
        """Test complete flow: Create invoice -> Finalize -> Payment -> Verify ledger"""
        customer_id = self._get_or_create_customer()
        assert customer_id is not None, "Failed to get/create customer"
        
        # Get initial ledger balance
        ledger_initial = self.session.get(f"{BASE_URL}/api/ledger/customer/{customer_id}").json()
        initial_balance = ledger_initial.get("balance", 0)
        print(f"Initial ledger balance: {initial_balance} TL")
        
        # Step 1: Create invoice
        invoice_data = {
            "customer_id": customer_id,
            "items": [
                {"description": "TEST Full Flow Service", "quantity": 1, "unit_price": 500.00, "tax_rate": 20, "discount": 0}
            ],
            "notes": "TEST full flow invoice"
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/invoices", json=invoice_data)
        assert create_response.status_code in [200, 201], "Invoice creation failed"
        invoice = create_response.json()
        invoice_id = invoice["id"]
        invoice_total = invoice["grand_total"]
        print(f"Step 1: Created invoice {invoice['invoice_number']}, Total: {invoice_total} TL")
        
        # Verify ledger unchanged (draft invoice doesn't affect ledger)
        ledger_after_create = self.session.get(f"{BASE_URL}/api/ledger/customer/{customer_id}").json()
        assert ledger_after_create.get("balance", 0) == initial_balance, "Draft invoice should not affect ledger"
        
        # Step 2: Finalize invoice
        finalize_response = self.session.post(f"{BASE_URL}/api/invoices/{invoice_id}/finalize")
        assert finalize_response.status_code == 200, "Invoice finalization failed"
        print(f"Step 2: Finalized invoice, status: {finalize_response.json()['status']}")
        
        # Verify ledger increased by invoice amount
        ledger_after_finalize = self.session.get(f"{BASE_URL}/api/ledger/customer/{customer_id}").json()
        expected_balance_after_finalize = initial_balance + invoice_total
        assert abs(ledger_after_finalize.get("balance", 0) - expected_balance_after_finalize) < 0.01, \
            "Ledger should increase by invoice amount after finalization"
        print(f"Ledger after finalize: {ledger_after_finalize['balance']} TL (expected: {expected_balance_after_finalize})")
        
        # Step 3: Create payment
        payment_data = {
            "customer_id": customer_id,
            "invoice_id": invoice_id,
            "amount": invoice_total,
            "payment_method": "credit_card",
            "notes": "TEST full flow payment"
        }
        
        payment_response = self.session.post(f"{BASE_URL}/api/payments", json=payment_data)
        assert payment_response.status_code in [200, 201], "Payment creation failed"
        payment = payment_response.json()
        print(f"Step 3: Created payment {payment['payment_number']}, Amount: {payment['amount']} TL")
        
        # Step 4: Verify final ledger balance
        ledger_final = self.session.get(f"{BASE_URL}/api/ledger/customer/{customer_id}").json()
        expected_final_balance = initial_balance  # Should return to initial after full payment
        assert abs(ledger_final.get("balance", 0) - expected_final_balance) < 0.01, \
            f"Final ledger balance should be {expected_final_balance}, got {ledger_final.get('balance', 0)}"
        print(f"Step 4: Final ledger balance: {ledger_final['balance']} TL (expected: {expected_final_balance})")
        
        # Step 5: Verify invoice is paid
        invoice_final = self.session.get(f"{BASE_URL}/api/invoices/{invoice_id}").json()
        assert invoice_final.get("status") == "paid", "Invoice should be marked as paid"
        print(f"Step 5: Invoice status: {invoice_final['status']}")
        
        print("\n✅ Full flow test completed successfully!")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
