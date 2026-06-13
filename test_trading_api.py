"""
Test script for CarbonX Trading API
This script tests all trading endpoints with a real user.
"""

import requests
import json

# Configuration
BASE_URL = "http://localhost:8000"
EMAIL = "trader@example.com"
PASSWORD = "testpass123"

def test_api():
    """Run comprehensive API tests"""
    
    session = requests.Session()
    
    print("=" * 60)
    print("CarbonX Trading API - Test Suite")
    print("=" * 60)
    
    # 1. Register new user
    print("\n[1] Registering user...")
    register_response = session.post(f"{BASE_URL}/api/register/", json={
        "email": EMAIL,
        "password": PASSWORD,
        "username": EMAIL
    })
    print(f"Status: {register_response.status_code}")
    if register_response.status_code == 200:
        print("✓ Registration successful")
    else:
        print(f"Registration response: {register_response.text}")
    
    # 2. Login
    print("\n[2] Logging in...")
    login_response = session.post(f"{BASE_URL}/api/login/", json={
        "email": EMAIL,
        "password": PASSWORD
    })
    print(f"Status: {login_response.status_code}")
    if login_response.status_code == 200:
        token = login_response.json()["access"]
        session.headers.update({"Authorization": f"Bearer {token}"})
        print("✓ Login successful")
        print(f"Token: {token[:20]}...")
    else:
        print(f"Login failed: {login_response.text}")
        return
    
    # 3. Get trading profile
    print("\n[3] Getting trading profile...")
    profile_response = session.get(f"{BASE_URL}/api/trading/profile/")
    print(f"Status: {profile_response.status_code}")
    if profile_response.status_code == 200:
        profile = profile_response.json()
        print("✓ Profile retrieved")
        print(f"  Cash Balance: ${profile['cash_balance']}")
        print(f"  Credits Owned: {profile['credits_owned']}")
        print(f"  Total Retired: {profile['total_retired_offset']} kg")
    else:
        print(f"Error: {profile_response.text}")
    
    # 4. Deposit cash
    print("\n[4] Depositing cash ($500 via eSewa)...")
    deposit_response = session.post(f"{BASE_URL}/api/trading/deposit/", json={
        "amount": 500.00,
        "method": "esewa"
    })
    print(f"Status: {deposit_response.status_code}")
    if deposit_response.status_code == 201:
        data = deposit_response.json()
        print("✓ Deposit successful")
        print(f"  Cash Balance: ${data['cash_balance']}")
        print(f"  Message: {data['message']}")
    else:
        print(f"Error: {deposit_response.text}")
    
    # 5. Buy carbon credits
    print("\n[5] Buying carbon credits...")
    buy_response = session.post(f"{BASE_URL}/api/trading/trade/", json={
        "project_id": "proj-terai",
        "projectName": "Terai Forest Conservation",
        "type": "BUY",
        "quantity": 2.5,
        "totalValue": 46.25
    })
    print(f"Status: {buy_response.status_code}")
    if buy_response.status_code == 201:
        data = buy_response.json()
        print("✓ Purchase successful")
        print(f"  Cash Balance: ${data['cash_balance']}")
        print(f"  Credits Owned: {data['credits_owned']}")
    else:
        print(f"Error: {buy_response.text}")
    
    # 6. Offset carbon credits
    print("\n[6] Offsetting carbon credits...")
    offset_response = session.post(f"{BASE_URL}/api/trading/trade/", json={
        "project_id": "proj-terai",
        "projectName": "Terai Forest Conservation",
        "type": "OFFSET",
        "quantity": 1.0,
        "totalValue": 0
    })
    print(f"Status: {offset_response.status_code}")
    if offset_response.status_code == 201:
        data = offset_response.json()
        print("✓ Offset successful")
        print(f"  Credits Owned: {data['credits_owned']}")
        print(f"  Total Retired: {data['total_retired_offset']} kg")
    else:
        print(f"Error: {offset_response.text}")
    
    # 7. Get transaction history
    print("\n[7] Getting transaction history...")
    transactions_response = session.get(f"{BASE_URL}/api/trading/transactions/")
    print(f"Status: {transactions_response.status_code}")
    if transactions_response.status_code == 200:
        data = transactions_response.json()
        print(f"✓ Retrieved {data['total_transactions']} transactions")
        for i, txn in enumerate(data['transactions'], 1):
            print(f"  {i}. {txn['transaction_type']}: {txn['project_name']} "
                  f"({txn['quantity']} units) - ${txn['total_value']} "
                  f"on {txn['created_at']}")
    else:
        print(f"Error: {transactions_response.text}")
    
    # 8. Final profile check
    print("\n[8] Final profile check...")
    final_profile = session.get(f"{BASE_URL}/api/trading/profile/")
    if final_profile.status_code == 200:
        profile = final_profile.json()
        print("✓ Profile updated")
        print(f"  Cash Balance: ${profile['cash_balance']}")
        print(f"  Credits Owned: {profile['credits_owned']}")
        print(f"  Total Retired: {profile['total_retired_offset']} kg")
    
    print("\n" + "=" * 60)
    print("Test suite completed!")
    print("=" * 60)

if __name__ == "__main__":
    try:
        test_api()
    except Exception as e:
        print(f"Test failed with error: {e}")
        import traceback
        traceback.print_exc()
