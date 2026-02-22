import requests
import sys
from datetime import datetime
import json
import base64

class NetworkServiceAPITester:
    def __init__(self, base_url="https://netrepair-pro.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.created_ids = {}  # Store created resource IDs for cleanup and reference

    def run_test(self, name, method, endpoint, expected_status, data=None, params=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PATCH':
                response = requests.patch(url, json=data, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return success, response.json()
                except:
                    return success, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_detail = response.json()
                    print(f"   Error: {error_detail}")
                except:
                    print(f"   Error: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_user_registration(self):
        """Test user registration"""
        user_data = {
            "email": "test@network.com",
            "password": "Test123!",
            "full_name": "Test Kullanıcı",
            "role": "admin"
        }
        success, response = self.run_test(
            "User Registration",
            "POST",
            "auth/register",
            200,
            data=user_data
        )
        if success and 'id' in response:
            self.created_ids['user'] = response['id']
            return True
        return False

    def test_user_login(self):
        """Test user login and get token"""
        login_data = {
            "email": "test@network.com",
            "password": "Test123!"
        }
        success, response = self.run_test(
            "User Login",
            "POST",
            "auth/login",
            200,
            data=login_data
        )
        if success and 'access_token' in response:
            self.token = response['access_token']
            print(f"   Token obtained: {self.token[:20]}...")
            return True
        return False

    def test_get_current_user(self):
        """Test getting current user info"""
        success, response = self.run_test(
            "Get Current User",
            "GET",
            "auth/me",
            200
        )
        return success

    def test_create_customer(self):
        """Test creating a customer"""
        customer_data = {
            "name": "Ahmet Yılmaz",
            "company": "TechCorp A.Ş.",
            "email": "ahmet@techcorp.com",
            "phone": "+90 555 123 4567",
            "sla_level": "standard"
        }
        success, response = self.run_test(
            "Create Customer",
            "POST",
            "customers",
            200,
            data=customer_data
        )
        if success and 'id' in response:
            self.created_ids['customer'] = response['id']
            return True
        return False

    def test_get_customers(self):
        """Test getting customer list"""
        success, response = self.run_test(
            "Get Customers",
            "GET",
            "customers",
            200
        )
        return success

    def test_create_asset(self):
        """Test creating an asset"""
        if 'customer' not in self.created_ids:
            print("❌ Cannot create asset - no customer ID available")
            return False
            
        asset_data = {
            "customer_id": self.created_ids['customer'],
            "serial_number": "SN-12345",
            "device_type": "Switch",
            "brand": "Cisco",
            "model": "C2960-48"
        }
        success, response = self.run_test(
            "Create Asset",
            "POST",
            "assets",
            200,
            data=asset_data
        )
        if success and 'id' in response:
            self.created_ids['asset'] = response['id']
            return True
        return False

    def test_get_assets(self):
        """Test getting asset list"""
        success, response = self.run_test(
            "Get Assets",
            "GET",
            "assets",
            200
        )
        return success

    def test_create_ticket(self):
        """Test creating a ticket"""
        if 'customer' not in self.created_ids:
            print("❌ Cannot create ticket - no customer ID available")
            return False
            
        ticket_data = {
            "customer_id": self.created_ids['customer'],
            "asset_id": self.created_ids.get('asset'),
            "title": "Switch portu çalışmıyor",
            "description": "Port 24 bağlantı sağlamıyor",
            "category": "hardware",
            "priority": "high"
        }
        success, response = self.run_test(
            "Create Ticket",
            "POST",
            "tickets",
            200,
            data=ticket_data
        )
        if success and 'id' in response:
            self.created_ids['ticket'] = response['id']
            return True
        return False

    def test_get_tickets(self):
        """Test getting ticket list"""
        success, response = self.run_test(
            "Get Tickets",
            "GET",
            "tickets",
            200
        )
        return success

    def test_update_ticket(self):
        """Test updating ticket status"""
        if 'ticket' not in self.created_ids:
            print("❌ Cannot update ticket - no ticket ID available")
            return False
            
        update_data = {
            "status": "in_progress"
        }
        success, response = self.run_test(
            "Update Ticket Status",
            "PATCH",
            f"tickets/{self.created_ids['ticket']}",
            200,
            data=update_data
        )
        return success

    def test_create_work_order(self):
        """Test creating a work order"""
        if 'ticket' not in self.created_ids or 'user' not in self.created_ids:
            print("❌ Cannot create work order - missing ticket or user ID")
            return False
            
        work_order_data = {
            "ticket_id": self.created_ids['ticket'],
            "assigned_technician": self.created_ids['user'],
            "notes": "Port değişimi gerekli"
        }
        success, response = self.run_test(
            "Create Work Order",
            "POST",
            "work-orders",
            200,
            data=work_order_data
        )
        if success and 'id' in response:
            self.created_ids['work_order'] = response['id']
            return True
        return False

    def test_get_work_orders(self):
        """Test getting work order list"""
        success, response = self.run_test(
            "Get Work Orders",
            "GET",
            "work-orders",
            200
        )
        return success

    def test_create_part(self):
        """Test creating a part"""
        part_data = {
            "part_number": "P-1001",
            "name": "RJ45 Port Modülü",
            "category": "Network",
            "quantity": 10,
            "min_stock": 5,
            "unit_price": 25.50
        }
        success, response = self.run_test(
            "Create Part",
            "POST",
            "parts",
            200,
            data=part_data
        )
        if success and 'id' in response:
            self.created_ids['part'] = response['id']
            return True
        return False

    def test_get_parts(self):
        """Test getting parts list"""
        success, response = self.run_test(
            "Get Parts",
            "GET",
            "parts",
            200
        )
        return success

    def test_create_rma(self):
        """Test creating an RMA"""
        if 'asset' not in self.created_ids:
            print("❌ Cannot create RMA - no asset ID available")
            return False
            
        rma_data = {
            "asset_id": self.created_ids['asset'],
            "ticket_id": self.created_ids.get('ticket'),
            "reason": "Arızalı port modülü"
        }
        success, response = self.run_test(
            "Create RMA",
            "POST",
            "rma",
            200,
            data=rma_data
        )
        if success and 'id' in response:
            self.created_ids['rma'] = response['id']
            return True
        return False

    def test_get_rma_list(self):
        """Test getting RMA list"""
        success, response = self.run_test(
            "Get RMA List",
            "GET",
            "rma",
            200
        )
        return success

    def test_dashboard_stats(self):
        """Test dashboard statistics"""
        success, response = self.run_test(
            "Dashboard Statistics",
            "GET",
            "reports/dashboard",
            200
        )
        if success:
            print(f"   Dashboard stats: {response}")
        return success

    def test_create_additional_user(self):
        """Test creating additional user (technician)"""
        user_data = {
            "email": "teknisyen@network.com",
            "password": "Tech123!",
            "full_name": "Mehmet Demir",
            "role": "technician"
        }
        success, response = self.run_test(
            "Create Additional User",
            "POST",
            "auth/register",
            200,
            data=user_data
        )
        return success

    def test_get_users(self):
        """Test getting users list"""
        success, response = self.run_test(
            "Get Users",
            "GET",
            "users",
            200
        )
        return success

def main():
    print("🚀 Starting Network Service API Tests...")
    print("=" * 60)
    
    tester = NetworkServiceAPITester()
    
    # Test sequence following the workflow requirements
    test_sequence = [
        # Authentication tests
        ("User Registration", tester.test_user_registration),
        ("User Login", tester.test_user_login),
        ("Get Current User", tester.test_get_current_user),
        
        # Customer management
        ("Create Customer", tester.test_create_customer),
        ("Get Customers", tester.test_get_customers),
        
        # Asset management
        ("Create Asset", tester.test_create_asset),
        ("Get Assets", tester.test_get_assets),
        
        # Ticket management
        ("Create Ticket", tester.test_create_ticket),
        ("Get Tickets", tester.test_get_tickets),
        ("Update Ticket", tester.test_update_ticket),
        
        # Work order management
        ("Create Work Order", tester.test_create_work_order),
        ("Get Work Orders", tester.test_get_work_orders),
        
        # Parts management
        ("Create Part", tester.test_create_part),
        ("Get Parts", tester.test_get_parts),
        
        # RMA management
        ("Create RMA", tester.test_create_rma),
        ("Get RMA List", tester.test_get_rma_list),
        
        # Dashboard and reporting
        ("Dashboard Stats", tester.test_dashboard_stats),
        
        # User management
        ("Create Additional User", tester.test_create_additional_user),
        ("Get Users", tester.test_get_users),
    ]
    
    failed_tests = []
    
    for test_name, test_func in test_sequence:
        try:
            if not test_func():
                failed_tests.append(test_name)
        except Exception as e:
            print(f"❌ {test_name} failed with exception: {str(e)}")
            failed_tests.append(test_name)
    
    # Print final results
    print("\n" + "=" * 60)
    print(f"📊 Test Results: {tester.tests_passed}/{tester.tests_run} tests passed")
    
    if failed_tests:
        print(f"\n❌ Failed Tests ({len(failed_tests)}):")
        for test in failed_tests:
            print(f"   - {test}")
    else:
        print("\n✅ All tests passed!")
    
    print(f"\n📋 Created Resources:")
    for resource_type, resource_id in tester.created_ids.items():
        print(f"   - {resource_type}: {resource_id}")
    
    return 0 if len(failed_tests) == 0 else 1

if __name__ == "__main__":
    sys.exit(main())