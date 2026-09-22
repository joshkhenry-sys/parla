'use client';

import { useState } from "react";

const languages = [
  ["Spanish", "blue", "blue"],
  ["English", "coral", "coral"],
  ["French", "green", "green"],
  ["Japanese", "purple", "purple"],
  ["Italian", "gold", "gold"],
  ["Portuguese", "teal", "teal"],
];

export default function Home() {
  const [activeLanguage, setActiveLanguage] = useState("Spanish");

  return (
    <div className="page">
      <header className="container">
        <nav>
          <a href="/" className="logo">parla<span className="logo-dot">•</span></a>

          <div className="nav-center">
            <a href="#why">Why Parla</a>
            <a href="#experience">Experience</a>
            <a href="#languages">Languages</a>
          </div>

          <div className="nav-right">
            <a href="/login" className="login">Log in</a>
            <a href="/signup" className="nav-cta">Get started</a>
          </div>
        </nav>
      </header>

      <section className="hero container">
        <div className="eyebrow">
          <span className="eyebrow-mark" />
          A new kind of language learning
        </div>

        <h1>
          Learn a language.<br />
          <span className="blue">Actually use it.</span>
        </h1>

        <p className="hero-copy">
          Parla adapts to the way you learn, what you care about,
          and the language you actually want to use in the real world.
        </p>

        <div className="hero-actions">
          <a href="/signup" className="primary-button">
            Start learning
            <span className="arrow">→</span>
          </a>

          <a href="#experience" className="secondary-button">
            See how it works
          </a>
        </div>

        <div className="language-area" id="languages">
          <div className="language-label">Choose your language</div>

          <div className="language-list">
            {languages.map(([name, dotClass]) => (
              <button
                key={name}
                type="button"
                className={`language ${activeLanguage === name ? "active" : ""}`}
                onClick={() => setActiveLanguage(name)}
                aria-pressed={activeLanguage === name}
              >
                <span className={`language-dot dot-${dotClass}`} />
                {name}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="intro" id="experience">
        <div className="container intro-grid">
          <div>
            <div className="section-kicker">Learning that adapts</div>

            <h2>Your language journey shouldn't look like everyone else's.</h2>

            <p className="intro-description">
              Parla pays attention to what you know, what you struggle with,
              and what you want to be able to say. Then it changes what comes next.
            </p>
          </div>

          <div className="experience-card">
            <div className="card-header">
              <span>YOUR LEARNING PATH</span>

              <div className="status">
                <span className="status-dot" />
                Adapting
              </div>
            </div>

            <div className="lesson-card">
              <div className="lesson-top">
                <span className="lesson-tag">FOR YOU</span>
                <span className="lesson-time">8 min</span>
              </div>

              <h3>Making plans</h3>

              <p>
                Useful expressions for making plans,
                changing them, and sounding natural.
              </p>

              <div className="lesson-progress">
                <span />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="features" id="why">
        <div className="container">
          <div className="features-heading">
            <div className="section-kicker">The Parla difference</div>

            <h2>
              Less studying.<br />
              More becoming fluent.
            </h2>

            <p>
              Parla isn't built around finishing lessons.
              It's built around becoming someone who can actually use another language.
            </p>
          </div>

          <div className="feature-grid">
            <article className="feature">
              <div className="feature-number">01</div>
              <div>
                <div className="feature-line blue-line" />
                <h3>Learn what matters</h3>
                <p>
                  Start with language that fits your life,
                  interests, goals, and current level.
                </p>
              </div>
            </article>

            <article className="feature">
              <div className="feature-number">02</div>
              <div>
                <div className="feature-line coral-line" />
                <h3>Practice naturally</h3>
                <p>
                  Build the words and patterns you need
                  before you're expected to use them.
                </p>
              </div>
            </article>

            <article className="feature">
              <div className="feature-number">03</div>
              <div>
                <div className="feature-line green-line" />
                <h3>Speak with confidence</h3>
                <p>
                  Have real conversations, get useful feedback,
                  and let Parla remember what you need next.
                </p>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="final container">
        <div className="final-card">
          <h2>
            Your language.<br />
            Your way.
          </h2>

          <p>
            Start with a language. Parla will figure out
            how to help you move forward.
          </p>

          <a href="/signup" className="final-button">
            Start learning →
          </a>
        </div>
      </section>

      <footer>
        <div className="container footer-inner">
          <div className="footer-copy">© 2026 Parla</div>

          <div className="footer-links">
            <a href="#">Privacy</a>
            <a href="#">Terms</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
