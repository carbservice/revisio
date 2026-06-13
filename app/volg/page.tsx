"use client";

// Klantportal: begeleidende weergave van de revisie. Wit logo op groene
// kop, persoonlijke begroeting, en een bewegende verticale voortgangsbalk
// die per stadium meeloopt. Elke fase is een eigen blok (lezen van boven
// naar beneden), met aanklikbare thumbnails.
// Toegang via /volg?t=token of /volg?nr=ORDERNR&code=CODE.

import { Suspense, useCallback, useEffect, useRef, useState, CSSProperties } from "react";
import { useSearchParams } from "next/navigation";
import Lightbox from "@/app/components/Lightbox";

const GROEN = "#1a3c2e";
const GROEN_LICHT = "#2f8f5b";
const TEKST = "#23211c";
const GRIJS = "#5a574f";
const RAND = "#dcd8cc";
const GROEN_BG = "#e7f0ea";
const SPOOR = "#e1e7dd";

const STADIA = [
  { stap: "ontvangen", label: "Ontvangen", omschrijving: "Intake en eerste check (is het goed aangekomen?)", pct: 20 },
  { stap: "gestart", label: "Diagnose", omschrijving: "Inspectie & analyse (is alles gangbaar?)", pct: 40 },
  { stap: "voor_ultrasoon", label: "Reviseren", omschrijving: "Aan de slag met de carburateurrevisie: demontage, ultrasoonreiniging en onderdelen plaatsen.", pct: 60 },
  { stap: "na_ultrasoon", label: "Afbouwen & aftesten", omschrijving: "We bouwen de carburateur af en zetten deze daarna onder vacuüm en benzinedruk.", pct: 80 },
  { stap: "schoon", label: "Klaar om te verzenden of op te halen", omschrijving: "Je revisie is afgerond, gecontroleerd en klaar.", pct: 100 },
];

type Stap = { stap: string; label: string; pct: number; bericht: string; gedaan_op: string | null; fotos: string[] };
type Data = { nummer: string; klant: string; voertuig: string; klacht: string; monteur: string; pct: number; actiefStap: string | null; stadium: string; stappen: Stap[]; algemeneFotos: string[]; gepubliceerd: boolean; fout?: string };

// Waar moet de carburateur staan? Bij een actief stadium: daar. Anders zakt hij
// naar het eerstvolgende nog-niet-gedane stadium, zodat hij bij bijvoorbeeld 20%
// onderaan het ontvangst-vak komt en niet bovenin blijft hangen. Is alles
// gedaan, dan staat hij bij het laatste stadium.
function focusStadium(actiefStap: string | null, stappen: { stap: string }[]): number {
  if (actiefStap) {
    const i = STADIA.findIndex((s) => s.stap === actiefStap);
    if (i >= 0) return i;
  }
  const niet = STADIA.findIndex((s) => !stappen.find((x) => x.stap === s.stap));
  return niet === -1 ? STADIA.length - 1 : niet;
}

// WhatsApp-glyph voor de deelknop.
const WHATSAPP_PAD = "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.885-9.885 9.885M20.52 3.449C18.24 1.245 15.24 0 12.045 0 5.463 0 .104 5.334.101 11.892c0 2.096.549 4.142 1.595 5.945L0 24l6.305-1.654a11.962 11.962 0 005.71 1.45h.005c6.585 0 11.946-5.336 11.949-11.896 0-3.176-1.24-6.165-3.495-8.411";

// Socials onderaan het portaal (SVG-paden in 24x24-viewbox).
const SOCIALS = [
  { naam: "YouTube", url: "https://www.youtube.com/@carbservice", pad: "M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" },
  { naam: "Instagram", url: "https://www.instagram.com/carbservice/", pad: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" },
  { naam: "Facebook", url: "https://www.facebook.com/carbservice/", pad: "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" },
  { naam: "TikTok", url: "https://www.tiktok.com/@carbservice", pad: "M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" },
  { naam: "LinkedIn", url: "https://www.linkedin.com/in/cyrielgaemers/", pad: "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z" },
];

function Inner() {
  const sp = useSearchParams();
  const t = sp.get("t") || "";
  const nr = sp.get("nr") || "";
  const code = sp.get("code") || "";

  const [data, setData] = useState<Data | null>(null);
  const [fout, setFout] = useState("");
  const [laden, setLaden] = useState(true);
  const [logoOk, setLogoOk] = useState(true);
  const [lightbox, setLightbox] = useState<{ fotos: string[]; start: number } | null>(null);
  const [vul, setVul] = useState(0);
  const [centers, setCenters] = useState<number[]>([]);
  const [replay, setReplay] = useState(0);
  const tijdlijnRef = useRef<HTMLDivElement | null>(null);
  const dotRefs = useRef<(HTMLDivElement | null)[]>([]);
  const centersRef = useRef<number[]>([]);

  // Meet de posities van de stadia-bolletjes. Doen we eenmalig en bij resize,
  // niet elke frame: dat veroorzaakte gehaper tijdens het scrollen.
  const meet = useCallback(() => {
    const cont = tijdlijnRef.current;
    if (!cont) return;
    const cTop = cont.getBoundingClientRect().top;
    const cs = dotRefs.current.map((d) => (d ? d.getBoundingClientRect().top - cTop + d.offsetHeight / 2 : 0));
    centersRef.current = cs;
    setCenters(cs);
  }, []);

  // Het carburateur-icoon zakt langzaam langs de balk tot het huidige stadium
  // en vult onderweg de groene bolletjes. We meten de posities live (de kaarten
  // hebben wisselende hoogtes door foto's).
  // Houd de metingen actueel bij dataladen en bij venster-resize.
  useEffect(() => {
    if (!data) return;
    meet();
    window.addEventListener("resize", meet);
    return () => window.removeEventListener("resize", meet);
  }, [data, meet]);

  useEffect(() => {
    if (!data || replay === 0) return;
    let raf = 0;
    let start: number | null = null;
    if (!data.stappen.length) return; // niets gepubliceerd: geen carburateur
    const huidige = focusStadium(data.actiefStap, data.stappen);
    meet();      // verse meting bij de start van de rit
    setVul(0);   // icoon terug naar boven, daarna rijdt hij weer naar beneden
    const tick = (ts: number) => {
      if (start == null) start = ts;
      const doel = centersRef.current[huidige] || 0;
      const p = Math.min(1, (ts - start) / 8500);
      setVul(doel * p);
      if (p < 1) raf = requestAnimationFrame(tick);
      else setVul(doel);
    };
    const to = setTimeout(() => { raf = requestAnimationFrame(tick); }, 500);
    return () => { clearTimeout(to); cancelAnimationFrame(raf); };
  }, [data, replay, meet]);

  // Speel de rit opnieuw af telkens als de tijdlijn (opnieuw) in beeld komt,
  // bijvoorbeeld bij terugscrollen. Zo komt de carburateur steeds weer mee.
  useEffect(() => {
    const el = tijdlijnRef.current;
    if (!el) return;
    let inBeeld = false;
    const obs = new IntersectionObserver((entries) => {
      const e = entries[0];
      if (e.isIntersecting && !inBeeld) { inBeeld = true; setReplay((r) => r + 1); }
      else if (!e.isIntersecting && inBeeld) { inBeeld = false; }
    }, { threshold: 0.12 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [data]);

  useEffect(() => {
    const qs = t ? `t=${encodeURIComponent(t)}` : `nr=${encodeURIComponent(nr)}&code=${encodeURIComponent(code)}`;
    fetch(`/api/werkbon-publiek?${qs}`)
      .then((r) => r.json())
      .then((d) => { if (d.fout) setFout(d.fout); else setData(d); })
      .catch((e) => setFout(String(e)))
      .finally(() => setLaden(false));
  }, [t, nr, code]);

  const wrap: CSSProperties = {
    minHeight: "100vh",
    background: "linear-gradient(170deg, #f1f7f1 0%, #dde9df 55%, #cfe0d3 100%)",
    color: TEKST,
    fontFamily: "'Karma', 'Times New Roman', serif",
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "center",
    padding: "40px 16px",
  };
  const kaart: CSSProperties = {
    width: "100%", maxWidth: 620, background: "#ffffff", border: `1px solid ${RAND}`,
    borderRadius: 22, overflow: "hidden", boxShadow: "0 20px 55px rgba(26,60,46,0.16)",
  };
  const body: CSSProperties = { padding: "30px 32px 36px" };
  const labelStijl: CSSProperties = { fontSize: 12.5, letterSpacing: 1.5, textTransform: "uppercase", color: GROEN, fontWeight: 700 };

  const logoKop = (
    <div style={{ background: `linear-gradient(150deg, ${GROEN_LICHT} 0%, ${GROEN} 70%)`, padding: "24px 24px", textAlign: "center" }}>
      {logoOk ? (
        <img src="/logo-wit.png" alt="Carburateur Service" onError={() => setLogoOk(false)} style={{ width: "78%", maxWidth: 300, height: "auto", display: "block", margin: "0 auto" }} />
      ) : (
        <>
          <div style={{ fontSize: 30, fontWeight: 600, color: "#fff", lineHeight: 1.05, letterSpacing: 0.5 }}>Carburateur</div>
          <div style={{ fontSize: 11, letterSpacing: 6, textTransform: "uppercase", color: "rgba(255,255,255,0.88)", marginTop: 2 }}>Service</div>
        </>
      )}
    </div>
  );

  const fontLink = <link href="https://fonts.googleapis.com/css2?family=Karma:wght@300;400;500;600;700&display=swap" rel="stylesheet" />;
  const stijl = (
    <style>{`
      @keyframes volgVloei { from { background-position: 0 0 } to { background-position: 0 22px } }
      @keyframes volgPuls { 0%,100% { box-shadow: 0 0 0 4px rgba(47,143,91,0.20) } 50% { box-shadow: 0 0 0 9px rgba(47,143,91,0.06) } }
      @keyframes volgVul { from { transform: scaleY(0) } to { transform: scaleY(1) } }
    `}</style>
  );

  if (laden) return <main style={wrap}>{fontLink}<p style={{ color: GRIJS, fontSize: 17, marginTop: 50 }}>Laden…</p></main>;

  if (fout || !data) return (
    <main style={wrap}>
      {fontLink}
      <div style={kaart}>
        {logoKop}
        <div style={body}>
          <h1 style={{ fontSize: 26, fontWeight: 700, margin: "0 0 12px", color: GROEN }}>Revisie niet gevonden</h1>
          <p style={{ fontSize: 17, lineHeight: 1.6, color: TEKST }}>{fout || "Controleer je ordernummer en code en probeer het opnieuw."}</p>
          <a href="/" style={{ display: "inline-block", marginTop: 20, color: GROEN, fontSize: 16, fontWeight: 700, textDecoration: "none", borderBottom: `2px solid ${GROEN}`, paddingBottom: 2 }}>← Terug naar start</a>
        </div>
      </div>
    </main>
  );

  const pct = Math.max(0, Math.min(100, data.pct || 0));
  const klaar = pct >= 100;
  const stapData = (st: string) => data.stappen.find((s) => s.stap === st);
  const huidigeIndex = data.stappen.length ? focusStadium(data.actiefStap, data.stappen) : -1;
  // % dat met het icoon meeloopt en optelt naar het huidige stadium.
  const doelCenter = huidigeIndex >= 0 ? (centers[huidigeIndex] || 0) : 0;
  const toonPct = doelCenter > 0 ? Math.round(pct * Math.min(1, vul / doelCenter)) : 0;

  const u = new Date().getHours();
  const groet = u < 12 ? "Goedemorgen" : u < 18 ? "Goedemiddag" : "Goedenavond";

  // WhatsApp-deelknop: deelt de huidige unieke volglink met een leuke tekst.
  const huidigeUrl = typeof window !== "undefined" ? window.location.href : "";
  const deelTekst = `Bekijk mijn carburateurrevisie en de voortgang op de app van Carburateur Service Nederland! ${huidigeUrl}`;
  const waDeelUrl = `https://wa.me/?text=${encodeURIComponent(deelTekst)}`;

  return (
    <main style={wrap}>
      {fontLink}{stijl}
      <div style={kaart}>
        {logoKop}
        <div style={body}>

          <div style={{ fontSize: 23, fontWeight: 600, color: GROEN }}>{groet}{data.klant ? `, ${data.klant}` : ""}</div>
          <p style={{ fontSize: 16, lineHeight: 1.6, color: TEKST, marginTop: 8 }}>
            Welkom bij Revisio, de app waarin je ziet wat er met jouw carburateurrevisie gebeurt.
          </p>

          {/* Groot offertenummer als eerste blikvanger */}
          <div style={{ marginTop: 22, background: GROEN_BG, border: `1px solid ${RAND}`, borderRadius: 16, padding: "16px 20px", textAlign: "center" }}>
            <div style={labelStijl}>Je offertenummer</div>
            <div style={{ fontSize: 38, fontWeight: 700, color: GROEN, letterSpacing: 0.5, lineHeight: 1.1, marginTop: 4 }}>{data.nummer}</div>
          </div>

          {data.voertuig && (
            <div style={{ marginTop: 18 }}>
              <div style={labelStijl}>Deze revisie is voor</div>
              <div style={{ fontSize: 18, fontWeight: 600, color: TEKST, marginTop: 4 }}>{data.voertuig}</div>
            </div>
          )}

          {data.klacht && (
            <div style={{ marginTop: 16, background: GROEN_BG, borderRadius: 12, padding: "15px 17px" }}>
              <div style={{ fontSize: 14.5, fontWeight: 700, color: GROEN }}>De klacht die je ons hebt meegegeven</div>
              <div style={{ fontSize: 17, lineHeight: 1.55, color: TEKST, marginTop: 6 }}>{data.klacht}</div>
            </div>
          )}

          {/* Voortgang als groot, vriendelijk percentage (compact) */}
          <div style={{ marginTop: 24, background: "#fff", border: `1px solid ${RAND}`, borderRadius: 16, padding: "15px 20px", textAlign: "center", boxShadow: "0 6px 18px rgba(26,60,46,0.07)" }}>
            {klaar ? (
              <>
                <div style={{ fontSize: 23, fontWeight: 700, color: GROEN }}>Je revisie is klaar.</div>
                {data.monteur && <div style={{ fontSize: 15.5, color: GRIJS, marginTop: 5 }}>Uitgevoerd door {data.monteur}.</div>}
              </>
            ) : (
              <>
                <div style={{ fontSize: 16, color: TEKST }}>Je revisie is momenteel op</div>
                <div style={{ fontSize: 42, fontWeight: 700, color: GROEN_LICHT, lineHeight: 1.05 }}>{pct}%</div>
                <div style={{ fontSize: 15, color: GRIJS }}>van de 100%</div>
                <div style={{ fontSize: 16, color: TEKST, marginTop: 7 }}>We zijn er druk mee.</div>
                {data.monteur && <div style={{ fontSize: 15, color: GRIJS, marginTop: 5 }}>Onder behandeling van {data.monteur}.</div>}
              </>
            )}
          </div>

          {/* Verticale voortgang: het icoon zakt langzaam naar het huidige
              stadium en vult onderweg de groene bolletjes. */}
          <div ref={tijdlijnRef} style={{ position: "relative", marginTop: 22 }}>
            {centers.length > 0 && (
              <>
                <div style={{ position: "absolute", left: 13, top: centers[0], height: Math.max(0, (centers[centers.length - 1] || 0) - (centers[0] || 0)), width: 6, borderRadius: 3, background: SPOOR }} />
                <div style={{ position: "absolute", left: 13, top: centers[0], height: Math.max(0, vul - (centers[0] || 0)), width: 6, borderRadius: 3, background: "linear-gradient(180deg, #2f8f5b, #3aa66b)", boxShadow: "0 0 12px rgba(47,143,91,0.45)" }} />
                {vul > (centers[0] || 0) - 1 && (
                  <>
                    <img src="/icon.png" alt="" style={{ position: "absolute", left: -8, top: vul - 24, width: 48, height: 48, borderRadius: "50%", zIndex: 3, boxShadow: "0 0 0 3px #ffffff, 0 4px 13px rgba(0,0,0,0.38)" }} />
                    <div style={{ position: "absolute", left: -10, top: vul + 27, width: 52, textAlign: "center", zIndex: 4 }}>
                      <span style={{ display: "inline-block", background: GROEN, color: "#fff", fontSize: 13, fontWeight: 800, borderRadius: 999, padding: "2px 9px", boxShadow: "0 2px 6px rgba(0,0,0,0.28)" }}>{toonPct}%</span>
                    </div>
                  </>
                )}
              </>
            )}
            {STADIA.map((st, i) => {
              const s = stapData(st.stap);
              const done = !!s;
              const actief = data.actiefStap === st.stap;       // hier zijn we mee bezig
              const voltooid = done && !actief;                  // echt afgerond stadium
              const laatste = i === STADIA.length - 1;
              const bereikt = done && centers[i] != null && vul >= centers[i] - 2;
              const vink = voltooid && bereikt;                  // alleen voltooide stadia: vinkje
              const dotGroen = vink || actief;                   // actief stadium ook groen (icoon staat erop)
              return (
                <div key={st.stap} style={{ position: "relative", paddingLeft: 50, paddingBottom: laatste ? 0 : 16 }}>
                  <div ref={(el) => { dotRefs.current[i] = el; }} style={{
                    position: "absolute", left: 1, top: 2, width: 30, height: 30, borderRadius: "50%",
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 800, color: "#fff",
                    background: dotGroen ? GROEN_LICHT : "#fff", border: dotGroen ? "none" : `2px solid ${RAND}`,
                    boxShadow: dotGroen ? "0 0 0 4px rgba(47,143,91,0.14)" : "none",
                    transition: "background .35s ease, border .35s ease, box-shadow .35s ease", zIndex: 2,
                  }}>{vink ? "✓" : ""}</div>

                  {/* Eigen blok per stap */}
                  <div style={{
                    background: done ? "#f4f9f5" : "#f8f8f6",
                    border: `1px solid ${done ? "#d2e6d8" : "#ececE8"}`,
                    borderLeft: `4px solid ${done ? GROEN_LICHT : RAND}`,
                    borderRadius: 12, padding: "13px 16px",
                  }}>
                    <div style={{ fontSize: 19, fontWeight: 700, color: done ? GROEN : "#9a978e" }}>{st.label}</div>
                    {st.omschrijving && <div style={{ fontSize: 16, lineHeight: 1.6, color: done ? TEKST : "#a8a59c", marginTop: 5 }}>{st.omschrijving}</div>}
                    {actief
                      ? <div style={{ display: "inline-block", fontSize: 12.5, fontWeight: 700, color: "#fff", background: GROEN_LICHT, borderRadius: 999, padding: "3px 11px", marginTop: 8 }}>We zijn hier nu mee bezig</div>
                      : !done && <div style={{ display: "inline-block", fontSize: 12.5, fontWeight: 700, color: "#8d8a81", background: "#efefea", borderRadius: 999, padding: "3px 11px", marginTop: 8 }}>Nog te doen</div>}

                    {done && s!.fotos.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 14 }}>
                        {s!.fotos.slice(0, 3).map((url, j) => (
                          <img key={j} src={url} alt="" onClick={() => setLightbox({ fotos: s!.fotos.slice(0, 3), start: j })} style={{ width: 120, height: 120, objectFit: "cover", borderRadius: 12, border: `1px solid ${RAND}`, display: "block", cursor: "pointer" }} />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Verwachting onderaan: geruststellende tijdsindicatie */}
          {!klaar && (
            <div style={{ marginTop: 26, background: `linear-gradient(150deg, ${GROEN_LICHT} 0%, ${GROEN} 75%)`, borderRadius: 16, padding: "18px 22px", color: "#fff" }}>
              <div style={{ fontSize: 12.5, letterSpacing: 1.5, textTransform: "uppercase", color: "rgba(255,255,255,0.82)", fontWeight: 700 }}>Verwachting</div>
              <div style={{ fontSize: 17, lineHeight: 1.55, marginTop: 5 }}>We verwachten binnen enkele dagen dat jouw carburateur compleet klaar is.</div>
            </div>
          )}

          {data.algemeneFotos.length > 0 && (
            <div style={{ marginTop: 28, borderTop: `1px solid ${RAND}`, paddingTop: 22 }}>
              <div style={{ ...labelStijl, marginBottom: 12 }}>Extra foto's</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                {data.algemeneFotos.slice(0, 3).map((url, j) => (
                  <img key={j} src={url} alt="" onClick={() => setLightbox({ fotos: data.algemeneFotos.slice(0, 3), start: j })} style={{ width: 120, height: 120, objectFit: "cover", borderRadius: 12, border: `1px solid ${RAND}`, display: "block", cursor: "pointer" }} />
                ))}
              </div>
            </div>
          )}

          <div style={{ marginTop: 30, paddingTop: 20, borderTop: `1px solid ${RAND}`, fontSize: 15, color: GRIJS, lineHeight: 1.6, textAlign: "center" }}>
            {klaar
              ? "Je revisie is klaar, afgesteld en gecontroleerd. We nemen contact met je op."
              : "Je ziet hier de laatste stand die onze werkplaats heeft gedeeld. Bedankt voor je vertrouwen."}
          </div>

          {/* Deel-knop plus social-balk */}
          <div style={{ marginTop: 26, paddingTop: 24, borderTop: `1px solid ${RAND}`, textAlign: "center" }}>
            <div style={{ fontSize: 15.5, color: TEKST, lineHeight: 1.55, marginBottom: 13 }}>Deel deze unieke link gerust met je omgeving.</div>
            <a href={waDeelUrl} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 9, background: "#25D366", color: "#fff", textDecoration: "none", fontWeight: 700, fontSize: 15.5, borderRadius: 999, padding: "11px 22px", boxShadow: "0 6px 16px rgba(37,211,102,0.30)" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff" aria-hidden="true"><path d={WHATSAPP_PAD} /></svg>
              Deel via WhatsApp
            </a>

            <div style={{ marginTop: 28, fontSize: 12.5, letterSpacing: 1.5, textTransform: "uppercase", color: GROEN, fontWeight: 700, marginBottom: 14 }}>Volg Carburateur Service</div>
            <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: 22 }}>
              {SOCIALS.map((s) => (
                <a key={s.naam} href={s.url} target="_blank" rel="noreferrer" aria-label={s.naam} title={s.naam} style={{ color: GROEN, display: "inline-flex" }}>
                  <svg width="27" height="27" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d={s.pad} /></svg>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
      {lightbox && <Lightbox fotos={lightbox.fotos} start={lightbox.start} onClose={() => setLightbox(null)} />}
    </main>
  );
}

export default function VolgPagina() {
  return (
    <Suspense fallback={<main style={{ minHeight: "100vh", background: "#eef3ec" }} />}>
      <Inner />
    </Suspense>
  );
}
