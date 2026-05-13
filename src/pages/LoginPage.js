import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { useAuth } from "../usrmngment/auth/AuthContext";
import dostLogo from "../assets/logo/dost_sinta_logo_mark.png";
import "./LoginPage.css";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, isAuthenticated, authLoading } = useAuth();

  const [form, setForm] = useState({
    username: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate("/dashboard", { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate]);

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
    const password = form.password;

    if (!username || !password) {
      setError("Please enter your username and password.");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await login(username, password);

      if (!result?.success) {
        setError(result?.message || "Invalid username or password.");
        return;
      }

      navigate("/dashboard", { replace: true });
    } catch (err) {
      console.error("Login error:", err);
      setError("Unable to connect to the server. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="dost-login-page">
      <div className="dost-login-bg-circle dost-login-bg-circle-1" />
      <div className="dost-login-bg-circle dost-login-bg-circle-2" />

      <section className="dost-login-card" aria-label="SINTA Login">
        <div className="dost-login-logo-wrap">
          <img
            src={dostLogo}
            alt="DOST SINTA Logo"
            className="dost-login-logo"
          />
        </div>

        <p className="dost-login-subtitle">
          
        </p>

        <form
          onSubmit={handleSubmit}
          className="dost-login-form"
          autoComplete="off"
          noValidate
        >
          <label className="dost-login-field">
            <span>Username</span>
            <div className="dost-login-input-box">
              <Mail size={16} />
              <input
                type="text"
                name="username"
                placeholder="Enter your username"
                value={form.username}
                onChange={handleChange}
                disabled={isSubmitting}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck="false"
              />
            </div>
          </label>

          <label className="dost-login-field">
            <span>Password</span>
            <div className="dost-login-input-box">
              <Lock size={16} />
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Enter your password"
                value={form.password}
                onChange={handleChange}
                disabled={isSubmitting}
                autoComplete="new-password"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck="false"
              />

              <button
                type="button"
                className="dost-login-eye"
                onClick={() => setShowPassword((prev) => !prev)}
                disabled={isSubmitting}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </label>

          {error ? <div className="dost-login-error">{error}</div> : null}

          <button
            type="submit"
            className="dost-login-submit"
            disabled={isSubmitting || authLoading}
          >
            {isSubmitting ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="dost-login-footer">
          © 2026 DOST PANGASINAN. All rights reserved.
        </p>
      </section>

      <div className="dost-login-city" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>
    </main>
  );
}