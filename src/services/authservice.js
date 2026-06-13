import api from "./api";

const authService = {

  /**
   * POST /api/token/
   * Body: { email, password }
   * Response: { access, refresh }
   */
  login: async (email, password) => {
    const res = await api.post("/api/token/", { email, password });

    // Store both tokens — api.js interceptor reads "access" for every request
    localStorage.setItem("access", res.data.access);
    localStorage.setItem("refresh", res.data.refresh);

    // Try to read display name from JWT payload
    let name = email.split("@")[0];
    try {
      const payload = JSON.parse(atob(res.data.access.split(".")[1]));
      name = payload.username || payload.email || name;
    } catch { /* ignore non-decodable tokens */ }

    return {
      access: res.data.access,
      refresh: res.data.refresh,
      user: { email, name },
    };
  },

  /**
   * POST /api/register/
   * Body: { email, password }   ← backend creates username from email automatically
   * Then auto-logs in to return tokens.
   */
  register: async (_name, email, password) => {
    await api.post("/api/register/", { email, password });
    return await authService.login(email, password);
  },

  /**
   * Clear both tokens from localStorage.
   */
  logout: () => {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
  },
};

export default authService;
