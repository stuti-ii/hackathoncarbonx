# CarbonX Trading API Documentation

## Overview
The Trading API enables users to buy and offset carbon credits, manage cash balances, and track all transactions. All endpoints require JWT authentication.

---

## Authentication
All endpoints require a valid JWT token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

Obtain a token by logging in:
```
POST /auth/login/
Body:
{
  "email": "user@example.com",
  "password": "password"
}
```

---

## Endpoints

### 1. Execute Trade (BUY / OFFSET)
**POST** `/api/trading/trade/`

Execute a carbon credit transaction (buy or offset).

#### Request Body
```json
{
  "project_id": "proj-1",
  "projectName": "Terai Forest Conservation",
  "type": "BUY",
  "quantity": 1.50,
  "totalValue": 27.75
}
```

#### Parameters
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| project_id | string | No | Unique project identifier |
| projectName | string | Yes | Name of the carbon offset project |
| type | string | Yes | Transaction type: "BUY" or "OFFSET" |
| quantity | number | Yes | Amount of credits to buy/offset |
| totalValue | number | Yes | Cash value of the transaction |

#### Response (Success - 201 Created)
```json
{
  "success": true,
  "message": "BUY transaction completed",
  "cash_balance": 2472.25,
  "credits_owned": 1.50,
  "total_retired_offset": 0.00
}
```

#### Response (Error - Insufficient Balance)
```json
{
  "error": "Insufficient balance",
  "available": 2500.00,
  "required": 27.75
}
```

#### Response (Error - Insufficient Credits)
```json
{
  "error": "Insufficient credits",
  "available": 0.50,
  "required": 1.50
}
```

#### Examples

**Example 1: Buy Credits**
```bash
curl -X POST http://localhost:8000/api/trading/trade/ \
  -H "Authorization: Bearer your_token" \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": "proj-1",
    "projectName": "Terai Forest Conservation",
    "type": "BUY",
    "quantity": 2.00,
    "totalValue": 37.00
  }'
```

**Example 2: Offset Credits**
```bash
curl -X POST http://localhost:8000/api/trading/trade/ \
  -H "Authorization: Bearer your_token" \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": "proj-1",
    "projectName": "Terai Forest Conservation",
    "type": "OFFSET",
    "quantity": 1.00,
    "totalValue": 0
  }'
```

---

### 2. Deposit Cash (Payment Simulation)
**POST** `/api/trading/deposit/`

Simulate a cash deposit via payment method.

#### Request Body
```json
{
  "amount": 500.00,
  "method": "esewa"
}
```

#### Parameters
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| amount | number | Yes | Amount to deposit (must be > 0) |
| method | string | No | Payment method: "esewa", "khalti", "card" (default: "card") |

#### Response (Success - 201 Created)
```json
{
  "success": true,
  "message": "Deposit of $500.00 completed via esewa",
  "cash_balance": 3000.00,
  "credits_owned": 1.50,
  "total_retired_offset": 1000.00
}
```

#### Response (Error - Invalid Amount)
```json
{
  "error": "Amount must be greater than 0"
}
```

#### Example
```bash
curl -X POST http://localhost:8000/api/trading/deposit/ \
  -H "Authorization: Bearer your_token" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 500.00,
    "method": "esewa"
  }'
```

---

### 3. Get Trading Profile
**GET** `/api/trading/profile/`

Retrieve the current user's trading profile with balances and offsets.

#### Response (Success - 200 OK)
```json
{
  "cash_balance": 2472.25,
  "credits_owned": 1.50,
  "total_retired_offset": 1000.00,
  "created_at": "2025-06-13T10:30:00Z",
  "updated_at": "2025-06-13T14:45:00Z"
}
```

#### Example
```bash
curl -X GET http://localhost:8000/api/trading/profile/ \
  -H "Authorization: Bearer your_token"
```

---

### 4. Get Transaction History
**GET** `/api/trading/transactions/`

Retrieve all transactions for the current user.

#### Response (Success - 200 OK)
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
    {
      "id": 2,
      "project_id": null,
      "project_name": "eSewa Deposit",
      "transaction_type": "DEPOSIT",
      "quantity": "0.00",
      "total_value": "500.00",
      "created_at": "2025-06-13T14:30:00Z"
    },
    {
      "id": 3,
      "project_id": "proj-1",
      "project_name": "Terai Forest Conservation",
      "transaction_type": "OFFSET",
      "quantity": "1.00",
      "total_value": "18.50",
      "created_at": "2025-06-13T15:00:00Z"
    }
  ]
}
```

#### Example
```bash
curl -X GET http://localhost:8000/api/trading/transactions/ \
  -H "Authorization: Bearer your_token"
```

---

## Data Models

### UserProfile
Stores user trading data.

```
- user_id: Foreign key to User
- cash_balance: Decimal (default: 2500.00)
- credits_owned: Decimal (default: 0.00)
- total_retired_offset: Decimal (default: 0.00)
- created_at: DateTime
- updated_at: DateTime
```

### Transaction
Logs all trading activities.

```
- id: Auto-increment ID
- user_id: Foreign key to User
- project_id: String (nullable)
- project_name: String
- transaction_type: Choice (BUY, OFFSET, DEPOSIT)
- quantity: Decimal
- total_value: Decimal
- created_at: DateTime
```

---

## Trading Logic

### BUY Transaction
1. Check if user has sufficient cash balance
2. Deduct `totalValue` from cash balance
3. Add `quantity` to credits owned
4. Create transaction record with type "BUY"
5. Return updated balances

### OFFSET Transaction
1. Check if user has sufficient credits owned
2. Deduct `quantity` from credits owned
3. Add `quantity * 1000` to total retired offset
4. Create transaction record with type "OFFSET"
5. Return updated balances

### DEPOSIT Transaction
1. Add `amount` to cash balance
2. Create transaction record with type "DEPOSIT"
3. Return updated balances

---

## Error Handling

All errors return appropriate HTTP status codes:

| Status | Scenario |
|--------|----------|
| 201 | Transaction successful |
| 400 | Bad request (invalid data, insufficient balance/credits) |
| 401 | Unauthorized (missing/invalid JWT token) |
| 500 | Server error |

Error response format:
```json
{
  "error": "Error message describing what went wrong"
}
```

---

## Usage Workflow

### Complete Trading Workflow Example

1. **User Registration & Login**
```bash
POST /auth/register/
POST /auth/login/
```

2. **Check Initial Profile**
```bash
GET /api/trading/profile/
# Response: cash_balance: 2500.00, credits_owned: 0.00
```

3. **Deposit Additional Funds**
```bash
POST /api/trading/deposit/
# Request: { "amount": 1000.00, "method": "esewa" }
```

4. **Buy Carbon Credits**
```bash
POST /api/trading/trade/
# Request: { "projectName": "...", "type": "BUY", "quantity": 5.0, "totalValue": 92.50 }
```

5. **Offset Carbon Credits**
```bash
POST /api/trading/trade/
# Request: { "projectName": "...", "type": "OFFSET", "quantity": 2.0, "totalValue": 0 }
```

6. **View Transaction History**
```bash
GET /api/trading/transactions/
```

---

## Rate Limiting
No rate limiting is currently implemented. For production, consider adding rate limiting middleware.

## Testing
All endpoints have been tested with JWT authentication and transaction validations.
