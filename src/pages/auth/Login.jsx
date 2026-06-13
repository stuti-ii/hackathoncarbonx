import { useEffect, useState } from "react";
import { FiArrowRight, FiLock, FiMail } from "react-icons/fi";
import { FaLeaf } from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import AuthInput from "../../components/auth/AuthInput";
import { useAuthStore } from "../../store/authStore";
import authService from "../../services/authservice";

function Login() {
  const navigate = useNavigate();
  const { login, token, error, loading, setError } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (token) {
      navigate("/dashboard");
    }

    if (typeof setError === "function") {
      setError(null);
    }
  }, [token, navigate, setError]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!email.trim() || !password) {
      toast.error("Please fill in all input fields.");
      return;
    }

    if (password.length < 4) {
      toast.error("Password must be at least 4 characters.");
      return;
    }

    const success = await login(email.trim(), password);

    if (success) {
      toast.success("Successfully logged in!");
      navigate("/dashboard");
      return;
    }

    toast.error(error || "Login credentials invalid.");
  };

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="login-title">
        <div className="auth-header">
          <div className="auth-logo" aria-hidden="true">
            <FaLeaf />
          </div>
          <p className="auth-brand">
            Carbon<span>X</span>
          </p>
          <h1 id="login-title">Welcome back</h1>
          <p>Sign in to analyze your digital carbon emissions.</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <AuthInput
            autoComplete="email"
            icon={FiMail}
            label="Email address"
            name="email"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="name@gmail.com"
            type="email"
            value={email}
          />

          <AuthInput
            autoComplete="current-password"
            icon={FiLock}
            label="Password"
            name="password"
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter your password"
            type="password"
            value={password}
          />

          <button className="auth-button" disabled={loading} type="submit">
            <span>{loading ? "Signing in..." : "Sign in"}</span>
            {!loading && <FiArrowRight aria-hidden="true" />}
          </button>
        </form>

        <p className="auth-footer">
          Don&apos;t have an account?
          <Link to="/signup">Create account</Link>
        </p>
      </section>
    </main>
  );
}

export default Login;
