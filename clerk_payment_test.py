#!/usr/bin/env python3
"""
Clerk Payment Processing Test Script
Tests the new Clerk user payment flow and ensures JWT users still work
"""

import requests
import json
import os
import uuid
import time
from pymongo import MongoClient

# Get backend URL from frontend .env
def get_backend_url():
    try:
        with open('/app/frontend/.env', 'r') as f:
            for line in f:
                if line.startswith('REACT_APP_BACKEND_URL='):
                    return line.split('=', 1)[1].strip()
    except:
        pass
    return "http://localhost:8001"

BASE_URL = get_backend_url()
API_URL = f"{BASE_URL}/api"

class ClerkPaymentTester:
    def __init__(self):
        self.session = requests.Session()
        self.jwt_token = None
        self.clerk_user = None
        self.jwt_user = None
        self.test_products = []
        
        # MongoDB connection to find Clerk users
        try:
            with open('/app/backend/.env', 'r') as f:
                for line in f:
                    if line.startswith('MONGO_URL='):
                        mongo_url = line.split('=', 1)[1].strip()
                        break
            
            self.mongo_client = MongoClient(mongo_url)
            self.db = self.mongo_client['ecommerce_db']
        except Exception as e:
            print(f"❌ MongoDB connection failed: {e}")
            self.mongo_client = None
            self.db = None

    def find_clerk_user(self):
        """Find a Clerk user from the database"""
        print("🔍 Finding Clerk user in database...")
        
        if self.db is None:
            print("   ❌ No database connection")
            return False
        
        try:
            # Find a user with clerk_id
            clerk_user = self.db.users.find_one({"clerk_id": {"$exists": True, "$ne": None}})
            
            if clerk_user:
                self.clerk_user = {
                    "id": clerk_user["id"],
                    "clerk_id": clerk_user["clerk_id"],
                    "email": clerk_user["email"],
                    "name": clerk_user["name"]
                }
                print(f"   ✅ Found Clerk user: {self.clerk_user['email']} (clerk_id: {self.clerk_user['clerk_id']})")
                return True
            else:
                print("   ❌ No Clerk users found in database")
                # Create a test Clerk user
                return self.create_test_clerk_user()
                
        except Exception as e:
            print(f"   ❌ Error finding Clerk user: {e}")
            return False

    def create_test_clerk_user(self):
        """Create a test Clerk user via clerk-sync endpoint"""
        print("👤 Creating test Clerk user...")
        
        unique_id = str(uuid.uuid4())[:8]
        clerk_data = {
            "clerk_id": f"clerk_test_{unique_id}",
            "email": f"clerkuser_{unique_id}@example.com",
            "name": f"Clerk Test User {unique_id}",
            "profile_image_url": "https://example.com/avatar.jpg"
        }
        
        try:
            response = self.session.post(f"{API_URL}/auth/clerk-sync", json=clerk_data)
            print(f"   Clerk sync status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                self.clerk_user = {
                    "id": result["user"]["id"],
                    "clerk_id": clerk_data["clerk_id"],
                    "email": clerk_data["email"],
                    "name": clerk_data["name"]
                }
                print(f"   ✅ Test Clerk user created: {self.clerk_user['email']}")
                return True
            else:
                print(f"   ❌ Clerk user creation failed: {response.text}")
                return False
                
        except Exception as e:
            print(f"   ❌ Clerk user creation error: {e}")
            return False

    def create_jwt_user(self):
        """Create a JWT user for comparison testing"""
        print("👤 Creating JWT test user...")
        
        unique_id = str(uuid.uuid4())[:8]
        user_data = {
            "email": f"jwtuser_{unique_id}@example.com",
            "password": "testpassword123",
            "name": f"JWT Test User {unique_id}"
        }
        
        try:
            response = self.session.post(f"{API_URL}/auth/register", json=user_data)
            print(f"   JWT user registration status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                self.jwt_token = result.get('token')
                self.jwt_user = result.get('user')
                print(f"   ✅ JWT user created: {self.jwt_user['email']}")
                return True
            else:
                print(f"   ❌ JWT user creation failed: {response.text}")
                return False
                
        except Exception as e:
            print(f"   ❌ JWT user creation error: {e}")
            return False

    def get_test_products(self):
        """Get products for testing"""
        print("📦 Getting test products...")
        
        try:
            response = self.session.get(f"{API_URL}/products")
            print(f"   Products retrieval status: {response.status_code}")
            
            if response.status_code == 200:
                products = response.json()
                # Get first 2 products for testing
                self.test_products = products[:2] if len(products) >= 2 else products
                print(f"   ✅ Found {len(self.test_products)} products for testing")
                for product in self.test_products:
                    print(f"      - {product['name']} (₹{product['price']}) - ID: {product['id']}")
                return len(self.test_products) > 0
            else:
                print(f"   ❌ Products retrieval failed: {response.text}")
                return False
                
        except Exception as e:
            print(f"   ❌ Products retrieval error: {e}")
            return False

    def test_clerk_order_creation(self):
        """Test POST /api/orders/create with clerk_id and cart_items"""
        print("\n💳 Testing Clerk User Order Creation...")
        
        if not self.clerk_user or not self.test_products:
            print("   ❌ Missing clerk user or test products")
            return False
        
        # Prepare cart items
        cart_items = []
        expected_total = 0
        for product in self.test_products:
            cart_items.append({
                "product_id": product["id"],
                "quantity": 1
            })
            expected_total += product["price"]
        
        order_data = {
            "clerk_id": self.clerk_user["clerk_id"],
            "cart_items": cart_items
        }
        
        try:
            # No Authorization header for Clerk users
            response = self.session.post(f"{API_URL}/orders/create", json=order_data)
            print(f"   Clerk order creation status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                
                # Verify response structure
                required_fields = ["order_id", "razorpay_order_id", "amount", "currency", "key_id"]
                missing_fields = [field for field in required_fields if field not in result]
                
                if missing_fields:
                    print(f"   ❌ Missing fields in response: {missing_fields}")
                    return False
                
                print(f"   ✅ Clerk order created successfully")
                print(f"   Order ID: {result['order_id']}")
                print(f"   Razorpay Order ID: {result['razorpay_order_id']}")
                print(f"   Amount: ₹{result['amount']}")
                print(f"   Currency: {result['currency']}")
                print(f"   Key ID: {result['key_id']}")
                
                # Verify amount calculation
                amount_correct = abs(result['amount'] - expected_total) < 0.01
                print(f"   Amount calculation correct: {'✅' if amount_correct else '❌'}")
                print(f"   Expected: ₹{expected_total}, Got: ₹{result['amount']}")
                
                # Store order details for verification test
                self.clerk_order = result
                
                return amount_correct
            else:
                print(f"   ❌ Clerk order creation failed: {response.text}")
                return False
                
        except Exception as e:
            print(f"   ❌ Clerk order creation error: {e}")
            return False

    def test_jwt_order_creation(self):
        """Test POST /api/orders/create with JWT token (ensure not broken)"""
        print("\n💳 Testing JWT User Order Creation...")
        
        if not self.jwt_token or not self.test_products:
            print("   ❌ Missing JWT token or test products")
            return False
        
        # First add items to JWT user's cart
        headers = {"Authorization": f"Bearer {self.jwt_token}"}
        
        # Add products to cart
        for product in self.test_products:
            cart_item = {
                "product_id": product["id"],
                "quantity": 1
            }
            try:
                response = self.session.post(f"{API_URL}/cart/add", json=cart_item, headers=headers)
                if response.status_code != 200:
                    print(f"   ⚠️ Failed to add product {product['name']} to cart: {response.status_code}")
            except Exception as e:
                print(f"   ⚠️ Error adding to cart: {e}")
        
        try:
            # Create order with JWT authentication
            response = self.session.post(f"{API_URL}/orders/create", headers=headers)
            print(f"   JWT order creation status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                
                # Verify response structure
                required_fields = ["order_id", "razorpay_order_id", "amount", "currency", "key_id"]
                missing_fields = [field for field in required_fields if field not in result]
                
                if missing_fields:
                    print(f"   ❌ Missing fields in response: {missing_fields}")
                    return False
                
                print(f"   ✅ JWT order created successfully")
                print(f"   Order ID: {result['order_id']}")
                print(f"   Razorpay Order ID: {result['razorpay_order_id']}")
                print(f"   Amount: ₹{result['amount']}")
                
                # Store order details for verification test
                self.jwt_order = result
                
                return True
            else:
                print(f"   ❌ JWT order creation failed: {response.text}")
                return False
                
        except Exception as e:
            print(f"   ❌ JWT order creation error: {e}")
            return False

    def test_error_handling(self):
        """Test error handling scenarios"""
        print("\n🚨 Testing Error Handling...")
        
        test_results = {}
        
        # Test 1: Invalid clerk_id
        print("   Testing invalid clerk_id...")
        invalid_order_data = {
            "clerk_id": "invalid_clerk_id_12345",
            "cart_items": [{"product_id": self.test_products[0]["id"], "quantity": 1}] if self.test_products else []
        }
        
        try:
            response = self.session.post(f"{API_URL}/orders/create", json=invalid_order_data)
            if response.status_code == 404:
                result = response.json()
                if "User not found" in result.get("detail", ""):
                    print("   ✅ Invalid clerk_id correctly returns 404 User not found")
                    test_results['invalid_clerk_id'] = True
                else:
                    print(f"   ❌ Invalid clerk_id wrong error message: {result}")
                    test_results['invalid_clerk_id'] = False
            else:
                print(f"   ❌ Invalid clerk_id should return 404, got {response.status_code}")
                test_results['invalid_clerk_id'] = False
        except Exception as e:
            print(f"   ❌ Invalid clerk_id test error: {e}")
            test_results['invalid_clerk_id'] = False
        
        # Test 2: Empty cart_items
        print("   Testing empty cart_items...")
        empty_cart_data = {
            "clerk_id": self.clerk_user["clerk_id"] if self.clerk_user else "test_clerk",
            "cart_items": []
        }
        
        try:
            response = self.session.post(f"{API_URL}/orders/create", json=empty_cart_data)
            if response.status_code == 400:
                result = response.json()
                if "Cart is empty" in result.get("detail", ""):
                    print("   ✅ Empty cart_items correctly returns 400 Cart is empty")
                    test_results['empty_cart'] = True
                else:
                    print(f"   ❌ Empty cart wrong error message: {result}")
                    test_results['empty_cart'] = False
            else:
                print(f"   ❌ Empty cart should return 400, got {response.status_code}")
                test_results['empty_cart'] = False
        except Exception as e:
            print(f"   ❌ Empty cart test error: {e}")
            test_results['empty_cart'] = False
        
        # Test 3: No authentication
        print("   Testing no authentication...")
        try:
            response = self.session.post(f"{API_URL}/orders/create")
            if response.status_code == 401:
                result = response.json()
                if "Authentication required" in result.get("detail", ""):
                    print("   ✅ No authentication correctly returns 401 Authentication required")
                    test_results['no_auth'] = True
                else:
                    print(f"   ❌ No auth wrong error message: {result}")
                    test_results['no_auth'] = False
            else:
                print(f"   ❌ No authentication should return 401, got {response.status_code}")
                test_results['no_auth'] = False
        except Exception as e:
            print(f"   ❌ No authentication test error: {e}")
            test_results['no_auth'] = False
        
        return all(test_results.values())

    def test_data_validation(self):
        """Test data validation - verify order and Razorpay order creation"""
        print("\n🔍 Testing Data Validation...")
        
        if not hasattr(self, 'clerk_order') or not self.clerk_user:
            print("   ❌ No clerk order to validate")
            return False
        
        validation_results = {}
        
        # Test 1: Verify order exists in database
        print("   Checking order in database...")
        try:
            if self.db is not None:
                order = self.db.orders.find_one({"id": self.clerk_order["order_id"]})
                if order:
                    print(f"   ✅ Order found in database")
                    print(f"   Order user_id: {order['user_id']}")
                    print(f"   Order total: ₹{order['total']}")
                    print(f"   Order status: {order['status']}")
                    
                    # Verify user_id matches clerk user
                    user_id_correct = order['user_id'] == self.clerk_user['id']
                    print(f"   User ID correct: {'✅' if user_id_correct else '❌'}")
                    validation_results['order_in_db'] = user_id_correct
                else:
                    print("   ❌ Order not found in database")
                    validation_results['order_in_db'] = False
            else:
                print("   ⚠️ Cannot verify database - no connection")
                validation_results['order_in_db'] = True  # Skip this test
        except Exception as e:
            print(f"   ❌ Database validation error: {e}")
            validation_results['order_in_db'] = False
        
        # Test 2: Verify Razorpay order ID is not null
        razorpay_id_valid = bool(self.clerk_order.get("razorpay_order_id"))
        print(f"   Razorpay order ID valid: {'✅' if razorpay_id_valid else '❌'}")
        validation_results['razorpay_id'] = razorpay_id_valid
        
        # Test 3: Verify total calculation
        expected_total = sum(product["price"] for product in self.test_products)
        actual_total = self.clerk_order.get("amount", 0)
        total_correct = abs(actual_total - expected_total) < 0.01
        print(f"   Total calculation correct: {'✅' if total_correct else '❌'}")
        print(f"   Expected: ₹{expected_total}, Got: ₹{actual_total}")
        validation_results['total_calculation'] = total_correct
        
        return all(validation_results.values())

    def run_all_tests(self):
        """Run all Clerk payment processing tests"""
        print("🚀 Starting Clerk Payment Processing Tests")
        print("=" * 60)
        print(f"Backend URL: {BASE_URL}")
        print(f"API URL: {API_URL}")
        print("=" * 60)
        
        test_results = {}
        
        # Setup
        print("🔧 Setting up test environment...")
        setup_success = (
            self.find_clerk_user() and
            self.create_jwt_user() and
            self.get_test_products()
        )
        
        if not setup_success:
            print("❌ Setup failed - cannot proceed with tests")
            return {}
        
        # Test 1: Clerk User Order Creation
        test_results['clerk_order_creation'] = self.test_clerk_order_creation()
        
        # Test 2: JWT User Order Creation (ensure not broken)
        test_results['jwt_order_creation'] = self.test_jwt_order_creation()
        
        # Test 3: Error Handling
        test_results['error_handling'] = self.test_error_handling()
        
        # Test 4: Data Validation
        test_results['data_validation'] = self.test_data_validation()
        
        # Summary
        print("\n" + "=" * 60)
        print("📊 CLERK PAYMENT PROCESSING TEST RESULTS")
        print("=" * 60)
        
        passed = 0
        total = len(test_results)
        
        for test_name, result in test_results.items():
            status = "✅ PASS" if result else "❌ FAIL"
            print(f"   {test_name.replace('_', ' ').title()}: {status}")
            if result:
                passed += 1
        
        print(f"\nOverall: {passed}/{total} tests passed")
        
        if passed == total:
            print("🎉 All Clerk payment processing features are working correctly!")
        else:
            print("⚠️  Some features failed. Please check the detailed output above.")
        
        # Cleanup
        if self.mongo_client:
            self.mongo_client.close()
        
        return test_results

if __name__ == "__main__":
    tester = ClerkPaymentTester()
    results = tester.run_all_tests()