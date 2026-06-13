import api from "./api";

// ─── Badge definitions (Pital → Chadi → Sun → Hira, ascending) ───────────────
export const BADGE_TIERS = [
  {
    id: "pital",
    name: "Pital",          // Bronze
    emoji: "🥉",
    color: "#CD7F32",
    glow: "rgba(205,127,50,0.35)",
    description: "Your first step toward a greener digital life.",
    xpRequired: 0,
  },
  {
    id: "chadi",
    name: "Chadi",          // Silver
    emoji: "🥈",
    color: "#C0C0C0",
    glow: "rgba(192,192,192,0.35)",
    description: "A consistent eco-warrior making real impact.",
    xpRequired: 100,
  },
  {
    id: "sun",
    name: "Sun",            // Gold
    emoji: "🥇",
    color: "#FFD700",
    glow: "rgba(255,215,0,0.35)",
    description: "Shining bright — top-tier carbon consciousness.",
    xpRequired: 300,
  },
  {
    id: "hira",
    name: "Hira",           // Diamond
    emoji: "💎",
    color: "#b9f2ff",
    glow: "rgba(185,242,255,0.45)",
    description: "Diamond status — the pinnacle of eco excellence.",
    xpRequired: 600,
  },
];

// ─── Gamification Service ─────────────────────────────────────────────────────
const gamificationService = {

  /**
   * GET /api/gamification/profile/
   * Returns: { level, points, streak, next_level_xp, badges_earned }
   */
  getProfile: async () => {
    try {
      const { data } = await api.get("/api/gamification/profile/");
      return data;
    } catch (error) {
      if (error.response?.status === 401) throw error; // let interceptor handle it
      console.warn("[gamification] profile offline, using mock:", error.message);
      return {
        level: 3,
        points: 250,
        streak: 4,
        next_level_xp: 300,
        badges_earned: ["pital", "chadi"],
      };
    }
  },

  /**
   * GET /api/gamification/badges/
   * Returns: [{ id, name, unlocked, earned_at }]
   */
  getBadges: async () => {
    try {
      const { data } = await api.get("/api/gamification/badges/");
      return data;
    } catch (error) {
      if (error.response?.status === 401) throw error;
      console.warn("[gamification] badges offline, using mock:", error.message);
      return [
        { id: "pital", name: "Pital", unlocked: true,  earned_at: "2026-06-08" },
        { id: "chadi", name: "Chadi", unlocked: true,  earned_at: "2026-06-10" },
        { id: "sun",   name: "Sun",   unlocked: false, earned_at: null },
        { id: "hira",  name: "Hira",  unlocked: false, earned_at: null },
      ];
    }
  },

  /**
   * GET /api/gamification/challenges/
   * Returns: [{ id, title, description, reward_xp, completed, deadline }]
   */
  getChallenges: async () => {
    try {
      const { data } = await api.get("/api/gamification/challenges/");
      return data;
    } catch (error) {
      if (error.response?.status === 401) throw error;
      console.warn("[gamification] challenges offline, using mock:", error.message);
      return [
        {
          id: 1,
          title: "Reduce AI Usage",
          description: "Use AI tools for less than 30 minutes today.",
          reward_xp: 100,
          completed: false,
          deadline: "Weekly",
        },
        {
          id: 2,
          title: "Stream Smarter",
          description: "Watch streaming content at 1080p instead of 4K for a week.",
          reward_xp: 75,
          completed: false,
          deadline: "Weekly",
        },
        {
          id: 3,
          title: "Social Media Detox",
          description: "Keep social media under 20 minutes for 3 days straight.",
          reward_xp: 50,
          completed: true,
          deadline: "Weekly",
        },
      ];
    }
  },
};

export default gamificationService;
