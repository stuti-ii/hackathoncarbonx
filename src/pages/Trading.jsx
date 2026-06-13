import { useEffect, useState, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { toast } from "react-hot-toast";
import { FaLeaf } from "react-icons/fa";
import {
  FiLogOut, FiHome, FiAward, FiTrendingUp, FiCheck,
  FiShoppingBag, FiLayers, FiActivity, FiArrowUpRight, FiArrowDownRight
} from "react-icons/fi";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid
} from "recharts";
import dashboardService from "../services/dashboardService";

// ─── Initial Mock Data ────────────────────────────────────────────────────────
const TICKER_DATA = [
  { symbol: "GS-VER (Gold Standard)", price: 15.80, change: 1.25, type: "up" },
  { symbol: "VCS-VCU (Verra)", price: 12.20, change: -0.45, type: "down" },
  { symbol: "CER (UN Framework)", price: 18.50, change: 2.10, type: "up" },
  { symbol: "Plan Vivo (Bio)", price: 9.50, change: 0.00, type: "flat" }
];

const MARKET_PROJECTS = [
  {
    id: "proj-1",
    symbol: "NEPAL-REDD+",
    name: "Terai Arc Landscape Forest Conservation",
    standard: "UNFCCC REDD+",
    price: 18.50,
    bid: 18.45,
    ask: 18.50,
    volume24h: 12500,
    change24h: 1.8,
    available: 125000,
    color: "#10b981",
    glow: "rgba(16, 185, 129, 0.2)"
  },
  {
    id: "proj-2",
    symbol: "NEPAL-WETLAND",
    name: "Bagmati Riverine Wetland Restoration",
    standard: "Verra VCS",
    price: 12.20,
    bid: 12.15,
    ask: 12.20,
    volume24h: 8400,
    change24h: -0.5,
    available: 45000,
    color: "#3b82f6",
    glow: "rgba(59, 130, 246, 0.2)"
  },
  {
    id: "proj-3",
    symbol: "NEPAL-HYDRO",
    name: "Himalayan Small Hydro Transition",
    standard: "Gold Standard",
    price: 15.80,
    bid: 15.75,
    ask: 15.80,
    volume24h: 21000,
    change24h: 2.4,
    available: 85000,
    color: "#06b6d4",
    glow: "rgba(6, 182, 212, 0.2)"
  },
  {
    id: "proj-4",
    symbol: "NEPAL-METHANE",
    name: "Kathmandu Solid Waste Landfill Gas",
    standard: "Gold Standard",
    price: 11.50,
    bid: 11.40,
    ask: 11.50,
    volume24h: 6200,
    change24h: 0.9,
    available: 60000,
    color: "#f59e0b",
    glow: "rgba(245, 158, 11, 0.2)"
  },
  {
    id: "proj-5",
    symbol: "NEPAL-EE",
    name: "Biratnagar Industrial Energy Efficiency",
    standard: "UNFCCC CDM",
    price: 14.20,
    bid: 14.10,
    ask: 14.20,
    volume24h: 3400,
    change24h: -1.2,
    available: 40000,
    color: "#ec4899",
    glow: "rgba(236, 72, 153, 0.2)"
  }
];

// Mock Chart Price History generator
const generateChartHistory = (basePrice) => {
  return [
    { time: "09:00", price: basePrice - 0.4 },
    { time: "10:00", price: basePrice - 0.2 },
    { time: "11:00", price: basePrice - 0.5 },
    { time: "12:00", price: basePrice + 0.1 },
    { time: "13:00", price: basePrice },
    { time: "14:00", price: basePrice + 0.3 },
    { time: "15:00", price: basePrice + 0.2 },
    { time: "16:00", price: basePrice }
  ];
};

function Trading() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const [selectedProjectId, setSelectedProjectId] = useState(MARKET_PROJECTS[0].id);
  const selectedProject = MARKET_PROJECTS.find(p => p.id === selectedProjectId) || MARKET_PROJECTS[0];

  // User cash and digital footprint
  const [cashBalance, setCashBalance] = useState(() => {
    const stored = localStorage.getItem("carbonx_cash_balance");
    return stored ? parseFloat(stored) : 5000.00; // Mock USD cash balance
  });
  
  const [footprint, setFootprint] = useState(124.5); // kg CO2
  
  const [creditsOwned, setCreditsOwned] = useState(() => {
    const stored = localStorage.getItem("carbonx_credits_owned");
    return stored ? JSON.parse(stored) : {}; // { [projectId]: credits (t) }
  });

  const [retiredOffset, setRetiredOffset] = useState(() => {
    const stored = localStorage.getItem("carbonx_credits_retired");
    return stored ? parseFloat(stored) : 0; // tCO2 retired
  });

  const [transactions, setTransactions] = useState(() => {
    const stored = localStorage.getItem("carbonx_transactions");
    return stored ? JSON.parse(stored) : [];
  });

  // Trading Console States
  const [tradeType, setTradeType] = useState("BUY"); // "BUY" | "SELL" | "RETIRE"
  const [orderType, setOrderType] = useState("MARKET"); // "LIMIT" | "MARKET"
  const [limitPrice, setLimitPrice] = useState(selectedProject.price.toString());
  const [quantity, setQuantity] = useState("1.00"); // in tons of CO2
  const [isAdjustment, setIsAdjustment] = useState(true);

  // Synchronize dependencies
  useEffect(() => {
    localStorage.setItem("carbonx_credits_owned", JSON.stringify(creditsOwned));
  }, [creditsOwned]);

  useEffect(() => {
    localStorage.setItem("carbonx_credits_retired", retiredOffset.toString());
  }, [retiredOffset]);

  useEffect(() => {
    localStorage.setItem("carbonx_transactions", JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem("carbonx_cash_balance", cashBalance.toString());
  }, [cashBalance]);

  // Sync footprint on mount
  useEffect(() => {
    const fetchFootprint = async () => {
      try {
        const summary = await dashboardService.getSummary();
        if (summary && summary.totalCarbon !== undefined) {
          setFootprint(summary.totalCarbon);
        }
      } catch (err) {
        console.warn("Footprint fetch failed, using default:", err);
      }
    };
    fetchFootprint();
  }, []);

  // Update limit price input when project changes
  useEffect(() => {
    setLimitPrice(selectedProject.price.toString());
  }, [selectedProject]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // Calculations
  const executionPrice = orderType === "MARKET" ? selectedProject.price : parseFloat(limitPrice || 0);
  const totalCost = parseFloat((parseFloat(quantity || 0) * executionPrice).toFixed(2));
  const offsetInKg = parseFloat((retiredOffset * 1000).toFixed(1));
  const offsetPercentage = footprint > 0 ? Math.min(100, Math.round((offsetInKg / footprint) * 100)) : 0;

  // Execute buy order
  const handleExecuteTrade = (e) => {
    e.preventDefault();
    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) {
      toast.error("Please enter a valid credit quantity.");
      return;
    }

    if (tradeType === "BUY") {
      if (totalCost > cashBalance) {
        toast.error("Insufficient USD cash balance to execute this trade.");
        return;
      }

      setCashBalance(prev => parseFloat((prev - totalCost).toFixed(2)));
      setCreditsOwned(prev => ({
        ...prev,
        [selectedProject.id]: parseFloat(((prev[selectedProject.id] || 0) + qty).toFixed(4))
      }));

      const newTx = {
        id: `tx-${Date.now()}`,
        date: new Date().toISOString(),
        projectName: selectedProject.name,
        symbol: selectedProject.symbol,
        type: "BUY",
        credits: qty,
        pricePerCredit: executionPrice,
        totalValue: totalCost,
        mechanism: selectedProject.standard,
        ledgerStatus: isAdjustment ? "Adjusted" : "Unadjusted",
        details: isAdjustment ? "Corresponding Adjustment logged in National NDC Register" : "Standard credit transfer"
      };

      setTransactions(prev => [newTx, ...prev]);
      toast.success(`Trade Executed: Bought ${qty} ${selectedProject.symbol} at $${executionPrice.toFixed(2)}`);
    } else if (tradeType === "SELL") {
      const owned = creditsOwned[selectedProject.id] || 0;
      if (qty > owned) {
        toast.error(`Insufficient credits! You only own ${owned} of this token.`);
        return;
      }

      setCreditsOwned(prev => ({
        ...prev,
        [selectedProject.id]: parseFloat((owned - qty).toFixed(4))
      }));
      setCashBalance(prev => parseFloat((prev + totalCost).toFixed(2)));

      const newTx = {
        id: `tx-${Date.now()}`,
        date: new Date().toISOString(),
        projectName: selectedProject.name,
        symbol: selectedProject.symbol,
        type: "SELL",
        credits: qty,
        pricePerCredit: executionPrice,
        totalValue: totalCost,
        mechanism: selectedProject.standard,
        ledgerStatus: "Traded",
        details: `Sold on CarbonX Exchange`
      };

      setTransactions(prev => [newTx, ...prev]);
      toast.success(`Trade Executed: Sold ${qty} ${selectedProject.symbol} at $${executionPrice.toFixed(2)}`);
    } else if (tradeType === "RETIRE") {
      const owned = creditsOwned[selectedProject.id] || 0;
      if (qty > owned) {
        toast.error(`Insufficient credits! You only own ${owned} credits.`);
        return;
      }

      setCreditsOwned(prev => ({
        ...prev,
        [selectedProject.id]: parseFloat((owned - qty).toFixed(4))
      }));
      setRetiredOffset(prev => parseFloat((prev + qty).toFixed(4)));

      const newTx = {
        id: `tx-${Date.now()}`,
        date: new Date().toISOString(),
        projectName: selectedProject.name,
        symbol: selectedProject.symbol,
        type: "RETIRE",
        credits: qty,
        pricePerCredit: selectedProject.price,
        totalValue: 0.00,
        mechanism: selectedProject.standard,
        ledgerStatus: "Retired",
        details: `Permanently retired to offset ${qty * 1000} kg of Digital Compute Footprint.`
      };

      setTransactions(prev => [newTx, ...prev]);
      toast.success(`Retired ${qty} credits to neutralize digital footprint! 🌱`);
    }
  };

  return (
    <div className="gamification-page trading-page terminal-theme">
      {/* ── Navbar ── */}
      <nav className="dash-nav">
        <div className="dash-nav-brand">
          <FaLeaf className="brand-leaf" />
          <span>Carbon<strong>X</strong></span>
        </div>
        <div className="dash-nav-links">
          <Link to="/dashboard" className="nav-link">
            <FiHome /> Dashboard
          </Link>
          <Link to="/gamification" className="nav-link">
            <FiAward /> Achievements
          </Link>
          <Link to="/trading" className="nav-link active">
            <FiTrendingUp /> Carbon Trading
          </Link>
        </div>
        <div className="dash-nav-right">
          <span className="nav-user">{user?.name || user?.email || "User"}</span>
          <button className="nav-logout-btn" onClick={handleLogout}>
            <FiLogOut /> Logout
          </button>
        </div>
      </nav>

      {/* ── Ticker Tapes ── */}
      <div className="terminal-ticker">
        {TICKER_DATA.map((tick, idx) => (
          <div className="ticker-item" key={idx}>
            <span className="tick-sym">{tick.symbol}</span>
            <span className="tick-val">${tick.price.toFixed(2)}</span>
            <span className={`tick-pct change-${tick.type}`}>
              {tick.type === "up" ? <FiArrowUpRight /> : tick.type === "down" ? <FiArrowDownRight /> : null}
              {tick.change > 0 ? `+${tick.change.toFixed(2)}%` : `${tick.change.toFixed(2)}%`}
            </span>
          </div>
        ))}
      </div>

      <main className="trading-terminal-container">
        {/* LEFT COLUMN: Chart, Listings & Order Book */}
        <div className="terminal-left-pane">
          {/* Section 1: Chart */}
          <div className="terminal-card chart-panel">
            <div className="chart-panel-header">
              <div className="panel-brand">
                <span className="symbol-large" style={{ color: selectedProject.color }}>{selectedProject.symbol}</span>
                <span className="desc-small">{selectedProject.name} ({selectedProject.standard})</span>
              </div>
              <div className="panel-price-stats">
                <div className="stat-box">
                  <span className="stat-lbl">Price</span>
                  <span className="stat-val highlight-val">${selectedProject.price.toFixed(2)}</span>
                </div>
                <div className="stat-box">
                  <span className="stat-lbl">24h Change</span>
                  <span className={`stat-val change-${selectedProject.change24h >= 0 ? "up" : "down"}`}>
                    {selectedProject.change24h >= 0 ? "+" : ""}{selectedProject.change24h}%
                  </span>
                </div>
                <div className="stat-box">
                  <span className="stat-lbl">24h Vol</span>
                  <span className="stat-val">{selectedProject.volume24h.toLocaleString()} t</span>
                </div>
              </div>
            </div>

            <div className="terminal-chart-wrapper" style={{ height: "240px", marginTop: "16px" }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={generateChartHistory(selectedProject.price)} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="terminalGlow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={selectedProject.color} stopOpacity={0.15} />
                      <stop offset="95%" stopColor={selectedProject.color} stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="time" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis domain={['auto', 'auto']} stroke="#64748b" fontSize={11} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: "#1e293b", borderColor: "#334155", color: "#f8fafc" }} />
                  <Area type="monotone" dataKey="price" stroke={selectedProject.color} strokeWidth={2} fillOpacity={1} fill="url(#terminalGlow)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Section 2: Split Order Book & Project Listings */}
          <div className="terminal-split-row">
            {/* Project List */}
            <div className="terminal-card markets-panel">
              <h4 className="panel-title">Accredited Instruments</h4>
              <div className="markets-list-wrapper">
                <table className="markets-table">
                  <thead>
                    <tr>
                      <th>Symbol</th>
                      <th>Bid/Ask</th>
                      <th>Last</th>
                      <th>24h Chg</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MARKET_PROJECTS.map(proj => (
                      <tr
                        key={proj.id}
                        className={selectedProjectId === proj.id ? "active-row" : ""}
                        onClick={() => setSelectedProjectId(proj.id)}
                      >
                        <td className="sym-col" style={{ borderLeft: `3px solid ${proj.color}` }}>
                          {proj.symbol}
                          <span className="std-sub">{proj.standard}</span>
                        </td>
                        <td>{proj.bid.toFixed(2)} / {proj.ask.toFixed(2)}</td>
                        <td className="last-price">${proj.price.toFixed(2)}</td>
                        <td className={`change-${proj.change24h >= 0 ? "up" : "down"}`}>
                          {proj.change24h >= 0 ? "+" : ""}{proj.change24h}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mock Live Order Book */}
            <div className="terminal-card order-book-panel">
              <h4 className="panel-title">Order Book</h4>
              <div className="order-book-columns">
                {/* Sells (Asks) */}
                <div className="book-side ask-side">
                  <span className="side-title">Asks (Sell Orders)</span>
                  <div className="book-row book-header">
                    <span>Price</span>
                    <span>Size (t)</span>
                  </div>
                  {[
                    { price: selectedProject.price + 0.15, size: 850 },
                    { price: selectedProject.price + 0.10, size: 1200 },
                    { price: selectedProject.price + 0.05, size: 450 }
                  ].map((ask, i) => (
                    <div className="book-row ask-row" key={i}>
                      <span className="price">${ask.price.toFixed(2)}</span>
                      <span>{ask.size}</span>
                    </div>
                  ))}
                </div>

                {/* Bids (Buys) */}
                <div className="book-side bid-side">
                  <span className="side-title">Bids (Buy Orders)</span>
                  <div className="book-row book-header">
                    <span>Price</span>
                    <span>Size (t)</span>
                  </div>
                  {[
                    { price: selectedProject.price - 0.05, size: 600 },
                    { price: selectedProject.price - 0.10, size: 1450 },
                    { price: selectedProject.price - 0.15, size: 950 }
                  ].map((bid, i) => (
                    <div className="book-row bid-row" key={i}>
                      <span className="price">${bid.price.toFixed(2)}</span>
                      <span>{bid.size}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="book-spread">
                <span>Spread: ${(0.10).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Terminal Trading Console & Portfolio */}
        <div className="terminal-right-pane">
          {/* Trading Execution Console */}
          <div className="terminal-card console-panel">
            <div className="console-tab-header">
              {["BUY", "SELL", "RETIRE"].map(t => (
                <button
                  key={t}
                  className={`console-tab-btn tab-${t.toLowerCase()} ${tradeType === t ? "active" : ""}`}
                  onClick={() => setTradeType(t)}
                >
                  {t}
                </button>
              ))}
            </div>

            <form onSubmit={handleExecuteTrade} className="terminal-console-form">
              <div className="console-order-types">
                <button
                  type="button"
                  className={`order-type-btn ${orderType === "LIMIT" ? "active" : ""}`}
                  onClick={() => setOrderType("LIMIT")}
                >
                  Limit
                </button>
                <button
                  type="button"
                  className={`order-type-btn ${orderType === "MARKET" ? "active" : ""}`}
                  onClick={() => setOrderType("MARKET")}
                >
                  Market
                </button>
              </div>

              {/* Order input inputs */}
              {orderType === "LIMIT" && (
                <div className="terminal-form-group">
                  <label>Limit Price (USD)</label>
                  <div className="terminal-input-wrap">
                    <input
                      type="number"
                      step="0.05"
                      min="0.1"
                      value={limitPrice}
                      onChange={(e) => setLimitPrice(e.target.value)}
                    />
                    <span>USD</span>
                  </div>
                </div>
              )}

              <div className="terminal-form-group">
                <label>Amount (Tons of CO₂e)</label>
                <div className="terminal-input-wrap">
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                  />
                  <span>tCO₂e</span>
                </div>
              </div>

              {tradeType === "BUY" && (
                <div className="terminal-checkbox-group">
                  <input
                    id="corresponding-adjust"
                    type="checkbox"
                    checked={isAdjustment}
                    onChange={(e) => setIsAdjustment(e.target.checked)}
                  />
                  <label htmlFor="corresponding-adjust">
                    <strong>Corresponding Adjustment (Compliance Market)</strong>
                    <p>Marks registry transaction for government compliance ledgers.</p>
                  </label>
                </div>
              )}

              <div className="terminal-cost-sheet">
                <div className="cost-line">
                  <span>Unit Price</span>
                  <span>${executionPrice.toFixed(2)}</span>
                </div>
                <div className="cost-line highlight-total">
                  <span>Total Order Value</span>
                  <span>${totalCost.toFixed(2)} USD</span>
                </div>
              </div>

              <button
                type="submit"
                className={`execute-order-btn action-${tradeType.toLowerCase()}`}
              >
                {tradeType === "BUY" ? "Place Buy Order" : tradeType === "SELL" ? "Place Sell Order" : "Retire & Burn Credits"}
              </button>
            </form>
          </div>

          {/* Portfolio & Account Balance Panel */}
          <div className="terminal-card portfolio-panel">
            <h4 className="panel-title">Portfolio & Account Valuation</h4>
            <div className="portfolio-cash-box">
              <div className="cash-stat">
                <span className="lbl">Liquid Cash Balance</span>
                <span className="val">${cashBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD</span>
              </div>
              <div className="cash-stat">
                <span className="lbl">Carbon Net Footprint Offset</span>
                <span className="val">{offsetPercentage}% Neutralized ({offsetInKg} kg of {footprint} kg offset)</span>
              </div>
            </div>

            {/* Holdings inventory list */}
            <div className="holdings-inventory">
              <span className="section-subtitle">Your Carbon Inventories</span>
              <div className="inventory-list">
                {MARKET_PROJECTS.map(proj => {
                  const owned = creditsOwned[proj.id] || 0;
                  return owned > 0 ? (
                    <div className="inventory-row" key={proj.id}>
                      <span className="inv-sym">{proj.symbol}</span>
                      <span className="inv-qty">{owned.toFixed(3)} t</span>
                      <span className="inv-val">${(owned * proj.price).toFixed(2)}</span>
                    </div>
                  ) : null;
                })}
                {Object.values(creditsOwned).every(v => v === 0) && (
                  <div className="empty-inventory">
                    <span>No carbon token inventories held. Place a Buy order.</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* BOTTOM LEDGER PANEL: Transaction log */}
      <footer className="terminal-footer-ledger">
        <div className="ledger-header-panel">
          <FiLayers />
          <span>Real-time Trade Ledger Log</span>
        </div>
        <div className="ledger-table-wrap">
          <table className="ledger-table">
            <thead>
              <tr>
                <th>Time Executed</th>
                <th>Instrument</th>
                <th>Standard</th>
                <th>Trade Type</th>
                <th>Amount (t)</th>
                <th>Execution Price</th>
                <th>Valuation (USD)</th>
                <th>Registry Ledgers</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map(tx => (
                <tr key={tx.id}>
                  <td>{new Date(tx.date).toLocaleTimeString()}</td>
                  <td className="tx-symbol">{tx.symbol}</td>
                  <td>{tx.mechanism}</td>
                  <td>
                    <span className={`trade-tag tag-${tx.type.toLowerCase()}`}>
                      {tx.type}
                    </span>
                  </td>
                  <td>{tx.credits.toFixed(3)} t</td>
                  <td>${tx.pricePerCredit.toFixed(2)}</td>
                  <td>${tx.totalValue.toFixed(2)}</td>
                  <td className="ledger-msg">{tx.details}</td>
                  <td>
                    <span className={`status-badge stat-${tx.ledgerStatus.toLowerCase()}`}>
                      {tx.ledgerStatus}
                    </span>
                  </td>
                </tr>
              ))}
              {transactions.length === 0 && (
                <tr>
                  <td colSpan="9" style={{ textAlign: "center", color: "#64748b", padding: "24px" }}>
                    No executed orders registered on ledger.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </footer>
    </div>
  );
}

export default Trading;
