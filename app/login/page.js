"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        window.location.href = "/dashboard";
      }
    });
  }, []);

  async function signInWithGoogle() {
    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin + "/auth/callback?next=/dashboard",
      },
    });

    if (error) {
      setLoading(false);
      setMessage(error.message);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setLoading(false);
      setMessage(error.message);
      return;
    }

    window.location.href = "/dashboard";
  }

  async function handleForgotPassword() {
    setMessage("");

    if (!email.trim()) {
      setMessage("Enter your email first.");
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: window.location.origin + "/login",
    });

    setMessage(error ? error.message : "Password reset instructions are on their way.");
  }

  return (
    <main className="auth-page">
      <nav className="auth-nav">
        <a href="/" className="auth-logo">parla<span>•</span></a>
        <div className="auth-nav-copy">
          New to Parla? <a href="/signup">Create account</a>
        </div>
      </nav>

      <section className="auth-main">
        <div className="auth-wrap">
          <div className="auth-intro">
            <div className="auth-eyebrow">Welcome back</div>
            <h1>Good to see you.</h1>
            <p>
              Pick up where you left off. Your learning, progress, and conversations are waiting for you.
            </p>
          </div>

          <div className="auth-card">
            <button
              type="button"
              className="google-button"
              onClick={signInWithGoogle}
              disabled={loading}
            >
              <span className="google-mark" aria-hidden="true">G</span>
              <span>{loading ? "Connecting…" : "Continue with Google"}</span>
            </button>

            <div className="auth-divider"><span>or continue with email</span></div>

            <form onSubmit={handleSubmit}>
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />

              <div className="password-label-row">
                <label htmlFor="password">Password</label>
                <button type="button" onClick={handleForgotPassword} className="forgot-button">
                  Forgot password?
                </button>
              </div>

              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />

              <button type="submit" className="submit-button" disabled={loading}>
                {loading ? "Logging in…" : "Log in"}
              </button>

              <div className="auth-message" role="alert" aria-live="polite">
                {message}
              </div>
            </form>

            <p className="auth-terms">
              By continuing, you agree to Parla&apos;s Terms and Privacy Policy.
            </p>
          </div>
        </div>
      </section>

      <footer className="auth-footer">© 2026 Parla</footer>
    </main>
  );
}
