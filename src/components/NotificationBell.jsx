import { useState, useEffect, useRef, useCallback } from "react";
import { FiBell, FiX } from "react-icons/fi";
import notificationService from "../services/notificationService";

/* ── Icon map by notification type ── */
const TYPE_ICON = {
  carbon_alert:  "⚠️",
  achievement:   "🏆",
  offset:        "🌱",
  weekly_report: "📊",
};

const TYPE_LABEL = {
  carbon_alert:  "Carbon Alert",
  achievement:   "Achievement",
  offset:        "Offset Tip",
  weekly_report: "Weekly Report",
};

/* ── Relative time helper ── */
function timeAgo(iso) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)  return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function NotificationBell() {
  const [open, setOpen]               = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading]         = useState(true);
  const panelRef                      = useRef(null);

  /* ── Fetch on mount ── */
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [list, count] = await Promise.all([
        notificationService.getNotifications(),
        notificationService.getUnreadCount(),
      ]);
      setNotifications(list);
      setUnreadCount(count);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  /* ── Poll every 60 s ── */
  useEffect(() => {
    const id = setInterval(refresh, 60_000);
    return () => clearInterval(id);
  }, [refresh]);

  /* ── Close panel on outside click ── */
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  /* ── Mark as read ── */
  const handleRead = async (id) => {
    const updated = await notificationService.markAsRead(id);
    setNotifications(updated);
    setUnreadCount(updated.filter((n) => !n.is_read).length);
  };

  /* ── Mark ALL as read ── */
  const handleMarkAllRead = async () => {
    const unread = notifications.filter((n) => !n.is_read);
    for (const n of unread) {
      await notificationService.markAsRead(n.id);
    }
    const updated = notifications.map((n) => ({ ...n, is_read: true }));
    setNotifications(updated);
    setUnreadCount(0);
  };

  return (
    <div className="notif-wrapper" ref={panelRef}>
      {/* ── Bell button ── */}
      <button
        className="notif-bell-btn"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
      >
        <FiBell className="notif-bell-icon" />
        {unreadCount > 0 && (
          <span className="notif-badge" aria-hidden="true">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* ── Dropdown panel ── */}
      {open && (
        <div className="notif-panel" role="dialog" aria-label="Notifications">
          {/* Header */}
          <div className="notif-panel-header">
            <span className="notif-panel-title">
              🔔 Notifications
              {unreadCount > 0 && (
                <span className="notif-header-badge">{unreadCount}</span>
              )}
            </span>
            <div className="notif-panel-actions">
              {unreadCount > 0 && (
                <button className="notif-mark-all-btn" onClick={handleMarkAllRead}>
                  Mark all read
                </button>
              )}
              <button className="notif-close-btn" onClick={() => setOpen(false)} aria-label="Close">
                <FiX />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="notif-list">
            {loading && (
              <div className="notif-empty">
                <span className="notif-loader" /> Loading…
              </div>
            )}

            {!loading && notifications.length === 0 && (
              <div className="notif-empty">
                <span style={{ fontSize: "1.6rem" }}>🎉</span>
                <p>You're all caught up!</p>
              </div>
            )}

            {!loading && notifications.map((n) => (
              <div
                key={n.id}
                className={`notif-item${n.is_read ? " read" : " unread"}`}
                onClick={() => { if (!n.is_read) handleRead(n.id); }}
                role={n.is_read ? "listitem" : "button"}
                tabIndex={n.is_read ? -1 : 0}
                onKeyDown={(e) => { if (e.key === "Enter" && !n.is_read) handleRead(n.id); }}
                aria-label={n.is_read ? undefined : `Mark "${n.title}" as read`}
              >
                <span className={`notif-type-icon type-${n.type}`} aria-hidden="true">
                  {TYPE_ICON[n.type] ?? "🔔"}
                </span>
                <div className="notif-item-body">
                  <div className="notif-item-top">
                    <span className="notif-item-title">{n.title}</span>
                    <span className="notif-item-time">{timeAgo(n.created_at)}</span>
                  </div>
                  <p className="notif-item-msg">{n.message}</p>
                  <span className={`notif-type-tag type-tag-${n.type}`}>
                    {TYPE_LABEL[n.type] ?? n.type}
                  </span>
                </div>
                {!n.is_read && <span className="notif-unread-dot" aria-hidden="true" />}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
