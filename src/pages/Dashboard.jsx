import { useEffect, useState, useCallback } from "react";
import { useAuthStore } from "../store/authStore";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { 
  FiActivity, FiClock, FiZap, FiPlusCircle, FiLogOut, 
  FiSearch, FiTrendingUp, FiPieChart, FiAward, FiBookOpen 
} from "react-icons/fi";
import { FaLeaf } from "react-icons/fa";
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip,
  PieChart, Pie, Cell, Legend
} from "recharts";
import activityService, { calculateCarbon } from "../services/activityService";
import dashboardService from "../services/dashboardService";

// Category mapping helper
const getCategory = (platform) => {
  const p = platform.toLowerCase().trim();
  if (["youtube", "netflix", "spotify", "twitch"].includes(p)) return "Streaming";
  if (["instagram", "facebook", "tiktok", "twitter", "x"].includes(p)) return "Social Media";
  if (["chatgpt", "claude", "gmail", "docs", "sheets"].includes(p)) return "AI Usage";
  return "Browsing";
};

// Colors for charts
const CATEGORY_COLORS = {
  "Streaming": "#3b82f6",       // Blue
  "Social Media": "#ec4899",     // Pink
  "AI Usage": "#10b981",         // Emerald Green
  "Browsing": "#94a3b8"          // Slate
};

// Format YYYY-MM-DD date string to short weekday abbreviation
const formatTrendDay = (dayStr) => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dayStr)) {
    const date = new Date(dayStr);
    if (!isNaN(date)) {
      return date.toLocaleDateString(undefined, { weekday: "short", timeZone: "UTC" });
    }
  }
  return dayStr;
};

function Dashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [activeTab, setActiveTab] = useState("insights"); // "insights" or "feed"
  
  // Data states
  const [summary, setSummary] = useState({ totalCarbon: 0, ecoScore: 0, energyConsumed: 0, aiUsage: 0 });
  const [breakdown, setBreakdown] = useState([]);
  const [trends, setTrends] = useState([]);
  const [ecoScoreDetail, setEcoScoreDetail] = useState({ score: 0, rating: "Fair", aiEfficiency: 0, streamingEfficiency: 0 });
  const [recommendations, setRecommendations] = useState([]);
  const [activities, setActivities] = useState([]);
  
  // UI states
  const [loading, setLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [loggingActivity, setLoggingActivity] = useState(false);
  
  // Logger form states
  const [logPlatform, setLogPlatform] = useState("youtube");
  const [logDuration, setLogDuration] = useState("");
  const [customPlatform, setCustomPlatform] = useState("");

  // Feed Filter/Sort states
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

  // Fetch all dashboard data
  const fetchDashboardData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      // Run all requests concurrently — each service falls back individually if offline
      const [sumRes, breakRes, trendRes, ecoRes, recRes, actRes] = await Promise.all([
        dashboardService.getSummary(),
        dashboardService.getBreakdown(),
        dashboardService.getTrends(),
        dashboardService.getEcoScore(),
        dashboardService.getRecommendations(),
        activityService.getActivities()
      ]);

      setSummary(sumRes);
      setBreakdown(breakRes);
      setTrends(trendRes);
      setEcoScoreDetail(ecoRes);
      setRecommendations(recRes);
      setActivities(actRes);

      // Demo mode = backend didn't respond (summary would return local defaults with no ecoScore from server)
      // We detect this by checking if the token exists but response came from fallback
      const token = localStorage.getItem("carbonx_token");
      const isMockToken = token && token.startsWith("mock_jwt_access_token_");
      setIsDemoMode(isMockToken);
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
      toast.error("Error retrieving dashboard data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();

    // Listen to updates from other components
    const handleMockUpdate = () => fetchDashboardData(true);
    window.addEventListener("mock-activities-updated", handleMockUpdate);

    return () => {
      window.removeEventListener("mock-activities-updated", handleMockUpdate);
    };
  }, [fetchDashboardData]);

  // Logout handler
  const handleLogout = () => {
    logout();
    toast.success("Successfully logged out.");
    navigate("/login");
  };

  // Quick log activity form submission handler
  const handleLogActivity = async (e) => {
    e.preventDefault();
    const platformName = logPlatform === "custom" ? customPlatform : logPlatform;
    const durationMins = Number(logDuration);

    if (!platformName.trim()) {
      toast.error("Please specify a platform.");
      return;
    }
    if (isNaN(durationMins) || durationMins <= 0) {
      toast.error("Please enter a valid duration greater than 0.");
      return;
    }

    setLoggingActivity(true);
    try {
      await activityService.logActivity(platformName.toLowerCase().trim(), durationMins);
      toast.success(`Logged ${durationMins}m on ${platformName}!`);
      
      // Clear inputs
      setLogDuration("");
      setCustomPlatform("");
      
      // Reload dashboard metrics
      await fetchDashboardData(true);
    } catch (err) {
      toast.error("Failed to log activity.");
    } finally {
      setLoggingActivity(false);
    }
  };

  // Recharts custom tooltip renderer
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-chart-tooltip">
          <p className="custom-tooltip-label">{label}</p>
          <p className="custom-tooltip-value">
            {payload[0].value.toFixed(2)} kg CO₂e
          </p>
        </div>
      );
    }
    return null;
  };

  // Circular gauge config
  const gaugeRadius = 50;
  const gaugeCircumference = 2 * Math.PI * gaugeRadius;
  const gaugeOffset = gaugeCircumference - (ecoScoreDetail.score / 100) * gaugeCircumference;

  // Filter & Sort activities logic
  const filteredActivities = activities
    .filter((act) => {
      const matchSearch = act.platform.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCat = categoryFilter === "all" || getCategory(act.platform).toLowerCase() === categoryFilter.toLowerCase();
      return matchSearch && matchCat;
    })
    .sort((a, b) => {
      if (sortBy === "newest") return new Date(b.timestamp) - new Date(a.timestamp);
      if (sortBy === "oldest") return new Date(a.timestamp) - new Date(b.timestamp);
      if (sortBy === "carbon") return b.carbon - a.carbon;
      if (sortBy === "duration") return b.duration - a.duration;
      return 0;
    });

  return (
    <div className="dashboard-page">
      {/* Top Navbar */}
      <nav className="dashboard-nav">
        <div className="nav-brand">
          <FaLeaf aria-hidden="true" />
          <span>CarbonX</span>
        </div>
        
        <div className="nav-controls">
          <div className="nav-tabs" role="tablist">
            <button 
              className={`nav-tab-btn ${activeTab === "insights" ? "active" : ""}`}
              onClick={() => setActiveTab("insights")}
              role="tab"
              aria-selected={activeTab === "insights"}
            >
              Dashboard
            </button>
            <button 
              className={`nav-tab-btn ${activeTab === "feed" ? "active" : ""}`}
              onClick={() => setActiveTab("feed")}
              role="tab"
              aria-selected={activeTab === "feed"}
            >
              Activity Feed
            </button>
          </div>

          <div className="user-profile">
            {isDemoMode && (
              <span className="demo-badge">Demo Mode (Offline)</span>
            )}
            <button className="logout-btn" onClick={handleLogout}>
              <FiLogOut aria-hidden="true" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Dashboard Layout */}
      {loading ? (
        <div className="dashboard-fallback">
          <h1>Syncing Eco-Footprint...</h1>
          <p>We are aggregating your digital activity compute...</p>
        </div>
      ) : (
        <main className="dashboard-content">
          {/* Welcome Area */}
          <div className="dashboard-welcome">
            <div className="welcome-text">
              <h2>Welcome, <span>{user?.name || "Eco Friend"}</span></h2>
              <p>Analyze your web and app carbon footprint below.</p>
            </div>
            <p className="welcome-text" style={{ fontSize: "13px", color: "var(--color-text-dim)" }}>
              Data synced: <strong>Today</strong>
            </p>
          </div>

          {/* Core Metrics Summary Row */}
          <section className="metrics-grid" aria-label="Core Metrics Summary">
            {/* Total Carbon */}
            <div className="metric-card">
              <div className="metric-card-header">
                <span className="metric-card-title">Total Carbon</span>
                <span className="metric-icon-wrapper" aria-hidden="true">
                  <FiActivity />
                </span>
              </div>
              <div className="metric-value">
                {summary.totalCarbon}
                <span>kg CO₂e</span>
              </div>
              <span className="metric-footer">Based on active compute usage</span>
            </div>

            {/* Eco Score */}
            <div className="metric-card eco-score-card">
              <div className="metric-card-header">
                <span className="metric-card-title">Eco Score</span>
                <span className="metric-icon-wrapper" aria-hidden="true">
                  <FiAward />
                </span>
              </div>
              <div className="metric-value">
                {summary.ecoScore}
                <span>/ 100</span>
              </div>
              <span className="metric-footer">Higher is cleaner</span>
            </div>

            {/* Energy Consumed */}
            <div className="metric-card energy-card">
              <div className="metric-card-header">
                <span className="metric-card-title">Energy Consumed</span>
                <span className="metric-icon-wrapper" aria-hidden="true">
                  <FiZap />
                </span>
              </div>
              <div className="metric-value">
                {summary.energyConsumed}
                <span>kWh</span>
              </div>
              <span className="metric-footer">Est. data-center server power</span>
            </div>

            {/* Screen Time Usage */}
            <div className="metric-card usage-card">
              <div className="metric-card-header">
                <span className="metric-card-title">Digital Usage</span>
                <span className="metric-icon-wrapper" aria-hidden="true">
                  <FiClock />
                </span>
              </div>
              <div className="metric-value">
                {activities.reduce((sum, a) => sum + a.duration, 0)}
                <span>mins</span>
              </div>
              <span className="metric-footer">Tracked across browsers & apps</span>
            </div>
          </section>

          {activeTab === "insights" ? (
            <>
              {/* Analytics Charts Grid */}
              <section className="charts-grid" aria-label="Visual Insights">
                {/* Weekly Trends Area Chart */}
                <div className="chart-card">
                  <div className="chart-header">
                    <div>
                      <h3 className="chart-title">Carbon Emission Trend</h3>
                      <p className="chart-subtitle">Daily digital emissions (kg CO₂e)</p>
                    </div>
                    <span style={{ color: "var(--color-primary)", display: "flex", gap: "6px", alignItems: "center", fontSize: "13px", fontWeight: 600 }}>
                      <FiTrendingUp /> Weekly View
                    </span>
                  </div>
                  <div className="chart-container-wrapper">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="carbonGlow" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.25} />
                            <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <XAxis 
                          dataKey="day" 
                          stroke="var(--color-text-dim)" 
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={formatTrendDay}
                        />
                        <YAxis 
                          stroke="var(--color-text-dim)" 
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Area 
                          type="monotone" 
                          dataKey="carbon" 
                          stroke="var(--color-primary)" 
                          strokeWidth={3} 
                          fillOpacity={1} 
                          fill="url(#carbonGlow)" 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Carbon Breakdown Pie/Donut Chart */}
                <div className="chart-card">
                  <div className="chart-header">
                    <div>
                      <h3 className="chart-title">Emissions Breakdown</h3>
                      <p className="chart-subtitle">Carbon footprint by category</p>
                    </div>
                  </div>
                  <div className="chart-container-wrapper">
                    {breakdown.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={breakdown}
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={75}
                            paddingAngle={3}
                            dataKey="carbon"
                            nameKey="category"
                          >
                            {breakdown.map((entry, index) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={CATEGORY_COLORS[entry.category] || CATEGORY_COLORS["Browsing"]} 
                              />
                            ))}
                          </Pie>
                          <Tooltip 
                            formatter={(value) => [`${value.toFixed(1)} kg CO₂e`, "Emissions"]}
                            contentStyle={{ 
                              background: "rgba(255, 255, 255, 0.95)",
                              border: "1px solid rgba(16, 185, 129, 0.15)",
                              borderRadius: "10px",
                              fontSize: "12px",
                              boxShadow: "0 8px 24px rgba(0, 0, 0, 0.06)"
                            }}
                          />
                          <Legend 
                            verticalAlign="bottom" 
                            height={36} 
                            iconType="circle"
                            iconSize={8}
                            wrapperStyle={{ fontSize: "11px" }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="empty-state" style={{ height: "100%", padding: "20px 0" }}>
                        <FiPieChart aria-hidden="true" />
                        <p>No category breakdown data.</p>
                      </div>
                    )}
                  </div>
                </div>
              </section>

              {/* Lower Section split: Health Rating, Recommendations, Logger */}
              <section className="insights-grid">
                {/* Eco Score Circular Gauge + Efficiency */}
                <div className="chart-card">
                  <div className="chart-header">
                    <div>
                      <h3 className="chart-title">Eco Health</h3>
                      <p className="chart-subtitle">Efficiency metrics rating</p>
                    </div>
                  </div>
                  <div className="eco-details-container">
                    <div className="circular-gauge-wrapper">
                      <svg className="circular-gauge-bg">
                        <circle
                          cx="65"
                          cy="65"
                          r={gaugeRadius}
                          stroke="#e2ebe5"
                          strokeWidth="10"
                          fill="transparent"
                        />
                        <circle
                          cx="65"
                          cy="65"
                          r={gaugeRadius}
                          stroke={
                            ecoScoreDetail.rating === "Excellent" ? "#10b981" :
                            ecoScoreDetail.rating === "Good" ? "#16a34a" :
                            ecoScoreDetail.rating === "Fair" ? "#f59e0b" : "#ef4444"
                          }
                          strokeWidth="10"
                          fill="transparent"
                          strokeDasharray={gaugeCircumference}
                          strokeDashoffset={gaugeOffset}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="gauge-center-text">
                        <span className="gauge-score">{ecoScoreDetail.score}</span>
                        <span className={`gauge-rating ${ecoScoreDetail.rating.toLowerCase()}`}>
                          {ecoScoreDetail.rating}
                        </span>
                      </div>
                    </div>

                    <div className="efficiency-bars-list">
                      <div className="efficiency-item">
                        <div className="efficiency-item-header">
                          <span>AI Compute Efficiency</span>
                          <span>{ecoScoreDetail.aiEfficiency}%</span>
                        </div>
                        <div className="efficiency-progress-bg">
                          <div 
                            className="efficiency-progress-bar ai" 
                            style={{ width: `${ecoScoreDetail.aiEfficiency}%` }}
                          />
                        </div>
                      </div>

                      <div className="efficiency-item">
                        <div className="efficiency-item-header">
                          <span>Streaming Efficiency</span>
                          <span>{ecoScoreDetail.streamingEfficiency}%</span>
                        </div>
                        <div className="efficiency-progress-bg">
                          <div 
                            className="efficiency-progress-bar streaming" 
                            style={{ width: `${ecoScoreDetail.streamingEfficiency}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actionable Recommendations */}
                <div className="chart-card">
                  <div className="chart-header">
                    <div>
                      <h3 className="chart-title">Smart Reductions</h3>
                      <p className="chart-subtitle">Tailored guides to decrease server load</p>
                    </div>
                    <span style={{ color: "var(--color-primary)", display: "flex", gap: "6px", alignItems: "center", fontSize: "13px", fontWeight: 600 }}>
                      <FiBookOpen /> Insights
                    </span>
                  </div>
                  <div className="recommendations-list">
                    {recommendations.length > 0 ? (
                      recommendations.map((rec, index) => (
                        <div className="recommendation-card" key={index}>
                          <span className="recommendation-icon" aria-hidden="true">🌱</span>
                          <div className="recommendation-info">
                            <h4>{rec.title}</h4>
                            <p>{rec.description}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="empty-state">
                        <p>No recommendations computed. Great job keeping your emissions low!</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Simulated Quick Activity Logger */}
                <div className="chart-card">
                  <div className="chart-header">
                    <div>
                      <h3 className="chart-title">Quick activity simulator</h3>
                      <p className="chart-subtitle">Simulate digital actions logged by the Chrome extension</p>
                    </div>
                    <span style={{ color: "var(--color-primary)", display: "flex", gap: "6px", alignItems: "center", fontSize: "13px", fontWeight: 600 }}>
                      <FiPlusCircle /> Extension Sim
                    </span>
                  </div>

                  <form onSubmit={handleLogActivity} className="logger-form">
                    <div className="form-row">
                      <label className="auth-field">
                        <span>Platform / App</span>
                        <div className="auth-input">
                          <select 
                            className="logger-select"
                            value={logPlatform} 
                            onChange={(e) => setLogPlatform(e.target.value)}
                            style={{ border: "none", background: "transparent", width: "100%", padding: "12px", outline: "none", fontSize: "14px", color: "var(--color-text-main)" }}
                          >
                            <option value="youtube">YouTube</option>
                            <option value="netflix">Netflix</option>
                            <option value="instagram">Instagram</option>
                            <option value="claude">Claude AI</option>
                            <option value="chatgpt">ChatGPT</option>
                            <option value="twitch">Twitch</option>
                            <option value="tiktok">TikTok</option>
                            <option value="gmail">Gmail</option>
                            <option value="custom">Custom App...</option>
                          </select>
                        </div>
                      </label>
                      
                      <label className="auth-field">
                        <span>Duration (Minutes)</span>
                        <div className="auth-input">
                          <input 
                            type="number" 
                            min="1"
                            placeholder="e.g. 45"
                            value={logDuration}
                            onChange={(e) => setLogDuration(e.target.value)}
                            style={{ padding: "12px 14px" }}
                          />
                        </div>
                      </label>
                    </div>

                    {logPlatform === "custom" && (
                      <label className="auth-field" style={{ animation: "card-appear 0.3s ease-out" }}>
                        <span>Custom App Name</span>
                        <div className="auth-input">
                          <input 
                            type="text" 
                            placeholder="Enter application name (e.g. Slack)"
                            value={customPlatform}
                            onChange={(e) => setCustomPlatform(e.target.value)}
                            style={{ padding: "12px 14px" }}
                          />
                        </div>
                      </label>
                    )}

                    <button className="auth-button" disabled={loggingActivity} type="submit" style={{ marginTop: "8px" }}>
                      <span>{loggingActivity ? "Syncing..." : "Simulate Action Event"}</span>
                    </button>
                  </form>
                </div>
              </section>
            </>
          ) : (
            /* Tab: Activity Feed */
            <section className="chart-card" aria-label="Activity Feed Panel">
              <div className="chart-header">
                <div>
                  <h3 className="chart-title">Emissions Log History</h3>
                  <p className="chart-subtitle">Detailed audit of all user session activity</p>
                </div>
              </div>

              {/* Feed Filters */}
              <div className="feed-filters-row">
                <div className="feed-search-wrapper">
                  <FiSearch aria-hidden="true" />
                  <input 
                    type="text" 
                    placeholder="Search platform..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <div className="feed-filters">
                  <select 
                    className="feed-select"
                    value={categoryFilter} 
                    onChange={(e) => setCategoryFilter(e.target.value)}
                  >
                    <option value="all">All Categories</option>
                    <option value="streaming">Streaming</option>
                    <option value="social media">Social Media</option>
                    <option value="ai usage">AI Usage</option>
                    <option value="browsing">Browsing</option>
                  </select>

                  <select 
                    className="feed-select"
                    value={sortBy} 
                    onChange={(e) => setSortBy(e.target.value)}
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="carbon">Emissions (High to Low)</option>
                    <option value="duration">Duration (Longest to Shortest)</option>
                  </select>
                </div>
              </div>

              {/* Activity Table */}
              <div className="activity-table-wrapper">
                {filteredActivities.length > 0 ? (
                  <table className="activity-table">
                    <thead>
                      <tr>
                        <th>Platform</th>
                        <th>Category</th>
                        <th>Duration</th>
                        <th>Carbon Emitted</th>
                        <th>Log Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredActivities.map((act, idx) => {
                        const cat = getCategory(act.platform);
                        return (
                          <tr key={idx}>
                            <td>
                              <span className="platform-badge">
                                <span className={`platform-dot ${cat.toLowerCase().replace(/[^a-z0-9]/g, "-")}`} aria-hidden="true" />
                                {act.platform}
                              </span>
                            </td>
                            <td style={{ color: "var(--color-text-muted)" }}>{cat}</td>
                            <td>{act.duration} mins</td>
                            <td>
                              <span className={`carbon-badge ${act.carbon > 4 ? "high" : act.carbon > 1 ? "medium" : "low"}`}>
                                {act.carbon.toFixed(2)} kg
                              </span>
                            </td>
                            <td style={{ color: "var(--color-text-dim)" }}>{act.timestamp}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <div className="empty-state">
                    <FiActivity aria-hidden="true" />
                    <p>No activity logs match your filter criteria.</p>
                  </div>
                )}
              </div>
            </section>
          )}
        </main>
      )}
    </div>
  );
}

export default Dashboard;
