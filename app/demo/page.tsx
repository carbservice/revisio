"use client";

// Demo-omgeving voor op de website: een nagebootst klantportaal dat
// automatisch door de stadia loopt (Ontvangen -> ... -> Klaar) en daarna
// opnieuw begint. Geen echte data, geen API. Puur ter promotie van de
// volgservice. Staat los van /volg en de rest van de app.

import { useEffect, useRef, useState, CSSProperties } from "react";

const GROEN = "#1a3c2e";
const GROEN_LICHT = "#2f8f5b";
const TEKST = "#23211c";
const GRIJS = "#5a574f";
const RAND = "#dcd8cc";
const GROEN_BG = "#e7f0ea";
const SPOOR = "#e1e7dd";
const BRASS = "#b8893a";

// Demo-foto's. De showcase-foto's staan in public/demo/. Zolang die er nog
// niet zijn, valt de afbeelding terug op de tijdelijke foto's (fallback).
const F = "https://ntcbrqoesjlgiawmkdsa.supabase.co/storage/v1/object/public/werkbon-fotos/2026-0566";
const STADIA = [
  { label: "Ontvangen", oms: "We hebben je carburateur goed ontvangen en op de werkbank gelegd.", foto: "/demo/ontvangen.jpg", fallback: `${F}/ontvangen/1781344012440.jpg`, pct: 20 },
  { label: "Diagnose", oms: "We zijn begonnen: inspectie en analyse van alle onderdelen.", foto: "/demo/diagnose.jpg", fallback: `${F}/gestart/1781346357956.jpg`, pct: 40 },
  { label: "Reviseren", oms: "Demontage, ultrasoonreiniging en de onderdelen plaatsen.", foto: "/demo/reviseren.jpg", fallback: `${F}/voor_ultrasoon/1781354974808.jpg`, pct: 60 },
  { label: "Afbouwen en aftesten", oms: "We bouwen de carburateur af en testen op vacuum en benzinedruk.", foto: "/demo/afbouwen.jpg", fallback: `${F}/voor_ultrasoon/1781354988151.jpg`, pct: 80 },
  { label: "Klaar om op te halen", oms: "Je revisie is afgerond, afgesteld en gecontroleerd.", foto: "/demo/klaar.jpg", fallback: `${F}/schoon/1781359590611.jpg`, pct: 100 },
];

const PAUZE = 2600;     // hoe lang een fase in beeld blijft
const EIND_PAUZE = 3400; // hoe lang "Klaar" blijft staan voor de herstart
const FADE = 450;

// Intro die als typemachine over het scherm loopt zodra je de pagina opent.
const INTRO = "Welkom op de DEMO-pagina van Carburateur Service Nederland.\n\nAls wij een revisie voor je mogen uitvoeren, krijg je zo'n link in je e-mail. Dit is onze nieuwste ontwikkeling: we houden je up-to-date over de revisie van jouw carburateur op onze werkbanken.\n\nKijk hieronder mee.";

export default function DemoPagina() {
  const [aantal, setAantal] = useState(1);      // aantal voltooide stadia (1..5)
  const [centers, setCenters] = useState<number[]>([]);
  const [transAan, setTransAan] = useState(true);
  const [zichtbaar, setZichtbaar] = useState(true);
  const [logoOk, setLogoOk] = useState(true);
  const [getypt, setGetypt] = useState("");
  const [typKlaar, setTypKlaar] = useState(false);

  // Typemachine-intro: letter voor letter, met een korte adempauze na een punt
  // of een nieuwe alinea.
  useEffect(() => {
    let i = 0;
    let t: ReturnType<typeof setTimeout>;
    const tik = () => {
      i++;
      setGetypt(INTRO.slice(0, i));
      if (i < INTRO.length) {
        const ch = INTRO[i - 1];
        const wacht = ch === "\n" ? 240 : ch === "." ? 280 : ch === "," ? 120 : 24;
        t = setTimeout(tik, wacht);
      } else {
        setTypKlaar(true);
      }
    };
    t = setTimeout(tik, 600);
    return () => clearTimeout(t);
  }, []);

  const tijdlijnRef = useRef<HTMLDivElement | null>(null);
  const dotRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Meet de posities van de bolletjes (en opnieuw bij resize / font-laden).
  const meet = () => {
    const cont = tijdlijnRef.current;
    if (!cont) return;
    const cTop = cont.getBoundingClientRect().top;
    const cs = dotRefs.current.map((d) => (d ? d.getBoundingClientRect().top - cTop + d.offsetHeight / 2 : 0));
    setCenters(cs);
  };
  useEffect(() => {
    meet();
    window.addEventListener("resize", meet);
    let obs: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined" && tijdlijnRef.current) {
      obs = new ResizeObserver(() => meet());
      obs.observe(tijdlijnRef.current);
    }
    return () => { window.removeEventListener("resize", meet); if (obs) obs.disconnect(); };
  }, []);

  // De demo-lus: telkens een fase erbij, dan resetten en opnieuw.
  useEffect(() => {
    if (centers.length < STADIA.length) return;
    let leeft = true;
    const slaap = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
    async function lus() {
      while (leeft) {
        setTransAan(true); setZichtbaar(true);
        for (let n = 1; n <= STADIA.length; n++) {
          if (!leeft) return;
          setAantal(n);
          await slaap(PAUZE);
        }
        await slaap(EIND_PAUZE);
        if (!leeft) return;
        setZichtbaar(false);          // tijdlijn faadt weg
        await slaap(FADE);
        if (!leeft) return;
        setTransAan(false); setAantal(1); // reset posities/vinkjes terwijl het onzichtbaar is
        await slaap(80);
      }
    }
    lus();
    return () => { leeft = false; };
  }, [centers.length]);

  const carbTop = centers.length ? (centers[Math.max(0, aantal - 1)] || 0) : 0;
  const pct = STADIA[Math.max(0, aantal - 1)].pct;
  const klaar = aantal >= STADIA.length;
  const rijTransitie = transAan ? "top 1.1s cubic-bezier(.4,0,.2,1)" : "none";

  const wrap: CSSProperties = {
    minHeight: "100vh",
    background: "linear-gradient(170deg, #f1f7f1 0%, #dde9df 55%, #cfe0d3 100%)",
    color: TEKST, fontFamily: "'Karma','Times New Roman',serif",
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start",
    padding: "40px 16px",
  };
  const introTekst: CSSProperties = { fontSize: "clamp(16px,2.3vw,20px)", lineHeight: 1.62, color: GROEN, fontWeight: 500, whiteSpace: "pre-wrap", fontFamily: "'Karma','Times New Roman',serif", textAlign: "left" };
  const kaart: CSSProperties = {
    width: "100%", maxWidth: 620, background: "#fff", border: `1px solid ${RAND}`,
    borderRadius: 22, overflow: "hidden", boxShadow: "0 20px 55px rgba(26,60,46,0.16)",
  };
  const body: CSSProperties = { padding: "28px 30px 34px" };
  const labelStijl: CSSProperties = { fontSize: 12.5, letterSpacing: 1.5, textTransform: "uppercase", color: GROEN, fontWeight: 700 };

  return (
    <main style={wrap}>
      <link href="https://fonts.googleapis.com/css2?family=Karma:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      <style>{`
        @keyframes demoPuls{0%,100%{box-shadow:0 0 0 4px rgba(184,137,58,.18)}50%{box-shadow:0 0 0 9px rgba(184,137,58,.04)}}
        @keyframes demoCursor{0%,100%{opacity:1}50%{opacity:0}}
        @keyframes demoBounce{0%,100%{transform:translateY(0)}50%{transform:translateY(7px)}}
      `}</style>

      {/* Typemachine-intro die de bezoeker meeneemt */}
      <div style={{ width: "100%", maxWidth: 620, margin: "0 auto 28px" }}>
        <div style={{ position: "relative" }}>
          {/* onzichtbare laag reserveert de volledige hoogte, zodat de kaart niet verspringt tijdens het typen */}
          <div style={{ ...introTekst, visibility: "hidden" }} aria-hidden="true">{INTRO}</div>
          <div style={{ ...introTekst, position: "absolute", inset: 0 }}>
            {getypt}
            <span style={{ color: GROEN_LICHT, fontWeight: 400, animation: typKlaar ? "none" : "demoCursor 1s step-end infinite", opacity: typKlaar ? 0 : 1 }}>|</span>
          </div>
        </div>
        {typKlaar && (
          <div style={{ textAlign: "center", color: GROEN_LICHT, fontSize: 28, marginTop: 10, animation: "demoBounce 1.4s ease-in-out infinite" }}>&darr;</div>
        )}
      </div>

      <div style={kaart}>
        <div style={{ background: `linear-gradient(150deg, ${GROEN_LICHT} 0%, ${GROEN} 70%)`, padding: "22px 24px", textAlign: "center" }}>
          {logoOk ? (
            <img src="/logo-wit.png" alt="Carburateur Service" onError={() => setLogoOk(false)} style={{ width: "70%", maxWidth: 270, height: "auto", display: "block", margin: "0 auto" }} />
          ) : (
            <div style={{ fontSize: 28, fontWeight: 600, color: "#fff", letterSpacing: 0.5 }}>Carburateur Service</div>
          )}
        </div>

        <div style={body}>
          <div style={{ textAlign: "center", marginBottom: 4 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8, border: `1px solid rgba(184,137,58,.45)`, color: BRASS, fontSize: 11.5, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", padding: "6px 15px", borderRadius: 999 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: BRASS }} />
              Demo &middot; voorbeeld
            </span>
          </div>

          <div style={{ fontSize: 23, fontWeight: 600, color: GROEN, marginTop: 12 }}>Zo volg je jouw revisie live</div>
          <p style={{ fontSize: 16, lineHeight: 1.6, color: TEKST, marginTop: 8 }}>
            Dit is een voorbeeld. Bij jouw eigen revisie zie je precies hetzelfde, met je eigen ordernummer en code.
          </p>

          <div style={{ marginTop: 22, background: GROEN_BG, border: `1px solid ${RAND}`, borderRadius: 16, padding: "16px 20px", textAlign: "center" }}>
            <div style={labelStijl}>Je offertenummer</div>
            <div style={{ fontSize: 38, fontWeight: 700, color: GROEN, letterSpacing: 0.5, lineHeight: 1.1, marginTop: 4 }}>2026-DEMO</div>
          </div>

          <div style={{ marginTop: 18 }}>
            <div style={labelStijl}>Deze revisie is voor</div>
            <div style={{ fontSize: 18, fontWeight: 600, color: TEKST, marginTop: 4 }}>Alfa Romeo 2000 GTV (1973)</div>
            <div style={{ fontSize: 15, color: GRIJS, marginTop: 2 }}>Dubbele Dellorto DHLA 40</div>
          </div>

          <div style={{ marginTop: 16, background: GROEN_BG, borderRadius: 12, padding: "15px 17px" }}>
            <div style={{ fontSize: 14.5, fontWeight: 700, color: GROEN }}>De klacht die je ons hebt meegegeven</div>
            <div style={{ fontSize: 17, lineHeight: 1.55, color: TEKST, marginTop: 6 }}>Motor loopt onregelmatig stationair, graag een volledige revisie.</div>
          </div>

          <div style={{ marginTop: 24, background: "#fff", border: `1px solid ${RAND}`, borderRadius: 16, padding: "15px 20px", textAlign: "center", boxShadow: "0 6px 18px rgba(26,60,46,0.07)" }}>
            {klaar ? (
              <div style={{ fontSize: 23, fontWeight: 700, color: GROEN }}>Je revisie is klaar.</div>
            ) : (
              <>
                <div style={{ fontSize: 16, color: TEKST }}>Je revisie is momenteel op</div>
                <div style={{ fontSize: 42, fontWeight: 700, color: GROEN_LICHT, lineHeight: 1.05 }}>{pct}%</div>
                <div style={{ fontSize: 16, color: TEKST, marginTop: 4 }}>We zijn er druk mee.</div>
              </>
            )}
          </div>

          {/* Tijdlijn met meelopende carburateur */}
          <div ref={tijdlijnRef} style={{ position: "relative", marginTop: 24, opacity: zichtbaar ? 1 : 0, transition: `opacity ${FADE}ms ease` }}>
            {centers.length > 0 && (
              <>
                <div style={{ position: "absolute", left: 13, top: centers[0], height: Math.max(0, (centers[centers.length - 1] || 0) - (centers[0] || 0)), width: 6, borderRadius: 3, background: SPOOR }} />
                <div style={{ position: "absolute", left: 13, top: centers[0], height: Math.max(0, carbTop - (centers[0] || 0)), width: 6, borderRadius: 3, background: "linear-gradient(180deg, #2f8f5b, #3aa66b)", boxShadow: "0 0 12px rgba(47,143,91,0.45)", transition: rijTransitie.replace("top", "height") }} />
                <img src="/icon.png" alt="" style={{ position: "absolute", left: -8, top: carbTop - 24, width: 48, height: 48, borderRadius: "50%", zIndex: 3, boxShadow: "0 0 0 3px #fff, 0 4px 13px rgba(0,0,0,0.38)", transition: rijTransitie }} />
                <div style={{ position: "absolute", left: -10, top: carbTop + 27, width: 52, textAlign: "center", zIndex: 4, transition: rijTransitie }}>
                  <span style={{ display: "inline-block", background: GROEN, color: "#fff", fontSize: 13, fontWeight: 800, borderRadius: 999, padding: "2px 9px", boxShadow: "0 2px 6px rgba(0,0,0,0.28)" }}>{pct}%</span>
                </div>
              </>
            )}

            {STADIA.map((st, i) => {
              const done = i < aantal;
              const actief = i === aantal - 1;
              const laatste = i === STADIA.length - 1;
              const vink = done && !actief;
              const dotGroen = done;
              return (
                <div key={st.label} style={{ position: "relative", paddingLeft: 50, paddingBottom: laatste ? 0 : 16 }}>
                  <div ref={(el) => { dotRefs.current[i] = el; }} style={{
                    position: "absolute", left: 1, top: 2, width: 30, height: 30, borderRadius: "50%",
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 800, color: "#fff",
                    background: dotGroen ? GROEN_LICHT : "#fff", border: dotGroen ? "none" : `2px solid ${RAND}`,
                    boxShadow: dotGroen ? "0 0 0 4px rgba(47,143,91,0.14)" : "none",
                    transition: "background .35s ease, border .35s ease, box-shadow .35s ease", zIndex: 2,
                  }}>{vink ? "✓" : ""}</div>

                  <div style={{
                    background: done ? "#f4f9f5" : "#f8f8f6",
                    border: `1px solid ${done ? "#d2e6d8" : "#ececE8"}`,
                    borderLeft: `4px solid ${done ? GROEN_LICHT : RAND}`,
                    borderRadius: 12, padding: "13px 16px",
                    transition: "background .35s ease, border-color .35s ease",
                  }}>
                    <div style={{ fontSize: 19, fontWeight: 700, color: done ? GROEN : "#9a978e" }}>{st.label}</div>
                    <div style={{ fontSize: 16, lineHeight: 1.6, color: done ? TEKST : "#a8a59c", marginTop: 5 }}>{st.oms}</div>
                    {actief && <div style={{ display: "inline-block", fontSize: 12.5, fontWeight: 700, color: "#fff", background: GROEN_LICHT, borderRadius: 999, padding: "3px 11px", marginTop: 8 }}>We zijn hier nu mee bezig</div>}
                    {!done && <div style={{ display: "inline-block", fontSize: 12.5, fontWeight: 700, color: "#8d8a81", background: "#efefea", borderRadius: 999, padding: "3px 11px", marginTop: 8 }}>Nog te doen</div>}
                    {done && (
                      <div style={{ marginTop: 13 }}>
                        <img src={st.foto} onError={(e) => { const im = e.currentTarget; if (im.dataset.fb) return; im.dataset.fb = "1"; im.src = st.fallback; }} alt="" style={{ width: 120, height: 120, objectFit: "cover", borderRadius: 12, border: `1px solid ${RAND}`, display: "block" }} />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 28, paddingTop: 20, borderTop: `1px solid ${RAND}`, fontSize: 14.5, color: GRIJS, lineHeight: 1.6, textAlign: "center" }}>
            Dit voorbeeld loopt automatisch door. Bij je eigen revisie bepaalt de werkplaats wanneer een update zichtbaar wordt, en zie je echte foto&apos;s van jouw carburateur.
          </div>
          <div style={{ marginTop: 16, textAlign: "center" }}>
            <a href="https://www.carbservice.nl" style={{ display: "inline-block", background: GROEN_LICHT, color: "#fff", textDecoration: "none", fontWeight: 700, fontSize: 15.5, borderRadius: 999, padding: "12px 26px", boxShadow: "0 8px 20px rgba(47,143,91,.28)" }}>Terug naar carbservice.nl</a>
          </div>
        </div>
      </div>
    </main>
  );
}
