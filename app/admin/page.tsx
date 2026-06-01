"use client";

import { useState, useEffect } from "react";
import "./admin.css";

type Status = "idle" | "saving" | "saved" | "error";

export default function AdminPage() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  useEffect(() => {
    if (!loggedIn) return;
    fetch("/api/review")
      .then((r) => r.json())
      .then((d) => setUrl(d.url ?? ""));
  }, [loggedIn]);

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (username === "admin" && password === "123asd123") {
      setLoggedIn(true);
      setLoginError("");
    } else {
      setLoginError("Wrong username or password.");
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");
    const res = await fetch("/api/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, url }),
    });
    if (res.ok) {
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 2500);
    } else {
      setStatus("error");
    }
  }

  if (!loggedIn) {
    return (
      <div className="adm-root">
        <form className="adm-form" onSubmit={handleLogin}>
          <p className="adm-brand">PHOTOAUTOMAT</p>
          <h1 className="adm-title">Admin</h1>
          <input
            className="adm-input"
            type="text"
            placeholder="Username"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            className="adm-input"
            type="password"
            placeholder="Password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {loginError && <p className="adm-error">{loginError}</p>}
          <button className="adm-btn" type="submit">LOGIN</button>
        </form>
      </div>
    );
  }

  return (
    <div className="adm-root">
      <form className="adm-form" onSubmit={handleSave}>
        <p className="adm-brand">PHOTOAUTOMAT</p>
        <h1 className="adm-title">Review Link</h1>
        <p className="adm-hint">
          Paste the Google Maps review link below.<br />
          The QR code at <strong>/review</strong> will always point here.
        </p>
        <input
          className="adm-input adm-input--url"
          type="url"
          placeholder="https://maps.app.goo.gl/..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <button
          className={`adm-btn ${status === "saved" ? "adm-btn--saved" : ""}`}
          type="submit"
          disabled={status === "saving"}
        >
          {status === "saving" ? "SAVING..." : status === "saved" ? "SAVED ✓" : "SAVE"}
        </button>
        {status === "error" && <p className="adm-error">Failed to save. Try again.</p>}
        <a className="adm-preview" href="/review" target="_blank" rel="noopener noreferrer">
          Preview /review page ↗
        </a>
      </form>
    </div>
  );
}
