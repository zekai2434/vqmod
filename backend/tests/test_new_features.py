"""
Test file for new features:
- Ticket Timeline (History)
- Contract Management
- RMA Management
- Technician Performance Reports
"""
import pytest
import requests
import os
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
        data = response.json()
        assert "access_token" in data
        return data["access_token"]
    
    def test_login_success(self):
        """Test successful login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@network.com",
            "password": "Test123!"
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["email"] == "test@network.com"


class TestTicketTimeline:
    """Ticket Timeline/History endpoint tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@network.com",
            "password": "Test123!"
        })
        return response.json()["access_token"]
    
    def test_get_ticket_history(self, auth_token):
        """Test getting ticket history/timeline"""
        ticket_id = "36db4c29-3992-4fbd-bd3c-1560002efda9"
        response = requests.get(
            f"{BASE_URL}/api/tickets/{ticket_id}/history",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        # Verify history event structure
        if len(data) > 0:
            event = data[0]
            assert "id" in event
            assert "event_type" in event
            assert "description" in event
            assert "timestamp" in event
            assert "metadata" in event
    
    def test_ticket_history_has_created_event(self, auth_token):
        """Test that ticket history includes creation event"""
        ticket_id = "36db4c29-3992-4fbd-bd3c-1560002efda9"
        response = requests.get(
            f"{BASE_URL}/api/tickets/{ticket_id}/history",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Find created event
        created_events = [e for e in data if e["event_type"] == "created"]
        assert len(created_events) > 0, "Should have at least one 'created' event"
        
        created_event = created_events[0]
        assert created_event["description"] == "Ticket oluşturuldu"
        assert "metadata" in created_event
        assert "status" in created_event["metadata"]
    
    def test_ticket_history_not_found(self, auth_token):
        """Test 404 for non-existent ticket"""
        response = requests.get(
            f"{BASE_URL}/api/tickets/non-existent-id/history",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 404
    
    def test_ticket_history_unauthorized(self):
        """Test unauthorized access to ticket history"""
        ticket_id = "36db4c29-3992-4fbd-bd3c-1560002efda9"
        response = requests.get(f"{BASE_URL}/api/tickets/{ticket_id}/history")
        assert response.status_code in [401, 403]


class TestContractManagement:
    """Contract Management endpoint tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@network.com",
            "password": "Test123!"
        })
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def customer_id(self, auth_token):
        """Get a customer ID for contract creation"""
        response = requests.get(
            f"{BASE_URL}/api/customers",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        customers = response.json()
        if customers:
            return customers[0]["id"]
        return None
    
    def test_get_contracts_list(self, auth_token):
        """Test getting contracts list"""
        response = requests.get(
            f"{BASE_URL}/api/contracts",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_create_contract(self, auth_token, customer_id):
        """Test creating a new contract"""
        if not customer_id:
            pytest.skip("No customer available for contract creation")
        
        start_date = datetime.now().strftime("%Y-%m-%d")
        end_date = (datetime.now() + timedelta(days=365)).strftime("%Y-%m-%d")
        
        contract_data = {
            "customer_id": customer_id,
            "name": "TEST_Yıllık Bakım Sözleşmesi",
            "contract_type": "standard",
            "start_date": start_date,
            "end_date": end_date,
            "auto_renew": False,
            "monthly_fee": 5000.0,
            "currency": "TRY",
            "includes_remote_support": True,
            "includes_onsite_support": True,
            "includes_parts": False,
            "terms": "Test sözleşme şartları",
            "notes": "Test notları"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/contracts",
            json=contract_data,
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify contract data
        assert "id" in data
        assert "contract_number" in data
        assert data["name"] == "TEST_Yıllık Bakım Sözleşmesi"
        assert data["customer_id"] == customer_id
        assert data["monthly_fee"] == 5000.0
        assert data["status"] == "active"
        
        return data["id"]
    
    def test_get_contract_by_id(self, auth_token, customer_id):
        """Test getting a specific contract"""
        # First create a contract
        start_date = datetime.now().strftime("%Y-%m-%d")
        end_date = (datetime.now() + timedelta(days=365)).strftime("%Y-%m-%d")
        
        create_response = requests.post(
            f"{BASE_URL}/api/contracts",
            json={
                "customer_id": customer_id,
                "name": "TEST_Get Contract Test",
                "contract_type": "premium",
                "start_date": start_date,
                "end_date": end_date,
                "monthly_fee": 10000.0
            },
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        if create_response.status_code != 200:
            pytest.skip("Could not create contract for test")
        
        contract_id = create_response.json()["id"]
        
        # Get the contract
        response = requests.get(
            f"{BASE_URL}/api/contracts/{contract_id}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == contract_id
        assert data["name"] == "TEST_Get Contract Test"
    
    def test_update_contract(self, auth_token, customer_id):
        """Test updating a contract"""
        # First create a contract
        start_date = datetime.now().strftime("%Y-%m-%d")
        end_date = (datetime.now() + timedelta(days=365)).strftime("%Y-%m-%d")
        
        create_response = requests.post(
            f"{BASE_URL}/api/contracts",
            json={
                "customer_id": customer_id,
                "name": "TEST_Update Contract Test",
                "contract_type": "standard",
                "start_date": start_date,
                "end_date": end_date,
                "monthly_fee": 3000.0
            },
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        if create_response.status_code != 200:
            pytest.skip("Could not create contract for test")
        
        contract_id = create_response.json()["id"]
        
        # Update the contract
        update_response = requests.patch(
            f"{BASE_URL}/api/contracts/{contract_id}",
            json={
                "name": "TEST_Updated Contract Name",
                "monthly_fee": 6000.0,
                "auto_renew": True
            },
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert update_response.status_code == 200
        data = update_response.json()
        assert data["name"] == "TEST_Updated Contract Name"
        assert data["monthly_fee"] == 6000.0
        assert data["auto_renew"] == True
    
    def test_delete_contract(self, auth_token, customer_id):
        """Test deleting a contract"""
        # First create a contract
        start_date = datetime.now().strftime("%Y-%m-%d")
        end_date = (datetime.now() + timedelta(days=365)).strftime("%Y-%m-%d")
        
        create_response = requests.post(
            f"{BASE_URL}/api/contracts",
            json={
                "customer_id": customer_id,
                "name": "TEST_Delete Contract Test",
                "contract_type": "standard",
                "start_date": start_date,
                "end_date": end_date
            },
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        if create_response.status_code != 200:
            pytest.skip("Could not create contract for test")
        
        contract_id = create_response.json()["id"]
        
        # Delete the contract
        delete_response = requests.delete(
            f"{BASE_URL}/api/contracts/{contract_id}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert delete_response.status_code == 200
        
        # Verify deletion
        get_response = requests.get(
            f"{BASE_URL}/api/contracts/{contract_id}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert get_response.status_code == 404
    
    def test_get_expiring_contracts(self, auth_token):
        """Test getting expiring contracts"""
        response = requests.get(
            f"{BASE_URL}/api/contracts/expiring/list?days=30",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_contracts_unauthorized(self):
        """Test unauthorized access to contracts"""
        response = requests.get(f"{BASE_URL}/api/contracts")
        assert response.status_code in [401, 403]


class TestRMAManagement:
    """RMA Management endpoint tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@network.com",
            "password": "Test123!"
        })
        return response.json()["access_token"]
    
    def test_get_rma_list(self, auth_token):
        """Test getting RMA list"""
        response = requests.get(
            f"{BASE_URL}/api/rma",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        # Verify RMA structure if data exists
        if len(data) > 0:
            rma = data[0]
            assert "id" in rma
            assert "rma_number" in rma
            assert "status" in rma
            assert "reason" in rma
    
    def test_rma_has_progress_fields(self, auth_token):
        """Test that RMA has fields needed for progress tracking"""
        response = requests.get(
            f"{BASE_URL}/api/rma",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        if len(data) > 0:
            rma = data[0]
            # Check for status field which is used for progress bar
            assert "status" in rma
            # Valid statuses for progress tracking
            valid_statuses = ["pending", "approved", "shipped", "received", "completed", "rejected"]
            assert rma["status"] in valid_statuses
    
    def test_rma_unauthorized(self):
        """Test unauthorized access to RMA"""
        response = requests.get(f"{BASE_URL}/api/rma")
        assert response.status_code in [401, 403]


class TestTechnicianPerformance:
    """Technician Performance Report endpoint tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@network.com",
            "password": "Test123!"
        })
        return response.json()["access_token"]
    
    def test_get_technician_performance(self, auth_token):
        """Test getting technician performance report"""
        response = requests.get(
            f"{BASE_URL}/api/reports/technician-performance",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        # Verify performance data structure
        if len(data) > 0:
            tech = data[0]
            assert "technician_id" in tech
            assert "name" in tech
            assert "assigned_tickets" in tech
            assert "completed_work_orders" in tech
            assert "total_time_spent" in tech
            assert "avg_resolution_time" in tech
    
    def test_technician_performance_with_date_filter(self, auth_token):
        """Test technician performance with date filters"""
        start_date = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
        end_date = datetime.now().strftime("%Y-%m-%d")
        
        response = requests.get(
            f"{BASE_URL}/api/reports/technician-performance?start_date={start_date}&end_date={end_date}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_technician_performance_detail(self, auth_token):
        """Test getting detailed performance for a specific technician"""
        # First get list of technicians
        list_response = requests.get(
            f"{BASE_URL}/api/reports/technician-performance",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        if list_response.status_code != 200:
            pytest.skip("Could not get technician list")
        
        technicians = list_response.json()
        if not technicians:
            pytest.skip("No technicians available")
        
        tech_id = technicians[0]["technician_id"]
        
        # Get detailed performance
        response = requests.get(
            f"{BASE_URL}/api/reports/technician-performance/{tech_id}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify detailed performance structure
        assert "technician_id" in data
        assert "technician_name" in data
        assert "summary" in data
        assert "work_type_breakdown" in data
        assert "monthly_trend" in data
        assert "recent_work_orders" in data
    
    def test_technician_performance_unauthorized(self):
        """Test unauthorized access to technician performance"""
        response = requests.get(f"{BASE_URL}/api/reports/technician-performance")
        assert response.status_code in [401, 403]


class TestSLAProfiles:
    """SLA Profiles endpoint tests (for contract integration)"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@network.com",
            "password": "Test123!"
        })
        return response.json()["access_token"]
    
    def test_get_sla_profiles(self, auth_token):
        """Test getting SLA profiles for contract selection"""
        response = requests.get(
            f"{BASE_URL}/api/sla-profiles",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


# Cleanup fixture
@pytest.fixture(scope="session", autouse=True)
def cleanup_test_data():
    """Cleanup TEST_ prefixed data after all tests"""
    yield
    
    # Login to get token
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "test@network.com",
        "password": "Test123!"
    })
    
    if response.status_code != 200:
        return
    
    token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Delete test contracts
    contracts_response = requests.get(f"{BASE_URL}/api/contracts", headers=headers)
    if contracts_response.status_code == 200:
        for contract in contracts_response.json():
            if contract.get("name", "").startswith("TEST_"):
                requests.delete(f"{BASE_URL}/api/contracts/{contract['id']}", headers=headers)
