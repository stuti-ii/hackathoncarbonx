import api from "./api";

// ─── Platform → Category mapping (mirrors backend logic) ────────────────────
const PLATFORM_CATEGORIES = {
  youtube: "Streaming",
  netflix: "Streaming",
  spotify: "Streaming",
  twitch: "Streaming",
  instagram: "Social Media",
  facebook: "Social Media",
  tiktok: "Social Media",
  twitter: "Social Media",
  x: "Social Media",
  claude: "AI Usage",
  chatgpt: "AI Usage",
  gmail: "AI Usage",
  docs: "AI Usage",
  sheets: "AI Usage",
};

function getCategory(platform) {
  return PLATFORM_CATEGORIES[platform?.toLowerCase()?.trim()] || "Browsing";
}

// ─── Local activity helpers (used only when backend is offline) ──────────────
function getLocalActivities() {
  try {
    return JSON.parse(localStorage.getItem("carbonx_mock_activities") || "[]");
  } catch {
    return [];
  }
}

function calculateLocalSummary() {
  const activities = getLocalActivities();
  const totalCarbon = activities.reduce((sum, a) => sum + (a.carbon || 0), 0);
  const aiUsage = activities
    .filter((a) => getCategory(a.platform) === "AI Usage")
    .reduce((sum, a) => sum + a.duration, 0);
  const ecoScore = Math.max(30, Math.min(100, 100 - Math.round(totalCarbon * 1.5)));
  return {
    totalCarbon: parseFloat(totalCarbon.toFixed(1)),
    ecoScore,
    energyConsumed: parseFloat((totalCarbon * 2.5).toFixed(1)),
    aiUsage,
  };
}

// ─── Normalise the breakdown response ───────────────────────────────────────
// Backend returns either:
//   [{platform: "youtube", carbon: 5.2}, ...]
//   [{category: "Streaming", carbon: 5.2}, ...]
//   {"AI Usage": 5.2, "Streaming": 3.1}      (object form)
function normaliseBreakdown(data) {
  if (!data) return [];

  // Object form → array
  if (!Array.isArray(data)) {
    return Object.entries(data).map(([category, carbon]) => ({
      category,
      carbon: Number(carbon),
    }));
  }

  // Array form – map platform → category if needed
  return data.map((item) => ({
    category: item.category || getCategory(item.platform) || item.platform,
    carbon: Number(item.carbon ?? item.value ?? 0),
  }));
}

// ─── Service ─────────────────────────────────────────────────────────────────
const dashboardService = {
  /**
   * GET /api/dashboard/summary/
   * Returns: { totalCarbon, ecoScore, energyConsumed, aiUsage }
   */
  getSummary: async () => {
    try {
      const { data } = await api.get("/api/dashboard/summary/");
      return data;
    } catch (error) {
      console.warn("[dashboardService] getSummary offline, using local calc:", error.message);
      return calculateLocalSummary();
    }
  },

  /**
   * GET /api/dashboard/breakdown/
   * Backend may return platform-keyed or category-keyed array/object.
   * Normalised to: [{ category, carbon }]
   */
  getBreakdown: async () => {
    try {
      const { data } = await api.get("/api/dashboard/breakdown/");
      return normaliseBreakdown(data);
    } catch (error) {
      console.warn("[dashboardService] getBreakdown offline, using local calc:", error.message);
      const acts = getLocalActivities();
      const map = {};
      acts.forEach((a) => {
        const cat = getCategory(a.platform);
        map[cat] = (map[cat] || 0) + (a.carbon || 0);
      });
      return Object.entries(map)
        .filter(([, c]) => c > 0)
        .map(([category, carbon]) => ({ category, carbon: parseFloat(carbon.toFixed(1)) }));
    }
  },

  /**
   * GET /api/dashboard/trends/
   * Returns: [{ day: "2026-06-12", carbon: 1.5 }, ...]
   */
  getTrends: async () => {
    try {
      const { data } = await api.get("/api/dashboard/trends/");
      return data;
    } catch (error) {
      console.warn("[dashboardService] getTrends offline, using local calc:", error.message);
      const acts = getLocalActivities();
      const trends = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split("T")[0];
        const carbon = acts
          .filter((a) => (a.created_at || a.timestamp) === dateStr)
          .reduce((sum, a) => sum + (a.carbon || 0), 0);
        trends.push({ day: dateStr, carbon: parseFloat(carbon.toFixed(2)) });
      }
      return trends;
    }
  },

  /**
   * GET /api/ecoscore/
   * Returns: { score, rating, aiEfficiency, streamingEfficiency }
   */
  getEcoScore: async () => {
    try {
      const { data } = await api.get("/api/ecoscore/");
      return data;
    } catch (error) {
      console.warn("[dashboardService] getEcoScore offline, using local calc:", error.message);
      const summary = calculateLocalSummary();
      const acts = getLocalActivities();
      const streamMins = acts.filter((a) => getCategory(a.platform) === "Streaming")
                             .reduce((s, a) => s + a.duration, 0);
      const aiMins    = acts.filter((a) => getCategory(a.platform) === "AI Usage")
                            .reduce((s, a) => s + a.duration, 0);
      let rating = "Fair";
      if (summary.ecoScore >= 90) rating = "Excellent";
      else if (summary.ecoScore >= 75) rating = "Good";
      else if (summary.ecoScore < 50) rating = "Poor";
      return {
        score: summary.ecoScore,
        rating,
        aiEfficiency:        Math.max(40, Math.min(98, 95 - Math.round(aiMins / 10))),
        streamingEfficiency: Math.max(40, Math.min(98, 95 - Math.round(streamMins / 20))),
      };
    }
  },

  /**
   * GET /api/recommendations/
   * Returns: [{ title, description }, ...]
   */
  getRecommendations: async () => {
    try {
      const { data } = await api.get("/api/recommendations/");
      return data;
    } catch (error) {
      console.warn("[dashboardService] getRecommendations offline:", error.message);
      const acts = getLocalActivities();
      const streamCarbon = acts.filter((a) => getCategory(a.platform) === "Streaming")
                               .reduce((s, a) => s + (a.carbon || 0), 0);
      const aiCarbon     = acts.filter((a) => getCategory(a.platform) === "AI Usage")
                               .reduce((s, a) => s + (a.carbon || 0), 0);
      const socialCarbon = acts.filter((a) => getCategory(a.platform) === "Social Media")
                               .reduce((s, a) => s + (a.carbon || 0), 0);
      const recs = [];
      if (aiCarbon > 1.0)     recs.push({ title: "Reduce AI Usage",          description: "Consolidate AI prompts and limit non-essential queries to reduce LLM compute load." });
      if (streamCarbon > 3.0) recs.push({ title: "Lower Streaming Quality",  description: "Switch to 720p instead of 4K — cuts video data energy by up to 70%." });
      if (socialCarbon > 1.0) recs.push({ title: "Limit Social Scrolling",   description: "Reduce Instagram/TikTok by 15 mins/day to cut server-side encoding carbon." });
      recs.push({ title: "Activate Tab Sleeper", description: "Auto-discard idle browser tabs after 10 minutes to prevent background CPU carbon." });
      return recs;
    }
  },
};

export default dashboardService;
