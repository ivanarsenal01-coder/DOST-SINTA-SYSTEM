import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { useAuth } from "../usrmngment/auth/AuthContext"; // palitan kung iba ang path mo
import "./LoginPage.css";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, isAuthenticated, authLoading } = useAuth();

  const [form, setForm] = useState({
    username: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate("/dashboard", { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate]);

  useEffect(() => {
    const remembered = localStorage.getItem("remembered_username");
    if (remembered) {
      setForm((prev) => ({
        ...prev,
        username: remembered,
      }));
      setRememberMe(true);
    }
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const username = form.username.trim();
    const password = form.password.trim();

    if (!username || !password) {
      setError("Please enter username and password.");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await login(username, password);

      if (!result.success) {
        setError(result.message || "Invalid username or password.");
        return;
      }

      if (rememberMe) {
        localStorage.setItem("remembered_username", username);
      } else {
        localStorage.removeItem("remembered_username");
      }

      navigate("/dashboard", { replace: true });
    } catch (err) {
      console.error("Login error:", err);
      setError("Unable to connect to the server.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="dost-login-page">
      <div className="dost-login-bg-circle dost-login-bg-circle-1" />
      <div className="dost-login-bg-circle dost-login-bg-circle-2" />

      <section className="dost-login-shell">
        <div className="dost-login-left">
          <div className="dost-login-left-overlay" />

          <div className="dost-login-brand">
            <div className="dost-login-brand-mark">DOST</div>
            <div>
              <h1> Science, Technology, and Innovation Interventions Tracker and Analytics</h1>
            </div>
          </div>

          <div className="dost-login-hero-content">
            <span className="dost-login-kicker">DOST Region I</span>
            <h2>Welcome to SINTA</h2>
            <p>
              Monitor targets, accomplishments, services, technology promotion,
              trainings, and project implementation in one secure platform.
            </p>
          </div>

          <div className="dost-login-mountain">
            <div className="mountain mountain-1" />
            <div className="mountain mountain-2" />
            <div className="mountain mountain-3" />
          </div>
        </div>

        <div className="dost-login-right">
          <div className="dost-login-form-wrap">
            <div className="dost-login-mobile-logo">DOST</div>

            <h2 className="dost-login-title">Welcome</h2>
            <p className="dost-login-subtitle">
              Sign in to your DOST Science and Innovation Tracking Application
              account.
            </p>

            <form onSubmit={handleSubmit} className="dost-login-form">
              <label className="dost-login-field">
                <span>Username</span>
                <div className="dost-login-input-box">
                  <Mail size={17} />
                  <input
                    type="text"
                    name="username"
                    placeholder="Email Address / Username"
                    value={form.username}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    autoComplete="username"
                  />
                </div>
              </label>

              <label className="dost-login-field">
                <span>Password</span>
                <div className="dost-login-input-box">
                  <Lock size={17} />
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    placeholder="Password"
                    value={form.password}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    autoComplete="current-password"
                  />

                  <button
                    type="button"
                    className="dost-login-eye"
                    onClick={() => setShowPassword((prev) => !prev)}
                    disabled={isSubmitting}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </label>

              <div className="dost-login-row">
                <label className="dost-login-check">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    disabled={isSubmitting}
                  />
                  <span>Remember me</span>
                </label>

                <button
                  type="button"
                  className="dost-login-link"
                  onClick={() =>
                    alert("You can connect this to your forgot password flow later.")
                  }
                  disabled={isSubmitting}
                >
                  Forgot Password?
                </button>
              </div>

              {error ? <div className="dost-login-error">{error}</div> : null}

              <button
                type="submit"
                className="dost-login-submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Signing in..." : "Login"}
              </button>

              <div className="dost-login-divider">
                <span />
                <p>secure access</p>
                <span />
              </div>

              <p className="dost-login-test">
                Test account: <b>superadmin</b> / <b>1234</b>
              </p>
            </form>
          </div>
        </div>
      </section>

      <div className="dost-login-city">
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>
    </main>
  );
}