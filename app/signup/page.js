"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const [name, setName] = useState("");
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

  async function signUpWithGoogle() {
    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin + "/auth/callback?next=/onboarding",
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

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: name.trim(),
        },
        emailRedirectTo: window.location.origin + "/auth/callback?next=/onboarding",
      },
    });

    if (error) {
      setLoading(false);
      setMessage(error.message);
      return;
    }

    if (data.session) {
      window.location.href = "/onboarding";
      return;
    }

    setLoading(false);
    setMessage("Check your email to confirm your account, then come back to Parla.");
  }

  return (
    <main className="auth-page">
      <nav className="auth-nav">
        <a href="/" className="auth-logo">parla<span>•</span></a>
        <div className="auth-nav-copy">
          Already learning? <a href="/login">Log in</a>
        </div>
      </nav>

      <section className="auth-main signup-main">
        <div className="auth-wrap">
          <div className="auth-intro">
            <div className="auth-eyebrow">Start your journey</div>
            <h1>Let&apos;s make this yours.</h1>
            <p>
              Tell Parla a little about yourself, and we&apos;ll build your learning experience around you.
            </p>
          </div>

          <div className="auth-card">
            <button
              type="button"
              className="google-button"
              onClick={signUpWithGoogle}
              disabled={loading}
            >
              <span className="google-mark" aria-hidden="true">G</span>
              <span>{loading ? "Connecting…" : "Continue with Google"}</span>
            </button>

            <div className="auth-divider"><span>or create an account with email</span></div>

            <form onSubmit={handleSubmit}>
              <label htmlFor="name">Your name</label>
              <input
                id="name"
                type="text"
                autoComplete="name"
                placeholder="What should we call you?"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />

              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />

              <label htmlFor="password">Create a password</label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                placeholder="Create your password"
                minLength={8}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />

              <div className="password-note">At least 8 characters</div>

              <button type="submit" className="submit-button" disabled={loading}>
                {loading ? "Creating account…" : "Create account"}
              </button>

              <div className="auth-message" role="alert" aria-live="polite">
                {message}
              </div>
            </form>

            <p className="auth-terms">
              By creating an account, you agree to Parla&apos;s Terms and Privacy Policy.
            </p>
          </div>
        </div>
      </section>

      <footer className="auth-footer">© 2026 Parla</footer>
    </main>
  );
}
