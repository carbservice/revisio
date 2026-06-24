"use client";

// Fotografie-funnel voor Rin Hortulanus (portret + bedrijfsfotografie). app/rin/page.tsx
// Zelfde funnel-opzet als de Carbservice-landingspagina's, eigen elegante look.

import { useState, CSSProperties } from "react";

const INKT = "#1c1a17";
const CREME = "#f6f2ea";
const GOUD = "#b08d3e";
const GRIJS = "#6b665d";
const RAND = "#e4ddcf";

export default function RinFotografie() {
  const [type, setType] = useState<"portret" | "bedrijf">("portret");
  const [verzonden, setVerzonden] = useState(false);
  const [bezig, setBezig] = useState(false);
  const [f, setF] = useState({ naam: "", email: "", telefoon: "", bericht: "" });

  const veld = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setF((s) => ({ ...s, [k]: e.target.value }));

  async function verstuur(e: React.FormEvent) {
    e.preventDefault();
    if (!f.naam.trim() || !f.email.trim() || !f.telefoon.trim()) {
      alert("Vul je naam, e-mailadres en telefoonnummer in.");
      return;
    }
    setBezig(true);
    try {
      await fetch("/api/rin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...f, type }),
      });
    } catch {
      /* nooit blokkeren */
    }
    setVerzonden(true);
  }

  const knop: CSSProperties = { display: "inline-flex", alignItems: "center", gap: 8, background: GOUD, color: "#1c1a17", fontWeight: 700, fontSize: 15, border: "none", borderRadius: 4, padding: "14px 26px", cursor: "pointer", textDecoration: "none", letterSpacing: ".02em" };
  const knopLicht: CSSProperties = { ...knop, background: "transparent", color: "#fff", border: "1px solid rgba(255,255,255,.4)" };
  const sec: CSSProperties = { maxWidth: 1080, margin: "0 auto", padding: "0 22px" };
  const label: CSSProperties = { display: "block", fontSize: 12.5, fontWeight: 600, color: GRIJS, margin: "16px 0 6px", letterSpacing: ".04em", textTransform: "uppercase" };
  const input: CSSProperties = { width: "100%", border: `1px solid ${RAND}`, borderRadius: 4, padding: "12px 14px", fontSize: 15, background: "#fff", color: INKT, fontFamily: "inherit" };

  const eyebrow: CSSProperties = { fontSize: 12.5, fontWeight: 700, letterSpacing: ".18em", textTransform: "uppercase", color: GOUD };

  return (
    <main style={{ background: CREME, color: INKT, fontFamily: "'Inter', system-ui, sans-serif", minHeight: "100vh" }}>
      {/* HERO */}
      <section style={{ background: "linear-gradient(150deg,#2a2620 0%,#1c1a17 60%,#100e0b 100%)", color: "#fff" }}>
        <div style={{ ...sec, padding: "78px 22px 74px", textAlign: "center" }}>
          <span style={eyebrow}>Fotografie · Rin Hortulanus</span>
          <h1 style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: "clamp(38px,6vw,68px)", fontWeight: 600, lineHeight: 1.08, margin: "18px auto 0", maxWidth: 760, letterSpacing: "-.01em" }}>
            Beeld dat <span style={{ color: GOUD, fontStyle: "italic" }}>blijft hangen</span>
          </h1>
          <p style={{ fontSize: 18, color: "rgba(255,255,255,.82)", maxWidth: 560, margin: "22px auto 30px", lineHeight: 1.6 }}>
            Portret- en bedrijfsfotografie met karakter. Of het nu om een sterk persoonlijk portret gaat of om professionele beelden voor je bedrijf, ik vang wie je echt bent.
          </p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <a href="#aanvraag" style={knop}>Plan een shoot →</a>
            <a href="#diensten" style={knopLicht}>Bekijk de specialiteiten</a>
          </div>
          <div style={{ display: "flex", gap: 30, justifyContent: "center", marginTop: 40, flexWrap: "wrap", fontSize: 13, color: "rgba(255,255,255,.7)" }}>
            <div><b style={{ display: "block", fontFamily: "Georgia, serif", fontSize: 22, color: "#fff", fontWeight: 600 }}>Portret</b>persoonlijk &amp; personal brand</div>
            <div><b style={{ display: "block", fontFamily: "Georgia, serif", fontSize: 22, color: "#fff", fontWeight: 600 }}>Bedrijf</b>team, sfeer &amp; content</div>
            <div><b style={{ display: "block", fontFamily: "Georgia, serif", fontSize: 22, color: "#fff", fontWeight: 600 }}>Op locatie</b>of in de studio</div>
          </div>
        </div>
      </section>

      {/* DIENSTEN */}
      <section id="diensten" style={{ padding: "72px 0" }}>
        <div style={sec}>
          <div style={{ textAlign: "center", maxWidth: 620, margin: "0 auto 44px" }}>
            <span style={eyebrow}>Twee specialiteiten</span>
            <h2 style={{ fontFamily: "Georgia, serif", fontSize: "clamp(26px,3.4vw,38px)", fontWeight: 600, margin: "12px 0 12px" }}>Waar kan ik je mee helpen?</h2>
            <p style={{ color: GRIJS, fontSize: 16.5 }}>Twee richtingen, dezelfde aandacht voor wie en wat er voor de lens staat.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px,1fr))", gap: 22 }}>
            {[
              { t: "Portretfotografie", d: "Een portret dat écht jou laat zien. Voor jezelf, je social media of je personal brand. Ontspannen, eerlijk en met oog voor detail." },
              { t: "Bedrijfsfotografie", d: "Professionele beelden voor je bedrijf: teamportretten, sfeerbeelden op locatie en content voor je website en socials. Consistent in je eigen stijl." },
            ].map((c) => (
              <div key={c.t} style={{ background: "#fff", border: `1px solid ${RAND}`, borderRadius: 8, padding: "30px 28px" }}>
                <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#1c1a17", color: GOUD, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Georgia, serif", fontSize: 22, fontWeight: 700, marginBottom: 18 }}>{c.t[0]}</div>
                <h3 style={{ fontFamily: "Georgia, serif", fontSize: 22, fontWeight: 600, marginBottom: 10 }}>{c.t}</h3>
                <p style={{ color: GRIJS, fontSize: 15, lineHeight: 1.6 }}>{c.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WAAROM */}
      <section style={{ background: "#fff", borderTop: `1px solid ${RAND}`, borderBottom: `1px solid ${RAND}`, padding: "64px 0" }}>
        <div style={sec}>
          <div style={{ textAlign: "center", maxWidth: 560, margin: "0 auto 38px" }}>
            <span style={eyebrow}>Werken met Rin</span>
            <h2 style={{ fontFamily: "Georgia, serif", fontSize: "clamp(24px,3vw,34px)", fontWeight: 600, marginTop: 12 }}>Waarom het klikt</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px,1fr))", gap: 22 }}>
            {[
              ["Eigen herkenbare stijl", "Natuurlijk, warm en tijdloos, geen geforceerde poses."],
              ["Ontspannen op de set", "Ook als je een hekel hebt aan op de foto gaan, ik maak het makkelijk."],
              ["Snel geleverd", "Een nette selectie bewerkte beelden, zonder lang wachten."],
              ["Op locatie of studio", "Daar waar het beeld het sterkst is voor jou of je merk."],
            ].map(([t, d]) => (
              <div key={t}>
                <div style={{ width: 30, height: 2, background: GOUD, marginBottom: 14 }} />
                <h3 style={{ fontSize: 16.5, fontWeight: 700, marginBottom: 6 }}>{t}</h3>
                <p style={{ color: GRIJS, fontSize: 14, lineHeight: 1.55 }}>{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AANVRAAG */}
      <section id="aanvraag" style={{ padding: "72px 0" }}>
        <div style={{ maxWidth: 640, margin: "0 auto", padding: "0 22px" }}>
          <div style={{ textAlign: "center", marginBottom: 30 }}>
            <span style={eyebrow}>Vrijblijvend</span>
            <h2 style={{ fontFamily: "Georgia, serif", fontSize: "clamp(26px,3.4vw,38px)", fontWeight: 600, margin: "12px 0 10px" }}>Plan je shoot</h2>
            <p style={{ color: GRIJS, fontSize: 16 }}>Laat je gegevens achter, dan neem ik snel contact met je op om je wensen te bespreken.</p>
          </div>

          {verzonden ? (
            <div style={{ background: "#fff", border: `1px solid ${RAND}`, borderRadius: 8, padding: "40px 28px", textAlign: "center" }}>
              <div style={{ fontSize: 40 }}>✦</div>
              <h3 style={{ fontFamily: "Georgia, serif", fontSize: 24, fontWeight: 600, margin: "10px 0 6px" }}>Bedankt, {f.naam.split(" ")[0] || "top"}!</h3>
              <p style={{ color: GRIJS }}>Je aanvraag is binnen. Ik neem snel contact met je op om je shoot in te plannen.</p>
            </div>
          ) : (
            <form onSubmit={verstuur} style={{ background: "#fff", border: `1px solid ${RAND}`, borderRadius: 8, padding: "30px 28px" }}>
              <div style={{ ...label, marginTop: 0 }}>Waarvoor zoek je een fotograaf?</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {([["portret", "Portret"], ["bedrijf", "Bedrijfsfotografie"]] as const).map(([k, lbl]) => (
                  <button type="button" key={k} onClick={() => setType(k)} style={{ cursor: "pointer", borderRadius: 5, padding: "13px 12px", fontSize: 15, fontWeight: 600, border: `1.5px solid ${type === k ? GOUD : RAND}`, background: type === k ? "#fbf6ec" : "#fff", color: INKT }}>{lbl}</button>
                ))}
              </div>

              <label style={label}>Naam *</label>
              <input style={input} value={f.naam} onChange={veld("naam")} required />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div><label style={label}>E-mail *</label><input style={input} type="email" value={f.email} onChange={veld("email")} required /></div>
                <div><label style={label}>Telefoon *</label><input style={input} type="tel" value={f.telefoon} onChange={veld("telefoon")} required /></div>
              </div>
              <label style={label}>Wat wil je vastleggen?</label>
              <textarea style={{ ...input, minHeight: 90, resize: "vertical" }} value={f.bericht} onChange={veld("bericht")} placeholder="Vertel kort over je wensen, gelegenheid of merk..." />

              <button type="submit" disabled={bezig} style={{ ...knop, width: "100%", justifyContent: "center", marginTop: 22, fontSize: 16, opacity: bezig ? 0.7 : 1 }}>
                {bezig ? "Versturen…" : "Verstuur mijn aanvraag →"}
              </button>
              <p style={{ textAlign: "center", fontSize: 12.5, color: GRIJS, marginTop: 12 }}>Geen verplichtingen. Ik reageer meestal binnen een dag.</p>
            </form>
          )}
        </div>
      </section>

      <footer style={{ background: "#1c1a17", color: "rgba(255,255,255,.7)", padding: "40px 0", textAlign: "center" }}>
        <div style={sec}>
          <div style={{ fontFamily: "Georgia, serif", fontSize: 20, color: "#fff", fontWeight: 600 }}>Rin Hortulanus <span style={{ color: GOUD }}>· Fotografie</span></div>
          <p style={{ fontSize: 13.5, marginTop: 8 }}>Portret &amp; bedrijfsfotografie. Beeld dat blijft hangen.</p>
        </div>
      </footer>
    </main>
  );
}
