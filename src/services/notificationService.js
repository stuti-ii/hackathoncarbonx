/**
 * notificationService.js
 * Connects to Django notification endpoints.
 * JWT is auto-attached by the shared api.js interceptor.
 *
 * Endpoints:
 *   GET  /api/notifications/          → list all notifications
 *   GET  /api/notifications/count/    → { unread_count: number }
 *   POST /api/notifications/read/<id>/ → mark one as read
 */
import api from "./api";

// ── Seed data used when the backend is unreachable ──
const SEED_NOTIFICATIONS = [
  {
    id: 1,
    type: "carbon_alert",
    title: "Carbon Alert",
    message: "Your recent activity generated more than 2 kg CO₂ emissions.",
    is_read: false,
    created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(),   // 5 min ago
  },
  {
    id: 2,
    type: "achievement",
    title: "Achievement Unlocked",
    message: "You completed 50 tracked activities. Keep it up! 🏆",
    is_read: false,
    created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),  // 30 min ago
  },
  {
    id: 3,
    type: "offset",
    title: "Offset Recommendation",
    message: "Consider purchasing carbon credits to neutralize this week's footprint.",
    is_read: false,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 h ago
  },
  {
    id: 4,
    type: "weekly_report",
    title: "Weekly Report Ready",
    message: "Your weekly carbon summary is available. You emitted 4.2 kg CO₂ this week.",
    is_read: true,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
  },
];

const STORAGE_KEY = "carbonx_notifications";

function loadLocal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveLocal(notifications) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
}

// ── Public API ──

/**
 * Fetch all notifications newest-first.
 * Falls back to localStorage seed data if backend is unreachable.
 */
export async function getNotifications() {
  try {
    const res = await api.get("/api/notifications/");
    const list = Array.isArray(res.data) ? res.data : res.data?.results ?? [];
    // Sort newest first
    list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    saveLocal(list);
    return list;
  } catch {
    const cached = loadLocal();
    if (cached) return cached;
    saveLocal(SEED_NOTIFICATIONS);
    return SEED_NOTIFICATIONS;
  }
}

/**
 * Fetch unread notification count.
 * Falls back to counting locally.
 */
export async function getUnreadCount() {
  try {
    const res = await api.get("/api/notifications/count/");
    return typeof res.data?.unread_count === "number"
      ? res.data.unread_count
      : res.data?.count ?? 0;
  } catch {
    const cached = loadLocal() ?? SEED_NOTIFICATIONS;
    return cached.filter((n) => !n.is_read).length;
  }
}

/**
 * Mark a notification as read by ID.
 * Also updates the local cache optimistically.
 */
export async function markAsRead(id) {
  // Optimistic local update first
  const cached = loadLocal() ?? SEED_NOTIFICATIONS;
  const updated = cached.map((n) => (n.id === id ? { ...n, is_read: true } : n));
  saveLocal(updated);

  try {
    await api.post(`/api/notifications/read/${id}/`);
  } catch {
    // Silent — local update already applied
  }

  return updated;
}

const notificationService = { getNotifications, getUnreadCount, markAsRead };
export default notificationService;
