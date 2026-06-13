/**
 * tradingService.js
 * Connects to Django backend trading endpoints.
 * Uses the shared `api` axios instance which automatically:
 *   - Attaches `Authorization: Bearer <token>` header
 *   - Handles 401 → redirect to /login
 */
import api from "./api";

/**
 * Fetch the user's trading profile.
 * GET /trading/profile/
 * Returns: { cash_balance, credits_owned, total_retired, footprint_kg }
 */
export async function getProfile() {
  const res = await api.get("/trading/profile/");
  return res.data;
}

/**
 * Deposit cash into the trading account.
 * POST /trading/deposit/
 * Body: { amount: number }
 * Returns: { new_balance, message }
 */
export async function deposit(amount) {
  const res = await api.post("/trading/deposit/", { amount });
  return res.data;
}

/**
 * Execute a buy or retire trade.
 * POST /trading/trade/
 * Body: { project_id, action: "BUY"|"OFFSET", quantity: number }
 * Returns: { success, message, new_balance, new_credits }
 */
export async function executeTrade({ project_id, action, quantity }) {
  const res = await api.post("/trading/trade/", { project_id, action, quantity });
  return res.data;
}

/**
 * Fetch all past transactions for the user.
 * GET /trading/transactions/
 * Returns: Array<{ id, date, project_name, type, credits, price, total_value }>
 */
export async function getTransactions() {
  const res = await api.get("/trading/transactions/");
  return res.data;
}

const tradingService = { getProfile, deposit, executeTrade, getTransactions };
export default tradingService;
