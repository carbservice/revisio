"use client";

// Carburateur Hub. app/hub/page.tsx
// Interne kruisverwijzing-database van Pierburg-kennbladen. Achter admin-login.
// Data (18 unieke kennbladen) staat statisch in data.ts. Later uit Supabase.

import { useEffect, useMemo, useState, CSSProperties } from "react";
import { GROEN, GOUD, TEKST, GRIJS, RAND, BG } from "@/lib/theme";
import AuthGate, { useGebruiker } from "@/app/components/AuthGate";
import { KENNBLADEN, LABELS, ORDER, Kennblad } from "./data";

const TALEN = ["NL", "DE", "EN"] as const;
// LABELS-volgorde in data.ts is [en, de, nl, symbool]; UI-volgorde is NL, DE, EN.
const LANG_INDEX = { NL: 2, DE: 1, EN: 0 } as const;
const SERIF = "'Karma', Georgia, serif";

function norm(s: string) { return (s || "").toUpperCase().replace(/\s+/g, ""); }

export default function HubPagina() {
  return (
    <AuthGate requireAdmin>
      <Hub />
    </AuthGate>
  );
}

function Hub() {
  const { uitloggen } = useGebruiker();
  const [zoek, setZoek] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [taal, setTaal] = useState<(typeof TALEN)[number]>("NL");
  const [gekopieerd, setGekopieerd] = useState(false);

  // Deep-link: ?id=<kennblad> opent meteen die kaart en is deelbaar.
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("id");
    if (id && KENNBLADEN.some((c) => c.id === id)) setOpenId(id);
  }, []);

  function openen(c: Kennblad) {
    setOpenId(c.id);
    const url = `${window.location.pathname}?id=${encodeURIComponent(c.id)}`;
    window.history.replaceState(null, "", url);
    window.scrollTo(0, 0);
  }
  function sluiten() {
    setOpenId(null);
    window.history.replaceState(null, "", window.location.pathname);
  }
  function kopieerLink() {
    navigator.clipboard?.writeText(window.location.href).then(() => {
      setGekopieerd(true);
      setTimeout(() => setGekopieerd(false), 1800);
    });
  }

  const lijst = useMemo(() => {
    const q = norm(zoek);
    if (!q) return KENNBLADEN;
    return KENNBLADEN.filter((c) => {
      const toep = (c.toepassingen || []).map((t) => `${t.merk_model} ${t.chassis} ${t.motorcode}`).join(" ");
      const hooi = norm(
        c.type + " " + c.vehicle + " " + c.registrier + " " + c.engine + " " +
        (c.motor ? `${c.motor.cc} ${c.motor.kw} ${c.motor.ps}` : "") + " " +
        (c.bouwjaar ? `${c.bouwjaar.von} ${c.bouwjaar.bis}` : "") + " " + toep + " " +
        c.variants.map((v) => `${v.tag} ${v.kleur}`).join(" ") + " " + c.tag_norm.join(" ")
      );
      return hooi.includes(q);
    });
  }, [zoek]);

  const open = openId ? KENNBLADEN.find((c) => c.id === openId) || null : null;
  const li = LANG_INDEX[taal];

  return (
    <main style={{ minHeight: "100vh", background: BG, color: TEKST, fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Karma:wght@400;500;600;700&display=swap" />

      <header style={{ background: GROEN, color: "#fff", padding: "22px 0 26px" }}>
        <div style={wrap}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
            <div>
              <div style={{ fontFamily: SERIF, fontSize: 27, fontWeight: 700, letterSpacing: 0.2 }}>Carburateur Hub</div>
              <div style={{ fontSize: 12.5, color: "#bcd6c8", marginTop: 2 }}>Pierburg-kennbladen · interne kruisverwijzing</div>
            </div>
            <button onClick={uitloggen} style={{ background: "rgba(255,255,255,.12)", color: "#fff", border: "1px solid rgba(255,255,255,.25)", borderRadius: 10, padding: "8px 12px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Uitloggen</button>
          </div>
          <div style={{ marginTop: 18, display: "flex", alignItems: "center", gap: 10, background: "#fff", borderRadius: 12, padding: "11px 14px", boxShadow: "0 8px 24px rgba(10,40,25,.18)" }}>
            <span style={{ color: GROEN, fontSize: 16 }}>🔍</span>
            <input
              value={zoek}
              onChange={(e) => setZoek(e.target.value)}
              placeholder="Zoek op auto, bouwjaar, cc, type, kleur of tag (bv. Passat, 1980, 1600, 4A1)…"
              style={{ border: 0, outline: 0, fontSize: 16, width: "100%", color: TEKST, background: "transparent" }}
            />
          </div>
          <div style={{ fontSize: 12.5, color: "#bcd6c8", marginTop: 9 }}>{lijst.length} van {KENNBLADEN.length} kennbladen</div>
        </div>
      </header>

      <div style={wrap}>
        {open ? (
          <Detail c={open} li={li} taal={taal} setTaal={setTaal} terug={sluiten} kopieer={kopieerLink} gekopieerd={gekopieerd} />
        ) : (
          <div style={grid}>
            {lijst.map((c) => (
              <button key={c.id} onClick={() => openen(c)} style={kaart}>
                {c.drawing && (
                  <div style={{ height: 150, background: `#f3f6f4 url('${c.drawing}') center/cover no-repeat`, borderBottom: `1px solid ${RAND}` }} />
                )}
                <div style={{ padding: "14px 16px 16px" }}>
                  <div style={{ fontFamily: SERIF, fontSize: 20, fontWeight: 700, color: GROEN }}>Pierburg {c.type}</div>
                  <div style={{ fontWeight: 700, marginTop: 2 }}>{c.vehicle}</div>
                  <div style={{ color: GRIJS, fontSize: 13, marginTop: 4 }}>{c.engine}</div>
                  {c.bouwjaar && <div style={{ color: GROEN, fontSize: 12.5, fontWeight: 700, marginTop: 3 }}>Bouwjaar: {c.bouwjaar.von}{c.bouwjaar.bis ? ` – ${c.bouwjaar.bis}` : " →"}</div>}
                  <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {c.variants.map((v, i) => <span key={i} style={badgeGoud}>{v.tag}</span>)}
                    <span style={badgeGoud}>{c.gasklep} mm gasklep</span>
                  </div>
                </div>
              </button>
            ))}
            {lijst.length === 0 && (
              <p style={{ color: GRIJS, gridColumn: "1 / -1", textAlign: "center", padding: 30 }}>Geen kennblad gevonden voor &ldquo;{zoek}&rdquo;.</p>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

function Detail({ c, li, taal, setTaal, terug, kopieer, gekopieerd }: { c: Kennblad; li: number; taal: string; setTaal: (t: any) => void; terug: () => void; kopieer: () => void; gekopieerd: boolean }) {
  const [groot, setGroot] = useState(false);
  return (
    <div style={{ paddingBottom: 60 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <button onClick={terug} style={{ background: "none", border: 0, color: GROEN, fontSize: 15, fontWeight: 700, cursor: "pointer", padding: "14px 0" }}>← terug naar overzicht</button>
        <button onClick={kopieer} style={{ background: gekopieerd ? GOUD : "#fff", color: gekopieerd ? "#fff" : GROEN, border: `1px solid ${gekopieerd ? GOUD : RAND}`, borderRadius: 10, padding: "8px 12px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>{gekopieerd ? "Gekopieerd!" : "🔗 Kopieer link"}</button>
      </div>
      <div style={{ fontFamily: SERIF, fontSize: 28, fontWeight: 700, color: GROEN }}>Pierburg {c.type}</div>
      <div style={{ fontSize: 17, fontWeight: 700 }}>{c.vehicle}</div>
      <div style={{ color: GRIJS, marginTop: 3 }}>{c.engine} · {c.yearFrom}</div>
      <div style={{ color: GRIJS, fontSize: 12.5, marginTop: 6 }}>Registrier-Nr {c.registrier} · {c.fabrikant} · bronbladen {c.bron_sheets.join(" & ")}</div>

      {c.toepassingen && c.toepassingen.length > 0 && (
        <section style={paneel}>
          <h3 style={kop}>Toepassingen (voertuigen)</h3>
          <table style={tabel}>
            <thead><tr>{["Merk / model", "Chassis", "Motorcode", "Bouwjaar"].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
            <tbody>
              {c.toepassingen.map((t, i) => (
                <tr key={i}>
                  <td style={{ ...td, fontWeight: 700 }}>{t.merk_model}</td>
                  <td style={td}>{t.chassis || "–"}</td>
                  <td style={td}>{t.motorcode || "–"}</td>
                  <td style={td}>{c.bouwjaar ? `${c.bouwjaar.von}${c.bouwjaar.bis ? ` – ${c.bouwjaar.bis}` : " →"}` : "–"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {c.motor && (
            <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 8 }}>
              <span style={badge}>{c.motor.kw} kW</span>
              <span style={badge}>{c.motor.ps} pk</span>
              <span style={badge}>{c.motor.cc} cc</span>
              <span style={badge}>{c.motor.rpm}/min</span>
              <span style={badgeGoud}>{c.gasklep} mm gasklep</span>
            </div>
          )}
        </section>
      )}

      <section style={paneel}>
        <h3 style={kop}>Uitvoeringen &amp; tags</h3>
        <table style={tabel}>
          <thead><tr>{["Uitvoering", "Tag (Typenschild)", "Bestel-nr", "Kleur"].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
          <tbody>
            {c.variants.map((v, i) => (
              <tr key={i}>
                <td style={td}>{v.name}</td>
                <td style={{ ...td, fontWeight: 700, color: GOUD, fontVariantNumeric: "tabular-nums" }}>{v.tag}</td>
                <td style={{ ...td, fontVariantNumeric: "tabular-nums" }}>{v.bestel}</td>
                <td style={td}>{v.kleur}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* 1. Specsheet (instelwaarden) */}
      <section style={paneel}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <h3 style={{ ...kop, margin: 0 }}>Specsheet — normaalinstelling</h3>
          <div style={{ display: "inline-flex", border: `1px solid ${RAND}`, borderRadius: 8, overflow: "hidden" }}>
            {TALEN.map((t) => (
              <button key={t} onClick={() => setTaal(t)} style={{ border: 0, borderLeft: `1px solid ${RAND}`, background: taal === t ? GROEN : "#fff", color: taal === t ? "#fff" : GRIJS, fontSize: 12.5, fontWeight: 700, padding: "6px 12px", cursor: "pointer" }}>{t}</button>
            ))}
          </div>
        </div>
        <table style={{ ...tabel, marginTop: 12 }}>
          <tbody>
            {ORDER.map((k) => {
              const L = LABELS[k]; const v = c.werte[k];
              if (!v) return null;
              return (
                <tr key={k}>
                  <td style={{ ...td, color: GOUD, fontWeight: 800, width: 34 }}>{L[3]}</td>
                  <td style={td}>{L[li]}</td>
                  <td style={{ ...td, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{v}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {c.controle && (
          <div style={{ background: "#f7eecd", border: "1px solid #e6d49a", color: "#7a5e12", borderRadius: 10, padding: "10px 12px", marginTop: 14, fontSize: 13.5 }}>
            ⚠ Controle: {c.controle}
          </div>
        )}
      </section>

      {/* 2. Blueprint (explosietekening) — onder de specsheet */}
      {c.drawing && (
        <section style={paneel}>
          <h3 style={kop}>Blueprint — explosietekening</h3>
          <button onClick={() => setGroot(true)} style={{ display: "block", width: "100%", border: 0, background: "#fff", padding: 0, cursor: "zoom-in" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={c.drawing} alt={`Explosietekening ${c.type} ${c.vehicle}`} style={{ width: "100%", height: "auto", borderRadius: 8, border: `1px solid ${RAND}` }} />
          </button>
          <div style={{ color: GRIJS, fontSize: 12, marginTop: 8, display: "flex", gap: 14, flexWrap: "wrap" }}>
            <span>Klik om groot te bekijken.</span>
            <a href={c.drawing} target="_blank" rel="noreferrer" style={{ color: GROEN, fontWeight: 700, textDecoration: "none" }}>Tekening openen in nieuw tabblad ↗</a>
          </div>
        </section>
      )}

      {/* 3. Originele vertaalde onderdelenlijst (nummers met uitleg) — onder de blueprint */}
      <section style={paneel}>
        <h3 style={kop}>Onderdelenlijst — nummers bij de tekening</h3>
        <div style={{ color: GRIJS, fontSize: 13.5, lineHeight: 1.5 }}>
          De genummerde onderdelenlijst die bij deze explosietekening hoort (nummer voor nummer, vertaald)
          wordt nog toegevoegd.
        </div>
      </section>

      {groot && c.drawing && (
        <div onClick={() => setGroot(false)} style={{ position: "fixed", inset: 0, background: "rgba(20,30,25,.88)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 50, cursor: "zoom-out" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={c.drawing} alt={`Explosietekening ${c.type} ${c.vehicle}`} style={{ maxWidth: "100%", maxHeight: "100%", borderRadius: 8, background: "#fff" }} />
        </div>
      )}
    </div>
  );
}

const wrap: CSSProperties = { maxWidth: 1000, margin: "0 auto", padding: "0 16px" };
const grid: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))", gap: 16, marginTop: 22 };
const kaart: CSSProperties = { textAlign: "left", background: "#fff", border: `1px solid ${RAND}`, borderRadius: 14, padding: 0, overflow: "hidden", cursor: "pointer", font: "inherit", color: TEKST };
const badge: CSSProperties = { fontSize: 11.5, background: "#eef0ea", border: `1px solid ${RAND}`, color: GROEN, borderRadius: 20, padding: "3px 9px" };
const badgeGoud: CSSProperties = { ...badge, color: "#8a6320", borderColor: "#e6d49a", background: "#f7eecd", fontVariantNumeric: "tabular-nums" };
const paneel: CSSProperties = { background: "#fff", border: `1px solid ${RAND}`, borderRadius: 14, padding: 18, marginTop: 16 };
const kop: CSSProperties = { fontFamily: SERIF, color: GROEN, margin: "0 0 12px", fontSize: 18, fontWeight: 700 };
const tabel: CSSProperties = { width: "100%", borderCollapse: "collapse", fontSize: 14 };
const th: CSSProperties = { textAlign: "left", padding: "8px 10px", borderBottom: `1px solid #eef0ea`, color: GROEN, fontWeight: 700 };
const td: CSSProperties = { textAlign: "left", padding: "8px 10px", borderBottom: `1px solid #eef0ea`, verticalAlign: "top" };
