"use client";

// Revisio CEO dashboard. app/dashboard/page.tsx

import { useEffect, useState } from "react";

const GROEN = "#1a3c2e";
const GOUD = "#b8962e";
const BLAUW = "#185fa5";
const TEKST = "#23211c";
const GRIJS = "#7a7770";
const RAND = "#e7e3da";
const BG = "#f7f6f2";

// CONFIG maandtegels: pas titel, cijfer, kleur of symbool aan.
const TEGELS = [
  { key: "omzet", titel: "Omzet", kleur: GROEN, symbool: "€" },
  { key: "brutomarge", titel: "Brutomarge", pctKey: "brutomarge_pct", kleur: GOUD, symbool: "%" },
  { key: "nettowinst", titel: "Nettowinst", pctKey: "netto_pct", kleur: GROEN, symbool: "↑" },
  { key: "kosten", titel: "Kosten", kleur: GOUD, symbool: "↓" },
];

// CONFIG cellen jaaroverzicht.
const JAAR_CELLEN = [
  { key: "omzet", titel: "Omzet" },
  { key: "brutomarge", titel: "Brutomarge", pctKey: "brutomarge_pct" },
  { key: "nettowinst", titel: "Nettowinst", pctKey: "netto_pct" },
  { key: "kosten", titel: "Kosten" },
];

const VOORUITBLIK = ["Omzet", "Kosten", "Aantal offertes", "Closing rate"];

function euro(n: number) {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}
function euro2(n: number) {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}
function procent(n: number) {
  return `${Math.round(n)}%`;
}
function groet() {
  const u = new Date().getHours();
  if (u < 12) return "Goedemorgen";
  if (u < 18) return "Goedemiddag";
  return "Goedenavond";
}
function yoyTekst(y: any, vorigLabel: string) {
  if (!y) return "";
  const teken = y.absoluut >= 0 ? "+" : "-";
  const pct = y.procent === null ? "" : ` (${teken}${procent(Math.abs(y.procent))})`;
  return `vs ${vorigLabel}: ${teken}${euro(Math.abs(y.absoluut))}${pct}`;
}

const kaart = { background: "#fff", border: `1px solid ${RAND}`, borderRadius: 14, padding: 18 };
const sectieLabel = { fontSize: 13, color: GRIJS, fontWeight: 600 as const, margin: "22px 2px 10px" };

export default function Dashboard() {
  const [data, setData] = useState<any>(null);
  const [fout, setFout] = useState("");

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((d) => (d.fout ? setFout(d.fout) : setData(d)))
      .catch((e) => setFout(String(e)));
  }, []);

  if (fout) return <div style={{ padding: 24, color: "#b00" }}>Fout bij ophalen: {fout}</div>;
  if (!data) return <div style={{ padding: 24, color: GRIJS }}>Cijfers laden...</div>;

  return (
    <main style={{ minHeight: "100vh", background: BG, padding: "28px 16px", fontFamily: "system-ui, -apple-system, sans-serif", color: TEKST }}>
      <div style={{ maxWidth: 1040, margin: "0 auto" }}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 4 }}>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700 }}>{groet()} Cyriel!</h1>
          <span style={{ fontSize: 13, color: GRIJS, background: "#fff", border: `1px solid ${RAND}`, borderRadius: 999, padding: "6px 14px" }}>
            {data.labels.afgerond} vs {data.labels.vorigJaar}
          </span>
        </div>

        {data.operationeel && (
          <>
            <div style={sectieLabel}>Nu openstaand</div>
            <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
              <div style={kaart}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 9, background: BLAUW, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 600 }}>€</div>
                  <div style={{ fontSize: 14, color: GRIJS }}>Te ontvangen</div>
                </div>
                <div style={{ fontSize: 24, fontWeight: 700 }}>{euro2(data.operationeel.teOntvangen.bedrag)}</div>
                <div style={{ fontSize: 13, color: GRIJS, marginTop: 2 }}>{data.operationeel.teOntvangen.aantal} facturen</div>
              </div>
              <div style={kaart}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 9, background: GOUD, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 600 }}>€</div>
                  <div style={{ fontSize: 14, color: GRIJS }}>Te betalen</div>
                </div>
                <div style={{ fontSize: 24, fontWeight: 700 }}>{euro2(data.operationeel.teBetalen.bedrag)}</div>
                <div style={{ fontSize: 13, color: GRIJS, marginTop: 2 }}>{data.operationeel.teBetalen.aantal} inkoopfacturen</div>
              </div>
            </section>
          </>
        )}

        {data.jaar && (
          <>
            <div style={sectieLabel}>Dit jaar ({data.labels.jaar}) tot nu toe</div>
            <section style={{ ...kaart, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 18 }}>
              {JAAR_CELLEN.map((c) => {
                const pct = "pctKey" in c ? data.jaar[(c as any).pctKey] : null;
                return (
                  <div key={c.key}>
                    <div style={{ fontSize: 13, color: GRIJS }}>{c.titel}</div>
                    <div style={{ fontSize: 22, fontWeight: 700 }}>{euro(data.jaar[c.key])}</div>
                    {pct !== null && <div style={{ fontSize: 13, color: GOUD }}>{procent(pct)} marge</div>}
                  </div>
                );
              })}
            </section>
          </>
        )}

        <div style={sectieLabel}>Per maand</div>
        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
          {TEGELS.map((t) => {
            const waarde = data.afgerond[t.key];
            const pct = "pctKey" in t ? data.afgerond[(t as any).pctKey] : null;
            const y = data.yoy[t.key];
            return (
              <div key={t.key} style={kaart}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 9, background: t.kleur, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, fontWeight: 600 }}>{t.symbool}</div>
                  <div style={{ fontSize: 14, color: GRIJS }}>{t.titel}</div>
                </div>
                <div style={{ fontSize: 28, fontWeight: 700 }}>{euro(waarde)}</div>
                {pct !== null && <div style={{ fontSize: 13, color: GRIJS, marginTop: 2 }}>{procent(pct)} marge</div>}
                <div style={{ fontSize: 13, color: BLAUW, marginTop: 8 }}>{yoyTekst(y, data.labels.vorigJaar)}</div>
              </div>
            );
          })}
        </section>

        <div style={{ ...kaart, marginTop: 16, display: "flex", alignItems: "center", gap: 12, padding: "14px 18px" }}>
          <div style={{ width: 26, height: 26, borderRadius: "50%", background: BLAUW, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, flexShrink: 0 }}>i</div>
          <div style={{ fontSize: 14 }}>
            {data.labels.lopend} tot nu toe: <strong>{euro(data.lopend.omzet)}</strong> omzet. Deze maand loopt nog, dus nog niet representatief.
          </div>
        </div>

        <section style={{ ...kaart, marginTop: 16 }}>
          <div style={{ fontSize: 15, fontWeight: 600, paddingBottom: 10, borderBottom: `1px solid ${RAND}`, marginBottom: 14 }}>Vooruitblik volgende maand</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 14 }}>
            {VOORUITBLIK.map((titel) => (
              <div key={titel}>
                <div style={{ fontSize: 13, color: GRIJS }}>{titel}</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: "#c9c6bf" }}>—</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 12, color: GRIJS, marginTop: 10 }}>Wordt gevuld in de volgende stap, een schatting op basis van vorig jaar plus je groei.</div>
        </section>

      </div>
    </main>
  );
}