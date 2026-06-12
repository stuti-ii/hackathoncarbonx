// popup.js — CarbonX v2

const API_BASE = "https://carbonx-l8qh.onrender.com";

// ══════════════════════════════════════════════════════════════
//  AUTH
// ══════════════════════════════════════════════════════════════

// ── Screen switching ──────────────────────────────────────────

function showScreen(name) {
  document
    .getElementById("authScreen")
    .classList.toggle("hidden", name !== "auth");
  document
    .getElementById("mainScreen")
    .classList.toggle("hidden", name !== "main");
}

// ── Tab switching (Login ↔ Register) ─────────────────────────

document.querySelectorAll(".auth-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document
      .querySelectorAll(".auth-tab")
      .forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    const target = tab.dataset.tab;
    document
      .getElementById("formLogin")
      .classList.toggle("hidden", target !== "login");
    document
      .getElementById("formRegister")
      .classList.toggle("hidden", target !== "register");
    document.getElementById("loginError").textContent = "";
    document.getElementById("regError").textContent = "";
  });
});

// ── Token storage ─────────────────────────────────────────────

async function saveTokens(accessToken, refreshToken) {
  await chrome.storage.local.set({ accessToken, refreshToken });
}

async function clearTokens() {
  await chrome.storage.local.remove(["accessToken", "refreshToken"]);
}

async function getStoredTokens() {
  return chrome.storage.local.get(["accessToken", "refreshToken"]);
}

// ── LOGIN ─────────────────────────────────────────────────────

document.getElementById("btnLogin").addEventListener("click", async () => {
  const btn = document.getElementById("btnLogin");
  const errEl = document.getElementById("loginError");
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;

  errEl.textContent = "";

  if (!email || !password) {
    errEl.textContent = "Please fill in all fields.";
    return;
  }

  btn.disabled = true;
  btn.textContent = "Logging in…";

  try {
    const res = await fetch(`${API_BASE}/api/token/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json().catch(() => ({}));

    if (res.ok) {
      const access = data.access; // Changed from data.accessToken
      const refresh = data.refresh; // Changed from data.refreshToken
      if (!access) throw new Error("No token in response");
      await saveTokens(access, refresh);
      enterMainScreen();
    } else {
      errEl.textContent = data.message || data.error || `Error ${res.status}`;
    }
  } catch (err) {
    errEl.textContent = "Network error. Please try again.";
    console.error("[carbonx] login error:", err);
  } finally {
    btn.disabled = false;
    btn.textContent = "Login";
  }
});

// ── REGISTER ──────────────────────────────────────────────────

document.getElementById("btnRegister").addEventListener("click", async () => {
  const btn = document.getElementById("btnRegister");
  const errEl = document.getElementById("regError");
  const email = document.getElementById("regEmail").value.trim();
  const password = document.getElementById("regPassword").value;
  const confirm = document.getElementById("regConfirm").value;

  errEl.textContent = "";

  if (!email || !password || !confirm) {
    errEl.textContent = "Please fill in all fields.";
    return;
  }
  if (password !== confirm) {
    errEl.textContent = "Passwords do not match.";
    return;
  }
  if (password.length < 6) {
    errEl.textContent = "Password must be at least 6 characters.";
    return;
  }

  btn.disabled = true;
  btn.textContent = "Creating account…";

  try {
    const res = await fetch(`${API_BASE}/api/register/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json().catch(() => ({}));

    if (res.ok) {
      // If registration returns tokens, log straight in; otherwise prompt login
      const access = data.accessToken || data.access_token || data.token;
      const refresh = data.refreshToken || data.refresh_token || "";
      if (access) {
        await saveTokens(access, refresh);
        enterMainScreen();
      } else {
        // Switch to login tab and show success hint
        errEl.style.color = "var(--accent)";
        errEl.textContent = "Account created! Please log in.";
        // flip to login tab after a beat
        setTimeout(() => {
          document.getElementById("tabLogin").click();
          document.getElementById("loginEmail").value = email;
        }, 1000);
      }
    } else {
      errEl.style.color = "var(--danger)";
      errEl.textContent = data.message || data.error || `Error ${res.status}`;
    }
  } catch (err) {
    errEl.style.color = "var(--danger)";
    errEl.textContent = "Network error. Please try again.";
    console.error("[carbonx] register error:", err);
  } finally {
    btn.disabled = false;
    btn.textContent = "Create Account";
  }
});

// ── LOGOUT ────────────────────────────────────────────────────

document.getElementById("btnLogout").addEventListener("click", async () => {
  const btn = document.getElementById("btnLogout");
  btn.disabled = true;
  chrome.runtime.sendMessage({ type: "LOGOUT" }, async () => {
    await clearTokens();
    // Reset tracker UI
    setSessionUI(false);
    renderLog([]);
    document.getElementById("statRecords").textContent = "0";
    document.getElementById("statSites").textContent = "0";
    showScreen("auth");
    btn.disabled = false;
  });
});

// ── Init: check if already logged in ─────────────────────────

async function initAuth() {
  const { accessToken } = await getStoredTokens();
  if (accessToken) {
    enterMainScreen();
  } else {
    showScreen("auth");
  }
}

function enterMainScreen() {
  showScreen("main");
  pollStatus();
}

// ══════════════════════════════════════════════════════════════
//  TRACKER  (unchanged logic from original popup.js)
// ══════════════════════════════════════════════════════════════

// ── State ─────────────────────────────────────────────────────
let _sessionStart = null;
let _siteStart = null;
let _currentSite = null;
let _sessionActive = false;
let _activityLog = [];

// ── Formatting ────────────────────────────────────────────────

function fmt(seconds) {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}

// ── UI helpers ────────────────────────────────────────────────

function setSessionUI(active) {
  _sessionActive = active;

  const badge = document.getElementById("sessionBadge");
  const btnStart = document.getElementById("btnStart");
  const btnStop = document.getElementById("btnStop");
  if (!badge) return;

  badge.textContent = active ? "● Active" : "Inactive";
  badge.classList.toggle("active", active);

  btnStart.disabled = active;
  btnStop.disabled = !active;

  if (!active) {
    document.getElementById("siteName").textContent = "— session inactive —";
    document.getElementById("siteName").classList.add("idle");
    document.getElementById("siteTimer").textContent = "";
    document.getElementById("statTime").textContent = "0s";
    _sessionStart = null;
    _siteStart = null;
    _currentSite = null;
    document.getElementById("sessionId").textContent = "";
  }
}

function showToast(message, type = "success") {
  const el = document.getElementById("toast");
  el.textContent = message;
  el.className = `toast ${type}`;
  el.style.display = "block";
  setTimeout(() => {
    el.style.display = "none";
  }, 4000);
}

function renderLog(records) {
  const container = document.getElementById("logEntries");
  if (!records || records.length === 0) {
    container.innerHTML =
      '<div class="log-empty">No activity recorded yet</div>';
    return;
  }

  const grouped = {};
  for (const r of records) {
    if (!grouped[r.platform]) grouped[r.platform] = 0;
    grouped[r.platform] += r.duration;
  }

  container.innerHTML = Object.entries(grouped)
    .sort((a, b) => b[1] - a[1])
    .map(
      ([site, dur]) => `
      <div class="log-row">
        <span class="log-site">${site}</span>
        <span class="log-dur">${fmt(dur)}</span>
      </div>
    `,
    )
    .join("");
}

// ── Tick — runs every second while popup is open ──────────────

function tick() {
  if (_sessionActive && _sessionStart) {
    const elapsed = Math.round((Date.now() - _sessionStart) / 1000);
    const el = document.getElementById("statTime");
    if (el) el.textContent = fmt(elapsed);
  }
  if (_sessionActive && _siteStart && _currentSite) {
    const siteElapsed = Math.round((Date.now() - _siteStart) / 1000);
    const el = document.getElementById("siteTimer");
    if (el) el.textContent = fmt(siteElapsed) + " on this page";
  }
}

// ── Poll background for live status ──────────────────────────

function pollStatus() {
  chrome.runtime.sendMessage({ type: "GET_STATUS" }, (status) => {
    if (chrome.runtime.lastError || !status) return;

    const wasActive = _sessionActive;

    _sessionActive = status.sessionActive;
    _sessionStart = status.sessionStart;
    _siteStart = status.siteStart ?? Date.now() - status.siteElapsed * 1000;
    _currentSite = status.currentSite;

    if (status.sessionActive !== wasActive) {
      setSessionUI(status.sessionActive);
    }

    const siteEl = document.getElementById("siteName");
    if (siteEl) {
      if (status.sessionActive && status.currentSite) {
        siteEl.textContent = status.currentSite;
        siteEl.classList.remove("idle");
      } else if (status.sessionActive) {
        siteEl.textContent = "waiting for tab…";
        siteEl.classList.add("idle");
      }
    }

    const recEl = document.getElementById("statRecords");
    const sidEl = document.getElementById("sessionId");
    if (recEl) recEl.textContent = status.activityCount;
    if (sidEl)
      sidEl.textContent = status.sessionId
        ? status.sessionId.replace("session_", "s_")
        : "";

    chrome.storage.local.get("activities", (s) => {
      const acts = s.activities || [];
      _activityLog = acts;
      const unique = new Set(acts.map((a) => a.platform)).size;
      const sitesEl = document.getElementById("statSites");
      if (sitesEl) sitesEl.textContent = unique;
      renderLog(acts);
    });
  });
}

// ── Button handlers ───────────────────────────────────────────

document.getElementById("btnStart").addEventListener("click", () => {
  const btn = document.getElementById("btnStart");
  btn.disabled = true;
  btn.textContent = "Starting…";

  chrome.runtime.sendMessage({ type: "START_SESSION" }, (res) => {
    if (res?.ok) {
      setSessionUI(true);
      pollStatus();
    } else {
      btn.disabled = false;
      btn.textContent = "▶ Start Session";
    }
  });
});

document.getElementById("btnStop").addEventListener("click", () => {
  const btn = document.getElementById("btnStop");
  btn.disabled = true;
  btn.textContent = "Sending…";

  chrome.runtime.sendMessage({ type: "STOP_SESSION" }, (res) => {
    // IMPORTANT: Reset button state regardless of success or failure
    btn.disabled = false;
    btn.textContent = "⏹ Stop & Send";

    if (res?.ok) {
      showToast(`✓ Sent ${res.sent} record(s) to backend`);
      setSessionUI(false);
      renderLog([]);
      document.getElementById("statRecords").textContent = "0";
      document.getElementById("statSites").textContent = "0";
    } else {
      showToast("✗ " + (res?.message || "Failed to send data"), "error");
    }
  });
});

// ── Init ──────────────────────────────────────────────────────

initAuth();
setInterval(tick, 1000);
setInterval(pollStatus, 2000);
