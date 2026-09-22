"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const languages = [
  ["Spanish", "Español", "ES", "es"],
  ["English", "English", "EN", "en"],
  ["Portuguese", "Português", "PT", "pt"],
  ["French", "Français", "FR", "fr"],
  ["Italian", "Italiano", "IT", "it"],
  ["German", "Deutsch", "DE", "de"],
  ["Japanese", "日本語", "日", "ja"],
  ["Korean", "한국어", "한", "ko"],
  ["Mandarin", "普通话", "中", "zh"],
  ["Arabic", "العربية", "ع", "ar"],
  ["Other", "Another language", "+", null],
];

const levels = [
  ["A0", "Starting from zero", "Very new to the language."],
  ["A1", "Beginner", "You know a few words and simple phrases."],
  ["A2", "Elementary", "You can handle familiar everyday situations."],
  ["B1", "Intermediate", "You can communicate, but still search for words."],
  ["B2+", "Upper intermediate", "You can have real conversations with some gaps."],
];

const goals = [
  ["Travel", "Get around and connect while traveling."],
  ["Real conversation", "Feel natural talking to real people."],
  ["Culture & connection", "Understand people, media, and culture."],
  ["Work", "Use the language professionally."],
  ["Something personal", "Learn for your own reason."],
];

const interests = [
  "Travel", "Food", "Music", "Movies", "Sports", "Fitness",
  "Technology", "Business", "Nature", "Gaming", "Books", "Everyday life",
];

const stepLabels = [
  "Choose a language",
  "Your background",
  "Your level",
  "Your goal",
  "Your interests",
  "You're ready",
];

export default function OnboardingPage() {
  const supabase = useMemo(() => createClient(), []);
  const [step, setStep] = useState(1);
  const [targetLanguage, setTargetLanguage] = useState("");
  const [nativeLanguage, setNativeLanguage] = useState("");
  const [level, setLevel] = useState("");
  const [goal, setGoal] = useState("");
  const [selectedInterests, setSelectedInterests] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const canContinue =
    (step === 1 && !!targetLanguage) ||
    (step === 2 && !!nativeLanguage) ||
    (step === 3 && !!level) ||
    (step === 4 && !!goal) ||
    (step === 5 && selectedInterests.length > 0) ||
    step === 6;

  function nextStep() {
    if (!canContinue || step === 6) return;
    setError("");
    setStep((current) => current + 1);
  }

  function previousStep() {
    setError("");
    setStep((current) => Math.max(1, current - 1));
  }

  function toggleInterest(interest) {
    setSelectedInterests((current) =>
      current.includes(interest)
        ? current.filter((item) => item !== interest)
        : [...current, interest]
    );
  }

  async function finishOnboarding() {
    setSaving(true);
    setError("");

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = "/login";
      return;
    }

    const target = languages.find(([name]) => name === targetLanguage);
    const native = languages.find(([name]) => name === nativeLanguage);

    if (!target || !target[3]) {
      setError("Please choose a supported learning language.");
      setSaving(false);
      return;
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .upsert({
        id: user.id,
        display_name:
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.email?.split("@")[0] ||
          "Learner",
        native_language_code: native?.[3] || null,
        goal,
        interests: selectedInterests,
      });

    if (profileError) {
      setError(profileError.message);
      setSaving(false);
      return;
    }

    const { data: language, error: languageError } = await supabase
      .from("languages")
      .select("id")
      .eq("code", target[3])
      .single();

    if (languageError || !language) {
      setError(languageError?.message || "Could not find that language.");
      setSaving(false);
      return;
    }

    const { error: learnerError } = await supabase
      .from("learner_languages")
      .upsert({
        user_id: user.id,
        language_id: language.id,
        level: level === "B2+" ? "B2" : level,
        goal,
        interests: selectedInterests,
        is_current: true,
      });

    if (learnerError) {
      setError(learnerError.message);
      setSaving(false);
      return;
    }

    window.location.href = "/dashboard";
  }

  return (
    <div className="onboarding-page">
      <nav className="onboarding-nav">
        <a href="/" className="logo">parla<span>•</span></a>
        <div className="save-text">Build your learning path</div>
      </nav>

      <div className="progress-wrap">
        <div className="progress-top">
          <span>{stepLabels[step - 1]}</span>
          <span>{step} of 6</span>
        </div>
        <div className="progress-track">
          <div
            className="progress-bar"
            style={{ width: `${(step / 6) * 100}%` }}
          />
        </div>
      </div>

      <main className="onboarding-main">
        <div className="onboarding-shell">
          {step === 1 && (
            <Step title="What do you want to learn first?" eyebrow="Your languages" description="Start with one language. You can add as many others as you want later.">
              <div className="language-grid">
                {languages.filter(([name]) => name !== "Other").map(([name, native, code]) => (
                  <button
                    key={name}
                    type="button"
                    className={`language-card ${targetLanguage === name ? "selected" : ""}`}
                    onClick={() => setTargetLanguage(name)}
                  >
                    <span className="language-check">{targetLanguage === name ? "✓" : ""}</span>
                    <span className="language-icon">{code}</span>
                    <span className="language-name">{name}</span>
                    <span className="language-native">{native}</span>
                  </button>
                ))}
              </div>
            </Step>
          )}

          {step === 2 && (
            <Step title="What language do you speak?" eyebrow="Your background" description="This helps Parla explain things in a way that makes sense to you.">
              <div className="language-grid">
                {languages.map(([name, native, code]) => (
                  <button
                    key={name}
                    type="button"
                    className={`language-card ${nativeLanguage === name ? "selected" : ""}`}
                    onClick={() => setNativeLanguage(name)}
                  >
                    <span className="language-check">{nativeLanguage === name ? "✓" : ""}</span>
                    <span className="language-icon">{code}</span>
                    <span className="language-name">{name}</span>
                    <span className="language-native">{native}</span>
                  </button>
                ))}
              </div>
            </Step>
          )}

          {step === 3 && (
            <Step title="Where are you right now?" eyebrow="Your level" description="Choose the level that feels closest. Parla will keep adjusting as you learn.">
              <div className="big-options">
                {levels.map(([value, title, subtitle]) => (
                  <button
                    key={value}
                    type="button"
                    className={`big-option ${level === value ? "selected" : ""}`}
                    onClick={() => setLevel(value)}
                  >
                    <span className="big-icon">{value}</span>
                    <span className="big-copy">
                      <span className="big-title">{title}</span>
                      <span className="big-sub">{subtitle}</span>
                    </span>
                    <span className="radio" />
                  </button>
                ))}
              </div>
            </Step>
          )}

          {step === 4 && (
            <Step title="What do you want this language for?" eyebrow="Your goal" description="Your goal changes what Parla teaches, practices, and brings back later.">
              <div className="big-options">
                {goals.map(([value, subtitle]) => (
                  <button
                    key={value}
                    type="button"
                    className={`big-option ${goal === value ? "selected" : ""}`}
                    onClick={() => setGoal(value)}
                  >
                    <span className="big-icon">{String(goals.indexOf(goals.find((g) => g[0] === value)) + 1).padStart(2, "0")}</span>
                    <span className="big-copy">
                      <span className="big-title">{value}</span>
                      <span className="big-sub">{subtitle}</span>
                    </span>
                    <span className="radio" />
                  </button>
                ))}
              </div>
            </Step>
          )}

          {step === 5 && (
            <Step title="What are you into?" eyebrow="Your interests" description="Pick a few things you actually care about. They will shape your lessons and conversations.">
              <div className="options">
                {interests.map((interest) => (
                  <button
                    key={interest}
                    type="button"
                    className={`option ${selectedInterests.includes(interest) ? "selected" : ""}`}
                    onClick={() => toggleInterest(interest)}
                  >
                    <span className="option-check">{selectedInterests.includes(interest) ? "✓" : ""}</span>
                    <span className="option-title">{interest}</span>
                    <span className="option-sub">Use it in real life.</span>
                  </button>
                ))}
              </div>
              <div className="multi-note">Choose as many as you like.</div>
            </Step>
          )}

          {step === 6 && (
            <section className="finish">
              <div className="finish-mark">✓</div>
              <div className="eyebrow"><span className="eyebrow-dot" /> Your path</div>
              <h1>You’re ready to start.</h1>
              <p>Parla will use what you told us to shape what you learn next.</p>
              <div className="language-preview">
                <span className="preview-pill">{targetLanguage}</span>
                <span className="preview-pill">{level}</span>
                <span className="preview-pill">{goal}</span>
                {selectedInterests.slice(0, 3).map((interest) => (
                  <span key={interest} className="preview-pill">{interest}</span>
                ))}
              </div>
            </section>
          )}

          {error && (
            <div className="onboarding-error" role="alert">
              {error}
            </div>
          )}

          <div className="controls">
            <button
              type="button"
              className="back-btn"
              onClick={previousStep}
              disabled={step === 1 || saving}
            >
              Back
            </button>

            {step < 6 ? (
              <button
                type="button"
                className="continue-btn"
                onClick={nextStep}
                disabled={!canContinue || saving}
              >
                Continue
              </button>
            ) : (
              <button
                type="button"
                className="start-btn"
                onClick={finishOnboarding}
                disabled={saving}
              >
                {saving ? "Saving…" : "Start learning"}
              </button>
            )}
          </div>
        </div>
      </main>

      <style jsx global>{`
        .onboarding-page {
          min-height: 100vh;
          background: #f7f7f4;
          color: #171717;
          -webkit-font-smoothing: antialiased;
        }
        .onboarding-nav {
          height: 82px;
          padding: 0 5vw;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .onboarding-nav .logo {
          color: #171717;
          text-decoration: none;
          font-size: 27px;
          font-weight: 700;
          letter-spacing: -1.5px;
        }
        .onboarding-nav .logo span { color: #536dff; }
        .save-text { color: #777773; font-size: 13px; }
        .progress-wrap { width: min(100% - 40px, 760px); margin: 8px auto 0; }
        .progress-top { display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; color:#777773; font-size:11px; font-weight:600; }
        .progress-track { width:100%; height:4px; background:#e8e8e2; border-radius:999px; overflow:hidden; }
        .progress-bar { height:100%; background:#536dff; border-radius:999px; transition:width .3s ease; }
        .onboarding-main { display:flex; justify-content:center; padding:55px 20px 80px; }
        .onboarding-shell { width:100%; max-width:760px; }
        .step-header { text-align:center; margin-bottom:38px; }
        .eyebrow { display:inline-flex; align-items:center; gap:8px; padding:8px 12px; margin-bottom:18px; border-radius:999px; background:#edf0ff; color:#536dff; font-size:12px; font-weight:700; }
        .eyebrow-dot { width:6px; height:6px; border-radius:50%; background:#536dff; }
        .step-header h1, .finish h1 { font-size:clamp(38px,6vw,56px); line-height:.98; letter-spacing:-3px; font-weight:700; margin:0 0 16px; }
        .step-header p, .finish p { max-width:530px; margin:0 auto; color:#777773; font-size:16px; line-height:1.6; }
        .language-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; }
        .language-card { position:relative; min-height:118px; padding:20px; border:1px solid #e5e5df; border-radius:22px; background:#fff; color:#171717; text-align:left; transition:.2s ease; }
        .language-card:hover { border-color:#c9c9c2; transform:translateY(-2px); }
        .language-card.selected { border-color:#536dff; background:#edf0ff; box-shadow:0 0 0 2px rgba(83,109,255,.08); }
        .language-icon { font-size:24px; margin-bottom:12px; display:block; }
        .language-name { display:block; font-size:15px; font-weight:650; margin-bottom:4px; }
        .language-native { color:#777773; font-size:12px; }
        .language-check, .option-check { display:flex; align-items:center; justify-content:center; }
        .language-check { position:absolute; top:14px; right:14px; width:19px; height:19px; border-radius:50%; border:1px solid #d8d8d1; font-size:11px; color:white; }
        .language-card.selected .language-check { border-color:#536dff; background:#536dff; }
        .big-options { display:grid; gap:12px; max-width:620px; margin:0 auto; }
        .big-option { position:relative; padding:21px 24px; border:1px solid #e5e5df; border-radius:22px; background:#fff; color:#171717; text-align:left; display:flex; align-items:center; gap:18px; transition:.2s ease; }
        .big-option:hover { border-color:#c9c9c2; transform:translateY(-1px); }
        .big-option.selected { border-color:#536dff; background:#edf0ff; }
        .big-icon { width:44px; height:44px; flex:0 0 44px; border-radius:14px; background:#f2f2ed; display:flex; align-items:center; justify-content:center; font-size:16px; font-weight:700; }
        .big-option.selected .big-icon { background:white; }
        .big-copy { flex:1; }
        .big-title { display:block; font-size:15px; font-weight:650; margin-bottom:4px; }
        .big-sub { display:block; color:#777773; font-size:12px; line-height:1.45; }
        .radio { width:20px; height:20px; flex:0 0 20px; border:1px solid #d2d2cb; border-radius:50%; position:relative; }
        .selected .radio { border-color:#536dff; }
        .selected .radio::after { content:""; position:absolute; inset:4px; background:#536dff; border-radius:50%; }
        .options { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; }
        .option { position:relative; min-height:105px; padding:20px; border:1px solid #e5e5df; border-radius:22px; background:#fff; color:#171717; text-align:left; transition:.2s ease; }
        .option:hover { border-color:#c9c9c2; transform:translateY(-2px); }
        .option.selected { border-color:#536dff; background:#edf0ff; }
        .option-check { position:absolute; top:14px; right:14px; width:19px; height:19px; border-radius:50%; border:1px solid #d8d8d1; color:white; font-size:11px; }
        .option.selected .option-check { border-color:#536dff; background:#536dff; }
        .option-title { display:block; font-size:15px; font-weight:650; margin-bottom:5px; }
        .option-sub { display:block; color:#777773; font-size:12px; line-height:1.4; }
        .multi-note { text-align:center; margin-top:14px; color:#777773; font-size:11px; }
        .controls { max-width:620px; margin:38px auto 0; display:flex; align-items:center; justify-content:space-between; }
        .back-btn { border:0; background:transparent; color:#777773; font-size:14px; font-weight:600; padding:12px 0; }
        .back-btn:disabled { opacity:.35; cursor:not-allowed; }
        .back-btn:not(:disabled):hover { color:#171717; }
        .continue-btn, .start-btn { min-width:145px; height:52px; padding:0 24px; border:0; border-radius:16px; background:#171717; color:white; font-size:14px; font-weight:700; transition:.2s ease; }
        .continue-btn:not(:disabled):hover, .start-btn:not(:disabled):hover { background:#292929; transform:translateY(-1px); box-shadow:0 8px 20px rgba(23,23,23,.12); }
        .continue-btn:disabled, .start-btn:disabled { opacity:.35; cursor:not-allowed; }
        .finish { text-align:center; padding-top:25px; }
        .finish-mark { width:72px; height:72px; margin:0 auto 25px; border-radius:24px; background:#edf0ff; color:#536dff; display:flex; align-items:center; justify-content:center; font-size:28px; font-weight:700; }
        .language-preview { display:flex; justify-content:center; flex-wrap:wrap; gap:8px; margin:25px auto 0; }
        .preview-pill { padding:8px 12px; border-radius:999px; background:white; border:1px solid #e5e5df; font-size:12px; font-weight:600; }
        .onboarding-error { max-width:620px; margin:20px auto 0; padding:12px 14px; border-radius:14px; background:#fff1ee; border:1px solid #f1c9c0; color:#9b4a3b; font-size:13px; line-height:1.45; }
        @media (max-width:800px) {
          .onboarding-nav { height:70px; padding:0 22px; }
          .onboarding-nav .logo { font-size:25px; }
          .save-text { font-size:12px; }
          .progress-wrap { width:calc(100% - 32px); margin-top:5px; }
          .onboarding-main { padding:42px 16px 60px; }
          .step-header { margin-bottom:28px; }
          .step-header h1, .finish h1 { font-size:42px; letter-spacing:-2px; }
          .step-header p, .finish p { font-size:14px; }
          .language-grid, .options { grid-template-columns:repeat(2,1fr); gap:10px; }
          .language-card { min-height:105px; padding:17px; }
          .option { min-height:96px; padding:17px; }
          .option-title, .language-name { font-size:14px; }
          .option-sub, .language-native { font-size:11px; }
          .big-option { padding:18px; gap:13px; }
          .big-icon { width:40px; height:40px; flex-basis:40px; font-size:14px; }
          .controls { margin-top:28px; }
          .continue-btn, .start-btn { min-width:130px; }
        }
        @media (max-width:430px) {
          .language-card { min-height:98px; }
          .option { min-height:88px; }
          .language-check, .option-check { top:10px; right:10px; }
          .step-header h1, .finish h1 { font-size:38px; }
        }
      `}
      </style>
    </div>
  );
}

function Step({ title, eyebrow, description, children }) {
  return (
    <section>
      <div className="step-header">
        <div className="eyebrow">
          <span className="eyebrow-dot" />
          {eyebrow}
        </div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {children}
    </section>
  );
}
