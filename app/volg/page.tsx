"use client";

// Klantportal: rustige, goed leesbare weergave van de revisievoortgang.
// Lichte kaart, donkere tekst (hoog contrast), groen alleen als accent.
// Grote letters — de doelgroep is wat ouder.
// Toegang via /volg?t=token of /volg?nr=ORDERNR&code=CODE.

import { Suspense, useEffect, useState, CSSProperties } from "react";
import { useSearchParams } from "next/navigation";

const GROEN = "#1a3c2e";
const GROEN_LICHT = "#2f8f5b";
const TEKST = "#23211c";
const GRIJS = "#5a574f";
const RAND = "#dcd8cc";
const GROEN_BG = "#e7f0ea";

const STADIA = [
  { stap: "ontvangen", label: "Ontvangen op de werkbank", pct: 20 },
  { stap: "gestart", label: "Demontage", pct: 40 },
  { stap: "voor_ultrasoon", label: "Ultrasoonreiniging", pct: 60 },
  { stap: "na_ultrasoon", label: "Heropbouwen", pct: 80 },
  { stap: "schoon", label: "Klaar en gecontroleerd", pct: 100 },
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
    background: "#eef1ea",
    color: TEKST,
    fontFamily: "'Karma', 'Times New Roman', serif",
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "center",
    padding: "44px 18px",
  };
  const kaart: CSSProperties = {
    width: "100%",
    maxWidth: 620,
    background: "#ffffff",
    border: `1px solid ${RAND}`,
    borderRadius: 22,
    padding: "38px 34px",
    boxShadow: "0 18px 50px rgba(26,60,46,0.12)",
  };
  const labelStijl: CSSProperties = { fontSize: 12.5, letterSpacing: 1.5, textTransform: "uppercase", color: GROEN, fontWeight: 700 };

  const fontLink = <link href="https://fonts.googleapis.com/css2?family=Karma:wght@300;400;500;600;700&display=swap" rel="stylesheet" />;

  if (laden) return <main style={wrap}>{fontLink}<p style={{ color: GRIJS, fontSize: 17, marginTop: 50 }}>Laden…</p></main>;

  if (fout || !data) return (
    <main style={wrap}>
      {fontLink}
      <div style={kaart}>
        <div style={labelStijl}>Carburateur Service</div>
        <h1 style={{ fontSize: 28, fontWeight: 700, margin: "12px 0 12px", color: GROEN }}>Revisie niet gevonden</h1>
        <p style={{ fontSize: 17, lineHeight: 1.6, color: TEKST }}>{fout || "Controleer uw ordernummer en code en probeer het opnieuw."}</p>
        <a href="/" style={{ display: "inline-block", marginTop: 20, color: GROEN, fontSize: 16, fontWeight: 700, textDecoration: "none", borderBottom: `2px solid ${GROEN}`, paddingBottom: 2 }}>← Terug naar start</a>
      </div>
    </main>
  );

  const pct = Math.max(0, Math.min(100, data.pct || 0));
  const klaar = pct >= 100;
  const stapData = (st: string) => data.stappen.find((s) => s.stap === st);

  return (
    <main style={wrap}>
      {fontLink}
      <style>{`@keyframes volgShimmer { 0% { background-position: -180% 0 } 100% { background-position: 180% 0 } }`}</style>

      <div style={kaart}>
        <div style={labelStijl}>Carburateur Service · Volg uw revisie</div>

        <div style={{ fontSize: 40, fontWeight: 600, letterSpacing: 0.5, margin: "14px 0 2px", color: GROEN }}>{data.nummer}</div>
        {data.klant && <div style={{ fontSize: 20, fontWeight: 600, color: TEKST }}>{data.klant}</div>}

        {data.voertuig && (
          <div style={{ marginTop: 20 }}>
            <div style={labelStijl}>Kenmerk</div>
            <div style={{ fontSize: 17, color: TEKST, marginTop: 3 }}>{data.voertuig}</div>
          </div>
        )}
        {data.klacht && (
          <div style={{ marginTop: 16, background: GROEN_BG, borderRadius: 12, padding: "15px 17px" }}>
            <div style={labelStijl}>Uw vraag</div>
            <div style={{ fontSize: 17, lineHeight: 1.55, color: TEKST, marginTop: 4 }}>{data.klacht}</div>
          </div>
        )}

        {/* Algehele voortgang */}
        <div style={{ marginTop: 32 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
            <span style={{ fontSize: 18, fontWeight: 700, color: TEKST }}>{data.stadium || "In behandeling"}</span>
            <span style={{ fontSize: 30, fontWeight: 700, color: GROEN, fontVariantNumeric: "tabular-nums" }}>{pct}%</span>
          </div>
          <div style={{ position: "relative", height: 18, borderRadius: 999, background: "#e4e9e0", overflow: "hidden", border: `1px solid ${RAND}` }}>
            <div style={{ position: "absolute", inset: 0, width: `${pct}%`, borderRadius: 999, background: `linear-gradient(90deg, ${GROEN}, ${GROEN_LICHT})`, transition: "width 1.1s cubic-bezier(.22,1,.36,1)" }}>
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(100deg, transparent 25%, rgba(255,255,255,0.4) 50%, transparent 75%)", backgroundSize: "200% 100%", animation: "volgShimmer 2.4s linear infinite" }} />
            </div>
          </div>
        </div>

        {/* Stadia onder elkaar */}
        <div style={{ marginTop: 36 }}>
          <div style={{ ...labelStijl, marginBottom: 20 }}>De stadia van uw revisie</div>
          {STADIA.map((st, i) => {
            const s = stapData(st.stap);
            const done = !!s;
            const laatste = i === STADIA.length - 1;
            return (
              <div key={st.stap} style={{ position: "relative", paddingLeft: 38, paddingBottom: laatste ? 0 : 30 }}>
                {!laatste && <div style={{ position: "absolute", left: 10, top: 28, bottom: 0, width: 2, background: done ? GROEN_LICHT : RAND }} />}
                <div style={{ position: "absolute", left: 0, top: 1, width: 22, height: 22, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: "#fff", background: done ? GROEN_LICHT : "#fff", border: done ? "none" : `2px solid ${RAND}` }}>{done ? "✓" : ""}</div>

                <div style={{ fontSize: 19, fontWeight: 700, color: done ? GROEN : "#a8a59c" }}>{st.label}</div>
                {done && s!.bericht && <div style={{ fontSize: 16, lineHeight: 1.6, color: TEKST, marginTop: 6 }}>{s!.bericht}</div>}
                {!done && <div style={{ fontSize: 15, color: "#a8a59c", marginTop: 4 }}>Nog te doen</div>}

                {done && s!.fotos.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 14 }}>
                    {s!.fotos.map((url, j) => (
                      <a key={j} href={url} target="_blank" rel="noreferrer">
                        <img src={url} alt="" style={{ width: 120, height: 120, objectFit: "cover", borderRadius: 12, border: `1px solid ${RAND}`, display: "block" }} />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Overige gedeelde foto's */}
        {data.algemeneFotos.length > 0 && (
          <div style={{ marginTop: 30, borderTop: `1px solid ${RAND}`, paddingTop: 22 }}>
            <div style={{ ...labelStijl, marginBottom: 12 }}>Extra foto's</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {data.algemeneFotos.map((url, j) => (
                <a key={j} href={url} target="_blank" rel="noreferrer">
                  <img src={url} alt="" style={{ width: 120, height: 120, objectFit: "cover", borderRadius: 12, border: `1px solid ${RAND}`, display: "block" }} />
                </a>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginTop: 32, paddingTop: 20, borderTop: `1px solid ${RAND}`, fontSize: 15, color: GRIJS, lineHeight: 1.6, textAlign: "center" }}>
          {klaar
            ? "Uw revisie is klaar, afgesteld en gecontroleerd. We nemen contact met u op."
            : "U ziet hier de laatste stand die onze werkplaats heeft gedeeld. Bedankt voor uw vertrouwen."}
        </div>
      </div>
    </main>
  );
}

export default function VolgPagina() {
  return (
    <Suspense fallback={<main style={{ minHeight: "100vh", background: "#eef1ea" }} />}>
      <Inner />
    </Suspense>
  );
}
