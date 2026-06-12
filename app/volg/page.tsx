"use client";

// Klantportal: chique, donkergroene weergave van de revisievoortgang.
// Toegang via /volg?t=token of /volg?nr=ORDERNR&code=CODE.

import { Suspense, useEffect, useState, CSSProperties } from "react";
import { useSearchParams } from "next/navigation";

const STADIA = [
  { pct: 20, kort: "Ontvangst" },
  { pct: 40, kort: "Demontage" },
  { pct: 60, kort: "Ultrasoon" },
  { pct: 80, kort: "Heropbouw" },
  { pct: 100, kort: "Klaar" },
];

type Data = { nummer: string; klant: string; voertuig: string; klacht: string; pct: number; stadium: string; gepubliceerd: boolean; fout?: string };

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
    background: "radial-gradient(120% 90% at 50% -10%, #1f5236 0%, #143a26 45%, #0c2418 100%)",
    color: "#eef3ec",
    fontFamily: "'Karma', 'Times New Roman', serif",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "40px 20px",
  };
  const goud = "#cdab5e";
  const kaart: CSSProperties = {
    width: "100%",
    maxWidth: 560,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(205,171,94,0.22)",
    borderRadius: 22,
    padding: "38px 32px",
    boxShadow: "0 30px 80px rgba(0,0,0,0.45)",
    backdropFilter: "blur(6px)",
  };

  const fontLink = <link href="https://fonts.googleapis.com/css2?family=Karma:wght@300;400;500;600;700&display=swap" rel="stylesheet" />;

  if (laden) return <main style={wrap}>{fontLink}<p style={{ opacity: 0.7 }}>Laden…</p></main>;

  if (fout || !data) return (
    <main style={wrap}>
      {fontLink}
      <div style={kaart}>
        <div style={{ fontSize: 11, letterSpacing: 4, textTransform: "uppercase", color: goud, opacity: 0.9 }}>Carburateur Service</div>
        <h1 style={{ fontSize: 26, fontWeight: 500, margin: "14px 0 10px" }}>Revisie niet gevonden</h1>
        <p style={{ fontSize: 15, lineHeight: 1.6, opacity: 0.8 }}>{fout || "Controleer je ordernummer en code en probeer het opnieuw."}</p>
        <a href="/" style={{ display: "inline-block", marginTop: 20, color: goud, textDecoration: "none", fontSize: 14, borderBottom: `1px solid ${goud}`, paddingBottom: 2 }}>← Terug naar start</a>
      </div>
    </main>
  );

  const pct = Math.max(0, Math.min(100, data.pct || 0));
  const klaar = pct >= 100;

  return (
    <main style={wrap}>
      {fontLink}
      <style>{`
        @keyframes volgShimmer { 0% { background-position: -180% 0 } 100% { background-position: 180% 0 } }
        @keyframes volgGlow { 0%,100% { box-shadow: 0 0 14px rgba(87,201,138,0.55) } 50% { box-shadow: 0 0 26px rgba(87,201,138,0.85) } }
      `}</style>

      <div style={kaart}>
        <div style={{ fontSize: 11, letterSpacing: 4, textTransform: "uppercase", color: goud, opacity: 0.9 }}>Carburateur Service · Volg uw revisie</div>

        <div style={{ fontSize: 34, fontWeight: 500, letterSpacing: 0.5, margin: "16px 0 2px", color: "#fff" }}>{data.nummer}</div>
        {data.klant && <div style={{ fontSize: 17, opacity: 0.85 }}>{data.klant}</div>}

        {data.voertuig && (
          <div style={{ marginTop: 18, fontSize: 13, opacity: 0.75 }}>
            <span style={{ letterSpacing: 2, textTransform: "uppercase", fontSize: 10.5, color: goud, marginRight: 8 }}>Kenmerk</span>
            {data.voertuig}
          </div>
        )}
        {data.klacht && (
          <div style={{ marginTop: 12, fontSize: 14.5, lineHeight: 1.55, background: "rgba(0,0,0,0.18)", border: "1px solid rgba(205,171,94,0.18)", borderRadius: 12, padding: "13px 15px" }}>
            <span style={{ letterSpacing: 2, textTransform: "uppercase", fontSize: 10.5, color: goud, display: "block", marginBottom: 4 }}>Uw vraag</span>
            {data.klacht}
          </div>
        )}

        {/* Voortgangsbalk */}
        <div style={{ marginTop: 30 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
            <span style={{ fontSize: 15, fontWeight: 600 }}>{data.stadium || "In behandeling"}</span>
            <span style={{ fontSize: 26, fontWeight: 600, color: goud, fontVariantNumeric: "tabular-nums" }}>{pct}%</span>
          </div>

          <div style={{ position: "relative", height: 16, borderRadius: 999, background: "rgba(255,255,255,0.08)", overflow: "hidden", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{
              position: "absolute", inset: 0, width: `${pct}%`,
              borderRadius: 999,
              background: "linear-gradient(90deg, #2f8f5b, #57c98a)",
              transition: "width 1.1s cubic-bezier(.22,1,.36,1)",
              animation: "volgGlow 2.6s ease-in-out infinite",
            }}>
              <div style={{
                position: "absolute", inset: 0,
                background: "linear-gradient(100deg, transparent 20%, rgba(255,255,255,0.45) 50%, transparent 80%)",
                backgroundSize: "200% 100%",
                animation: "volgShimmer 2.2s linear infinite",
              }} />
            </div>
          </div>

          {/* Fasen */}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14 }}>
            {STADIA.map((s) => {
              const bereikt = pct >= s.pct;
              return (
                <div key={s.pct} style={{ flex: 1, textAlign: "center" }}>
                  <div style={{ width: 11, height: 11, borderRadius: "50%", margin: "0 auto 6px", background: bereikt ? "#57c98a" : "rgba(255,255,255,0.18)", boxShadow: bereikt ? "0 0 8px rgba(87,201,138,0.8)" : "none" }} />
                  <div style={{ fontSize: 10.5, opacity: bereikt ? 0.95 : 0.5, color: bereikt ? "#dff0e6" : "#cfe0d5" }}>{s.kort}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ marginTop: 28, fontSize: 12.5, opacity: 0.6, lineHeight: 1.55, textAlign: "center" }}>
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
    <Suspense fallback={<main style={{ minHeight: "100vh", background: "#0c2418" }} />}>
      <Inner />
    </Suspense>
  );
}
