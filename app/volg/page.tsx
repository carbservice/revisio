"use client";

// Klantportal: begeleidende weergave van de revisie. Wit logo op groene
// kop, persoonlijke begroeting, en een bewegende verticale voortgangsbalk
// die per stadium meeloopt. Elke fase is een eigen blok (lezen van boven
// naar beneden), met aanklikbare thumbnails.
// Toegang via /volg?t=token of /volg?nr=ORDERNR&code=CODE.

import { Suspense, useEffect, useState, CSSProperties } from "react";
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
  { stap: "schoon", label: "Klaar om te verzenden of op te halen", omschrijving: "Uw revisie is afgerond, gecontroleerd en klaar.", pct: 100 },
];

type Stap = { stap: string; label: string; pct: number; bericht: string; gedaan_op: string | null; fotos: string[] };
type Data = { nummer: string; klant: string; voertuig: string; klacht: string; pct: number; stadium: string; stappen: Stap[]; algemeneFotos: string[]; gepubliceerd: boolean; fout?: string };

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
          <p style={{ fontSize: 17, lineHeight: 1.6, color: TEKST }}>{fout || "Controleer uw ordernummer en code en probeer het opnieuw."}</p>
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
            Welkom bij het volgsysteem van uw carburateur-revisie. Hieronder ziet u precies waar we mee bezig zijn.
          </p>

          <div style={{ marginTop: 24, fontSize: 18, color: TEKST }}>
            Uw offertenummer: <span style={{ fontWeight: 700, color: GROEN }}>{data.nummer}</span>
          </div>
          {data.voertuig && (
            <div style={{ marginTop: 16 }}>
              <div style={labelStijl}>Kenmerk</div>
              <div style={{ fontSize: 17, color: TEKST, marginTop: 3 }}>{data.voertuig}</div>
            </div>
          )}
          {data.klacht && (
            <div style={{ marginTop: 14, background: GROEN_BG, borderRadius: 12, padding: "15px 17px" }}>
              <div style={labelStijl}>Klacht</div>
              <div style={{ fontSize: 12.5, color: GRIJS, marginTop: 2, marginBottom: 6 }}>(wat u aan ons heeft doorgegeven)</div>
              <div style={{ fontSize: 17, lineHeight: 1.55, color: TEKST }}>{data.klacht}</div>
            </div>
          )}

          <div style={{ marginTop: 30, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 18, fontWeight: 700, color: TEKST }}>
              {klaar ? "Uw revisie is klaar" : "We zijn druk bezig met deze revisie"}
            </span>
            <span style={{ fontSize: 32, fontWeight: 700, color: GROEN, fontVariantNumeric: "tabular-nums" }}>{pct}%</span>
          </div>

          {/* Verticale, bewegende voortgang per stadium */}
          <div style={{ marginTop: 22 }}>
            {STADIA.map((st, i) => {
              const s = stapData(st.stap);
              const done = !!s;
              const volgendeDone = i < STADIA.length - 1 && !!stapData(STADIA[i + 1].stap);
              const laatste = i === STADIA.length - 1;
              const huidig = done && i === huidigeIndex && !klaar;
              return (
                <div key={st.stap} style={{ position: "relative", paddingLeft: 50, paddingBottom: laatste ? 0 : 16 }}>
                  {!laatste && (
                    <div style={{
                      position: "absolute", left: 12, top: 32, bottom: 0, width: 8, borderRadius: 4,
                      background: volgendeDone
                        ? "repeating-linear-gradient(180deg, #2f8f5b 0, #2f8f5b 6px, #3aa66b 6px, #3aa66b 11px)"
                        : SPOOR,
                      backgroundSize: volgendeDone ? "100% 22px" : undefined,
                      transformOrigin: "top",
                      animation: volgendeDone ? `volgVul 0.55s ease-out ${i * 0.4}s both, volgVloei 1.2s linear ${i * 0.4 + 0.55}s infinite` : undefined,
                    }} />
                  )}
                  <div style={{
                    position: "absolute", left: 0, top: 2, width: 32, height: 32, borderRadius: "50%",
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 800, color: "#fff",
                    background: done ? GROEN_LICHT : "#fff", border: done ? "none" : `2px solid ${RAND}`,
                    boxShadow: huidig ? "0 0 0 5px rgba(47,143,91,0.18)" : (done ? "0 0 0 4px rgba(47,143,91,0.12)" : "none"),
                    animation: huidig ? "volgPuls 1.8s ease-in-out infinite" : undefined,
                  }}>{done ? "✓" : ""}</div>

                  {/* Eigen blok per stap */}
                  <div style={{
                    background: done ? "#f4f9f5" : "#f8f8f6",
                    border: `1px solid ${done ? "#d2e6d8" : "#ececE8"}`,
                    borderLeft: `4px solid ${done ? GROEN_LICHT : RAND}`,
                    borderRadius: 12, padding: "13px 16px",
                  }}>
                    <div style={{ fontSize: 19, fontWeight: 700, color: done ? GROEN : "#9a978e" }}>{st.label}</div>
                    {st.omschrijving && <div style={{ fontSize: 15, lineHeight: 1.55, color: done ? GRIJS : "#a8a59c", marginTop: 4 }}>{st.omschrijving}</div>}
                    {done && s!.bericht && <div style={{ fontSize: 15.5, lineHeight: 1.6, color: TEKST, marginTop: 8 }}>{s!.bericht}</div>}
                    {!done && <div style={{ display: "inline-block", fontSize: 12.5, fontWeight: 700, color: "#8d8a81", background: "#efefea", borderRadius: 999, padding: "3px 11px", marginTop: 8 }}>Nog te doen</div>}

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
              ? "Uw revisie is klaar, afgesteld en gecontroleerd. We nemen contact met u op."
              : "U ziet hier de laatste stand die onze werkplaats heeft gedeeld. Bedankt voor uw vertrouwen."}
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
