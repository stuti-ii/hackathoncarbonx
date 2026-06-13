import { useEffect, useState, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { toast } from "react-hot-toast";
import { FaLeaf } from "react-icons/fa";
import {
  FiLogOut, FiHome, FiAward, FiStar,
  FiZap, FiTarget, FiCheck, FiLock, FiTrendingUp
} from "react-icons/fi";
import gamificationService, { BADGE_TIERS } from "../services/gamificationService";

// ─── Helper ───────────────────────────────────────────────────────────────────
function getRatingColor(points) {
  if (points >= 600) return "#b9f2ff";
  if (points >= 300) return "#FFD700";
  if (points >= 100) return "#C0C0C0";
  return "#CD7F32";
}

function getCurrentBadge(points) {
  const tiers = [...BADGE_TIERS].reverse();
  return tiers.find((t) => points >= t.xpRequired) || BADGE_TIERS[0];
}

// ─── Component ────────────────────────────────────────────────────────────────
function Gamification() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const [profile, setProfile] = useState({ level: 0, points: 0, streak: 0, next_level_xp: 300, badges_earned: [] });
  const [badges, setBadges] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("profile"); // "profile" | "badges" | "challenges"

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [prof, bdg, chall] = await Promise.all([
        gamificationService.getProfile(),
        gamificationService.getBadges(),
        gamificationService.getChallenges(),
      ]);
      setProfile(prof);
      setBadges(bdg);
      setChallenges(chall);
    } catch (err) {
      toast.error("Could not load gamification data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const xpPercent = Math.min(100, Math.round((profile.points / (profile.next_level_xp || 300)) * 100));
  const currentBadge = getCurrentBadge(profile.points);

  return (
    <div className="gamification-page">
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
          <Link to="/gamification" className="nav-link active">
            <FiAward /> Achievements
          </Link>
          <Link to="/trading" className="nav-link">
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

      <main className="gamification-main">
        {/* ── Page Header ── */}
        <div className="gamification-header">
          <div className="gamification-title-row">
            <FiAward className="page-icon" />
            <div>
              <h1>Achievements</h1>
              <p>Track your eco-progress, unlock badges, and complete challenges.</p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="dash-loading">
            <div className="dash-spinner" />
            <p>Loading your achievements...</p>
          </div>
        ) : (
          <>
            {/* ── XP Hero Banner ── */}
            <div className="xp-hero" style={{ "--badge-color": currentBadge.color, "--badge-glow": currentBadge.glow }}>
              <div className="xp-hero-left">
                <div className="xp-badge-icon" style={{ color: currentBadge.color, textShadow: `0 0 24px ${currentBadge.glow}` }}>
                  {currentBadge.emoji}
                </div>
                <div className="xp-hero-info">
                  <div className="xp-tier-name" style={{ color: currentBadge.color }}>{currentBadge.name} Tier</div>
                  <div className="xp-level">Level {profile.level}</div>
                  <div className="xp-desc">{currentBadge.description}</div>
                </div>
              </div>
              <div className="xp-hero-stats">
                <div className="xp-stat">
                  <FiStar />
                  <span className="xp-stat-val">{profile.points}</span>
                  <span className="xp-stat-lbl">Total XP</span>
                </div>
                <div className="xp-stat">
                  <span className="xp-stat-val streak-fire">🔥 {profile.streak}</span>
                  <span className="xp-stat-lbl">Day Streak</span>
                </div>
                <div className="xp-stat">
                  <FiTarget />
                  <span className="xp-stat-val">{profile.next_level_xp - profile.points}</span>
                  <span className="xp-stat-lbl">XP to Next</span>
                </div>
              </div>
              {/* XP Progress Bar */}
              <div className="xp-progress-wrap">
                <div className="xp-progress-label">
                  <span>{profile.points} XP</span>
                  <span>{profile.next_level_xp} XP</span>
                </div>
                <div className="xp-progress-track">
                  <div
                    className="xp-progress-fill"
                    style={{ width: `${xpPercent}%`, background: `linear-gradient(90deg, ${currentBadge.color}, ${currentBadge.glow})` }}
                  />
                </div>
                <div className="xp-percent-label">{xpPercent}% to Level {profile.level + 1}</div>
              </div>
            </div>

            {/* ── Tab Bar ── */}
            <div className="gamif-tabs">
              {[
                { key: "profile",    label: "Profile",    icon: <FiTrendingUp /> },
                { key: "badges",     label: "Badges",     icon: <FiAward /> },
                { key: "challenges", label: "Challenges", icon: <FiTarget /> },
              ].map((t) => (
                <button
                  key={t.key}
                  className={`gamif-tab${activeTab === t.key ? " active" : ""}`}
                  onClick={() => setActiveTab(t.key)}
                >
                  {t.icon} {t.label}
                </button>
              ))}
            </div>

            {/* ── Profile Tab ── */}
            {activeTab === "profile" && (
              <div className="gamif-section">
                <div className="profile-stats-grid">
                  <div className="profile-stat-card">
                    <FiZap className="psc-icon" style={{ color: "#FFD700" }} />
                    <div className="psc-val">{profile.points}</div>
                    <div className="psc-lbl">Total Points</div>
                  </div>
                  <div className="profile-stat-card">
                    <span className="psc-icon" style={{ fontSize: "1.6rem" }}>🔥</span>
                    <div className="psc-val">{profile.streak}</div>
                    <div className="psc-lbl">Day Streak</div>
                  </div>
                  <div className="profile-stat-card">
                    <FiStar className="psc-icon" style={{ color: "#a78bfa" }} />
                    <div className="psc-val">{profile.level}</div>
                    <div className="psc-lbl">Current Level</div>
                  </div>
                  <div className="profile-stat-card">
                    <FiAward className="psc-icon" style={{ color: "#34d399" }} />
                    <div className="psc-val">{badges.filter(b => b.unlocked).length}</div>
                    <div className="psc-lbl">Badges Earned</div>
                  </div>
                </div>

                {/* Tier Roadmap */}
                <div className="tier-roadmap">
                  <h3 className="section-subtitle">Badge Tier Roadmap</h3>
                  <div className="tier-row">
                    {BADGE_TIERS.map((tier, idx) => {
                      const unlocked = profile.points >= tier.xpRequired;
                      return (
                        <div key={tier.id} className={`tier-stop${unlocked ? " unlocked" : ""}`}>
                          <div className="tier-stop-icon" style={unlocked ? { color: tier.color, textShadow: `0 0 16px ${tier.glow}` } : {}}>
                            {unlocked ? tier.emoji : "🔒"}
                          </div>
                          <div className="tier-stop-name" style={unlocked ? { color: tier.color } : {}}>{tier.name}</div>
                          <div className="tier-stop-xp">{tier.xpRequired} XP</div>
                          {idx < BADGE_TIERS.length - 1 && <div className={`tier-connector${unlocked ? " filled" : ""}`} />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ── Badges Tab ── */}
            {activeTab === "badges" && (
              <div className="gamif-section">
                <h3 className="section-subtitle">Your Badge Collection</h3>
                <div className="badges-grid">
                  {BADGE_TIERS.map((tier) => {
                    const backendBadge = badges.find((b) => b.id === tier.id);
                    const unlocked = backendBadge?.unlocked ?? false;
                    return (
                      <div
                        key={tier.id}
                        className={`badge-card${unlocked ? " badge-unlocked" : " badge-locked"}`}
                        style={unlocked ? { "--b-color": tier.color, "--b-glow": tier.glow } : {}}
                      >
                        <div className="badge-card-icon">
                          {unlocked ? (
                            <span style={{ color: tier.color, textShadow: `0 0 32px ${tier.glow}`, fontSize: "3rem" }}>
                              {tier.emoji}
                            </span>
                          ) : (
                            <FiLock className="badge-lock-icon" />
                          )}
                        </div>
                        <div className="badge-card-name" style={unlocked ? { color: tier.color } : {}}>
                          {tier.name}
                        </div>
                        <div className="badge-card-desc">{tier.description}</div>
                        {unlocked ? (
                          <div className="badge-card-status unlocked-status">
                            <FiCheck /> Unlocked {backendBadge?.earned_at ? `· ${backendBadge.earned_at}` : ""}
                          </div>
                        ) : (
                          <div className="badge-card-status locked-status">
                            <FiLock /> Requires {tier.xpRequired} XP
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Challenges Tab ── */}
            {activeTab === "challenges" && (
              <div className="gamif-section">
                <h3 className="section-subtitle">Active Challenges</h3>
                <div className="challenges-list">
                  {challenges.map((ch) => (
                    <div key={ch.id} className={`challenge-card${ch.completed ? " challenge-done" : ""}`}>
                      <div className="challenge-left">
                        <div className="challenge-icon">
                          {ch.completed ? <FiCheck style={{ color: "#34d399" }} /> : <FiTarget style={{ color: "#a78bfa" }} />}
                        </div>
                        <div className="challenge-info">
                          <div className="challenge-title">{ch.title}</div>
                          <div className="challenge-desc">{ch.description}</div>
                          <div className="challenge-meta">
                            <span className="challenge-deadline">{ch.deadline}</span>
                          </div>
                        </div>
                      </div>
                      <div className="challenge-right">
                        <div className="challenge-xp">+{ch.reward_xp} XP</div>
                        {ch.completed ? (
                          <div className="challenge-complete-badge">Completed!</div>
                        ) : (
                          <button
                            className="challenge-btn"
                            onClick={() => toast.success(`Challenge "${ch.title}" marked — keep it up! 🌱`)}
                          >
                            Complete
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default Gamification;
