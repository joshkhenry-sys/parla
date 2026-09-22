export default function Home() {
  return (
    <main className="home">
      <nav className="nav">
        <a href="/" className="logo">parla</a>
        <div className="nav-actions">
          <a href="/login" className="login-link">Log in</a>
          <a href="/signup" className="signup-button">Get started</a>
        </div>
      </nav>

      <section className="hero">
        <p className="eyebrow">A smarter way to learn</p>
        <h1>Learn a language.<br />Actually use it.</h1>
        <p className="subhead">
          Parla helps you build real-world language skills through learning,
          practice, conversation, and feedback that adapts to you.
        </p>

        <div className="hero-actions">
          <a href="/signup" className="primary-button">Start learning</a>
          <a href="#experience" className="secondary-button">See how it works</a>
        </div>
      </section>

      <section id="experience" className="experience">
        <p className="eyebrow">Learn differently</p>
        <h2>Less memorizing.<br />More becoming fluent.</h2>
      </section>
    </main>
  );
}
