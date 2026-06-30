"use client";

// Landingspagina + funnel voor Rin (YourPersonalPaparazzi). app/rin/page.tsx
// Insteek: last-minute trouwfotografie (binnen 5 dagen) + fly-on-the-wall +
// ontzorgen. Kloppend hart: "een hele dag in 8 foto's" zodat een twijfelende
// bezoeker direct ziet wat 'ie krijgt en aanhaakt op de eigen emotie.
// NL als hoofdtaal met een EN-schakelaar rechtsboven. Conversie-gericht: één
// doel = aanvraag. Foto's komen uit Supabase-bucket rin-portfolio (zacht falend).

import { useState, useEffect, useMemo, CSSProperties } from "react";

const INKT = "#16130f";
const CREME = "#f5f0e8";
const GOUD = "#b89461";
const ZACHT = "#8a8175";
const RAND = "#e6ded0";

type Occ = "bruiloft" | "portret" | "anders";
type Lang = "nl" | "en";

const COPY = {
  nl: {
    lastminute: "Last-minute? Binnen 5 dagen vastgelegd",
    navBook: "Plan jullie dag",
    heroEyebrow: "Last-minute trouwfotograaf · binnen 5 dagen",
    heroH1a: "Jullie mooiste dag,",
    heroH1b: "precies zoals 'ie was.",
    heroSub: "Een fly on the wall, geen regisseur. Geen poseren, geen gedoe. Jullie regelen niets · ik leg jullie dag vast en jullie houden 'm voor altijd. Ook last-minute, binnen 5 dagen.",
    heroCta: "Check mijn beschikbaarheid",
    heroCta2: "Een hele dag in 8 foto's",
    heroTrust: "Binnen 5 dagen mogelijk · jullie regelen niets · galerij snel in je inbox",
    storyEyebrow: "Een hele dag in 8 foto's",
    storyTitle: "Dit is wat jullie krijgen",
    storyIntro: "Van de eerste zenuwen tot het laatste stuk taart. Geen geposeerde plaatjes, maar de echte momenten · precies zoals jullie ze zullen herinneren.",
    captions: [
      "De zenuwen, het opmaken, de stilte voor de storm.",
      "De jurk · de details waar maanden in zaten.",
      "Even nog jezelf, vlak voor de grote stap.",
      "Onderweg, op weg naar het moment.",
      "Elkaar aankijken, alsof de rest verdwijnt.",
      "De pure vreugde · niets geposeerd.",
      "Het eerste stuk taart, de eerste lach van de avond.",
      "En dan, heel even, alleen jullie twee.",
    ],
    whyTitle: "Jullie leven de dag. Ik vang 'm.",
    why: [
      ["Fly on the wall", "Ik val niet op en stuur niet. Ik vang de echte momenten, precies zoals ze gebeuren."],
      ["Last-minute kan", "Een vrije agenda betekent dat ik er binnen 5 dagen kan zijn. Ook als het snel moet."],
      ["Jullie regelen niets", "Ik plan, ik kom, ik lever. Jullie hoeven alleen jullie dag te beleven."],
      ["Snel in je inbox", "Een eerste selectie van de mooiste momenten, razendsnel terug."],
    ],
    funnelEyebrow: "Even kennismaken",
    funnelTitle: "Laten we jullie dag vastleggen",
    funnelSub: "Een paar korte vragen, dan neem ik snel persoonlijk contact op.",
    step: "Stap", of: "van", back: "← Terug",
    q1: "Waarvoor zoek je me?",
    occasions: [
      ["bruiloft", "Bruiloft", "Last-minute kan · binnen 5 dagen"],
      ["portret", "Portret", "Jij, zoals je echt bent"],
      ["anders", "Een ander moment", "Familie, feest of mijlpaal"],
    ],
    q2: "Wanneer dromen jullie van?",
    q2line: "Geen stress als het snel moet · daar ben ik juist goed in.",
    whenOpts: ["Binnen 5 dagen 🔥", "Deze maand", "Over een paar maanden", "Weet ik nog niet"],
    q3: "Waar kan ik je bereiken?",
    q3line: "Jullie dag krijgt vorm · laat je gegevens achter en ik breng 'm tot leven.",
    recapTitle: "Jullie aanvraag tot nu toe",
    rOcc: "Gelegenheid", rWhen: "Wanneer",
    name: "Naam", email: "E-mail", phone: "Telefoon",
    noteLabel: "Vertel kort over jullie dag",
    notePh: "De datum, de locatie, de mensen, het gevoel...",
    submit: "Verstuur mijn aanvraag", sending: "Versturen…",
    noob: "Vrijblijvend. Meestal reageer ik binnen een dag.",
    thanks: "Bedankt", thanksSub: "Jullie aanvraag is binnen. Ik neem snel persoonlijk contact op om jullie dag in te plannen.",
    fillAlert: "Vul je naam, e-mail en telefoonnummer in.",
    footerTag: "Be the main character of your own story.",
    footerSub: "Trouw- · portret- · bedrijfsfotografie · Nederland",
  },
  en: {
    lastminute: "Last-minute? Captured within 5 days",
    navBook: "Plan your day",
    heroEyebrow: "Last-minute wedding photographer · within 5 days",
    heroH1a: "Your most beautiful day,",
    heroH1b: "exactly as it was.",
    heroSub: "A fly on the wall, never a director. No posing, no fuss. You arrange nothing · I capture your day and you keep it forever. Last-minute too, within 5 days.",
    heroCta: "Check my availability",
    heroCta2: "A whole day in 8 photos",
    heroTrust: "Possible within 5 days · you arrange nothing · gallery fast in your inbox",
    storyEyebrow: "A whole day in 8 photos",
    storyTitle: "This is what you get",
    storyIntro: "From the first nerves to the last slice of cake. Not posed pictures, but the real moments · exactly as you'll remember them.",
    captions: [
      "The nerves, getting ready, the calm before it all.",
      "The dress · the details that took months.",
      "A last moment as yourself, before the big step.",
      "On the way, toward the moment.",
      "Looking at each other, like the rest disappears.",
      "Pure joy · nothing posed.",
      "The first slice of cake, the first laugh of the night.",
      "And then, just for a moment, only the two of you.",
    ],
    whyTitle: "You live the day. I keep it.",
    why: [
      ["Fly on the wall", "I don't stand out and I don't direct. I catch the real moments, exactly as they happen."],
      ["Last-minute works", "An open agenda means I can be there within 5 days. Even when it has to be quick."],
      ["You arrange nothing", "I plan, I show up, I deliver. All you do is live your day."],
      ["Fast in your inbox", "A first selection of the most beautiful moments, back in no time."],
    ],
    funnelEyebrow: "Let's meet",
    funnelTitle: "Let's capture your day",
    funnelSub: "A few quick questions, then I'll personally get back to you fast.",
    step: "Step", of: "of", back: "← Back",
    q1: "What are you looking for?",
    occasions: [
      ["bruiloft", "Wedding", "Last-minute possible · within 5 days"],
      ["portret", "Portrait", "You, as you really are"],
      ["anders", "Another moment", "Family, party or milestone"],
    ],
    q2: "When are you dreaming of?",
    q2line: "No stress if it's soon · that's exactly my thing.",
    whenOpts: ["Within 5 days 🔥", "This month", "In a few months", "Not sure yet"],
    q3: "Where can I reach you?",
    q3line: "Your day is taking shape · leave your details and I'll bring it to life.",
    recapTitle: "Your request so far",
    rOcc: "Occasion", rWhen: "When",
    name: "Name", email: "Email", phone: "Phone",
    noteLabel: "Tell me a little about your day",
    notePh: "The date, the location, the people, the feeling...",
    submit: "Send my request", sending: "Sending…",
    noob: "No obligations. I usually reply within a day.",
    thanks: "Thank you", thanksSub: "Your request is in. I'll personally be in touch very soon to plan your day.",
    fillAlert: "Please fill in your name, email and phone number.",
    footerTag: "Be the main character of your own story.",
    footerSub: "Wedding · portrait · business photography · The Netherlands",
  },
} as const;

const TOTAL = 3;

export default function RinFotografie() {
  const [lang, setLang] = useState<Lang>("nl");
  const t = COPY[lang];

  const [hero, setHero] = useState<string | null>(null);
  const [dag, setDag] = useState<string[]>([]);

  const [step, setStep] = useState(1);
  const [occ, setOcc] = useState<Occ | null>(null);
  const [when, setWhen] = useState("");
  const [verzonden, setVerzonden] = useState(false);
  const [bezig, setBezig] = useState(false);
  const [f, setF] = useState({ naam: "", email: "", telefoon: "", bericht: "" });

  useEffect(() => {
    fetch("/api/rin-fotos").then((r) => r.json()).then((d) => {
      setHero(d.hero || null);
      setDag(Array.isArray(d.dag) ? d.dag : []);
    }).catch(() => {});
  }, []);

  const veld = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setF((s) => ({ ...s, [k]: e.target.value }));

  const kies = (fn: (v: string) => void, v: string) => { fn(v); setTimeout(() => setStep((s) => Math.min(s + 1, TOTAL)), 220); };
  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  const occLabel = occ ? (t.occasions.find((o) => o[0] === occ)?.[1] ?? "") : "";
  const recap = useMemo(() => [
    occ && { l: t.rOcc, v: occLabel },
    when && { l: t.rWhen, v: when },
  ].filter(Boolean) as { l: string; v: string }[], [occ, when, lang]); // eslint-disable-line

  async function verstuur(e: React.FormEvent) {
    e.preventDefault();
    if (!f.naam.trim() || !f.email.trim() || !f.telefoon.trim()) { alert(t.fillAlert); return; }
    setBezig(true);
    const brief = recap.map((r) => `${r.l}: ${r.v}`).join("\n") + (f.bericht.trim() ? `\n\n${f.bericht.trim()}` : "");
    try {
      await fetch("/api/rin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ naam: f.naam, email: f.email, telefoon: f.telefoon, type: occ, bericht: brief }) });
    } catch { /* never block */ }
    setVerzonden(true);
  }

  const serif: CSSProperties = { fontFamily: "'Cormorant Garamond', Georgia, serif" };
  const knop: CSSProperties = { display: "inline-flex", alignItems: "center", gap: 9, background: GOUD, color: "#16130f", fontWeight: 600, fontSize: 14, letterSpacing: ".12em", textTransform: "uppercase", border: "none", borderRadius: 2, padding: "16px 28px", cursor: "pointer", textDecoration: "none" };
  const knopLicht: CSSProperties = { ...knop, background: "transparent", color: "#fff", border: "1px solid rgba(255,255,255,.4)" };
  const sec: CSSProperties = { maxWidth: 1120, margin: "0 auto", padding: "0 24px" };
  const eyebrow: CSSProperties = { fontSize: 12, fontWeight: 600, letterSpacing: ".24em", textTransform: "uppercase", color: GOUD };
  const label: CSSProperties = { display: "block", fontSize: 11.5, fontWeight: 600, color: ZACHT, margin: "18px 0 7px", letterSpacing: ".1em", textTransform: "uppercase" };
  const input: CSSProperties = { width: "100%", border: `1px solid ${RAND}`, borderRadius: 2, padding: "13px 15px", fontSize: 15, background: "#fff", color: INKT, fontFamily: "inherit" };
  const chip = (on: boolean): CSSProperties => ({ cursor: "pointer", borderRadius: 40, padding: "13px 22px", fontSize: 15, fontWeight: 500, border: `1.5px solid ${on ? GOUD : RAND}`, background: on ? "#faf5ec" : "#fff", color: INKT });

  return (
    <main style={{ background: CREME, color: INKT, fontFamily: "'Inter', system-ui, sans-serif" }}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Inter:wght@400;500;600&display=swap" />
      <style>{`@keyframes rinUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}`}</style>

      {/* TOPBAR */}
      <div style={{ position: "sticky", top: 0, zIndex: 30, background: "rgba(13,11,9,.9)", backdropFilter: "blur(8px)", borderBottom: "1px solid rgba(255,255,255,.08)" }}>
        <div style={{ ...sec, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 24px" }}>
          <span style={{ ...serif, fontSize: 18, color: "#fff", fontWeight: 500 }}>Your<span style={{ color: GOUD }}>Personal</span>Paparazzi</span>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ display: "flex", gap: 2, fontSize: 12.5, fontWeight: 600, letterSpacing: ".06em" }}>
              {(["nl", "en"] as const).map((l, i) => (
                <span key={l} style={{ display: "flex", alignItems: "center" }}>
                  {i > 0 && <span style={{ color: "rgba(255,255,255,.3)", margin: "0 2px" }}>/</span>}
                  <button onClick={() => setLang(l)} style={{ background: "none", border: "none", cursor: "pointer", padding: "2px 4px", color: lang === l ? GOUD : "rgba(255,255,255,.55)", fontWeight: lang === l ? 700 : 500, fontFamily: "inherit", fontSize: 12.5 }}>{l.toUpperCase()}</button>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* HERO */}
      <section style={{ position: "relative", color: "#fff", minHeight: "min(86vh, 760px)", display: "flex", alignItems: "center", overflow: "hidden", background: "#16130f" }}>
        {hero && <div style={{ position: "absolute", inset: 0, backgroundImage: `url(${hero})`, backgroundSize: "cover", backgroundPosition: "center 35%" }} />}
        <div style={{ position: "absolute", inset: 0, background: hero ? "linear-gradient(180deg, rgba(13,11,9,.55) 0%, rgba(13,11,9,.35) 40%, rgba(13,11,9,.82) 100%)" : "radial-gradient(120% 120% at 70% 10%, #2b251d 0%, #16130f 60%, #0b0907 100%)" }} />
        <div style={{ ...sec, position: "relative", padding: "70px 24px", textAlign: "center" }}>
          <span style={eyebrow}>{t.heroEyebrow}</span>
          <h1 style={{ ...serif, fontSize: "clamp(40px,6.4vw,80px)", fontWeight: 500, lineHeight: 1.04, margin: "20px auto 0", maxWidth: 860, letterSpacing: "-.01em", textShadow: "0 2px 30px rgba(0,0,0,.4)" }}>
            {t.heroH1a} <span style={{ fontStyle: "italic", color: GOUD }}>{t.heroH1b}</span>
          </h1>
          <p style={{ fontSize: 18, color: "rgba(255,255,255,.88)", maxWidth: 600, margin: "24px auto 32px", lineHeight: 1.6, fontWeight: 300, textShadow: "0 1px 14px rgba(0,0,0,.5)" }}>{t.heroSub}</p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={() => scrollTo("funnel")} style={knop}>{t.heroCta}</button>
            <button onClick={() => scrollTo("verhaal")} style={knopLicht}>{t.heroCta2}</button>
          </div>
          <p style={{ fontSize: 12.5, color: "rgba(255,255,255,.72)", marginTop: 26, letterSpacing: ".03em" }}>{t.heroTrust}</p>
        </div>
      </section>

      {/* EEN HELE DAG IN 8 FOTO'S */}
      <section id="verhaal" style={{ padding: "76px 0 84px" }}>
        <div style={sec}>
          <div style={{ textAlign: "center", maxWidth: 640, margin: "0 auto 46px" }}>
            <span style={eyebrow}>{t.storyEyebrow}</span>
            <h2 style={{ ...serif, fontSize: "clamp(30px,4vw,46px)", fontWeight: 500, margin: "12px 0 12px" }}>{t.storyTitle}</h2>
            <p style={{ color: ZACHT, fontSize: 16.5, lineHeight: 1.6 }}>{t.storyIntro}</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 18 }}>
            {t.captions.map((cap, i) => {
              const url = dag[i] || null;
              return (
                <figure key={i} style={{ margin: 0 }}>
                  <div style={{ position: "relative", aspectRatio: "4 / 5", borderRadius: 5, overflow: "hidden", background: "#ece3d4", border: `1px solid ${RAND}` }}>
                    {url ? (
                      <img src={url} alt={cap} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                    ) : (
                      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: GOUD, ...serif, fontSize: 30, opacity: 0.5 }}>✦</div>
                    )}
                    <span style={{ position: "absolute", top: 10, left: 12, ...serif, fontSize: 17, fontWeight: 600, color: "#fff", textShadow: "0 1px 8px rgba(0,0,0,.6)" }}>{String(i + 1).padStart(2, "0")}</span>
                  </div>
                  <figcaption style={{ color: ZACHT, lineHeight: 1.45, marginTop: 10, ...serif, fontStyle: "italic", fontSize: 16 }}>{cap}</figcaption>
                </figure>
              );
            })}
          </div>
        </div>
      </section>

      {/* WAAROM / ONTZORGEN */}
      <section style={{ background: "linear-gradient(180deg,#1c1814 0%,#16130f 100%)", color: "#fff", padding: "72px 0" }}>
        <div style={sec}>
          <div style={{ textAlign: "center", maxWidth: 600, margin: "0 auto 44px" }}>
            <h2 style={{ ...serif, fontSize: "clamp(28px,3.6vw,42px)", fontWeight: 500, color: "#fff" }}>{t.whyTitle}</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px,1fr))", gap: 30 }}>
            {t.why.map(([tt, d]) => (
              <div key={tt}>
                <div style={{ width: 34, height: 1, background: GOUD, marginBottom: 16 }} />
                <h3 style={{ ...serif, fontSize: 21, fontWeight: 500, marginBottom: 8, color: "#fff" }}>{tt}</h3>
                <p style={{ color: "rgba(255,255,255,.7)", fontSize: 14.5, lineHeight: 1.6, fontWeight: 300 }}>{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FUNNEL */}
      <section id="funnel" style={{ background: "linear-gradient(180deg,#fbf7ef 0%,#f5f0e8 100%)", borderTop: `1px solid ${RAND}`, padding: "80px 0" }}>
        <div style={{ maxWidth: 660, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ textAlign: "center", marginBottom: 30 }}>
            <span style={eyebrow}>{t.funnelEyebrow}</span>
            <h2 style={{ ...serif, fontSize: "clamp(30px,4vw,46px)", fontWeight: 500, margin: "12px 0 10px" }}>{t.funnelTitle}</h2>
            <p style={{ color: ZACHT, fontSize: 16.5, lineHeight: 1.6 }}>{t.funnelSub}</p>
          </div>

          {!verzonden && (
            <div style={{ marginBottom: 26 }}>
              <div style={{ height: 3, background: RAND, borderRadius: 3, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${(step / TOTAL) * 100}%`, background: GOUD, transition: "width .35s ease" }} />
              </div>
              <div style={{ fontSize: 12, color: ZACHT, letterSpacing: ".1em", marginTop: 9, textTransform: "uppercase" }}>{t.step} {step} {t.of} {TOTAL}</div>
            </div>
          )}

          {recap.length > 0 && !verzonden && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
              {recap.map((r) => (
                <span key={r.l} style={{ background: "#fff", border: `1px solid ${RAND}`, borderRadius: 40, padding: "6px 14px", fontSize: 12.5, color: INKT }}>
                  <span style={{ color: GOUD, fontWeight: 600 }}>{r.l}</span> · {r.v}
                </span>
              ))}
            </div>
          )}

          <div style={{ background: "#fff", border: `1px solid ${RAND}`, borderRadius: 8, padding: "38px 30px", boxShadow: "0 18px 50px -30px rgba(40,30,15,.45)" }}>
            {verzonden ? (
              <div style={{ textAlign: "center", animation: "rinUp .4s ease" }}>
                <div style={{ fontSize: 42, color: GOUD }}>✦</div>
                <h3 style={{ ...serif, fontSize: 30, fontWeight: 500, margin: "12px 0 8px" }}>{t.thanks}, {f.naam.split(" ")[0] || ""}!</h3>
                <p style={{ color: ZACHT, fontSize: 16, maxWidth: 430, margin: "0 auto" }}>{t.thanksSub}</p>
              </div>
            ) : (
              <div key={step} style={{ animation: "rinUp .35s ease" }}>
                {step === 1 && (<>
                  <div style={{ textAlign: "center", marginBottom: 24 }}>
                    <h3 style={{ ...serif, fontSize: "clamp(24px,3.2vw,34px)", fontWeight: 500 }}>{t.q1}</h3>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px,1fr))", gap: 14 }}>
                    {t.occasions.map(([k, lbl, d]) => (
                      <button key={k} type="button" onClick={() => kies((v) => setOcc(v as Occ), k)} style={{ ...chip(occ === k), borderRadius: 6, padding: "22px 16px", textAlign: "left", display: "flex", flexDirection: "column", gap: 6 }}>
                        <span style={{ ...serif, fontSize: 22, fontWeight: 600 }}>{lbl}</span>
                        <span style={{ fontSize: 13, color: ZACHT, fontWeight: 400, lineHeight: 1.4 }}>{d}</span>
                      </button>
                    ))}
                  </div>
                </>)}

                {step === 2 && (<>
                  <div style={{ textAlign: "center", marginBottom: 22 }}>
                    <h3 style={{ ...serif, fontSize: "clamp(24px,3.2vw,34px)", fontWeight: 500, marginBottom: 8 }}>{t.q2}</h3>
                    <p style={{ color: ZACHT, fontSize: 15.5, maxWidth: 440, margin: "0 auto", lineHeight: 1.5 }}>{t.q2line}</p>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center" }}>
                    {t.whenOpts.map((o) => <button key={o} type="button" onClick={() => kies(setWhen, o)} style={chip(when === o)}>{o}</button>)}
                  </div>
                </>)}

                {step === 3 && (
                  <form onSubmit={verstuur}>
                    <div style={{ textAlign: "center", marginBottom: 22 }}>
                      <h3 style={{ ...serif, fontSize: "clamp(24px,3.2vw,34px)", fontWeight: 500, marginBottom: 8 }}>{t.q3}</h3>
                      <p style={{ color: ZACHT, fontSize: 15.5, maxWidth: 440, margin: "0 auto", lineHeight: 1.5 }}>{t.q3line}</p>
                    </div>
                    {recap.length > 0 && (
                      <div style={{ background: "#faf5ec", border: `1px solid ${RAND}`, borderRadius: 6, padding: "16px 18px", marginBottom: 18 }}>
                        <div style={{ fontSize: 11.5, letterSpacing: ".1em", textTransform: "uppercase", color: GOUD, fontWeight: 600, marginBottom: 8 }}>{t.recapTitle}</div>
                        {recap.map((r) => <div key={r.l} style={{ fontSize: 14, color: INKT, lineHeight: 1.7 }}><span style={{ color: ZACHT }}>{r.l}:</span> {r.v}</div>)}
                      </div>
                    )}
                    <label style={{ ...label, marginTop: 0 }}>{t.name} *</label>
                    <input style={input} value={f.naam} onChange={veld("naam")} required />
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                      <div><label style={label}>{t.email} *</label><input style={input} type="email" value={f.email} onChange={veld("email")} required /></div>
                      <div><label style={label}>{t.phone} *</label><input style={input} type="tel" value={f.telefoon} onChange={veld("telefoon")} required /></div>
                    </div>
                    <label style={label}>{t.noteLabel}</label>
                    <textarea style={{ ...input, minHeight: 84, resize: "vertical" }} value={f.bericht} onChange={veld("bericht")} placeholder={t.notePh} />
                    <button type="submit" disabled={bezig} style={{ ...knop, width: "100%", justifyContent: "center", marginTop: 22, opacity: bezig ? 0.7 : 1 }}>{bezig ? t.sending : t.submit}</button>
                    <p style={{ textAlign: "center", fontSize: 12.5, color: ZACHT, marginTop: 13 }}>{t.noob}</p>
                  </form>
                )}

                {step > 1 && (
                  <div style={{ textAlign: "center" }}>
                    <button type="button" onClick={() => setStep((s) => Math.max(1, s - 1))} style={{ background: "none", border: "none", color: ZACHT, cursor: "pointer", fontSize: 13, letterSpacing: ".06em", marginTop: 24, fontFamily: "inherit" }}>{t.back}</button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      <footer style={{ background: "#0d0b09", color: "rgba(255,255,255,.65)", padding: "44px 0", textAlign: "center" }}>
        <div style={sec}>
          <div style={{ ...serif, fontSize: 22, color: "#fff", fontWeight: 500 }}>Your<span style={{ color: GOUD }}>Personal</span>Paparazzi</div>
          <p style={{ ...serif, fontSize: 16, fontStyle: "italic", marginTop: 10 }}>{t.footerTag}</p>
          <p style={{ fontSize: 12.5, marginTop: 12, letterSpacing: ".04em" }}>{t.footerSub}</p>
        </div>
      </footer>
    </main>
  );
}
