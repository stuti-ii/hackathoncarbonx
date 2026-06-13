import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { toast } from "react-hot-toast";
import { FaLeaf } from "react-icons/fa";
import { FiLogOut, FiHome, FiAward, FiTrendingUp, FiActivity } from "react-icons/fi";
import dashboardService from "../services/dashboardService";

const MARKET_PROJECTS = [
  { id: "proj-1", name: "Terai Arc Landscape Forest Conservation ($18.50/t)", price: 18.50, displayName: "Terai Forest Conservation" },
  { id: "proj-2", name: "Bagmati Riverine Wetland Restoration ($12.20/t)",    price: 12.20, displayName: "Bagmati Wetland Restoration" },
  { id: "proj-3", name: "Himalayan Small Hydro Renewable Transition ($15.80/t)", price: 15.80, displayName: "Himalayan Hydro Transition" },
  { id: "proj-4", name: "Kathmandu Solid Waste Landfill Gas Capture ($11.50/t)", price: 11.50, displayName: "Kathmandu Landfill Capture" },
];

function Trading() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const [cashBalance, setCashBalance] = useState(() =>
    parseFloat(localStorage.getItem("carbonx_cash_balance") || "2500")
  );
  const [creditsOwned, setCreditsOwned] = useState(() =>
    JSON.parse(localStorage.getItem("carbonx_credits_owned") || "{}")
  );
  const [retiredOffset, setRetiredOffset] = useState(() =>
    parseFloat(localStorage.getItem("carbonx_credits_retired") || "0")
  );
  const [transactions, setTransactions] = useState(() =>
    JSON.parse(localStorage.getItem("carbonx_transactions") || "[]")
  );
  const [footprint, setFootprint] = useState(124.5);

  const [selectedProjectId, setSelectedProjectId] = useState(MARKET_PROJECTS[0].id);
  const selectedProject = MARKET_PROJECTS.find(p => p.id === selectedProjectId) || MARKET_PROJECTS[0];
  const [tradeMode, setTradeMode] = useState("BUY");
  const [quantity, setQuantity]   = useState("1.00");

  /* Persist to localStorage on every change */
  useEffect(() => { localStorage.setItem("carbonx_cash_balance",    cashBalance.toString()); }, [cashBalance]);
  useEffect(() => { localStorage.setItem("carbonx_credits_owned",   JSON.stringify(creditsOwned)); }, [creditsOwned]);
  useEffect(() => { localStorage.setItem("carbonx_credits_retired",  retiredOffset.toString()); }, [retiredOffset]);
  useEffect(() => { localStorage.setItem("carbonx_transactions",     JSON.stringify(transactions)); }, [transactions]);

  /* Sync footprint from dashboard service */
  useEffect(() => {
    dashboardService.getSummary()
      .then(s => { if (s?.totalCarbon !== undefined) setFootprint(s.totalCarbon); })
      .catch(() => {});
  }, []);

  const totalCreditsOwned = Object.values(creditsOwned).reduce((s, v) => s + (v || 0), 0);
  const offsetInKg        = retiredOffset * 1000;
  const offsetPct         = footprint > 0 ? Math.min(100, Math.round((offsetInKg / footprint) * 100)) : 0;
  const totalCost         = parseFloat((parseFloat(quantity || 0) * selectedProject.price).toFixed(2));

  const handleLogout = () => { logout(); navigate("/login"); };

  const handleTradeSubmit = (e) => {
    e.preventDefault();
    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) { toast.error("Please enter a valid amount."); return; }

    if (tradeMode === "BUY") {
      if (totalCost > cashBalance) { toast.error("Insufficient cash balance."); return; }
      setCashBalance(prev => parseFloat((prev - totalCost).toFixed(2)));
      setCreditsOwned(prev => ({
        ...prev,
        [selectedProject.id]: parseFloat(((prev[selectedProject.id] || 0) + qty).toFixed(4)),
      }));
      const tx = {
        id: `tx-${Date.now()}`,
        date: new Date().toISOString(),
        projectName: selectedProject.displayName,
        type: "BUY",
        credits: qty,
        price: selectedProject.price,
        totalValue: totalCost,
      };
      setTransactions(prev => [tx, ...prev]);
      toast.success(`Purchased ${qty} t from ${selectedProject.displayName}! 🌿`);
    } else {
      const owned = creditsOwned[selectedProject.id] || 0;
      if (qty > owned) { toast.error(`Only ${owned.toFixed(2)} t available from this project.`); return; }
      setCreditsOwned(prev => ({
        ...prev,
        [selectedProject.id]: parseFloat((owned - qty).toFixed(4)),
      }));
      setRetiredOffset(prev => parseFloat((prev + qty).toFixed(4)));
      const tx = {
        id: `tx-${Date.now()}`,
        date: new Date().toISOString(),
        projectName: selectedProject.displayName,
        type: "OFFSET",
        credits: qty,
        price: selectedProject.price,
        totalValue: 0,
      };
      setTransactions(prev => [tx, ...prev]);
      toast.success(`Retired ${qty} t · ${(qty * 1000).toFixed(0)} kg CO₂ offset! 🌱`);
    }
  };

  return (
    <div className="trading-page">
      {/* ── Navbar ── */}
      <nav className="dash-nav">
        <div className="dash-nav-brand">
          <FaLeaf className="brand-leaf" />
          <span>Carbon<strong>X</strong></span>
        </div>
        <div className="dash-nav-links">
          <Link to="/dashboard" className="nav-link"><FiHome /> Dashboard</Link>
          <Link to="/dashboard?tab=feed" className="nav-link"><FiActivity /> Activity Feed</Link>
          <Link to="/gamification" className="nav-link"><FiAward /> Achievements</Link>
          <Link to="/trading" className="nav-link active"><FiTrendingUp /> Carbon Trading</Link>
        </div>
        <div className="dash-nav-right">
          <span className="nav-user">{user?.name || user?.email || "User"}</span>
          <button className="nav-logout-btn" onClick={handleLogout}><FiLogOut /> Logout</button>
        </div>
      </nav>

      <main className="trading-main basic-trading-layout">

        {/* ── Trading Card ── */}
        <div className="basic-trading-card">

          {/* Stats */}
          <div className="basic-stats-grid">
            <div className="basic-stat-item">
              <span className="lbl">Cash Balance</span>
              <span className="val">
                ${cashBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="basic-stat-item">
              <span className="lbl">Credits Owned</span>
              <span className="val" style={{ color: "#3b82f6" }}>{totalCreditsOwned.toFixed(2)} t</span>
            </div>
            <div className="basic-stat-item">
              <span className="lbl">Offset Neutrality</span>
              <span className="val">{offsetPct}%</span>
            </div>
          </div>

          <div style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", margin: "0 auto 18px", textAlign: "center" }}>
            Footprint: <strong>{footprint} kg CO₂</strong> · Retired: <strong>{offsetInKg.toFixed(1)} kg</strong>
          </div>

          {/* Trade Form */}
          <form onSubmit={handleTradeSubmit} className="basic-trade-form">
            <div className="basic-form-group">
              <label htmlFor="select-project">Select Project</label>
              <select id="select-project" value={selectedProjectId} onChange={e => setSelectedProjectId(e.target.value)}>
                {MARKET_PROJECTS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>

            <div className="basic-form-group">
              <label htmlFor="select-mode">Action</label>
              <select id="select-mode" value={tradeMode} onChange={e => setTradeMode(e.target.value)}>
                <option value="BUY">Buy Carbon Credits</option>
                <option value="OFFSET">Retire Credits &amp; Offset Footprint</option>
              </select>
            </div>

            <div className="basic-form-group">
              <label htmlFor="credit-qty">Quantity (Credits / Tons of CO₂)</label>
              <input
                id="credit-qty"
                type="number"
                step="0.01"
                min="0.01"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
              />
              <span className="input-hint">1 Credit = 1 Ton CO₂ = 1,000 kg emissions reduction</span>
            </div>

            <div className="basic-cost-summary">
              {tradeMode === "BUY" ? (
                <span>Total Price: <strong>${totalCost.toFixed(2)} USD</strong></span>
              ) : (
                <span>Footprint Offset: <strong>{(parseFloat(quantity || 0) * 1000).toFixed(0)} kg CO₂e</strong></span>
              )}
            </div>

            <button type="submit" className="basic-submit-btn">
              {tradeMode === "BUY" ? "Purchase Credits" : "Neutralize Digital Footprint"}
            </button>
          </form>
        </div>

        {/* ── Transaction History ── */}
        <div className="basic-history-section">
          <h3>Recent Transactions</h3>
          <div className="basic-history-list">
            {transactions.length === 0 && (
              <p className="no-data">No transactions logged yet.</p>
            )}
            {transactions.map(tx => (
              <div key={tx.id} className="basic-history-item">
                <span className="date">{new Date(tx.date).toLocaleDateString()}</span>
                <span className="desc" style={{ flex: 1, marginLeft: 12, marginRight: 12 }}>
                  {tx.type === "BUY" ? "Bought" : "Retired"} {tx.credits.toFixed(2)} t from {tx.projectName}
                </span>
                <span className={`cost${tx.type === "OFFSET" ? " cost-offset" : ""}`}>
                  {tx.totalValue > 0 ? `$${tx.totalValue.toFixed(2)}` : "Offset"}
                </span>
              </div>
            ))}
          </div>
        </div>

      </main>
    </div>
  );
}

export default Trading;
