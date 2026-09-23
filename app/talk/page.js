"use client";

import { useState } from "react";

export default function TalkPage() {
  const [messages, setMessages] = useState([
    { role: "parla", text: "Cuéntame, ¿qué hiciste este fin de semana?" },
    { role: "you", text: "Fui a caminar con unos amigos y después comimos en un restaurante nuevo." },
    { role: "parla", text: "Suena bien. ¿Qué tipo de comida probaron?" },
  ]);
  const [text, setText] = useState("");

  function send() {
    const value = text.trim();
    if (!value) return;

    setMessages((current) => [
      ...current,
      { role: "you", text: value },
      { role: "parla", text: "Interesting. Tell me a little more about that." },
    ]);
    setText("");
  }

  return (
    <main className="talk-page">
      <nav className="lesson-nav">
        <a href="/dashboard" className="lesson-back">← Dashboard</a>
        <a href="/" className="dynamic-logo">parla<span>•</span></a>
        <span className="talk-status">Natural conversation</span>
      </nav>

      <section className="talk-shell">
        <div className="dynamic-eyebrow">Just Talk</div>
        <h1>Say what you want.</h1>
        <p className="talk-subtitle">No script. No lesson plan. Parla listens for what you need next.</p>

        <div className="conversation-card">
          {messages.map((message, index) => (
            <div key={`${message.role}-${index}`} className={`message-row ${message.role}`}>
              <span className="message-name">{message.role === "parla" ? "Parla" : "You"}</span>
              <div className="message-bubble">{message.text}</div>
            </div>
          ))}

          <div className="composer">
            <textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  send();
                }
              }}
              placeholder="Say something…"
              aria-label="Message Parla"
            />
            <button type="button" className="dynamic-button" onClick={send}>Send</button>
          </div>
        </div>

        <div className="talk-note">
          <strong>Parla won't interrupt you to correct every mistake.</strong>
          <span>Your conversation becomes part of your learning.</span>
        </div>
      </section>
    </main>
  );
}
