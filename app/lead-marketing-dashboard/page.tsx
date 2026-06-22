"use client";

// Sales Dashboard. Alleen voor CG/LE/JM/LV. Toont per bron de leads, conversie,
// omzet en ROAS (spend handmatig per maand), plus de lead-pijplijn waarin sales
// elke aanvraag opvolgt (status, eigenaar, notitie). Periode via maand/kwartaal/jaar.

import { useEffect, useState, useCallback, CSSProperties } from "react";
import AuthGate, { useGebruiker } from "@/app/components/AuthGate";
import PaginaKop from "@/app/components/PaginaKop";
import { supabase } from "@/lib/supabase";
import { apiFetch } from "@/lib/api";
import { euro } from "@/lib/format";
import { magSales } from "@/app/werkplaats-planning/planning-config";
import { GROEN, GOUD, ROOD, TEKST, GRIJS, RAND, BG, KAART_BG } from "@/lib/theme";

type PerBron = { bron: string; leads: number; klanten: number; omzet: number; spend: number; roas: number | null; conversie: number };
type Lead = { id: string; datum: string; naam: string; email: string; telefoon: string; bedrijf: string; carburateur: string; bericht: string; bron: string; status: string; eigenaar: string | null; sales_notitie: string | null; omzet_excl: number; klant_sinds: string | null };
type Data = { perBron: PerBron[]; totaal: { leads: number; klanten: number; omzet: number; spend: number; roas: number | null }; leads: Lead[]; spend: { maand: string; kanaal: string; bedrag: number }[] };

const KANALEN = [{ key: "google_ads", label: "Google Ads" }, { key: "facebook", label: "Facebook" }, { key: "overig", label: "Overig" }];
const STATUS = ["nieuw", "gebeld", "offerte", "gewonnen", "verloren"];
const STATUS_KLEUR: Record<string, string> = { nieuw: "#6b7280", gebeld: "#2f6f8f", offerte: GOUD, gewonnen: GROEN, verloren: ROOD };
const EIGENAREN = ["", "CG", "LE", "JM", "LV"];
const BRON_LABEL: Record<string, string> = { google_ads: "Google Ads", facebook: "Facebook", organisch: "Organisch" };
const bronLabel = (b: string) => BRON_LABEL[b] || b;

function range(mode: string, anker: Date) {
  const d = anker;
  if (mode === "maand") return { van: new Date(d.getFullYear(), d.getMonth(), 1), tot: new Date(d.getFullYear(), d.getMonth() + 1, 1), label: new Date(d.getFullYear(), d.getMonth(), 1).toLocaleDateString("nl-NL", { month: "long", year: "numeric" }) };
  if (mode === "kwartaal") { const q = Math.floor(d.getMonth() / 3); return { van: new Date(d.getFullYear(), q * 3, 1), tot: new Date(d.getFullYear(), q * 3 + 3, 1), label: `Q${q + 1} ${d.getFullYear()}` }; }
  return { van: new Date(d.getFullYear(), 0, 1), tot: new Date(d.getFullYear() + 1, 0, 1), label: String(d.getFullYear()) };
}
function pct(n: number) { return `${Math.round(n * 100)}%`; }

export default function SalesPagina() {
  return <AuthGate><Gate /></AuthGate>;
}

function Gate() {
  const [mag, setMag] = useState<boolean | null>(null);
  const { uitloggen } = useGebruiker();
  useEffect(() => { supabase.auth.getUser().then(({ data }) => setMag(magSales(data.user?.email))); }, []);
  if (mag === null) return <main style={wrapL}><p style={{ color: GRIJS }}>Controleren…</p></main>;
  if (!mag) return (
    <main style={{ ...wrapL, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#fff", border: `1px solid ${RAND}`, borderRadius: 16, padding: 28, maxWidth: 380, textAlign: "center" }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: GROEN, margin: "0 0 8px" }}>Geen toegang</h1>
        <p style={{ fontSize: 14, color: TEKST, lineHeight: 1.5 }}>Dit dashboard is alleen voor het lead- en marketing-team.</p>
        <button onClick={uitloggen} style={{ marginTop: 14, border: `1px solid ${RAND}`, background: "#fff", color: GRIJS, borderRadius: 999, padding: "9px 16px", fontWeight: 700, cursor: "pointer" }}>Uitloggen</button>
      </div>
    </main>
  );
  return <Dashboard />;
}

function Dashboard() {
  const { naam, uitloggen } = useGebruiker();
  const [mode, setMode] = useState("maand");
  const [anker, setAnker] = useState(() => new Date());
  const [data, setData] = useState<Data | null>(null);
  const [laden, setLaden] = useState(true);
  const [spendVeld, setSpendVeld] = useState<Record<string, string>>({});

  const { van, tot, label } = range(mode, anker);

  const laad = useCallback(async () => {
    setLaden(true);
    try {
      const r = await apiFetch(`/api/sales?van=${encodeURIComponent(van.toISOString())}&tot=${encodeURIComponent(tot.toISOString())}`);
      const j = await r.json();
      setData(j);
      const sv: Record<string, string> = {};
      KANALEN.forEach((k) => { const row = (j.spend || []).find((s: any) => s.kanaal === k.key); sv[k.key] = row ? String(row.bedrag) : ""; });
      setSpendVeld(sv);
    } catch { setData(null); } finally { setLaden(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, anker]);
  useEffect(() => { laad(); }, [laad]);

  function schuif(richting: number) {
    const d = new Date(anker);
    if (mode === "maand") d.setMonth(d.getMonth() + richting);
    else if (mode === "kwartaal") d.setMonth(d.getMonth() + richting * 3);
    else d.setFullYear(d.getFullYear() + richting);
    setAnker(d);
  }

  async function bewaarSpend() {
    const maandISO = `${van.getFullYear()}-${String(van.getMonth() + 1).padStart(2, "0")}-01`;
    for (const k of KANALEN) {
      const v = spendVeld[k.key];
      if (v === undefined || v === "") continue;
      await apiFetch("/api/sales/spend", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ maand: maandISO, kanaal: k.key, bedrag: Number(v) || 0 }) });
    }
    laad();
  }

  async function wijzigLead(id: string, veld: string, waarde: string) {
    setData((d) => d ? { ...d, leads: d.leads.map((L) => L.id === id ? { ...L, [veld]: waarde } as Lead : L) } : d);
    await apiFetch("/api/sales/lead", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, [veld]: waarde }) });
  }

  const modeKnop = (m: string, lbl: string): CSSProperties => ({ border: `1.5px solid ${GROEN}`, background: mode === m ? GROEN : "#fff", color: mode === m ? "#fff" : GROEN, borderRadius: 10, padding: "8px 16px", fontSize: 14, fontWeight: 700, cursor: "pointer" });

  return (
    <main style={wrap}>
      <div style={binnen}>
        <PaginaKop naam={naam} onUitloggen={uitloggen} titel="Lead + Marketing Dashboard" streep />

        {/* Periode */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", marginBottom: 16 }}>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => setMode("maand")} style={modeKnop("maand", "Maand")}>Maand</button>
            <button onClick={() => setMode("kwartaal")} style={modeKnop("kwartaal", "Kwartaal")}>Kwartaal</button>
            <button onClick={() => setMode("jaar")} style={modeKnop("jaar", "Jaar")}>Jaar</button>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginLeft: "auto" }}>
            <button onClick={() => schuif(-1)} style={pijl}>◀</button>
            <span style={{ fontWeight: 800, color: GROEN, minWidth: 130, textAlign: "center", textTransform: "capitalize" }}>{label}</span>
            <button onClick={() => schuif(1)} style={pijl}>▶</button>
          </div>
        </div>

        {laden && !data ? <p style={{ color: GRIJS }}>Laden…</p> : data && (
          <>
            {/* Totaal-strip */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
              {kpi("Leads", String(data.totaal.leads), GROEN)}
              {kpi("Klanten", String(data.totaal.klanten), GROEN, data.totaal.leads ? pct(data.totaal.klanten / data.totaal.leads) + " conversie" : "")}
              {kpi("Omzet", euro(data.totaal.omzet), GROEN, "excl btw")}
              {kpi("Spend", euro(data.totaal.spend), data.totaal.spend ? TEKST : GRIJS)}
              {kpi("ROAS", data.totaal.roas != null ? data.totaal.roas.toFixed(1) + "x" : "—", data.totaal.roas != null ? (data.totaal.roas >= 1 ? GROEN : ROOD) : GRIJS, "omzet ÷ spend")}
            </div>

            {/* Per bron */}
            <div style={kaart}>
              <div style={kop}>Per bron</div>
              <div style={{ overflowX: "auto" }}>
                <table style={tabel}>
                  <thead><tr>{["Bron", "Leads", "Klanten", "Conversie", "Omzet", "Spend", "ROAS"].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
                  <tbody>
                    {data.perBron.map((s) => (
                      <tr key={s.bron}>
                        <td style={{ ...td, fontWeight: 700 }}>{bronLabel(s.bron)}</td>
                        <td style={td}>{s.leads}</td>
                        <td style={td}>{s.klanten}</td>
                        <td style={td}>{pct(s.conversie)}</td>
                        <td style={{ ...td, fontWeight: 700 }}>{euro(s.omzet)}</td>
                        <td style={td}>{s.spend ? euro(s.spend) : "—"}</td>
                        <td style={{ ...td, fontWeight: 800, color: s.roas == null ? GRIJS : s.roas >= 1 ? GROEN : ROOD }}>{s.roas != null ? s.roas.toFixed(1) + "x" : "—"}</td>
                      </tr>
                    ))}
                    {data.perBron.length === 0 && <tr><td style={td} colSpan={7}>Geen leads in deze periode.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Spend invoer (alleen per maand) */}
            {mode === "maand" && (
              <div style={kaart}>
                <div style={kop}>Advertentie-spend deze maand (excl btw)</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end" }}>
                  {KANALEN.map((k) => (
                    <div key={k.key}>
                      <div style={{ fontSize: 12, color: GRIJS, fontWeight: 700, marginBottom: 4 }}>{k.label}</div>
                      <input type="number" value={spendVeld[k.key] ?? ""} onChange={(e) => setSpendVeld((s) => ({ ...s, [k.key]: e.target.value }))} placeholder="0" style={{ width: 120, boxSizing: "border-box", border: `1.5px solid ${RAND}`, borderRadius: 8, padding: "8px 10px", fontSize: 14, background: "#fff" }} />
                    </div>
                  ))}
                  <button onClick={bewaarSpend} style={{ background: GROEN, color: "#fff", border: "none", borderRadius: 10, padding: "10px 18px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Opslaan</button>
                </div>
                <div style={{ fontSize: 12, color: GRIJS, marginTop: 8 }}>Vul hier de maandbedragen in (Google Ads, Facebook). Daarna rekent ROAS hierboven mee.</div>
              </div>
            )}

            {/* Lead-pijplijn */}
            <div style={kaart}>
              <div style={kop}>Leads / pijplijn ({data.leads.length})</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {data.leads.map((L) => (
                  <div key={L.id} style={{ border: `1px solid ${RAND}`, borderRadius: 10, padding: "10px 12px", background: "#fff" }}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ minWidth: 0 }}>
                        <span style={{ fontWeight: 800, color: TEKST }}>{L.naam || L.email}</span>
                        {L.bedrijf && <span style={{ color: GRIJS, fontSize: 13 }}> · {L.bedrijf}</span>}
                        <span style={{ ...bronPil, marginLeft: 8 }}>{bronLabel(L.bron)}</span>
                        {Number(L.omzet_excl) > 0 && <span style={{ ...bronPil, background: "#e7f0ea", color: GROEN, marginLeft: 6 }}>klant · {euro(Number(L.omzet_excl))}</span>}
                      </div>
                      <div style={{ fontSize: 12, color: GRIJS, whiteSpace: "nowrap" }}>{new Date(L.datum).toLocaleDateString("nl-NL", { day: "numeric", month: "short" })}</div>
                    </div>
                    <div style={{ fontSize: 12.5, color: GRIJS, margin: "4px 0 8px" }}>
                      {L.email}{L.telefoon ? ` · ${L.telefoon}` : ""}{L.carburateur ? ` · ${L.carburateur}` : ""}
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                      <select value={L.status || "nieuw"} onChange={(e) => wijzigLead(L.id, "status", e.target.value)} style={{ ...sel, borderColor: STATUS_KLEUR[L.status || "nieuw"], color: STATUS_KLEUR[L.status || "nieuw"], fontWeight: 700 }}>
                        {STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <select value={L.eigenaar || ""} onChange={(e) => wijzigLead(L.id, "eigenaar", e.target.value)} style={sel}>
                        {EIGENAREN.map((e) => <option key={e} value={e}>{e || "— eigenaar —"}</option>)}
                      </select>
                      <input value={L.sales_notitie || ""} onChange={(e) => wijzigLead(L.id, "sales_notitie", e.target.value)} placeholder="notitie…" style={{ flex: 1, minWidth: 140, border: `1px solid ${RAND}`, borderRadius: 8, padding: "6px 10px", fontSize: 13, background: "#fff" }} />
                    </div>
                  </div>
                ))}
                {data.leads.length === 0 && <p style={{ color: GRIJS }}>Geen leads in deze periode.</p>}
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

function kpi(titel: string, waarde: string, kleur: string, onder?: string) {
  return (
    <div style={{ ...kaart, marginBottom: 0, flex: 1, minWidth: 130 }}>
      <div style={{ fontSize: 12, color: GRIJS, fontWeight: 600 }}>{titel}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color: kleur, lineHeight: 1.1, marginTop: 2 }}>{waarde}</div>
      {onder && <div style={{ fontSize: 12, color: GRIJS, marginTop: 2 }}>{onder}</div>}
    </div>
  );
}

const wrap: CSSProperties = { minHeight: "100vh", background: BG, color: TEKST, fontFamily: "'Karma', Georgia, serif", padding: "26px max(20px, 3vw)" };
const wrapL: CSSProperties = { minHeight: "100vh", background: BG, color: TEKST, fontFamily: "'Karma', Georgia, serif", padding: 24 };
const binnen: CSSProperties = { maxWidth: 1100, margin: "0 auto" };
const kaart: CSSProperties = { background: KAART_BG, border: `1px solid ${RAND}`, borderRadius: 16, padding: 16, marginBottom: 16 };
const kop: CSSProperties = { fontSize: 12.5, color: GRIJS, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12 };
const tabel: CSSProperties = { width: "100%", borderCollapse: "collapse", fontSize: 14 };
const th: CSSProperties = { textAlign: "left", fontSize: 11.5, color: GRIJS, textTransform: "uppercase", letterSpacing: 0.4, padding: "0 10px 8px 0", borderBottom: `1px solid ${RAND}` };
const td: CSSProperties = { padding: "9px 10px 9px 0", borderBottom: `1px solid ${RAND}` };
const pijl: CSSProperties = { border: `1px solid ${RAND}`, background: "#fff", color: GROEN, borderRadius: 8, padding: "6px 11px", fontSize: 13, cursor: "pointer", fontWeight: 700 };
const sel: CSSProperties = { border: `1px solid ${RAND}`, borderRadius: 8, padding: "6px 10px", fontSize: 13, background: "#fff", cursor: "pointer", fontFamily: "inherit" };
const bronPil: CSSProperties = { fontSize: 11, fontWeight: 800, background: "#f1efe8", color: GRIJS, borderRadius: 999, padding: "2px 8px" };
