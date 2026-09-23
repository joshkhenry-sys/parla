"use client";

import { useState } from "react";

const steps = [
  {
    type: "learn",
    title: "Make plans naturally",
    subtitle: "Useful language for making, changing, and confirming plans.",
  },
  {
    type: "practice",
    title: "Choose the natural response",
    subtitle: "You are making plans with a friend for tonight.",
  },
  {
    type: "produce",
    title: "Build your own sentence",
    subtitle: "Write a natural response using the expression you just learned.",
  },
  {
    type: "speak",
    title: "Now use it",
    subtitle: "Tell Parla what your plans are for this weekend.",
  },
];

export default function LessonPage() {
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState(null);
  const current = steps[step];

  function next() {
    setSelected(null);
    setStep((value) => Math.min(value + 1, steps.length - 1));
  }

  return (
    <main className="lesson-page">
      <nav className="lesson-nav">
        <a href="/dashboard" className="lesson-back">← Dashboard</a>
        <a href="/" className="dynamic-logo">parla<span>•</span></a>
        <span className="lesson-progress-label">{step + 1} / {steps.length}</span>
      </nav>

      <div className="lesson-progress-track">
        <div className="lesson-progress-value" style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
      </div>

      <section className="lesson-shell">
        <div className="dynamic-eyebrow">{current.type}</div>
        <h1>{current.title}</h1>
        <p className="lesson-subtitle">{current.subtitle}</p>

        {step === 0 && (
          <div className="lesson-card-stack">
            <div className="teaching-card">
              <span className="teaching-label">Useful language</span>
              <h2>¿Qué te parece si…?</h2>
              <p>Use this when suggesting an idea or making a plan feel collaborative.</p>
              <div className="example">
                <strong>¿Qué te parece si cenamos a las ocho?</strong>
                <span>What do you think about having dinner at eight?</span>
              </div>
            </div>

            <div className="teaching-card">
              <span className="teaching-label">Another useful pattern</span>
              <h2>¿Estás libre…?</h2>
              <p>A natural way to ask whether someone is available.</p>
              <div className="example">
                <strong>¿Estás libre el sábado?</strong>
                <span>Are you free Saturday?</span>
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="exercise-card">
            <div className="context">You want to suggest getting dinner together.</div>
            {["¿Qué te parece si cenamos?", "¿Qué cenas tú?", "¿Dónde está el restaurante?"].map((answer) => (
              <button
                key={answer}
                type="button"
                className={`answer-option ${selected === answer ? "selected" : ""}`}
                onClick={() => setSelected(answer)}
              >
                {answer}
              </button>
            ))}
            {selected && (
              <div className="feedback">
                {selected === "¿Qué te parece si cenamos?"
                  ? "Exactly. That is the natural suggestion."
                  : "Not quite. Think about the expression you just learned for making a suggestion."}
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="exercise-card">
            <label className="exercise-label" htmlFor="production">Complete your response</label>
            <textarea id="production" className="production-input" placeholder="Write what you would actually say…" />
            <div className="feedback neutral">
              Parla will compare your answer with natural expressions, not just one “correct” sentence.
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="speak-card">
            <div className="speak-orb">●</div>
            <h2>Talk for 30–60 seconds.</h2>
            <p>Tell Parla about your plans. Don't worry about being perfect. Focus on communicating.</p>
            <button type="button" className="dynamic-button" onClick={() => setStep(3)}>
              Start speaking →
            </button>
          </div>
        )}

        <div className="lesson-actions">
          <button type="button" className="lesson-secondary" onClick={() => setStep((value) => Math.max(0, value - 1))} disabled={step === 0}>
            Back
          </button>
          {step < steps.length - 1 && (
            <button type="button" className="dynamic-button" onClick={next} disabled={step === 1 && !selected}>
              Continue →
            </button>
          )}
          {step === steps.length - 1 && (
            <a href="/dashboard" className="dynamic-button">Finish lesson →</a>
          )}
        </div>
      </section>
    </main>
  );
}
