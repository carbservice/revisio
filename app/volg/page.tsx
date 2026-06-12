"use client";

// Klantportal: chique weergave van de revisievoortgang. Witte buitenkant,
// donkergroene kaart met gradient, de stadia onder elkaar als tijdlijn met
// de gepubliceerde foto's per fase.
// Toegang via /volg?t=token of /volg?nr=ORDERNR&code=CODE.

import { Suspense, useEffect, useState, CSSProperties } from "react";
import { useSearchParams } from "next/navigation";

const STADIA = [
  { stap: "ontvangen", label: "Ontvangen op de werkbank", pct: 20 },
  { stap: "gestart", label: "Demontage", pct: 40 },
  { stap: "voor_ultrasoon", label: "Ultrasoonreiniging", pct: 60 },
  { stap: "na_ultrasoon", label: "Heropbouwen", pct: 80 },
  { stap: "schoon", label: "Klaar en gecontroleerd", pct: 100 },
];

type Stap = { stap: string; label: string; pct: number; bericht: string; gedaan_op: string | null; fotos: string[] };
type Data = { nummer: string; klant: string; voertuig: string; klacht: string; pct: number; stadium: string; stappen: Stap[]; algemeneFotos: string[]; gepubliceerd: boolean; fout?: string };

const GOUD = "#cdab5e";

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
    background: "linear-gradient(180deg, #ffffff 0%, #eef1ea 100%)",
    color: "#eef3ec",
    fontFamily: "'Karma', 'Times New Roman', serif",
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "center",
    padding: "48px 20px",
  };
  const kaart: CSSProperties = {
    width: "100%",
    maxWidth: 600,
    background: "radial-gradient(130% 80% at 50% 0%, #1f4d36 0%, #143a26 45%, #0b2014 100%)",
    border: "1px solid rgba(205,171,94,0.22)",
    borderRadius: 24,
    padding: "40px 34px",
    boxShadow: "0 36px 90px rgba(13,40,28,0.4)",
  };

  const fontLink = <link href="https://fonts.googleapis.com/css2?family=Karma:wght@300;400;500;600;700&display=swap" rel="stylesheet" />;

  if (laden) return <main style={wrap}>{fontLink}<p style={{ color: "#1a3c2e", opacity: 0.6, marginTop: 60 }}>Laden…</p></main>;

  if (fout || !data) return (
    <main style={wrap}>
      {fontLink}
      <div style={kaart}>
        <div style={{ fontSize: 11, letterSpacing: 4, textTransform: "uppercase", color: GOUD, opacity: 0.9 }}>Carburateur Service</div>
        <h1 style={{ fontSize: 26, fontWeight: 500, margin: "14px 0 10px", color: "#fff" }}>Revisie niet gevonden</h1>
        <p style={{ fontSize: 15, lineHeight: 1.6, opacity: 0.8 }}>{fout || "Controleer je ordernummer en code en probeer het opnieuw."}</p>
        <a href="/" style={{ display: "inline-block", marginTop: 20, color: GOUD, textDecoration: "none", fontSize: 14, borderBottom: `1px solid ${GOUD}`, paddingBottom: 2 }}>← Terug naar start</a>
      </div>
    </main>
  );

  const pct = Math.max(0, Math.min(100, data.pct || 0));
  const klaar = pct >= 100;
  const stapData = (st: string) => data.stappen.find((s) => s.stap === st);

  return (
    <main style={wrap}>
      {fontLink}
      <style>{`
        @keyframes volgShimmer { 0% { background-position: -180% 0 } 100% { background-position: 180% 0 } }
        @keyframes volgGlow { 0%,100% { box-shadow: 0 0 14px rgba(87,201,138,0.55) } 50% { box-shadow: 0 0 26px rgba(87,201,138,0.85) } }
      `}</style>

      <div style={kaart}>
        <div style={{ fontSize: 11, letterSpacing: 4, textTransform: "uppercase", color: GOUD, opacity: 0.9 }}>Carburateur Service · Volg uw revisie</div>

        <div style={{ fontSize: 34, fontWeight: 500, letterSpacing: 0.5, margin: "16px 0 2px", color: "#fff" }}>{data.nummer}</div>
        {data.klant && <div style={{ fontSize: 17, opacity: 0.85 }}>{data.klant}</div>}

        {data.voertuig && (
          <div style={{ marginTop: 18, fontSize: 13.5, opacity: 0.8 }}>
            <span style={{ letterSpacing: 2, textTransform: "uppercase", fontSize: 10.5, color: GOUD, marginRight: 8 }}>Kenmerk</span>
            {data.voertuig}
          </div>
        )}
        {data.klacht && (
          <div style={{ marginTop: 12, fontSize: 14.5, lineHeight: 1.55, background: "rgba(0,0,0,0.2)", border: "1px solid rgba(205,171,94,0.18)", borderRadius: 12, padding: "13px 15px" }}>
            <span style={{ letterSpacing: 2, textTransform: "uppercase", fontSize: 10.5, color: GOUD, display: "block", marginBottom: 4 }}>Uw vraag</span>
            {data.klacht}
          </div>
        )}

        {/* Algehele voortgangsbalk */}
        <div style={{ marginTop: 30 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
            <span style={{ fontSize: 15, fontWeight: 600 }}>{data.stadium || "In behandeling"}</span>
            <span style={{ fontSize: 26, fontWeight: 600, color: GOUD, fontVariantNumeric: "tabular-nums" }}>{pct}%</span>
          </div>
          <div style={{ position: "relative", height: 16, borderRadius: 999, background: "rgba(255,255,255,0.08)", overflow: "hidden", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ position: "absolute", inset: 0, width: `${pct}%`, borderRadius: 999, background: "linear-gradient(90deg, #2f8f5b, #57c98a)", transition: "width 1.1s cubic-bezier(.22,1,.36,1)", animation: "volgGlow 2.6s ease-in-out infinite" }}>
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(100deg, transparent 20%, rgba(255,255,255,0.45) 50%, transparent 80%)", backgroundSize: "200% 100%", animation: "volgShimmer 2.2s linear infinite" }} />
            </div>
          </div>
        </div>

        {/* Stadia onder elkaar (tijdlijn) */}
        <div style={{ marginTop: 34 }}>
          <div style={{ fontSize: 11, letterSpacing: 3, textTransform: "uppercase", color: GOUD, opacity: 0.85, marginBottom: 18 }}>De stadia van uw revisie</div>
          {STADIA.map((st, i) => {
            const s = stapData(st.stap);
            const done = !!s;
            const laatste = i === STADIA.length - 1;
            return (
              <div key={st.stap} style={{ position: "relative", paddingLeft: 32, paddingBottom: laatste ? 0 : 26 }}>
                {!laatste && <div style={{ position: "absolute", left: 8, top: 24, bottom: 0, width: 2, background: done ? "rgba(87,201,138,0.45)" : "rgba(255,255,255,0.12)" }} />}
                <div style={{ position: "absolute", left: 0, top: 2, width: 18, height: 18, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: "#0b2014", background: done ? "#57c98a" : "rgba(255,255,255,0.14)", border: done ? "none" : "1px solid rgba(255,255,255,0.22)", boxShadow: done ? "0 0 10px rgba(87,201,138,0.7)" : "none" }}>{done ? "✓" : ""}</div>

                <div style={{ fontSize: 16, fontWeight: 600, color: done ? "#fff" : "rgba(255,255,255,0.5)" }}>{st.label}</div>
                {done && s!.bericht && <div style={{ fontSize: 13.5, lineHeight: 1.55, opacity: 0.85, marginTop: 5 }}>{s!.bericht}</div>}
                {!done && <div style={{ fontSize: 12.5, opacity: 0.45, marginTop: 3 }}>Binnenkort</div>}

                {done && s!.fotos.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
                    {s!.fotos.map((url, j) => (
                      <a key={j} href={url} target="_blank" rel="noreferrer">
                        <img src={url} alt="" style={{ width: 94, height: 94, objectFit: "cover", borderRadius: 10, border: "1px solid rgba(205,171,94,0.3)", display: "block" }} />
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
          <div style={{ marginTop: 30 }}>
            <div style={{ fontSize: 11, letterSpacing: 3, textTransform: "uppercase", color: GOUD, opacity: 0.85, marginBottom: 12 }}>Extra foto's</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {data.algemeneFotos.map((url, j) => (
                <a key={j} href={url} target="_blank" rel="noreferrer">
                  <img src={url} alt="" style={{ width: 94, height: 94, objectFit: "cover", borderRadius: 10, border: "1px solid rgba(205,171,94,0.3)", display: "block" }} />
                </a>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginTop: 30, fontSize: 12.5, opacity: 0.6, lineHeight: 1.55, textAlign: "center" }}>
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
    <Suspense fallback={<main style={{ minHeight: "100vh", background: "#f4f6f1" }} />}>
      <Inner />
    </Suspense>
  );
}
