import api from "./api";

const authService = {
  // POST /api/login/  →  { access, refresh }
  login: async (email, password) => {
    const res = await api.post("/api/token/", {
      username: email,
      password,
    });

    localStorage.setItem("access", res.data.access);
    localStorage.setItem("refresh", res.data.refresh);

    let name = email.split("@")[0];
    try {
      const payload = JSON.parse(atob(res.data.access.split(".")[1]));
      name = payload.username || payload.name || name;
    } catch { /* non-decodable token — use email prefix */ }

    return {
      access: res.data.access,
      refresh: res.data.refresh,
      user: { email, name },
    };
  },

  // POST /api/register/  →  then auto-login
  register: async (name, email, password) => {
    const username =
      name.trim().replace(/\s+/g, "_").replace(/[^a-zA-Z0-9@./+\-_]/g, "") ||
      email.split("@")[0];

    await api.post("/api/register/", { username, email, password });

    return await authService.login(email, password);
  },

  logout: () => {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
  },
};

export default authService;
