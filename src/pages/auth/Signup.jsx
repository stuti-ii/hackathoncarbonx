import { useEffect, useState } from "react";
import { FiArrowRight, FiLock, FiMail, FiUser } from "react-icons/fi";
import { FaLeaf } from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import AuthInput from "../../components/auth/AuthInput";
import { useAuthStore } from "../../store/authStore";
import authService from "../../services/authservice";

function Signup() {
  const navigate = useNavigate();
  const { signup, token, error, loading, setError } = useAuthStore();
  const [name, setName] = useState("");
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

    if (!name.trim() || !email.trim() || !password) {
      toast.error("Please fill in all inputs.");
      return;
    }

    if (password.length < 4) {
      toast.error("Password must be at least 4 characters.");
      return;
    }

    const success = await signup(name.trim(), email.trim(), password);

    if (success) {
      toast.success("Account created! Welcome to CarbonX.");
      navigate("/dashboard");
      return;
    }

    toast.error(error || "Registration failed. Try a different email.");
  };

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="signup-title">
        <div className="auth-header">
          <div className="auth-logo" aria-hidden="true">
            <FaLeaf />
          </div>
          <p className="auth-brand">
            Carbon<span>X</span>
          </p>
          <h1 id="signup-title">Create account</h1>
          <p>Join the movement to make digital compute transparent.</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <AuthInput
            autoComplete="name"
            icon={FiUser}
            label="Full name"
            name="name"
            onChange={(event) => setName(event.target.value)}
            placeholder="Ram Shyam"
            type="text"
            value={name}
          />

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
            autoComplete="new-password"
            icon={FiLock}
            label="Password"
            name="password"
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Create a password"
            type="password"
            value={password}
          />

          <button className="auth-button" disabled={loading} type="submit">
            <span>{loading ? "Creating..." : "Create account"}</span>
            {!loading && <FiArrowRight aria-hidden="true" />}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account?
          <Link to="/login">Sign in</Link>
        </p>
      </section>
    </main>
  );
}

export default Signup;
