"use client";

// Fotografie-experience-funnel voor Rin (YourPersonalPaparazzi). app/rin/page.tsx
// Gebaseerd op yourpersonalpaparazzi.eu: emotioneel, luxe, "be the main
// character of your own story", your own paparazzi, mobile studio, timeless.
// Een experience: lookbook (camera-vriendelijke kleuren) + een step-funnel
// (richting -> locatie -> dromen -> recap die het aanvraagformulier vult).

import { useState, useMemo, CSSProperties } from "react";

const INKT = "#16130f";
const CREME = "#f5f0e8";
const GOUD = "#b89461";
const ZACHT = "#8a8175";
const RAND = "#e6ded0";

type Shoot = "portrait" | "business" | "wedding";
type Loc = "own" | "rin";

const SHOOTS: { k: Shoot; t: string; d: string }[] = [
  { k: "portrait", t: "Portrait", d: "Candid, cinematic and entirely yours. For you, the people you love, or your personal brand." },
  { k: "business", t: "Business", d: "Photography that gives your brand a face: team portraits, atmosphere on location and content that sticks." },
  { k: "wedding", t: "Wedding", d: "Your own paparazzi for the day it all happens. The vows, the glances, the in-between moments you want to keep." },
];

const FEELINGS = ["Warm & intimate", "Bold & editorial", "Candid & playful", "Timeless & classic"];
const TIMING = ["This season", "In a few months", "Just exploring for now"];
const FOCUS: Record<Shoot, { q: string; line: string; opts: string[] }> = {
  portrait: { q: "Who's stepping in front of the lens?", line: "Picture the people you want to remember exactly as they are right now.", opts: ["Just me", "Me & my person", "The whole family", "My personal brand"] },
  business: { q: "What should these images do for you?", line: "Think about where these photos will live, and the feeling they should give.", opts: ["Website & socials", "Team & culture", "Personal brand", "Product & atmosphere"] },
  wedding: { q: "Where are you in the story?", line: "Every love story has its own pace, tell me where yours is.", opts: ["Just engaged", "Planning the day", "An intimate elopement", "Celebrating an anniversary"] },
};

const TOTAL = 6; // richting, locatie, mood, focus, timing, gegevens

export default function RinFotografie() {
  const [step, setStep] = useState(1);
  const [shoot, setShoot] = useState<Shoot | null>(null);
  const [loc, setLoc] = useState<Loc | null>(null);
  const [feeling, setFeeling] = useState("");
  const [focus, setFocus] = useState("");
  const [timing, setTiming] = useState("");

  const [verzonden, setVerzonden] = useState(false);
  const [bezig, setBezig] = useState(false);
  const [f, setF] = useState({ naam: "", email: "", telefoon: "", bericht: "" });

  const veld = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setF((s) => ({ ...s, [k]: e.target.value }));

  // kies + ga zachtjes naar de volgende stap (de keuze licht eerst even op)
  const kies = (fn: (v: string) => void, v: string) => { fn(v); setTimeout(() => setStep((s) => Math.min(s + 1, TOTAL)), 220); };

  const recap = useMemo(() => [
    shoot && { l: "Shoot", v: SHOOTS.find((s) => s.k === shoot)!.t },
    loc && { l: "Location", v: loc === "own" ? "I have a place in mind" : "Rin finds the perfect spot" },
    feeling && { l: "Mood", v: feeling },
    focus && { l: "Focus", v: focus },
    timing && { l: "Timing", v: timing },
  ].filter(Boolean) as { l: string; v: string }[], [shoot, loc, feeling, focus, timing]);

  const briefText = recap.map((r) => `${r.l}: ${r.v}`).join("\n");

  async function verstuur(e: React.FormEvent) {
    e.preventDefault();
    if (!f.naam.trim() || !f.email.trim() || !f.telefoon.trim()) {
      alert("Please fill in your name, email and phone number.");
      return;
    }
    setBezig(true);
    const bericht = briefText + (f.bericht.trim() ? `\n\nNote: ${f.bericht.trim()}` : "");
    try {
      await fetch("/api/rin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ naam: f.naam, email: f.email, telefoon: f.telefoon, type: shoot, bericht }) });
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
  const chip = (on: boolean): CSSProperties => ({ cursor: "pointer", borderRadius: 40, padding: "13px 22px", fontSize: 15, fontWeight: 500, border: `1.5px solid ${on ? GOUD : RAND}`, background: on ? "#faf5ec" : "#fff", color: INKT, transition: "all .15s" });

  // herbruikbare blokjes voor de funnel-stappen
  const StepHead = ({ kicker, q, line }: { kicker: string; q: string; line?: string }) => (
    <div style={{ textAlign: "center", marginBottom: 26 }}>
      <span style={eyebrow}>{kicker}</span>
      <h3 style={{ ...serif, fontSize: "clamp(26px,3.4vw,38px)", fontWeight: 500, margin: "10px 0 8px" }}>{q}</h3>
      {line && <p style={{ color: ZACHT, fontSize: 16, lineHeight: 1.6, maxWidth: 520, margin: "0 auto" }}>{line}</p>}
    </div>
  );
  const Chips = ({ opts, val, set }: { opts: string[]; val: string; set: (v: string) => void }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center" }}>
      {opts.map((o) => <button key={o} type="button" onClick={() => kies(set, o)} style={chip(val === o)}>{o}</button>)}
    </div>
  );
  const Back = () => step > 1 && !verzonden ? (
    <button type="button" onClick={() => setStep((s) => Math.max(1, s - 1))} style={{ background: "none", border: "none", color: ZACHT, cursor: "pointer", fontSize: 13, letterSpacing: ".08em", marginTop: 26, fontFamily: "inherit" }}>← Back</button>
  ) : null;

  return (
    <main style={{ background: CREME, color: INKT, fontFamily: "'Inter', system-ui, sans-serif" }}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Inter:wght@400;500;600&display=swap" />
      <style>{`@keyframes rinUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}`}</style>

      {/* HERO */}
      <section style={{ position: "relative", background: "radial-gradient(120% 120% at 70% 10%, #2b251d 0%, #16130f 55%, #0b0907 100%)", color: "#fff", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 78% 28%, rgba(184,148,97,.22), transparent 45%)" }} />
        <div style={{ ...sec, position: "relative", padding: "92px 24px 86px", textAlign: "center" }}>
          <span style={eyebrow}>Hi, I&apos;m Rin · Photographer based in the Netherlands</span>
          <h1 style={{ ...serif, fontSize: "clamp(44px,7vw,86px)", fontWeight: 500, lineHeight: 1.05, margin: "24px auto 0", maxWidth: 820, letterSpacing: "-.01em" }}>
            Be the <span style={{ fontStyle: "italic", color: GOUD }}>main character</span> of your own story.
          </h1>
          <p style={{ fontSize: 19, color: "rgba(255,255,255,.8)", maxWidth: 560, margin: "26px auto 34px", lineHeight: 1.65, fontWeight: 300 }}>
            Your own personal paparazzi. Portraits, brands and weddings captured exactly as they are, the kind that look just as beautiful today as they will twenty years from now.
          </p>
          <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
            <a href="#experience" style={knop}>Design your shoot</a>
            <a href="#lookbook" style={knopLicht}>The lookbook</a>
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
            <p style={{ color: ZACHT, fontSize: 17, lineHeight: 1.6 }}>Three directions, the same eye for the people and the moments that matter.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px,1fr))", gap: 26 }}>
            {SHOOTS.map((c) => (
              <div key={c.k} style={{ background: "#fff", border: `1px solid ${RAND}`, borderRadius: 4, padding: "36px 32px" }}>
                <div style={{ width: 46, height: 46, borderRadius: "50%", background: INKT, color: GOUD, display: "flex", alignItems: "center", justifyContent: "center", ...serif, fontSize: 24, fontWeight: 600, marginBottom: 22 }}>{c.t[0]}</div>
                <h3 style={{ ...serif, fontSize: 27, fontWeight: 500, marginBottom: 12 }}>{c.t} photography</h3>
                <p style={{ color: ZACHT, fontSize: 15.5, lineHeight: 1.65 }}>{c.d}</p>
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

      {/* LOOKBOOK */}
      <section id="lookbook" style={{ padding: "78px 0" }}>
        <div style={sec}>
          <div style={{ textAlign: "center", maxWidth: 640, margin: "0 auto 46px" }}>
            <span style={eyebrow}>The lookbook</span>
            <h2 style={{ ...serif, fontSize: "clamp(30px,4vw,46px)", fontWeight: 500, margin: "14px 0 12px" }}>Colours that love the camera</h2>
            <p style={{ color: ZACHT, fontSize: 16.5, lineHeight: 1.6 }}>A little secret: the lens sees colour differently than your mirror. These tones photograph beautifully, soft, rich and true to skin.</p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px,1fr))", gap: 26 }}>
            {/* favorieten */}
            <div style={{ background: "#fff", border: `1px solid ${RAND}`, borderRadius: 6, padding: "30px 30px 34px" }}>
              <h3 style={{ ...serif, fontSize: 24, fontWeight: 600, marginBottom: 4 }}>Camera favourites</h3>
              <p style={{ color: ZACHT, fontSize: 14, marginBottom: 22 }}>Wear these and you&apos;ll glow.</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(88px,1fr))", gap: 16 }}>
                {[
                  ["Cream", "#efe7d8"], ["Camel", "#c2a06a"], ["Sage", "#9aa088"], ["Olive", "#6f7350"],
                  ["Dusty blue", "#8aa0b4"], ["Deep navy", "#2c3a4f"], ["Terracotta", "#b07a5b"], ["Mauve", "#a08a96"], ["Charcoal", "#3a3a3c"],
                ].map(([n, c]) => (
                  <div key={n} style={{ textAlign: "center" }}>
                    <div style={{ height: 58, borderRadius: 4, background: c, border: "1px solid rgba(0,0,0,.06)" }} />
                    <div style={{ fontSize: 12, color: ZACHT, marginTop: 7 }}>{n}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* wear with care */}
            <div style={{ background: "#1c1814", color: "#fff", borderRadius: 6, padding: "30px 30px 34px" }}>
              <h3 style={{ ...serif, fontSize: 24, fontWeight: 600, marginBottom: 4, color: "#fff" }}>Wear with care</h3>
              <p style={{ color: "rgba(255,255,255,.6)", fontSize: 14, marginBottom: 22 }}>Gorgeous in real life, tricky for the lens.</p>
              <div style={{ display: "grid", gap: 16 }}>
                {[
                  ["Bright red", "#c0392b", "Glows and bleeds under most lenses, it can tint everything around it."],
                  ["Neon & highlighter", "#c6ff2e", "Reflects onto the skin and pulls the eye away from your face."],
                  ["Pure white", "#ffffff", "Can blow out in bright light, soft cream holds its detail better."],
                  ["Tiny busy patterns", "repeating-linear-gradient(45deg,#444 0 6px,#ddd 6px 12px)", "Fine stripes and checks shimmer (moiré) on camera."],
                ].map(([n, c, why]) => (
                  <div key={n} style={{ display: "flex", gap: 14, alignItems: "center" }}>
                    <div style={{ flex: "0 0 46px", height: 46, borderRadius: 4, background: c, border: "1px solid rgba(255,255,255,.15)" }} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14.5, color: "#fff" }}>{n}</div>
                      <div style={{ color: "rgba(255,255,255,.62)", fontSize: 13, lineHeight: 1.45 }}>{why}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <p style={{ textAlign: "center", color: ZACHT, marginTop: 26, ...serif, fontStyle: "italic", fontSize: 18 }}>
            Not sure what to wear? Tell me your vibe in the form below, I&apos;ll help you style it.
          </p>
        </div>
      </section>

      {/* EXPERIENCE FUNNEL */}
      <section id="experience" style={{ background: "linear-gradient(180deg,#fbf7ef 0%,#f5f0e8 100%)", borderTop: `1px solid ${RAND}`, padding: "80px 0" }}>
        <div style={{ maxWidth: 680, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ textAlign: "center", marginBottom: 30 }}>
            <span style={eyebrow}>An experience, not a form</span>
            <h2 style={{ ...serif, fontSize: "clamp(30px,4vw,46px)", fontWeight: 500, margin: "12px 0 10px" }}>Let&apos;s design your shoot</h2>
            <p style={{ color: ZACHT, fontSize: 16.5, lineHeight: 1.6 }}>A few gentle questions, and your shoot takes shape as we go.</p>
          </div>

          {/* progress */}
          {!verzonden && (
            <div style={{ marginBottom: 28 }}>
              <div style={{ height: 3, background: RAND, borderRadius: 3, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${(step / TOTAL) * 100}%`, background: GOUD, transition: "width .35s ease" }} />
              </div>
              <div style={{ fontSize: 12, color: ZACHT, letterSpacing: ".1em", marginTop: 9, textTransform: "uppercase" }}>Step {step} of {TOTAL}</div>
            </div>
          )}

          {/* recap die meegroeit */}
          {recap.length > 0 && !verzonden && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 22 }}>
              {recap.map((r) => (
                <span key={r.l} style={{ background: "#fff", border: `1px solid ${RAND}`, borderRadius: 40, padding: "6px 14px", fontSize: 12.5, color: INKT }}>
                  <span style={{ color: GOUD, fontWeight: 600 }}>{r.l}</span> · {r.v}
                </span>
              ))}
            </div>
          )}

          <div style={{ background: "#fff", border: `1px solid ${RAND}`, borderRadius: 8, padding: "40px 32px", boxShadow: "0 18px 50px -30px rgba(40,30,15,.4)" }}>
            {verzonden ? (
              <div style={{ textAlign: "center", animation: "rinUp .4s ease" }}>
                <div style={{ fontSize: 42, color: GOUD }}>✦</div>
                <h3 style={{ ...serif, fontSize: 30, fontWeight: 500, margin: "12px 0 8px" }}>Thank you, {f.naam.split(" ")[0] || "lovely"}!</h3>
                <p style={{ color: ZACHT, fontSize: 16, maxWidth: 420, margin: "0 auto" }}>Your story is in. I&apos;ll be in touch very soon to plan your {shoot ? SHOOTS.find((s) => s.k === shoot)!.t.toLowerCase() : ""} shoot.</p>
              </div>
            ) : (
              <div key={step} style={{ animation: "rinUp .35s ease" }}>
                {step === 1 && (<>
                  <StepHead kicker="First, the big one" q="What are we creating?" line="Choose the direction that makes your heart beat a little faster." />
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px,1fr))", gap: 14 }}>
                    {SHOOTS.map((s) => (
                      <button key={s.k} type="button" onClick={() => kies((v) => setShoot(v as Shoot), s.k)} style={{ ...chip(shoot === s.k), borderRadius: 6, padding: "22px 16px", textAlign: "left", display: "flex", flexDirection: "column", gap: 6 }}>
                        <span style={{ ...serif, fontSize: 22, fontWeight: 600 }}>{s.t}</span>
                        <span style={{ fontSize: 13, color: ZACHT, fontWeight: 400, lineHeight: 1.45 }}>{s.d}</span>
                      </button>
                    ))}
                  </div>
                </>)}

                {step === 2 && (<>
                  <StepHead kicker="The setting" q="Where does this happen?" line="A place full of meaning, or shall we find the perfect spot together?" />
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                    {([["own", "I have a place in mind", "Home, a favourite spot, somewhere that means something."], ["rin", "Rin finds the spot", "I scout the perfect location to match your vibe."]] as const).map(([k, t, d]) => (
                      <button key={k} type="button" onClick={() => kies((v) => setLoc(v as Loc), k)} style={{ ...chip(loc === k), borderRadius: 6, padding: "22px 18px", textAlign: "left", display: "flex", flexDirection: "column", gap: 6 }}>
                        <span style={{ ...serif, fontSize: 20, fontWeight: 600 }}>{t}</span>
                        <span style={{ fontSize: 13, color: ZACHT, fontWeight: 400, lineHeight: 1.45 }}>{d}</span>
                      </button>
                    ))}
                  </div>
                </>)}

                {step === 3 && (<>
                  <StepHead kicker="The feeling" q="What mood are you after?" line="Close your eyes for a second, what do these photos feel like?" />
                  <Chips opts={FEELINGS} val={feeling} set={setFeeling} />
                </>)}

                {step === 4 && (<>
                  <StepHead kicker="The focus" q={shoot ? FOCUS[shoot].q : "What matters most?"} line={shoot ? FOCUS[shoot].line : undefined} />
                  <Chips opts={shoot ? FOCUS[shoot].opts : []} val={focus} set={setFocus} />
                </>)}

                {step === 5 && (<>
                  <StepHead kicker="The timing" q="When are you dreaming of?" line="No rush, just a feeling for when this should happen." />
                  <Chips opts={TIMING} val={timing} set={setTiming} />
                </>)}

                {step === 6 && (
                  <form onSubmit={verstuur}>
                    <StepHead kicker="Almost there" q="Where can I reach you?" line="Your shoot is taking shape, leave your details and I&apos;ll bring it to life." />
                    {recap.length > 0 && (
                      <div style={{ background: "#faf5ec", border: `1px solid ${RAND}`, borderRadius: 6, padding: "16px 18px", marginBottom: 18 }}>
                        <div style={{ fontSize: 11.5, letterSpacing: ".12em", textTransform: "uppercase", color: GOUD, fontWeight: 600, marginBottom: 8 }}>Your shoot so far</div>
                        {recap.map((r) => (
                          <div key={r.l} style={{ fontSize: 14, color: INKT, lineHeight: 1.7 }}><span style={{ color: ZACHT }}>{r.l}:</span> {r.v}</div>
                        ))}
                      </div>
                    )}
                    <label style={{ ...label, marginTop: 0 }}>Name *</label>
                    <input style={input} value={f.naam} onChange={veld("naam")} required />
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                      <div><label style={label}>Email *</label><input style={input} type="email" value={f.email} onChange={veld("email")} required /></div>
                      <div><label style={label}>Phone *</label><input style={input} type="tel" value={f.telefoon} onChange={veld("telefoon")} required /></div>
                    </div>
                    <label style={label}>Anything else you&apos;d love me to know?</label>
                    <textarea style={{ ...input, minHeight: 84, resize: "vertical" }} value={f.bericht} onChange={veld("bericht")} placeholder="A date, a dream, the people, the why..." />
                    <button type="submit" disabled={bezig} style={{ ...knop, width: "100%", justifyContent: "center", marginTop: 24, opacity: bezig ? 0.7 : 1 }}>
                      {bezig ? "Sending…" : "Send my request"}
                    </button>
                    <p style={{ textAlign: "center", fontSize: 12.5, color: ZACHT, marginTop: 14 }}>No obligations. I usually reply within a day.</p>
                  </form>
                )}

                <div style={{ textAlign: "center" }}><Back /></div>
              </div>
            )}
          </div>
        </div>
      </section>

      <footer style={{ background: "#0d0b09", color: "rgba(255,255,255,.65)", padding: "46px 0", textAlign: "center" }}>
        <div style={sec}>
          <div style={{ ...serif, fontSize: 23, color: "#fff", fontWeight: 500, letterSpacing: ".02em" }}>Your<span style={{ color: GOUD }}>Personal</span>Paparazzi</div>
          <p style={{ ...serif, fontSize: 16, fontStyle: "italic", marginTop: 10 }}>Be the main character of your own story.</p>
          <p style={{ fontSize: 12.5, marginTop: 14, letterSpacing: ".04em" }}>Portrait · business · wedding photography · The Netherlands</p>
        </div>
      </footer>
    </main>
  );
}
