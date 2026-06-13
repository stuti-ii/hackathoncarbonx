import api from "./api";

// ─── Helper: relative date ───────────────────────────────────────────────────
function getRelativeDate(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split("T")[0];
}

// ─── Default offline seed data ───────────────────────────────────────────────
const DEFAULT_ACTIVITIES = [
  { platform: "netflix",   duration: 180, carbon: 9.0,  energy: 22.5, created_at: getRelativeDate(5) },
  { platform: "instagram", duration: 60,  carbon: 0.6,  energy: 1.5,  created_at: getRelativeDate(4) },
  { platform: "claude",    duration: 40,  carbon: 1.2,  energy: 3.0,  created_at: getRelativeDate(3) },
  { platform: "youtube",   duration: 90,  carbon: 1.8,  energy: 4.5,  created_at: getRelativeDate(2) },
  { platform: "gmail",     duration: 30,  carbon: 0.45, energy: 1.13, created_at: getRelativeDate(1) },
  { platform: "instagram", duration: 45,  carbon: 0.45, energy: 1.13, created_at: getRelativeDate(0) },
];

function getMockActivities() {
  const data = localStorage.getItem("carbonx_mock_activities");
  if (!data) {
    localStorage.setItem("carbonx_mock_activities", JSON.stringify(DEFAULT_ACTIVITIES));
    return DEFAULT_ACTIVITIES;
  }
  return JSON.parse(data);
}

function saveMockActivities(activities) {
  localStorage.setItem("carbonx_mock_activities", JSON.stringify(activities));
}

// ─── Carbon formula (mirrors backend) ────────────────────────────────────────
export function calculateCarbon(platform, duration) {
  const p = (platform || "").toLowerCase().trim();
  if (p === "youtube")                return parseFloat((0.02 * duration).toFixed(2));
  if (p === "instagram")              return parseFloat((0.01 * duration).toFixed(2));
  if (p === "netflix")                return parseFloat((0.05 * duration).toFixed(2));
  if (p === "chatgpt" || p === "claude") return parseFloat((0.03 * duration).toFixed(2));
  return parseFloat((0.015 * duration).toFixed(2));
}

// ─── Service ──────────────────────────────────────────────────────────────────
const activityService = {

  /**
   * GET /api/activities/
   * Returns list of activity objects: [{ platform, duration, carbon, energy, created_at }]
   */
  getActivities: async () => {
    try {
      const { data } = await api.get("/api/activities/");
      return data;
    } catch (error) {
      console.warn("[activityService] getActivities offline, using local seed data:", error.message);
      return getMockActivities();
    }
  },

  /**
   * POST /api/activities/
   * Body: { platform, duration, carbon, energy }
   */
  logActivity: async (platform, duration) => {
    const carbon = calculateCarbon(platform, Number(duration));
    const energy = parseFloat((carbon * 2.5).toFixed(2));

    try {
      const { data } = await api.post("/api/activities/", {
        platform,
        duration: Number(duration),
        carbon,
        energy,
      });
      // Refresh dashboard data after successful post
      window.dispatchEvent(new Event("mock-activities-updated"));
      return data;
    } catch (error) {
      console.warn("[activityService] logActivity offline, saving locally:", error.message);

      const newActivity = {
        platform: platform.trim(),
        duration: Number(duration),
        carbon,
        energy,
        created_at: new Date().toISOString().split("T")[0],
      };

      const activities = getMockActivities();
      activities.unshift(newActivity);
      saveMockActivities(activities);

      window.dispatchEvent(new Event("mock-activities-updated"));
      return newActivity;
    }
  },
};

export default activityService;
