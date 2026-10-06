"use client";

import { useState } from "react";

export default function LeadForm() {
  const [state, setState] = useState("idle"); // idle | sending | done | error

  async function submit(e) {
    e.preventDefault();
    setState("sending");
    const f = new FormData(e.target);
    try {
      const r = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(f.entries())),
      });
      setState(r.ok ? "done" : "error");
    } catch {
      setState("error");
    }
  }

  if (state === "done")
    return (
      <div className="panel" id="pilot">
        <div className="label" style={{ color: "#000", fontWeight: 600 }}>REQUEST RECEIVED</div>
        <p style={{ fontSize: 13, color: "#666", lineHeight: 1.7, margin: "12px 0 0" }}>
          Thanks — we reply personally within 2 business days from
          info@photoautomat.hu. Check your spam folder just in case.
        </p>
      </div>
    );

  return (
    <form className="panel" id="pilot" onSubmit={submit}>
      <div className="panel-grid">
        <div className="field"><span className="label">Name *</span>
          <input name="name" required maxLength={120} /></div>
        <div className="field"><span className="label">Email *</span>
          <input name="email" type="email" required maxLength={200} /></div>
        <div className="field"><span className="label">Country / city</span>
          <input name="country" maxLength={80} placeholder="Budapest, HU" /></div>
        <div className="field"><span className="label">How many booths?</span>
          <input name="booths" maxLength={80} placeholder="1 planned / 3 running" /></div>
      </div>
      <div className="field" style={{ marginTop: 16 }}>
        <span className="label">Hardware you own or plan to buy</span>
        <input name="hardware" maxLength={300}
               placeholder="e.g. Canon 2000D, DNP DS-RX1, Nayax VPOS — or nothing yet" />
      </div>
      <div className="field" style={{ marginTop: 16 }}>
        <span className="label">Anything else</span>
        <input name="message" maxLength={2000} />
      </div>
      {/* honeypot */}
      <input name="website" tabIndex={-1} autoComplete="off"
             style={{ position: "absolute", left: -9999, top: -9999 }} aria-hidden />
      <div className="actions" style={{ marginTop: 20, alignItems: "center" }}>
        <button disabled={state === "sending"}>
          {state === "sending" ? "Sending…" : "Request pilot access"}
        </button>
        {state === "error" && (
          <span className="label" style={{ color: "#d62828" }}>
            Could not send — email us at info@photoautomat.hu
          </span>
        )}
      </div>
    </form>
  );
}
