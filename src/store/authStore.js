import { create } from "zustand";

const storedUser = localStorage.getItem("carbonx_user");
const storedToken = localStorage.getItem("carbonx_token");

export const useAuthStore = create((set) => ({
  error: null,
  loading: false,
  token: storedToken,
  user: storedUser ? JSON.parse(storedUser) : null,

  setError: (error) => set({ error }),

  login: async (email, password, loginRequest) => {
    set({ error: null, loading: true });

    try {
      const session = await loginRequest(email, password);

      localStorage.setItem("carbonx_token", session.token);
      localStorage.setItem("carbonx_user", JSON.stringify(session.user));
      set({ loading: false, token: session.token, user: session.user });
      return true;
    } catch (error) {
      set({ error: error.message || "Login failed.", loading: false });
      return false;
    }
  },

  signup: async (name, email, password, signupRequest) => {
    set({ error: null, loading: true });

    try {
      const session = await signupRequest(name, email, password);

      localStorage.setItem("carbonx_token", session.token);
      localStorage.setItem("carbonx_user", JSON.stringify(session.user));
      set({ loading: false, token: session.token, user: session.user });
      return true;
    } catch (error) {
      set({ error: error.message || "Signup failed.", loading: false });
      return false;
    }
  },

  logout: () => {
    localStorage.removeItem("carbonx_token");
    localStorage.removeItem("carbonx_user");
    set({ error: null, token: null, user: null });
  },
}));
