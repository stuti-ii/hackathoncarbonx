import api from "./api";

const authService = {
  /**
   * Logs in a user by calling POST /api/auth/login/
   * Returns a session object with { token, user: { email, name } }
   */
  login: async (email, password) => {
    try {
      const response = await api.post("/api/auth/login/", {
        username: email, // Django username_field is email
        email: email,
        password: password,
      });

      // SimpleJWT returns access and refresh tokens.
      const { access } = response.data;

      // Extract username/name if backend returns it, otherwise fallback to email prefix
      const name = response.data.username || email.split("@")[0];

      return {
        token: access,
        user: {
          email: email,
          name: name,
        },
      };
    } catch (error) {
      const message =
        error.response?.data?.error ||
        error.response?.data?.detail ||
        "Invalid email or password.";
      throw new Error(message);
    }
  },

  /**
   * Registers a user by calling POST /api/auth/register/
   * Automatically performs login afterwards to obtain a JWT session token.
   */
  register: async (name, email, password) => {
    try {
      // Django's username field validation allows letters, numbers, and @/./+/-/_ characters.
      // We sanitize the name by replacing spaces with underscores and filtering out invalid characters.
      const sanitizedUsername = name
        .trim()
        .replace(/\s+/g, "_")
        .replace(/[^a-zA-Z0-9@./+\-_]/g, "");

      // Create user
      await api.post("/api/auth/register/", {
        username: sanitizedUsername || email.split("@")[0].replace(/[^a-zA-Z0-9@./+\-_]/g, ""),
        email: email,
        password: password,
      });

      // Log the user in immediately to get tokens and provide a smooth user experience
      return await authService.login(email, password);
    } catch (error) {
      let message = "Registration failed.";
      if (error.response?.data) {
        const errors = error.response.data;
        if (typeof errors === "object") {
          // Format validation errors (e.g. {"email": ["User with this email already exists."]})
          const errList = Object.entries(errors).map(([field, msgs]) => {
            const fieldName = field.charAt(0).toUpperCase() + field.slice(1);
            const detail = Array.isArray(msgs) ? msgs.join(" ") : msgs;
            return `${fieldName}: ${detail}`;
          });
          if (errList.length > 0) {
            message = errList.join("\n");
          }
        } else if (typeof errors === "string") {
          message = errors;
        }
      }
      throw new Error(message);
    }
  },
};

export default authService;
