# CarbonX Trading System - Quick Start Guide

## 🚀 Get Started in 3 Minutes

### Step 1: Setup (1 minute)
```bash
cd carbonhack
pip install -r requirements.txt
python manage.py migrate
```

### Step 2: Run Server (30 seconds)
```bash
python manage.py runserver
# Server ready at http://127.0.0.1:8000/
```

### Step 3: Test API (1.5 minutes)
```bash
python test_trading_api.py
# All tests pass = System ready!
```

---

## 📌 Quick Reference

### User Workflow
1. **Register**: `POST /api/register/`
2. **Login**: `POST /api/login/` → Get JWT token
3. **Profile**: `GET /api/trading/profile/` → See $2500 default
4. **Deposit**: `POST /api/trading/deposit/` → Add funds
5. **Buy**: `POST /api/trading/trade/` (type=BUY) → Buy credits
6. **Offset**: `POST /api/trading/trade/` (type=OFFSET) → Offset CO2
7. **History**: `GET /api/trading/transactions/` → See all transactions

---

## 🔑 Key Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/trading/trade/` | POST | BUY or OFFSET credits |
| `/api/trading/deposit/` | POST | Add funds to account |
| `/api/trading/profile/` | GET | View balances |
| `/api/trading/transactions/` | GET | View transaction history |

---

## 📊 Data Flow Example

```
User: trader@example.com | Password: secure123

1. Register + Login → Get JWT Token
2. Profile: $2500 cash, 0 credits, 0kg offset
3. Deposit $500 → $3000 cash
4. Buy 2.5 credits for $46.25 → $2953.75 cash, 2.5 credits
5. Offset 1 credit → 1.5 credits, 1000kg offset
6. History shows: DEPOSIT, BUY, OFFSET
```

---

## 🧪 Test Everything

Run the comprehensive test suite:
```bash
python test_trading_api.py
```

Expected output:
```
✓ Registration successful
✓ Login successful
✓ Profile retrieved
✓ Deposit successful
✓ Purchase successful
✓ Offset successful
✓ Retrieved 3 transactions
✓ Final profile updated
```

---

## 💰 Transaction Types

### BUY
- **What**: Purchase carbon credits
- **Impact**: -Cash, +Credits
- **Example**: Buy 2.5 credits for $46.25

### OFFSET
- **What**: Retire credits to offset CO2
- **Impact**: -Credits, +Retired Offset
- **Example**: Offset 1 credit = 1000kg offset

### DEPOSIT
- **What**: Add cash to account
- **Impact**: +Cash
- **Example**: Deposit $500 via eSewa

---

## 🔐 Authentication

All endpoints except register/login need JWT token:

```bash
# Get token from login response
curl -X POST http://localhost:8000/api/login/ \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"pass123"}'

# Use token in headers
curl -X GET http://localhost:8000/api/trading/profile/ \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## ⚙️ What's Included

✅ **Models**: UserProfile, Transaction  
✅ **API**: 4 endpoints (POST/GET)  
✅ **Authentication**: JWT protected  
✅ **Database**: SQLite with migrations  
✅ **Tests**: Full test suite  
✅ **Documentation**: 3 comprehensive guides  

---

## 📚 Full Documentation

- **API Details**: `TRADING_API.md`
- **System Design**: `TRADING_SYSTEM.md`
- **Implementation**: `IMPLEMENTATION_SUMMARY.md`

---

## 🆘 Troubleshooting

### "Database not found" error
```bash
python manage.py migrate
```

### "ModuleNotFoundError" error
```bash
pip install -r requirements.txt
```

### "404 Not Found" error
- Check endpoint URL
- Verify JWT token is included
- See TRADING_API.md for correct endpoints

### Test fails with connection error
```bash
# Make sure server is running
python manage.py runserver  # in another terminal
```

---

## ✨ Features

- 💰 Dual trading (BUY & OFFSET)
- 💳 Payment simulation (esewa, khalti, card)
- 📊 Transaction history
- 🔒 Secure JWT authentication
- 📝 Complete audit trail
- ⚡ Real-time balance updates

---

## 📈 Next Steps

1. **Test the API** → Run test_trading_api.py
2. **Read the docs** → Check TRADING_API.md
3. **Integration** → Connect to frontend
4. **Production** → Deploy with proper security

---

## 🎯 Success Criteria

✅ All endpoints return 200/201 status  
✅ Transactions stored correctly  
✅ Balances update in real-time  
✅ JWT authentication works  
✅ Error handling works  
✅ Test suite passes  

---

**Version**: 1.0 | **Status**: Production Ready | **Date**: June 2026
