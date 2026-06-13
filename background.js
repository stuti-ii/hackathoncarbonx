// ─────────────────────────────────────────────────────────────
//  CarbonX — background.js
//
//  State machine: IDLE ──► ACTIVE ──► IDLE
//
//  IDLE:   No tracking. All tab events are ignored.
//  ACTIVE: Every tab switch / navigation ends the current
//          website's timer and starts a new one. On Stop,
//          the open timer is closed and ALL records are
//          POSTed to the backend as one batch.
// ─────────────────────────────────────────────────────────────

const API_BASE = "https://hackathoncarbonx.onrender.com";
const API_ADD_ACTIVITY = `${API_BASE}/api/activities/`;
const IDLE_SECONDS = 60; // treat user as away after 60 s of OS idle

// ── Persisted state keys ──────────────────────────────────────
// sessionActive : bool
// sessionId     : string  (e.g. "session_1749329412345")
// sessionStart  : number  (epoch ms — when Start was pressed)
// activities    : array   (completed records for this session)
// currentSite   : string | null  (hostname currently being timed)
// siteStart     : number | null  (epoch ms — when currentSite became active)

// ─────────────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────────────

function hostname(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

function trackable(url) {
  return (
    typeof url === "string" &&
    (url.startsWith("http://") || url.startsWith("https://"))
  );
}

function nowISO() {
  return new Date().toISOString();
}

async function getState() {
  return chrome.storage.local.get([
    "sessionActive",
    "sessionId",
    "sessionStart",
    "activities",
    "currentSite",
    "siteStart",
  ]);
}

async function setState(patch) {
  await chrome.storage.local.set(patch);
}

// ─────────────────────────────────────────────────────────────
//  Core: close the open site timer → push a record
// ─────────────────────────────────────────────────────────────

async function closeSiteTimer(state) {
  const { currentSite, siteStart, sessionId, activities } = state;
  if (!currentSite || !siteStart || !sessionId) return state;

  const duration = Math.round((Date.now() - siteStart) / 1000);
  if (duration <= 0) return state;

  const record = {
    platform: currentSite,
    duration, // seconds
    timestamp: new Date(siteStart).toISOString(),
    sessionId,
  };

  const updated = [...(activities || []), record];
  await setState({ activities: updated, currentSite: null, siteStart: null });

  console.log("[carbonx] recorded:", record);
  return { ...state, activities: updated, currentSite: null, siteStart: null };
}

// ─────────────────────────────────────────────────────────────
//  Core: open a new site timer
// ─────────────────────────────────────────────────────────────

async function openSiteTimer(url) {
  const site = hostname(url);
  if (!site) return;

  await setState({ currentSite: site, siteStart: Date.now() });
  console.log("[carbonx] timing:", site);
}
// ─────────────────────────────────────────────────────────────
//  START SESSION
// ─────────────────────────────────────────────────────────────

async function startSession() {
  const sessionId = "session_" + Date.now();
  await setState({
    sessionActive: true,
    sessionId,
    sessionStart: Date.now(),
    activities: [],
    currentSite: null,
    siteStart: null,
  });
  console.log("[carbonx] session started:", sessionId);

  // immediately begin timing the current active tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab && trackable(tab.url || "")) {
    await openSiteTimer(tab.url);
  }
}

// ─────────────────────────────────────────────────────────────
//  STOP SESSION — close timer → send all data → clear state
// ─────────────────────────────────────────────────────────────

async function stopSession() {
  let state = await getState();
  if (!state.sessionActive) return { ok: false, message: "No active session" };

  // Close whatever site is currently being timed
  state = await closeSiteTimer(state);

  const { activities, sessionId } = state;

  // Mark session inactive immediately (stop tracking)
  await setState({ sessionActive: false, currentSite: null, siteStart: null });

  if (!activities || activities.length === 0) {
    console.log("[carbonx] session ended with no activities");
    return { ok: true, sent: 0 };
  }

  // ── Send to backend ──────────────────────────────────────
  const result = await sendToBackend(activities, sessionId);

  // Clear session data only after a successful send
  if (result.ok) {
    await setState({ activities: [], sessionId: null, sessionStart: null });
  }

  return result;
}

// ─────────────────────────────────────────────────────────────
//  Token helpers
// ─────────────────────────────────────────────────────────────

async function getTokens() {
  const { accessToken, refreshToken } = await chrome.storage.local.get([
    "accessToken",
    "refreshToken",
  ]);
  return { accessToken, refreshToken };
}

async function refreshAccessToken() {
  const { refreshToken } = await getTokens();
  if (!refreshToken) return null;

  try {
    const res = await fetch(`${API_BASE}/api/token/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh: refreshToken }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const newToken = data.access;
    if (newToken) {
      await chrome.storage.local.set({ accessToken: newToken });
      return newToken;
    }
  } catch (err) {
    console.error("[carbonx] Token refresh error:", err);
  }
  return null;
}

// ─────────────────────────────────────────────────────────────
//  API call
// ─────────────────────────────────────────────────────────────

async function sendToBackend(activities, sessionId) {
  console.log(
    `[carbonx] sending ${activities.length} record(s) for ${sessionId}`,
  );
  console.log("[carbonx] activities to send:", activities);

  let { accessToken } = await getTokens();

  if (!accessToken) {
    console.error("[carbonx] No access token available");
    return { ok: false, message: "No authentication token" };
  }

  // Send activities one by one
  let successCount = 0;
  let errorCount = 0;

  for (const activity of activities) {
    // Convert duration from seconds to minutes (minimum 1 minute)

    // Format data EXACTLY as your backend expects
    const payload = {
      platform: activity.platform, // String
      duration: activity.duration,
    };

    console.log(`[carbonx] Sending payload:`, JSON.stringify(payload));

    try {
      const response = await fetch(API_ADD_ACTIVITY, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      });

      console.log(`[carbonx] Response status: ${response.status}`);

      if (response.status === 401) {
        // Try to refresh token
        console.log("[carbonx] Token expired, refreshing...");
        const newToken = await refreshAccessToken();
        if (newToken) {
          accessToken = newToken;
          // Retry with new token
          const retryResponse = await fetch(API_ADD_ACTIVITY, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify(payload),
          });

          if (retryResponse.ok) {
            successCount++;
            console.log(`[carbonx] ✓ Sent activity for ${activity.platform}`);
            continue;
          }
        }
      }

      if (response.ok) {
        successCount++;
        const data = await response.json();
        console.log(
          `[carbonx] ✓ Activity saved for ${activity.platform}, carbon: ${data.carbon}`,
        );
      } else {
        errorCount++;
        const errorText = await response.text();
        console.error(`[carbonx] ✗ Failed (${response.status}):`, errorText);
      }
    } catch (err) {
      errorCount++;
      console.error(`[carbonx] ✗ Network error:`, err.message);
    }

    // Small delay between requests
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  console.log(`[carbonx] Complete: ${successCount} sent, ${errorCount} failed`);

  if (errorCount > 0) {
    return {
      ok: false,
      message: `Sent ${successCount}/${activities.length} activities`,
      sent: successCount,
    };
  }

  return { ok: true, sent: successCount };
}

// ─────────────────────────────────────────────────────────────
//  Tab event handlers (only act when session is ACTIVE)
// ─────────────────────────────────────────────────────────────

async function handleTabSwitch(newTabId) {
  const state = await getState();
  if (!state.sessionActive) return;

  await closeSiteTimer(state);

  try {
    const tab = await chrome.tabs.get(newTabId);
    if (trackable(tab.url || "")) await openSiteTimer(tab.url);
  } catch {
    /* tab may have closed */
  }
}

async function handleNavigation(tabId, newUrl) {
  const state = await getState();
  if (!state.sessionActive) return;

  // Only care about the currently active tab
  const [activeTab] = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  });
  if (!activeTab || activeTab.id !== tabId) return;

  const newHost = hostname(newUrl);
  if (newHost === state.currentSite) return; // same site, ignore

  await closeSiteTimer(state);
  if (trackable(newUrl)) await openSiteTimer(newUrl);
}

async function handleTabClose(tabId) {
  const state = await getState();
  if (!state.sessionActive) return;

  const [activeTab] = await chrome.tabs
    .query({ active: true, currentWindow: true })
    .catch(() => [null]);
  // If the closed tab was the one being tracked, close its timer
  // (we can't know for sure, so we close if currentSite is set)
  if (state.currentSite) {
    await closeSiteTimer(state);
  }
}

// ─────────────────────────────────────────────────────────────
//  Chrome event listeners
// ─────────────────────────────────────────────────────────────

chrome.tabs.onActivated.addListener(({ tabId }) => {
  handleTabSwitch(tabId);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== "complete") return;
  handleNavigation(tabId, tab.url || "");
});

chrome.tabs.onRemoved.addListener((tabId) => {
  handleTabClose(tabId);
});

// Idle detection — pause timer while user is away
chrome.idle.setDetectionInterval(IDLE_SECONDS);
chrome.idle.onStateChanged.addListener(async (idleState) => {
  const state = await getState();
  if (!state.sessionActive) return;

  if (idleState === "idle" || idleState === "locked") {
    // Close the open timer — time while away won't be counted
    await closeSiteTimer(state);
    console.log("[carbonx] idle — timer paused");
  } else if (idleState === "active") {
    // Resume timing the current tab
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (tab && trackable(tab.url || "")) {
      await openSiteTimer(tab.url);
    }
    console.log("[carbonx] active — timer resumed");
  }
});

// ─────────────────────────────────────────────────────────────
//  Message bridge  (popup ↔ background)
// ─────────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === "GET_STATUS") {
    getState().then((state) => {
      const siteStart = state.siteStart ?? null;
      sendResponse({
        sessionActive: !!state.sessionActive,
        sessionId: state.sessionId ?? null,
        sessionStart: state.sessionStart ?? null,
        currentSite: state.currentSite ?? null,
        siteElapsed: siteStart
          ? Math.round((Date.now() - siteStart) / 1000)
          : 0,
        activityCount: (state.activities || []).length,
      });
    });
    return true;
  }

  if (msg.type === "START_SESSION") {
    startSession().then(() => sendResponse({ ok: true }));
    return true;
  }

  if (msg.type === "STOP_SESSION") {
    stopSession().then((result) => sendResponse(result));
    return true;
  }

  if (msg.type === "LOGOUT") {
    // Stop any active session silently, then wipe tokens
    const doLogout = async () => {
      const state = await getState();
      if (state.sessionActive) await stopSession().catch(() => {});
      await chrome.storage.local.remove(["accessToken", "refreshToken"]);
      await chrome.storage.local.set({
        sessionActive: false,
        activities: [],
        currentSite: null,
        siteStart: null,
      });
      return { ok: true };
    };
    doLogout().then((result) => sendResponse(result));
    return true;
  }

  return false;
});
