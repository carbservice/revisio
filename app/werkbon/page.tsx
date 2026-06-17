"use client";

// Klantpagina, Volg je revisie. app/werkbon/page.tsx

import { useEffect, useState, CSSProperties } from "react";
import { GROEN, ROOD, TEKST, GRIJS, RAND, BG } from "@/lib/theme";

const STAP_VOLGORDE = ["ontvangen", "gestart", "akkoord", "klaar", "ophalen"];
const STAP_LABEL: Record<string, string> = {
  ontvangen: "Ontvangen",
  gestart: "Revisie gestart",
  akkoord: "Wacht op je akkoord",
  klaar: "Klaar en getest",
  ophalen: "Klaar om op te halen",
};

function datum(s: string) {
  try {
    return new Date(s).toLocaleDateString("nl-NL", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
  } catch { return ""; }
}

export default function VolgRevisie() {
  const [data, setData] = useState<any>(null);
  const [laden, setLaden] = useState(true);
  const [fout, setFout] = useState("");

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("t");
    if (!t) { setFout("Geen geldige link."); setLaden(false); return; }
    fetch(`/api/werkbon-publiek?t=${encodeURIComponent(t)}`)
      .then((r) => r.json())
      .then((d) => { if (d.fout) setFout(d.fout); else setData(d); setLaden(false); })
      .catch((e) => { setFout(String(e)); setLaden(false); });
  }, []);

  const wrap: CSSProperties = { minHeight: "100vh", background: BG, color: TEKST, fontFamily: "'Karma', Georgia, serif", padding: "24px 16px", maxWidth: 560, margin: "0 auto" };
  const kaart: CSSProperties = { background: "#fff", border: `1px solid ${RAND}`, borderRadius: 16, padding: 20, marginBottom: 14 };

  if (laden) return <main style={wrap}><p style={{ color: GRIJS }}>Laden...</p></main>;
  if (fout) return <main style={wrap}><div style={{ ...kaart }}><div style={{ fontWeight: 700, color: GROEN, marginBottom: 6 }}>Carburateur Service Nederland</div><p style={{ color: ROOD }}>{fout}</p></div></main>;

  const gedaanMap: Record<string, any> = {};
  (data.voortgang || []).forEach((v: any) => { gedaanMap[v.stap] = v; });
  const fotosVan = (stap: string) => (data.fotos || []).filter((f: any) => f.stap === stap);

  const stappen = STAP_VOLGORDE.filter((s) => s !== "akkoord" || gedaanMap["akkoord"]);
  const laatsteGedaan = [...STAP_VOLGORDE].reverse().find((s) => gedaanMap[s]);
  const kop = laatsteGedaan ? gedaanMap[laatsteGedaan].bericht : "We hebben je revisie in goede orde ontvangen.";

  // werkbon samenvatting
  const metingMap: Record<string, any> = {};
  (data.meting || []).forEach((r: any) => {
    const k = `${r.label}__${r.positie}`;
    if (!metingMap[k]) metingMap[k] = { label: r.label, positie: r.positie, binnenkomst: "", afleveren: "" };
    if (r.moment === "afleveren") metingMap[k].afleveren = r.waarde;
    else metingMap[k].binnenkomst = r.waarde;
  });
  const metingen = Object.values(metingMap);
  const klaarGedaan = !!gedaanMap["klaar"];

  return (
    <main style={wrap}>
      <div style={{ textAlign: "center", marginBottom: 18 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: GROEN, letterSpacing: 0.5 }}>CARBURATEUR SERVICE NEDERLAND</div>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: "10px 0 2px" }}>Volg je revisie</h1>
      </div>

      <div style={{ ...kaart, background: GROEN, color: "#fff", border: "none" }}>
        <div style={{ fontSize: 12.5, opacity: 0.85, fontWeight: 600 }}>{data.nummer}</div>
        <div style={{ fontSize: 19, fontWeight: 800, marginTop: 2 }}>{data.klant}</div>
        {data.voertuig && <div style={{ fontSize: 13.5, opacity: 0.9, marginTop: 8, lineHeight: 1.4 }}>{data.voertuig}</div>}
        <div style={{ fontSize: 15, fontWeight: 600, marginTop: 14, lineHeight: 1.45 }}>{kop}</div>
      </div>

      <div style={kaart}>
        {stappen.map((s, i) => {
          const g = gedaanMap[s];
          const fts = fotosVan(s);
          return (
            <div key={s} style={{ display: "flex", gap: 14, paddingBottom: i === stappen.length - 1 ? 0 : 18 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div style={{ width: 26, height: 26, borderRadius: 999, background: g ? GROEN : "#fff", border: `2px solid ${g ? GROEN : RAND}`, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, flexShrink: 0 }}>{g ? "✓" : ""}</div>
                {i < stappen.length - 1 && <div style={{ width: 2, flex: 1, background: g ? GROEN : RAND, marginTop: 4, minHeight: 24 }} />}
              </div>
              <div style={{ flex: 1, paddingBottom: 4 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: g ? TEKST : GRIJS }}>{STAP_LABEL[s]}</div>
                {g ? (
                  <>
                    <div style={{ fontSize: 13.5, color: TEKST, marginTop: 3, lineHeight: 1.45 }}>{g.bericht}</div>
                    <div style={{ fontSize: 12, color: GRIJS, marginTop: 3 }}>{datum(g.gedaan_op)}</div>
                    {fts.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                        {fts.map((f: any, j: number) => (
                          <img key={j} src={f.url} alt="" style={{ width: 90, height: 90, objectFit: "cover", borderRadius: 10, border: `1px solid ${RAND}` }} />
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ fontSize: 13, color: GRIJS, marginTop: 3 }}>Nog te doen</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {klaarGedaan && metingen.length > 0 && (
        <div style={kaart}>
          <div style={{ fontSize: 13, color: GRIJS, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12 }}>Wat we hebben gedaan</div>
          {metingen.map((m: any, i: number) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "7px 0", borderTop: i === 0 ? "none" : `1px solid ${RAND}` }}>
              <span style={{ fontSize: 13.5, fontWeight: 600 }}>{m.positie > 1 ? `${m.label} ${m.positie}` : m.label}</span>
              <span style={{ fontSize: 13.5, color: GROEN, textAlign: "right" }}>{[m.binnenkomst, m.afleveren].filter(Boolean).join(" → ")}</span>
            </div>
          ))}
        </div>
      )}

      {klaarGedaan && (data.checklist || []).length > 0 && (
        <div style={kaart}>
          <div style={{ fontSize: 13, color: GRIJS, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12 }}>Eindcontrole</div>
          {(data.checklist || []).map((c: any, i: number) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "6px 0", borderTop: i === 0 ? "none" : `1px solid ${RAND}` }}>
              <span style={{ fontSize: 13.5 }}>{c.check_naam}</span>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: c.status === "afgekeurd" ? ROOD : GROEN }}>{c.status === "afgekeurd" ? "Afgekeurd" : "Goed"}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ textAlign: "center", color: GRIJS, fontSize: 13, marginTop: 18, marginBottom: 30, lineHeight: 1.6 }}>
        Vragen over je revisie?<br />carbservice.nl · +31653864208
      </div>
    </main>
  );
}