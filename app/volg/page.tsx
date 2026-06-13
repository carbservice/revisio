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
    let huidige = -1;
    STADIA.forEach((st, i) => { if (data.stappen.find((s) => s.stap === st.stap)) huidige = i; });
    if (huidige < 0) return;
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
  let huidigeIndex = -1;
  STADIA.forEach((st, i) => { if (stapData(st.stap)) huidigeIndex = i; });
  // % dat met het icoon meeloopt en optelt naar het huidige stadium.
  const doelCenter = huidigeIndex >= 0 ? (centers[huidigeIndex] || 0) : 0;
  const toonPct = doelCenter > 0 ? Math.round(pct * Math.min(1, vul / doelCenter)) : 0;

  const u = new Date().getHours();
  const groet = u < 12 ? "Goedemorgen" : u < 18 ? "Goedemiddag" : "Goedenavond";

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
