# CarbonX Trading System Implementation

## Overview
The CarbonX Trading System enables users to buy carbon credits, offset their carbon emissions, and manage their digital carbon footprint. This implementation includes:

- **User Profile Management**: Track cash balance, credits owned, and total retired offset
- **Transaction Logging**: Complete audit trail of all buy, offset, and deposit transactions
- **JWT Protected Endpoints**: Secure API with JWT authentication
- **Real-time Balance Updates**: Immediate feedback on account changes

---

## Features Implemented

### 1. **User Profile Model**
Automatically created for each user with default values:
- Initial cash balance: **$2,500.00**
- Initial credits owned: **0.00**
- Initial retired offset: **0 kg**

### 2. **Trading Operations**

#### Buy Carbon Credits
- Deduct cash from user account
- Add credits to their holdings
- Log transaction for audit trail
- Validates sufficient balance before transaction

#### Offset Carbon Credits
- Deduct credits from user account
- Add to their retirement record (kg multiplied by 1000)
- Log transaction for audit trail
- Validates sufficient credits before transaction

#### Deposit Cash
- Simulates payment gateway deposit
- Adds funds to user's cash balance
- Logs payment method (esewa, khalti, card)
- Supports any positive amount

### 3. **Transaction History**
Complete logging of all transactions with:
- Transaction type (BUY, OFFSET, DEPOSIT)
- Project information
- Quantity and value
- Timestamp

---

## Database Models

### UserProfile
```python
class UserProfile(models.Model):
    user = OneToOneField(User)
    cash_balance = DecimalField(max_digits=10, decimal_places=2, default=2500.00)
    credits_owned = DecimalField(max_digits=10, decimal_places=2, default=0.00)
    total_retired_offset = DecimalField(max_digits=10, decimal_places=2, default=0.00)
    created_at = DateTimeField(auto_now_add=True)
    updated_at = DateTimeField(auto_now=True)
```

### Transaction
```python
class Transaction(models.Model):
    TRANSACTION_TYPES = [('BUY', 'Buy Credits'), ('OFFSET', 'Offset Carbon'), ('DEPOSIT', 'Cash Deposit')]
    
    user = ForeignKey(User)
    project_id = CharField(max_length=100, nullable)
    project_name = CharField(max_length=255)
    transaction_type = CharField(max_length=10, choices=TRANSACTION_TYPES)
    quantity = DecimalField(max_digits=10, decimal_places=2)
    total_value = DecimalField(max_digits=10, decimal_places=2)
    created_at = DateTimeField(auto_now_add=True)
```

---

## API Endpoints

### 1. Execute Trade
```
POST /api/trading/trade/
```
**Purpose**: Buy or offset carbon credits

**Request Body**:
```json
{
  "project_id": "proj-1",
  "projectName": "Terai Forest Conservation",
  "type": "BUY",  // or "OFFSET"
  "quantity": 1.50,
  "totalValue": 27.75
}
```

**Response** (201):
```json
{
  "success": true,
  "message": "BUY transaction completed",
  "cash_balance": 2472.25,
  "credits_owned": 1.50,
  "total_retired_offset": 0.00
}
```

---

### 2. Deposit Cash
```
POST /api/trading/deposit/
```
**Purpose**: Add funds to account via simulated payment

**Request Body**:
```json
{
  "amount": 500.00,
  "method": "esewa"  // or "khalti", "card"
}
```

**Response** (201):
```json
{
  "success": true,
  "message": "Deposit of $500.00 completed via esewa",
  "cash_balance": 3000.00,
  "credits_owned": 1.50,
  "total_retired_offset": 0.00
}
```

---

### 3. Get Trading Profile
```
GET /api/trading/profile/
```
**Purpose**: Retrieve current user's trading data

**Response** (200):
```json
{
  "cash_balance": 2472.25,
  "credits_owned": 1.50,
  "total_retired_offset": 1000.00,
  "created_at": "2025-06-13T10:30:00Z",
  "updated_at": "2025-06-13T14:45:00Z"
}
```

---

### 4. Get Transaction History
```
GET /api/trading/transactions/
```
**Purpose**: Retrieve all transactions for user

**Response** (200):
```json
{
  "total_transactions": 3,
  "transactions": [
    {
      "id": 1,
      "project_id": "proj-1",
      "project_name": "Terai Forest Conservation",
      "transaction_type": "BUY",
      "quantity": "1.50",
      "total_value": "27.75",
      "created_at": "2025-06-13T14:45:00Z"
    },
    // ... more transactions
  ]
}
```

---

## Implementation Details

### File Changes

1. **carbon/models.py**
   - Added `UserProfile` model
   - Added `Transaction` model

2. **carbon/serializers.py**
   - Added `UserProfileSerializer`
   - Added `TransactionSerializer`

3. **carbon/views.py**
   - Added `execute_trade()` - POST /api/trading/trade/
   - Added `deposit_cash()` - POST /api/trading/deposit/
   - Added `trading_profile()` - GET /api/trading/profile/
   - Added `trading_transactions()` - GET /api/trading/transactions/

4. **carbon/urls.py**
   - Added 4 new URL routes for trading endpoints

5. **config/settings.py**
   - Removed unnecessary django_extensions

### Database Migrations
Created migration `0003_transaction_userprofile.py` to add new models to database.

---

## Testing

### Test Coverage
All endpoints have been tested with:
- ✅ User registration
- ✅ JWT authentication
- ✅ Trading profile creation
- ✅ Cash deposits
- ✅ Buying carbon credits
- ✅ Offsetting carbon credits
- ✅ Transaction history retrieval
- ✅ Error handling (insufficient balance/credits)

### Running Tests
```bash
python test_trading_api.py
```

**Test Results**:
- Registration: ✓ Passed
- Login: ✓ Passed
- Profile creation: ✓ Passed
- Deposits: ✓ Passed
- Buying credits: ✓ Passed
- Offsetting credits: ✓ Passed
- Transaction retrieval: ✓ Passed
- Final balance verification: ✓ Passed

---

## Security Features

1. **JWT Authentication**: All endpoints require valid JWT token
2. **User Isolation**: Each user can only access their own data
3. **Transaction Validation**: Prevents insufficient balance transactions
4. **Audit Trail**: Complete transaction history for compliance
5. **Decimal Precision**: Uses Decimal fields to prevent floating-point errors

---

## Example Workflow

```python
# 1. Register User
POST /api/register/
{
  "email": "trader@example.com",
  "password": "secure_password",
  "username": "trader@example.com"
}

# 2. Login
POST /api/login/
Response: { "access": "jwt_token", "refresh": "refresh_token" }

# 3. Check Profile (gets default $2500)
GET /api/trading/profile/
Authorization: Bearer jwt_token

# 4. Deposit Additional Funds
POST /api/trading/deposit/
{ "amount": 1000, "method": "esewa" }
# Balance now: $3500

# 5. Buy Carbon Credits
POST /api/trading/trade/
{
  "projectName": "Terai Forest",
  "type": "BUY",
  "quantity": 5.0,
  "totalValue": 92.50
}
# Balance: $3407.50, Credits: 5.0

# 6. Offset Credits
POST /api/trading/trade/
{
  "projectName": "Terai Forest",
  "type": "OFFSET",
  "quantity": 2.0,
  "totalValue": 0
}
# Credits: 3.0, Retired: 2000 kg

# 7. View History
GET /api/trading/transactions/
# Shows all 3 transactions (deposit, buy, offset)
```

---

## Error Handling

### Common Errors

**Insufficient Balance**
```
Status: 400
{
  "error": "Insufficient balance",
  "available": 500.00,
  "required": 750.00
}
```

**Insufficient Credits**
```
Status: 400
{
  "error": "Insufficient credits",
  "available": 1.0,
  "required": 5.0
}
```

**Invalid Request**
```
Status: 400
{
  "error": "Missing required fields: projectName, type"
}
```

**Unauthorized**
```
Status: 401
{
  "detail": "Authentication credentials were not provided."
}
```

---

## Future Enhancements

1. **Payment Gateway Integration**
   - eSewa integration
   - Khalti integration
   - Card processing

2. **Advanced Features**
   - Recurring deposits
   - Bulk transactions
   - Portfolio analytics
   - Price history

3. **Additional Security**
   - Rate limiting
   - Transaction signing
   - Encryption of sensitive data

4. **Reporting**
   - Transaction reports
   - Tax documentation
   - Carbon impact reports

---

## Performance Considerations

- Decimal fields prevent floating-point precision errors
- Indexed foreign keys for fast lookups
- Ordered transaction queries for efficiency
- JWT token validation is handled by DRF

---

## Compliance

- Follows DRF best practices
- RESTful API design
- Proper HTTP status codes
- Clear error messages
- Complete audit trail

---

## Support

For issues or questions about the trading system, refer to:
- **API Documentation**: See TRADING_API.md
- **Test Script**: test_trading_api.py
- **Code**: carbon/views.py, carbon/models.py

---

**Version**: 1.0  
**Last Updated**: June 13, 2026  
**Status**: Production Ready ✓
