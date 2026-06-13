import { create } from "zustand";
import authService from "../services/authservice";

export const useAuthStore = create((set) => ({
  user: null,
  token: localStorage.getItem("access") || null,
  isAuthenticated: !!localStorage.getItem("access"),
  loading: false,
  error: null,

  setError: (error) => set({ error }),

  login: async (email, password) => {
    set({
      loading: true,
      error: null,
    });

    try {
      const data = await authService.login(
        email,
        password
      );

      set({
        user: data.user,
        token: localStorage.getItem("access"),
        isAuthenticated: true,
        loading: false,
      });

      return true;
    } catch (error) {
      set({
        loading: false,
        error:
          error.response?.data?.detail ||
          error.message ||
          "Login failed",
      });

      return false;
    }
  },

  signup: async (
    name,
    email,
    password
  ) => {
    set({
      loading: true,
      error: null,
    });

    try {
      const data =
        await authService.register(
          name,
          email,
          password
        );

      set({
        user: data.user,
        token: localStorage.getItem("access"),
        isAuthenticated: true,
        loading: false,
      });

      return true;
    } catch (error) {
      set({
        loading: false,
        error:
          error.response?.data?.detail ||
          error.message ||
          "Signup failed",
      });

      return false;
    }
  },

  logout: () => {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");

    set({
      user: null,
      token: null,
      isAuthenticated: false,
      error: null,
    });
  },
}));