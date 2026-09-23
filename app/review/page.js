"use client";

import { useState } from "react";

const items = [
  ["quedar", "to meet / arrange", "Podemos quedar a las siete.", "You understood this expression before, but didn't use it naturally."],
  ["al final", "in the end", "Al final fuimos a otro restaurante.", "Useful for telling stories and explaining how plans changed."],
  ["ya vemos", "we'll see / we'll figure it out", "Ya vemos qué hacemos mañana.", "Common in casual conversation when the plan is not fixed yet."],
];

export default function ReviewPage() {
  const [index, setIndex] = useState(0);
  const [done, setDone] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const item = items[index];

  function next() {
    setShowAnswer(false);
    if (index === items.length - 1) setDone(true);
    else setIndex((value) => value + 1);
  }

  if (done) {
    return (
      <main className="review-page">
        <nav className="lesson-nav">
          <a href="/dashboard" className="lesson-back">← Dashboard</a>
          <a href="/" className="dynamic-logo">parla<span>•</span></a>
        </nav>
        <section className="review-complete">
          <div className="dynamic-eyebrow">Review complete</div>
          <h1>Nice work.</h1>
          <p>You revisited the expressions that still need more active use.</p>
          <a href="/dashboard" className="dynamic-button">Back to learning →</a>
        </section>
      </main>
    );
  }

  return (
    <main className="review-page">
      <nav className="lesson-nav">
        <a href="/dashboard" className="lesson-back">← Dashboard</a>
        <a href="/" className="dynamic-logo">parla<span>•</span></a>
        <span className="dynamic-label">{index + 1} / {items.length}</span>
      </nav>

      <section className="review-shell">
        <div className="dynamic-eyebrow">Review</div>
        <h1>Bring it back.</h1>
        <p className="review-subtitle">Recall the language, then use it in context.</p>

        <div className="review-card">
          <div className="review-word">{item[0]}</div>
          <div className="review-meaning">{item[1]}</div>

          <button type="button" className="dynamic-button" onClick={() => setShowAnswer(true)}>
            {showAnswer ? "Answer shown" : "Show answer"}
          </button>

          {showAnswer && (
            <div className="review-answer">
              <strong>{item[2]}</strong>
              <p>{item[3]}</p>
              <button type="button" className="dynamic-button" onClick={next}>Got it →</button>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
