"use client";

// Fotografie-funnel voor Rin (YourPersonalPaparazzi). app/rin/page.tsx
// Gebaseerd op yourpersonalpaparazzi.eu: emotioneel, luxe, "be the main
// character of your own story", your own paparazzi, mobile studio, timeless.

import { useState, CSSProperties } from "react";

const INKT = "#16130f";
const CREME = "#f5f0e8";
const GOUD = "#b89461";
const ZACHT = "#8a8175";
const RAND = "#e6ded0";

export default function RinFotografie() {
  const [type, setType] = useState<"portrait" | "business">("portrait");
  const [verzonden, setVerzonden] = useState(false);
  const [bezig, setBezig] = useState(false);
  const [f, setF] = useState({ naam: "", email: "", telefoon: "", bericht: "" });

  const veld = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setF((s) => ({ ...s, [k]: e.target.value }));

  async function verstuur(e: React.FormEvent) {
    e.preventDefault();
    if (!f.naam.trim() || !f.email.trim() || !f.telefoon.trim()) {
      alert("Please fill in your name, email and phone number.");
      return;
    }
    setBezig(true);
    try {
      await fetch("/api/rin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...f, type }) });
    } catch { /* never block */ }
    setVerzonden(true);
  }

  const serif: CSSProperties = { fontFamily: "'Cormorant Garamond', Georgia, serif" };
  const knop: CSSProperties = { display: "inline-flex", alignItems: "center", gap: 9, background: GOUD, color: "#16130f", fontWeight: 600, fontSize: 14, letterSpacing: ".14em", textTransform: "uppercase", border: "none", borderRadius: 2, padding: "16px 30px", cursor: "pointer", textDecoration: "none" };
  const knopLicht: CSSProperties = { ...knop, background: "transparent", color: "#fff", border: "1px solid rgba(255,255,255,.35)" };
  const sec: CSSProperties = { maxWidth: 1080, margin: "0 auto", padding: "0 24px" };
  const eyebrow: CSSProperties = { fontSize: 12, fontWeight: 600, letterSpacing: ".26em", textTransform: "uppercase", color: GOUD };
  const label: CSSProperties = { display: "block", fontSize: 11.5, fontWeight: 600, color: ZACHT, margin: "18px 0 7px", letterSpacing: ".12em", textTransform: "uppercase" };
  const input: CSSProperties = { width: "100%", border: `1px solid ${RAND}`, borderRadius: 2, padding: "13px 15px", fontSize: 15, background: "#fff", color: INKT, fontFamily: "inherit" };

  return (
    <main style={{ background: CREME, color: INKT, fontFamily: "'Inter', system-ui, sans-serif" }}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Inter:wght@400;500;600&display=swap" />

      {/* HERO */}
      <section style={{ position: "relative", background: "radial-gradient(120% 120% at 70% 10%, #2b251d 0%, #16130f 55%, #0b0907 100%)", color: "#fff", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 78% 28%, rgba(184,148,97,.22), transparent 45%)" }} />
        <div style={{ ...sec, position: "relative", padding: "92px 24px 86px", textAlign: "center" }}>
          <span style={eyebrow}>Hi, I&apos;m Rin · Photographer based in the Netherlands</span>
          <h1 style={{ ...serif, fontSize: "clamp(44px,7vw,86px)", fontWeight: 500, lineHeight: 1.05, margin: "24px auto 0", maxWidth: 820, letterSpacing: "-.01em" }}>
            Be the <span style={{ fontStyle: "italic", color: GOUD }}>main character</span> of your own story.
          </h1>
          <p style={{ fontSize: 19, color: "rgba(255,255,255,.8)", maxWidth: 560, margin: "26px auto 34px", lineHeight: 1.65, fontWeight: 300 }}>
            Your own personal paparazzi. Portraits that capture you exactly as you are, the kind that look just as beautiful today as they will twenty years from now.
          </p>
          <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
            <a href="#book" style={knop}>Book your shoot</a>
            <a href="#work" style={knopLicht}>See what I do</a>
          </div>
        </div>
      </section>

      {/* QUOTE */}
      <section style={{ background: "#fff", borderBottom: `1px solid ${RAND}`, padding: "58px 0", textAlign: "center" }}>
        <div style={{ ...sec, maxWidth: 720 }}>
          <p style={{ ...serif, fontSize: "clamp(24px,3.4vw,34px)", fontStyle: "italic", fontWeight: 400, lineHeight: 1.4, color: INKT }}>
            &ldquo;A portrait that looks good today, as well as twenty years from now.&rdquo;
          </p>
          <div style={{ width: 40, height: 1, background: GOUD, margin: "22px auto 0" }} />
        </div>
      </section>

      {/* WORK / DIENSTEN */}
      <section id="work" style={{ padding: "76px 0" }}>
        <div style={sec}>
          <div style={{ textAlign: "center", maxWidth: 620, margin: "0 auto 48px" }}>
            <span style={eyebrow}>Portraits &amp; your own paparazzi</span>
            <h2 style={{ ...serif, fontSize: "clamp(30px,4vw,46px)", fontWeight: 500, margin: "14px 0 14px" }}>What I capture</h2>
            <p style={{ color: ZACHT, fontSize: 17, lineHeight: 1.6 }}>Two directions, the same eye for the people and the moments that matter.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px,1fr))", gap: 26 }}>
            {[
              { t: "Portrait photography", d: "Candid, cinematic and entirely yours. Whether it&apos;s for you, the people you love, or your personal brand, I make sure you feel like the star you already are." },
              { t: "Business photography", d: "Photography that gives your brand a face: striking team portraits, atmosphere on location and content that makes your business impossible to forget." },
            ].map((c) => (
              <div key={c.t} style={{ background: "#fff", border: `1px solid ${RAND}`, borderRadius: 4, padding: "36px 32px" }}>
                <div style={{ width: 46, height: 46, borderRadius: "50%", background: INKT, color: GOUD, display: "flex", alignItems: "center", justifyContent: "center", ...serif, fontSize: 24, fontWeight: 600, marginBottom: 22 }}>{c.t[0]}</div>
                <h3 style={{ ...serif, fontSize: 27, fontWeight: 500, marginBottom: 12 }}>{c.t}</h3>
                <p style={{ color: ZACHT, fontSize: 15.5, lineHeight: 1.65 }} dangerouslySetInnerHTML={{ __html: c.d }} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHY */}
      <section style={{ background: "linear-gradient(180deg,#1c1814 0%,#16130f 100%)", color: "#fff", padding: "72px 0" }}>
        <div style={sec}>
          <div style={{ textAlign: "center", maxWidth: 560, margin: "0 auto 44px" }}>
            <span style={eyebrow}>Why it works</span>
            <h2 style={{ ...serif, fontSize: "clamp(28px,3.6vw,40px)", fontWeight: 500, marginTop: 14, color: "#fff" }}>More than a photo</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px,1fr))", gap: 30 }}>
            {[
              ["Your own paparazzi", "Candid, never stiff. I catch the real, in-between moments, the ones you actually want to keep."],
              ["A mobile studio", "My studio comes to you, so your portraits go further than what most photographers can offer."],
              ["Timeless by design", "Light and styling that age gracefully. Beautiful now, beautiful in twenty years."],
              ["At ease, always", "Even if you hate being photographed, I make it feel effortless and genuinely you."],
            ].map(([t, d]) => (
              <div key={t}>
                <div style={{ width: 34, height: 1, background: GOUD, marginBottom: 16 }} />
                <h3 style={{ ...serif, fontSize: 21, fontWeight: 500, marginBottom: 8, color: "#fff" }}>{t}</h3>
                <p style={{ color: "rgba(255,255,255,.7)", fontSize: 14.5, lineHeight: 1.6, fontWeight: 300 }}>{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BOOK */}
      <section id="book" style={{ padding: "80px 0" }}>
        <div style={{ maxWidth: 640, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ textAlign: "center", marginBottom: 34 }}>
            <span style={eyebrow}>No strings attached</span>
            <h2 style={{ ...serif, fontSize: "clamp(30px,4vw,46px)", fontWeight: 500, margin: "14px 0 12px" }}>Book your shoot</h2>
            <p style={{ color: ZACHT, fontSize: 16.5, lineHeight: 1.6 }}>Leave your details and I&apos;ll reach out soon to talk through your story and plan your session.</p>
          </div>

          {verzonden ? (
            <div style={{ background: "#fff", border: `1px solid ${RAND}`, borderRadius: 4, padding: "46px 30px", textAlign: "center" }}>
              <div style={{ fontSize: 40, color: GOUD }}>✦</div>
              <h3 style={{ ...serif, fontSize: 28, fontWeight: 500, margin: "12px 0 8px" }}>Thank you, {f.naam.split(" ")[0] || "lovely"}!</h3>
              <p style={{ color: ZACHT }}>Your request is in. I&apos;ll be in touch soon to plan your shoot.</p>
            </div>
          ) : (
            <form onSubmit={verstuur} style={{ background: "#fff", border: `1px solid ${RAND}`, borderRadius: 4, padding: "34px 30px" }}>
              <div style={{ ...label, marginTop: 0 }}>What are you looking for?</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {([["portrait", "Portrait"], ["business", "Business"]] as const).map(([k, lbl]) => (
                  <button type="button" key={k} onClick={() => setType(k)} style={{ cursor: "pointer", borderRadius: 2, padding: "14px 12px", fontSize: 14.5, fontWeight: 600, letterSpacing: ".04em", border: `1.5px solid ${type === k ? GOUD : RAND}`, background: type === k ? "#faf5ec" : "#fff", color: INKT }}>{lbl}</button>
                ))}
              </div>

              <label style={label}>Name *</label>
              <input style={input} value={f.naam} onChange={veld("naam")} required />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div><label style={label}>Email *</label><input style={input} type="email" value={f.email} onChange={veld("email")} required /></div>
                <div><label style={label}>Phone *</label><input style={input} type="tel" value={f.telefoon} onChange={veld("telefoon")} required /></div>
              </div>
              <label style={label}>The story you want to capture</label>
              <textarea style={{ ...input, minHeight: 92, resize: "vertical" }} value={f.bericht} onChange={veld("bericht")} placeholder="Tell me a little about the moment, the occasion or your brand..." />

              <button type="submit" disabled={bezig} style={{ ...knop, width: "100%", justifyContent: "center", marginTop: 24, opacity: bezig ? 0.7 : 1 }}>
                {bezig ? "Sending…" : "Send my request"}
              </button>
              <p style={{ textAlign: "center", fontSize: 12.5, color: ZACHT, marginTop: 14 }}>No obligations. I usually reply within a day.</p>
            </form>
          )}
        </div>
      </section>

      <footer style={{ background: "#0d0b09", color: "rgba(255,255,255,.65)", padding: "46px 0", textAlign: "center" }}>
        <div style={sec}>
          <div style={{ ...serif, fontSize: 23, color: "#fff", fontWeight: 500, letterSpacing: ".02em" }}>Your<span style={{ color: GOUD }}>Personal</span>Paparazzi</div>
          <p style={{ ...serif, fontSize: 16, fontStyle: "italic", marginTop: 10 }}>Be the main character of your own story.</p>
          <p style={{ fontSize: 12.5, marginTop: 14, letterSpacing: ".04em" }}>Portrait &amp; business photography · The Netherlands</p>
        </div>
      </footer>
    </main>
  );
}
