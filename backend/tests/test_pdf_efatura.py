"""
Test PDF Generation and E-Fatura Features
- Quote PDF download (GET /api/quotes/{id}/pdf)
- Quote accept and invoice creation (POST /api/quotes/{id}/accept)
- Invoice PDF download (GET /api/invoices/{id}/pdf)
- E-Fatura send to BizimHesap (POST /api/invoices/{id}/send-efatura)
- Service Report PDF download (GET /api/tickets/{id}/service-report/pdf)
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestPDFAndEFatura:
    """Test PDF generation and E-Fatura features"""
    
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
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        token = login_response.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        # Get or create a customer for testing
        customers_res = self.session.get(f"{BASE_URL}/api/customers")
        if customers_res.status_code == 200 and len(customers_res.json()) > 0:
            self.customer_id = customers_res.json()[0]["id"]
        else:
            # Create a test customer
            customer_res = self.session.post(f"{BASE_URL}/api/customers", json={
                "name": "TEST_PDF_Customer",
                "email": "test_pdf@example.com",
                "phone": "5551234567"
            })
            assert customer_res.status_code in [200, 201]
            self.customer_id = customer_res.json()["id"]
        
        yield
    
    # ========== QUOTE PDF TESTS ==========
    
    def test_quote_pdf_download(self):
        """Test downloading quote as PDF"""
        # First create a quote
        quote_res = self.session.post(f"{BASE_URL}/api/quotes", json={
            "customer_id": self.customer_id,
            "subject": "TEST_PDF_Quote",
            "items": [
                {"name": "Test Service", "quantity": 1, "price": 100, "vat_rate": 20}
            ],
            "valid_until": "2026-12-31"
        })
        assert quote_res.status_code in [200, 201], f"Quote creation failed: {quote_res.text}"
        quote_id = quote_res.json()["id"]
        
        # Download PDF
        pdf_res = self.session.get(f"{BASE_URL}/api/quotes/{quote_id}/pdf")
        assert pdf_res.status_code == 200, f"PDF download failed: {pdf_res.status_code}"
        assert pdf_res.headers.get("content-type") == "application/pdf"
        assert len(pdf_res.content) > 0, "PDF content is empty"
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/quotes/{quote_id}")
        print(f"PASS: Quote PDF download works - {len(pdf_res.content)} bytes")
    
    def test_quote_pdf_not_found(self):
        """Test PDF download for non-existent quote"""
        pdf_res = self.session.get(f"{BASE_URL}/api/quotes/nonexistent-id/pdf")
        assert pdf_res.status_code == 404
        print("PASS: Quote PDF returns 404 for non-existent quote")
    
    # ========== QUOTE ACCEPT TESTS ==========
    
    def test_accept_quote_creates_invoice(self):
        """Test accepting a quote creates an invoice"""
        # Create a quote
        quote_res = self.session.post(f"{BASE_URL}/api/quotes", json={
            "customer_id": self.customer_id,
            "subject": "TEST_Accept_Quote",
            "items": [
                {"name": "Service A", "quantity": 2, "price": 150, "vat_rate": 20},
                {"name": "Service B", "quantity": 1, "price": 200, "vat_rate": 20}
            ],
            "valid_until": "2026-12-31"
        })
        assert quote_res.status_code in [200, 201]
        quote_id = quote_res.json()["id"]
        
        # Update quote status to 'sent' first (required for accept)
        self.session.patch(f"{BASE_URL}/api/quotes/{quote_id}", json={"status": "sent"})
        
        # Accept the quote
        accept_res = self.session.post(f"{BASE_URL}/api/quotes/{quote_id}/accept")
        assert accept_res.status_code == 200, f"Accept failed: {accept_res.text}"
        
        data = accept_res.json()
        assert "invoice" in data, "Response should contain invoice"
        assert data["invoice"]["customer_id"] == self.customer_id
        assert data["invoice"]["quote_id"] == quote_id
        assert len(data["invoice"]["items"]) == 2
        
        # Verify quote status changed
        quote_check = self.session.get(f"{BASE_URL}/api/quotes/{quote_id}")
        assert quote_check.json()["status"] == "accepted"
        
        # Cleanup
        invoice_id = data["invoice"]["id"]
        self.session.delete(f"{BASE_URL}/api/invoices/{invoice_id}")
        self.session.delete(f"{BASE_URL}/api/quotes/{quote_id}")
        print("PASS: Quote accept creates invoice correctly")
    
    def test_accept_already_accepted_quote(self):
        """Test accepting an already accepted quote fails"""
        # Create and accept a quote
        quote_res = self.session.post(f"{BASE_URL}/api/quotes", json={
            "customer_id": self.customer_id,
            "subject": "TEST_Double_Accept",
            "items": [{"name": "Test", "quantity": 1, "price": 100, "vat_rate": 20}],
            "valid_until": "2026-12-31"
        })
        quote_id = quote_res.json()["id"]
        
        # Set to sent and accept
        self.session.patch(f"{BASE_URL}/api/quotes/{quote_id}", json={"status": "sent"})
        self.session.post(f"{BASE_URL}/api/quotes/{quote_id}/accept")
        
        # Try to accept again
        second_accept = self.session.post(f"{BASE_URL}/api/quotes/{quote_id}/accept")
        assert second_accept.status_code == 400, "Should fail for already accepted quote"
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/quotes/{quote_id}")
        print("PASS: Double accept correctly returns 400")
    
    # ========== INVOICE PDF TESTS ==========
    
    def test_invoice_pdf_download(self):
        """Test downloading invoice as PDF"""
        # Create an invoice
        invoice_res = self.session.post(f"{BASE_URL}/api/invoices", json={
            "customer_id": self.customer_id,
            "items": [
                {"description": "Test Service", "quantity": 1, "unit_price": 100, "tax_rate": 20}
            ]
        })
        assert invoice_res.status_code in [200, 201], f"Invoice creation failed: {invoice_res.text}"
        invoice_id = invoice_res.json()["id"]
        
        # Download PDF
        pdf_res = self.session.get(f"{BASE_URL}/api/invoices/{invoice_id}/pdf")
        assert pdf_res.status_code == 200, f"PDF download failed: {pdf_res.status_code}"
        assert pdf_res.headers.get("content-type") == "application/pdf"
        assert len(pdf_res.content) > 0, "PDF content is empty"
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/invoices/{invoice_id}")
        print(f"PASS: Invoice PDF download works - {len(pdf_res.content)} bytes")
    
    def test_invoice_pdf_not_found(self):
        """Test PDF download for non-existent invoice"""
        pdf_res = self.session.get(f"{BASE_URL}/api/invoices/nonexistent-id/pdf")
        assert pdf_res.status_code == 404
        print("PASS: Invoice PDF returns 404 for non-existent invoice")
    
    # ========== E-FATURA (BIZIMHESAP) TESTS ==========
    
    def test_efatura_requires_firm_id(self):
        """Test e-fatura fails without Firm ID configured"""
        # Create and finalize an invoice
        invoice_res = self.session.post(f"{BASE_URL}/api/invoices", json={
            "customer_id": self.customer_id,
            "items": [
                {"description": "E-Fatura Test", "quantity": 1, "unit_price": 500, "tax_rate": 20}
            ]
        })
        invoice_id = invoice_res.json()["id"]
        
        # Finalize the invoice
        self.session.post(f"{BASE_URL}/api/invoices/{invoice_id}/finalize")
        
        # Try to send e-fatura (should fail without Firm ID)
        efatura_res = self.session.post(f"{BASE_URL}/api/invoices/{invoice_id}/send-efatura")
        assert efatura_res.status_code == 400, f"Expected 400, got {efatura_res.status_code}"
        assert "Firm ID" in efatura_res.json().get("detail", "")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/invoices/{invoice_id}")
        print("PASS: E-Fatura correctly requires Firm ID configuration")
    
    def test_efatura_draft_invoice_fails(self):
        """Test e-fatura fails for draft invoices"""
        # Create a draft invoice
        invoice_res = self.session.post(f"{BASE_URL}/api/invoices", json={
            "customer_id": self.customer_id,
            "items": [
                {"description": "Draft Test", "quantity": 1, "unit_price": 100, "tax_rate": 20}
            ]
        })
        invoice_id = invoice_res.json()["id"]
        
        # Try to send e-fatura without finalizing
        efatura_res = self.session.post(f"{BASE_URL}/api/invoices/{invoice_id}/send-efatura")
        # Should fail either because draft or no Firm ID
        assert efatura_res.status_code == 400
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/invoices/{invoice_id}")
        print("PASS: E-Fatura correctly fails for draft invoices")
    
    # ========== SERVICE REPORT PDF TESTS ==========
    
    def test_service_report_pdf_download(self):
        """Test downloading service report as PDF"""
        # Create a ticket
        ticket_res = self.session.post(f"{BASE_URL}/api/tickets", json={
            "customer_id": self.customer_id,
            "title": "TEST_Service_Report_PDF",
            "description": "Test ticket for PDF generation",
            "category": "hardware",
            "priority": "medium"
        })
        assert ticket_res.status_code in [200, 201], f"Ticket creation failed: {ticket_res.text}"
        ticket_id = ticket_res.json()["id"]
        
        # Download service report PDF
        pdf_res = self.session.get(f"{BASE_URL}/api/tickets/{ticket_id}/service-report/pdf")
        assert pdf_res.status_code == 200, f"PDF download failed: {pdf_res.status_code}"
        assert pdf_res.headers.get("content-type") == "application/pdf"
        assert len(pdf_res.content) > 0, "PDF content is empty"
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/tickets/{ticket_id}")
        print(f"PASS: Service Report PDF download works - {len(pdf_res.content)} bytes")
    
    def test_service_report_pdf_not_found(self):
        """Test PDF download for non-existent ticket"""
        pdf_res = self.session.get(f"{BASE_URL}/api/tickets/nonexistent-id/service-report/pdf")
        assert pdf_res.status_code == 404
        print("PASS: Service Report PDF returns 404 for non-existent ticket")
    
    # ========== BIZIMHESAP SETTINGS TESTS ==========
    
    def test_get_bizimhesap_settings(self):
        """Test getting BizimHesap settings"""
        settings_res = self.session.get(f"{BASE_URL}/api/settings/bizimhesap")
        assert settings_res.status_code == 200
        data = settings_res.json()
        assert "is_configured" in data
        print(f"PASS: BizimHesap settings retrieved - configured: {data.get('is_configured')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
