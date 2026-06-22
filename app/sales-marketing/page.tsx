"use client";

// Sales & Marketing. Alleen voor CG/LE/JM/LV.
// Boven: marketing-analyse (per bron leads/conversie/omzet/ROAS, spend-invoer).
// Onder: de lead-pijplijn = leads met een verstuurde Moneybird-offerte. Per lead:
// status, eigenaar, bel-actie met datum-log, opvolgdatum, en terugschrijven naar
// Moneybird (accepteren/afwijzen). "Mijn opvolging" filtert op je eigen leads.

import { useEffect, useState, useCallback, useRef, CSSProperties } from "react";
import AuthGate, { useGebruiker } from "@/app/components/AuthGate";
import PaginaKop from "@/app/components/PaginaKop";
import { supabase } from "@/lib/supabase";
import { apiFetch } from "@/lib/api";
import { euro } from "@/lib/format";
import { magSales, codeVoorEmail } from "@/app/werkplaats-planning/planning-config";
import { GROEN, GROEN_BG, GOUD, ROOD, ROOD_BG, TEKST, GRIJS, RAND, BG, KAART_BG } from "@/lib/theme";

type Actie = { id: string; soort: string; tekst: string; door: string; datum: string };
type Lead = { id: string; datum: string; naam: string; email: string; telefoon: string; bedrijf: string; carburateur: string; bericht: string; bron: string; status: string; eigenaar: string | null; sales_notitie: string | null; opvolgen_op: string | null; omzet_excl: number; offerte_id: string | null; offerte_nummer: string | null; offerte_state: string | null; offerte_bedrag: number | null; offerte_url: string | null; acties: Actie[] };
type PerBron = { bron: string; leads: number; klanten: number; omzet: number; spend: number; roas: number | null; conversie: number };
type Ltv = { bron: string; klanten: number; omzet: number; gem: number; aandeel: number; aandeelKlanten: number };
type Data = { perBron: PerBron[]; totaal: { leads: number; klanten: number; omzet: number; spend: number; omzetBetaald: number; roas: number | null }; leads: Lead[]; spend: { google_ads: number; facebook: number; marktplaats: number }; ltv: Ltv[]; ltvTotaal: { klanten: number; omzet: number; gem: number } };

const STATUS = ["nieuw", "gebeld", "uitstellen", "geaccepteerd", "afgewezen"];
const STATUS_KLEUR: Record<string, string> = { nieuw: "#6b7280", gebeld: "#2f6f8f", uitstellen: "#b07d12", geaccepteerd: GROEN, afgewezen: ROOD };
const EIGENAREN = ["", "CG", "LE", "JM", "LV"];
const BRON_LABEL: Record<string, string> = { google_ads: "Google Ads", facebook: "Facebook", marktplaats: "Marktplaats", organisch: "Organisch" };
const bronLabel = (b: string) => BRON_LABEL[b] || b;
const OFFERTE_LABEL: Record<string, string> = { open: "verstuurd", late: "verlopen", accepted: "geaccepteerd", rejected: "afgewezen", draft: "concept", billed: "gefactureerd" };
const VERSTUURD = ["open", "late"];

function range(mode: string, anker: Date) {
  // Periode = de lokale maand/kwartaal/jaar van het anker, maar de grenzen bouwen
  // we op UTC-middernacht. Anders valt 1 juli lokaal (= 30 juni 22:00 UTC) in de
  // verkeerde maand en pakt de spend-functie de vorige maand. (TZ-fix)
  const y = anker.getFullYear(), m = anker.getMonth();
  const maandLabel = new Date(y, m, 1).toLocaleDateString("nl-NL", { month: "long", year: "numeric" });
  if (mode === "maand") return { van: new Date(Date.UTC(y, m, 1)), tot: new Date(Date.UTC(y, m + 1, 1)), label: maandLabel };
  if (mode === "kwartaal") { const q = Math.floor(m / 3); return { van: new Date(Date.UTC(y, q * 3, 1)), tot: new Date(Date.UTC(y, q * 3 + 3, 1)), label: `Q${q + 1} ${y}` }; }
  return { van: new Date(Date.UTC(y, 0, 1)), tot: new Date(Date.UTC(y + 1, 0, 1)), label: String(y) };
}
const pct = (n: number) => `${Math.round(n * 100)}%`;
const datkort = (iso: string) => new Date(iso).toLocaleDateString("nl-NL", { day: "numeric", month: "short" });

export default function LeadMarketingPagina() {
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
        <p style={{ fontSize: 14, color: TEKST, lineHeight: 1.5 }}>Dit dashboard is alleen voor het sales- en marketing-team.</p>
        <button onClick={uitloggen} style={{ marginTop: 14, border: `1px solid ${RAND}`, background: "#fff", color: GRIJS, borderRadius: 999, padding: "9px 16px", fontWeight: 700, cursor: "pointer" }}>Uitloggen</button>
      </div>
    </main>
  );
  return <Dashboard />;
}

function Dashboard() {
  const { naam, uitloggen } = useGebruiker();
  const [mijnCode, setMijnCode] = useState<string | null>(null);
  const [mode, setMode] = useState("maand");
  const [anker, setAnker] = useState(() => new Date());
  const [data, setData] = useState<Data | null>(null);
  const [laden, setLaden] = useState(true);
  const [mijn, setMijn] = useState(false);
  const [toonAlle, setToonAlle] = useState(false);
  const [zoek, setZoek] = useState("");
  const [roasKanaal, setRoasKanaal] = useState("totaal"); // welk kanaal de ROAS-KPI toont
  const [flash, setFlash] = useState<Record<string, boolean>>({});      // groene "verzonden"-flash
  const [teVaak, setTeVaak] = useState<Record<string, boolean>>({});     // dedup-melding
  const laatstRef = useRef<Record<string, { tekst: string; tijd: number }>>({});

  useEffect(() => { supabase.auth.getUser().then(({ data }) => setMijnCode(codeVoorEmail(data.user?.email))); }, []);
  const { van, tot, label } = range(mode, anker);

  const laad = useCallback(async () => {
    setLaden(true);
    try {
      const r = await apiFetch(`/api/sales?van=${encodeURIComponent(van.toISOString())}&tot=${encodeURIComponent(tot.toISOString())}`);
      const j = await r.json();
      setData(j);
    } catch { setData(null); } finally { setLaden(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, anker]);
  useEffect(() => { laad(); }, [laad]);

  function schuif(r: number) { const d = new Date(anker); if (mode === "maand") d.setMonth(d.getMonth() + r); else if (mode === "kwartaal") d.setMonth(d.getMonth() + r * 3); else d.setFullYear(d.getFullYear() + r); setAnker(d); }

  function patchLokaal(id: string, velden: Partial<Lead>) {
    setData((d) => d ? { ...d, leads: d.leads.map((L) => L.id === id ? { ...L, ...velden } : L) } : d);
  }
  async function wijzigLead(id: string, veld: string, waarde: string) {
    patchLokaal(id, { [veld]: waarde } as Partial<Lead>);
    try {
      const r = await apiFetch("/api/sales/lead", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, [veld]: waarde }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || j.fout) window.alert("Opslaan mislukt: " + (j.fout || r.status));
    } catch { window.alert("Opslaan mislukt (geen verbinding)."); }
  }
  async function logActie(L: Lead, soort: string, tekst: string): Promise<boolean> {
    try {
      const r = await apiFetch("/api/sales/actie", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lead_id: L.id, soort, tekst }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || j.fout) { window.alert("Niet opgeslagen: " + (j.fout || r.status)); return false; }
      const nieuw: Actie = { id: Math.random().toString(36), soort, tekst, door: j.door || mijnCode || "", datum: new Date().toISOString() };
      const wordtGebeld = soort === "gebeld" && L.status === "nieuw";
      patchLokaal(L.id, { acties: [nieuw, ...(L.acties || [])], status: wordtGebeld ? "gebeld" : L.status });
      if (wordtGebeld) apiFetch("/api/sales/lead", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: L.id, status: "gebeld" }) });
      return true;
    } catch { window.alert("Niet opgeslagen (geen verbinding)."); return false; }
  }
  function belActie(L: Lead) { logActie(L, "gebeld", ""); }
  async function notitieNaarMB(L: Lead) {
    const t = (L.sales_notitie || "").trim();
    if (!t) return;
    const prev = laatstRef.current[L.id];
    if (prev && prev.tekst === t && Date.now() - prev.tijd < 120000) {
      setTeVaak((s) => ({ ...s, [L.id]: true }));
      setTimeout(() => setTeVaak((s) => ({ ...s, [L.id]: false })), 2500);
      return;
    }
    const ok = await logActie(L, "notitie", t);
    if (!ok) return;
    laatstRef.current[L.id] = { tekst: t, tijd: Date.now() };
    setFlash((s) => ({ ...s, [L.id]: true })); // groene flash
    setTimeout(() => {
      patchLokaal(L.id, { sales_notitie: "" });
      apiFetch("/api/sales/lead", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: L.id, sales_notitie: "" }) });
      setFlash((s) => ({ ...s, [L.id]: false }));
    }, 1700);
  }
  // De status-dropdown is de enige knop: bij een beslissing met gekoppelde
  // offerte schrijft 'ie (na bevestiging) terug naar Moneybird. Idempotent.
  async function wijzigStatus(L: Lead, nieuw: string) {
    patchLokaal(L.id, { status: nieuw } as Partial<Lead>);
    try {
      await apiFetch("/api/sales/lead", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: L.id, status: nieuw }) });
    } catch { window.alert("Opslaan mislukt (geen verbinding)."); }

    if (L.offerte_id && (nieuw === "afgewezen" || nieuw === "geaccepteerd")) {
      const afw = nieuw === "afgewezen";
      const vraag = afw
        ? `Offerte ${L.offerte_nummer || ""} ook in Moneybird afwijzen?`
        : `Offerte ${L.offerte_nummer || ""} zelf accepteren in Moneybird?\n\nAnnuleren = je laat de klant zelf tekenen via de offerte-link.`;
      if (window.confirm(vraag)) {
        const r = await apiFetch("/api/sales/moneybird", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lead_id: L.id, actie: afw ? "declined" : "accepted" }) });
        const j = await r.json().catch(() => ({}));
        if (j.fout) window.alert(`Moneybird: ${j.fout}\n\nDe status staat hier wel goed.`);
        else laad();
      }
    }
  }

  const modeKnop = (m: string): CSSProperties => ({ border: `1.5px solid ${GROEN}`, background: mode === m ? GROEN : "#fff", color: mode === m ? "#fff" : GROEN, borderRadius: 10, padding: "8px 16px", fontSize: 14, fontWeight: 700, cursor: "pointer" });

  // ROAS per kanaal: elk betaald kanaal z'n eigen omzet ÷ eigen spend. Plus
  // "Totaal" (alle betaalde omzet ÷ alle spend) en "Alle" (incl. organisch).
  const roasVoor = (key: string): number | null => {
    if (!data) return null;
    const spend = (key === "totaal" || key === "alle") ? data.totaal.spend : (data.spend[key as keyof typeof data.spend] || 0);
    if (spend <= 0) return null;
    const omzet = key === "alle" ? data.totaal.omzet : key === "totaal" ? data.totaal.omzetBetaald : (data.perBron.find((s) => s.bron === key)?.omzet || 0);
    return omzet / spend;
  };
  const roasOpties = data ? [
    { key: "totaal", label: "Totaal (betaald)" },
    ...(["google_ads", "facebook", "marktplaats"] as const).filter((c) => (data.spend[c] || 0) > 0).map((c) => ({ key: c as string, label: bronLabel(c) })),
    { key: "alle", label: "Alle (incl. organisch)" },
  ] : [];
  const roasW = roasVoor(roasKanaal);
  const roasTotaalRij = roasVoor(roasKanaal === "alle" ? "alle" : "totaal");
  const roasSel = roasOpties.find((o) => o.key === roasKanaal);
  const roasSub = roasW != null ? `${roasSel?.label || ""} · €1 → ${euro(roasW)}` : "geen spend dit kanaal";

  const zoekTerm = zoek.trim().toLowerCase();
  const pijplijn = (data?.leads || []).filter((L) => {
    const inPijp = toonAlle || VERSTUURD.includes(L.offerte_state || "");
    const vanMij = !mijn || L.eigenaar === mijnCode;
    const raakt = !zoekTerm || [L.naam, L.email, L.bedrijf, L.telefoon, L.carburateur, L.offerte_nummer].some((v) => (v || "").toLowerCase().includes(zoekTerm));
    return inPijp && vanMij && raakt;
  });

  return (
    <main style={wrap}>
      <div style={binnen}>
        <PaginaKop naam={naam} onUitloggen={uitloggen} titel="Sales & Marketing" streep />
        <style>{`@keyframes verzondenFade { 0%,60% { opacity: 1; } 100% { opacity: 0.15; } }`}</style>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", marginBottom: 16 }}>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => setMode("maand")} style={modeKnop("maand")}>Maand</button>
            <button onClick={() => setMode("kwartaal")} style={modeKnop("kwartaal")}>Kwartaal</button>
            <button onClick={() => setMode("jaar")} style={modeKnop("jaar")}>Jaar</button>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginLeft: "auto" }}>
            <button onClick={() => schuif(-1)} style={pijl}>◀</button>
            <span style={{ fontWeight: 800, color: GROEN, minWidth: 130, textAlign: "center", textTransform: "capitalize" }}>{label}</span>
            <button onClick={() => schuif(1)} style={pijl}>▶</button>
          </div>
        </div>

        {laden && !data ? <p style={{ color: GRIJS }}>Laden…</p> : data && (
          <>
            {/* Uitleg: hoe lees je dit dashboard (inklapbaar) */}
            <details style={{ ...kaart, marginBottom: 14, fontSize: 13.5 }}>
              <summary style={{ cursor: "pointer", fontWeight: 800, color: GROEN }}>ⓘ Hoe lees je deze cijfers?</summary>
              <ul style={{ margin: "10px 0 0", paddingLeft: 18, lineHeight: 1.65, color: GRIJS }}>
                <li>Een <b>lead</b> is een formulieraanvraag. Alles hieronder is voor de gekozen periode, op de <b>aanvraagdatum</b> van de lead.</li>
                <li><b>Deal gewonnen</b> = een lead die omzet opleverde. <b>Conversie %</b> = deals ÷ leads.</li>
                <li><b>Omzet</b> is <b>per-deal</b>: elke betaalde factuur telt mee bij de lead die juist díé deal opleverde, in díé maand en op dát kanaal (niet alles op de eerste lead).</li>
                <li><b>ROAS</b> = omzet ÷ spend: hoeveel euro je terugkrijgt per €1 advertentie. Boven <b>1×</b> = de advertentie verdient zichzelf terug. <b>Belangrijk:</b> de totaal-ROAS rekent <b>alleen met omzet uit betaalde kanalen</b> — organische omzet is gratis en telt niet mee (anders krijg je een veel te hoge, misleidende ROAS).</li>
                <li><b>Aandeel</b> = welk deel van de totale omzet van die periode dit kanaal levert.</li>
                <li>Let op: een <b>recente maand groeit nog aan</b> — deals closen vaak pas weken later (de doorlooptijd).</li>
              </ul>
            </details>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
              {kpi("Leads", String(data.totaal.leads), GROEN, "aanvragen deze periode")}
              {kpi("Deals gewonnen", String(data.totaal.klanten), GROEN, data.totaal.leads ? pct(data.totaal.klanten / data.totaal.leads) + " conversie" : "nog geen leads")}
              {kpi("Omzet", euro(data.totaal.omzet), GROEN, "van deze leads · per-deal · excl. btw")}
              {kpi("Spend", euro(data.totaal.spend), data.totaal.spend ? TEKST : GRIJS, "advertentiekosten (Moneybird)")}
              {kpi("ROAS", roasW != null ? roasW.toFixed(1) + "x" : "—", roasW != null ? (roasW >= 1 ? GROEN : ROOD) : GRIJS, roasSub)}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", margin: "-4px 2px 16px", fontSize: 12.5, color: GRIJS }}>
              <span>ROAS van:</span>
              {roasOpties.map((o) => <button key={o.key} onClick={() => setRoasKanaal(o.key)} style={toggle(roasKanaal === o.key)}>{o.label}</button>)}
            </div>

            <div style={kaart}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                <div style={kop}>Per bron — deze periode</div>
                <span style={{ fontSize: 12, color: GRIJS }}>welk kanaal levert de leads, deals en omzet</span>
              </div>
              <div style={{ overflowX: "auto", marginTop: 10 }}>
                <table style={tabel}>
                  <thead><tr>{["Bron", "Leads", "Deals", "Conversie", "Omzet", "% omzet", "Spend", "ROAS"].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
                  <tbody>
                    {data.perBron.map((s) => (
                      <tr key={s.bron}>
                        <td style={{ ...td, fontWeight: 700 }}>{bronLabel(s.bron)}</td>
                        <td style={td}>{s.leads}</td><td style={td}>{s.klanten}</td><td style={td}>{pct(s.conversie)}</td>
                        <td style={{ ...td, fontWeight: 700 }}>{euro(s.omzet)}</td>
                        <td style={td}>{data.totaal.omzet ? pct(s.omzet / data.totaal.omzet) : "—"}</td>
                        <td style={td}>{s.spend ? euro(s.spend) : "—"}</td>
                        <td style={{ ...td, fontWeight: 800, color: s.roas == null ? GRIJS : s.roas >= 1 ? GROEN : ROOD }}>{s.roas != null ? s.roas.toFixed(1) + "x" : "—"}</td>
                      </tr>
                    ))}
                    {data.perBron.length === 0 && <tr><td style={td} colSpan={8}>Geen leads in deze periode.</td></tr>}
                    {data.perBron.length > 0 && (
                      <tr style={{ borderTop: `2px solid ${RAND}` }}>
                        <td style={{ ...td, fontWeight: 800, borderBottom: "none" }}>Totaal</td>
                        <td style={{ ...td, fontWeight: 800, borderBottom: "none" }}>{data.totaal.leads}</td>
                        <td style={{ ...td, fontWeight: 800, borderBottom: "none" }}>{data.totaal.klanten}</td>
                        <td style={{ ...td, fontWeight: 800, borderBottom: "none" }}>{data.totaal.leads ? pct(data.totaal.klanten / data.totaal.leads) : "—"}</td>
                        <td style={{ ...td, fontWeight: 800, borderBottom: "none" }}>{euro(data.totaal.omzet)}</td>
                        <td style={{ ...td, fontWeight: 800, borderBottom: "none" }}>{data.totaal.omzet ? "100%" : "—"}</td>
                        <td style={{ ...td, fontWeight: 800, borderBottom: "none" }}>{data.totaal.spend ? euro(data.totaal.spend) : "—"}</td>
                        <td style={{ ...td, fontWeight: 800, borderBottom: "none", color: roasTotaalRij == null ? GRIJS : roasTotaalRij >= 1 ? GROEN : ROOD }}>{roasTotaalRij != null ? roasTotaalRij.toFixed(1) + "x" : "—"}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{ fontSize: 12, color: GRIJS, margin: "-6px 2px 14px" }}>
              Spend komt automatisch uit Moneybird (grootboeken Google Ads / Facebook Ads / Marktplaats). Let op: maand-ROAS hangt af van wanneer de advertentiefactuur in Moneybird geboekt is.
            </div>

            {/* LTV per kanaal (hele historie) */}
            {data.ltv && data.ltv.length > 0 && (
              <div style={kaart}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                  <div style={kop}>Klantwaarde per kanaal — hele historie</div>
                  <span style={{ fontSize: 12, color: GRIJS }}>wat een klant via dit kanaal je gemiddeld oplevert (lifetime value)</span>
                </div>
                <div style={{ overflowX: "auto", marginTop: 10 }}>
                  <table style={tabel}>
                    <thead><tr>{["Kanaal", "Klanten", "% klanten", "Totale omzet", "% omzet", "Gem. per klant (LTV)"].map((h, i) => <th key={i} style={th}>{h}</th>)}</tr></thead>
                    <tbody>
                      {data.ltv.map((s) => (
                        <tr key={s.bron}>
                          <td style={{ ...td, fontWeight: 700 }}>{bronLabel(s.bron)}</td>
                          <td style={td}>{s.klanten}</td>
                          <td style={td}>{pct(s.aandeelKlanten)}</td>
                          <td style={{ ...td, fontWeight: 700 }}>{euro(s.omzet)}</td>
                          <td style={td}>{pct(s.aandeel)}</td>
                          <td style={{ ...td, fontWeight: 800, color: GROEN }}>{euro(s.gem)}</td>
                        </tr>
                      ))}
                      <tr style={{ borderTop: `2px solid ${RAND}` }}>
                        <td style={{ ...td, fontWeight: 800, borderBottom: "none" }}>Totaal / gemiddeld</td>
                        <td style={{ ...td, fontWeight: 800, borderBottom: "none" }}>{data.ltvTotaal.klanten}</td>
                        <td style={{ ...td, fontWeight: 800, borderBottom: "none" }}>100%</td>
                        <td style={{ ...td, fontWeight: 800, borderBottom: "none" }}>{euro(data.ltvTotaal.omzet)}</td>
                        <td style={{ ...td, fontWeight: 800, borderBottom: "none" }}>100%</td>
                        <td style={{ ...td, fontWeight: 800, borderBottom: "none", color: GROEN }}>{euro(data.ltvTotaal.gem)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div style={{ fontSize: 12, color: GRIJS, marginTop: 8, lineHeight: 1.5 }}>
                  Per klant tellen we alle betaalde omzet ooit op en hangen die aan het kanaal van z'n <b>eerste</b> aanvraag. <b>Gem. per klant</b> = totale omzet ÷ aantal klanten — zo zie je of bijv. een Google-klant op de lange duur meer waard is dan een organische.
                </div>
              </div>
            )}

            {/* Pijplijn */}
            <div style={kaart}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", marginBottom: 12 }}>
                <div style={kop}>Pijplijn ({pijplijn.length})</div>
                <div style={{ display: "flex", gap: 6, marginLeft: "auto", flexWrap: "wrap" }}>
                  <button onClick={() => setMijn((v) => !v)} style={toggle(mijn)}>Mijn opvolging</button>
                  <button onClick={() => setToonAlle((v) => !v)} style={toggle(toonAlle)}>{toonAlle ? "Alle leads" : "Alleen verstuurde offertes"}</button>
                </div>
              </div>
              <div style={{ position: "relative", marginBottom: 12, border: `2px solid ${GROEN}`, borderRadius: 12, background: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 15, opacity: 0.7 }}>🔍</span>
                <input
                  value={zoek}
                  onChange={(e) => setZoek(e.target.value)}
                  placeholder="Zoek op klant, e-mail, bedrijf, telefoon, voertuig of offertenummer..."
                  style={{ width: "100%", boxSizing: "border-box", border: "none", outline: "none", borderRadius: 12, padding: "11px 36px 11px 38px", fontSize: 14, background: "transparent", color: TEKST }}
                />
                {zoek && <button onClick={() => setZoek("")} title="Wissen" style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", border: "none", background: "transparent", color: GRIJS, fontSize: 18, lineHeight: 1, cursor: "pointer" }}>×</button>}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {pijplijn.map((L) => {
                  const afgewezen = L.status === "afgewezen";
                  return (
                    <div key={L.id} style={{ border: `1px solid ${afgewezen ? "#e0b3a8" : RAND}`, background: afgewezen ? ROOD_BG : "#fff", borderRadius: 10, padding: "10px 12px" }}>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ minWidth: 0 }}>
                          <span style={{ fontWeight: 800, color: TEKST }}>{L.naam || L.email}</span>
                          {L.bedrijf && <span style={{ color: GRIJS, fontSize: 13 }}> · {L.bedrijf}</span>}
                          <span style={{ ...pil, marginLeft: 8 }}>{bronLabel(L.bron)}</span>
                          {L.offerte_nummer && L.offerte_url && <a href={L.offerte_url} target="_blank" rel="noreferrer" style={{ ...pil, background: "#e7f0ea", color: GROEN, marginLeft: 6, textDecoration: "none" }}>🧾 {L.offerte_nummer}{L.offerte_state ? ` · ${OFFERTE_LABEL[L.offerte_state] || L.offerte_state}` : ""}{L.offerte_bedrag ? ` · ${euro(Number(L.offerte_bedrag))}` : ""}</a>}
                        </div>
                        <div style={{ fontSize: 12, color: GRIJS, whiteSpace: "nowrap" }}>{datkort(L.datum)}</div>
                      </div>
                      <div style={{ fontSize: 12.5, color: GRIJS, margin: "4px 0 8px" }}>{L.email}{L.telefoon ? ` · ${L.telefoon}` : ""}{L.carburateur ? ` · ${L.carburateur}` : ""}</div>

                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                        <select value={L.status || "nieuw"} onChange={(e) => wijzigStatus(L, e.target.value)} style={{ ...sel, borderColor: STATUS_KLEUR[L.status || "nieuw"], color: STATUS_KLEUR[L.status || "nieuw"], fontWeight: 700 }}>
                          {STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <select value={L.eigenaar || ""} onChange={(e) => wijzigLead(L.id, "eigenaar", e.target.value)} style={sel}>
                          {EIGENAREN.map((e) => <option key={e} value={e}>{e || "— eigenaar —"}</option>)}
                        </select>
                        <button onClick={() => belActie(L)} style={knopje}>📞 Gebeld</button>
                        {L.status === "uitstellen" && <input type="date" value={L.opvolgen_op || ""} onChange={(e) => wijzigLead(L.id, "opvolgen_op", e.target.value)} title="Opvolgen op" style={{ ...sel, padding: "5px 8px" }} />}
                        {L.offerte_id && L.offerte_url && <a href={L.offerte_url} target="_blank" rel="noreferrer" style={{ ...knopje, color: GRIJS, textDecoration: "none" }}>Klant laten tekenen ↗</a>}
                      </div>

                      {flash[L.id] ? (
                        <div style={{ marginTop: 8, background: GROEN_BG, color: GROEN, borderRadius: 8, padding: "9px 12px", fontSize: 13, fontWeight: 800, textAlign: "center", animation: "verzondenFade 1.7s ease forwards" }}>✓ Verzonden naar Moneybird</div>
                      ) : (
                        <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                          <input value={L.sales_notitie || ""} onChange={(e) => wijzigLead(L.id, "sales_notitie", e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") notitieNaarMB(L); }} placeholder="notitie…  (Enter of de knop = ook naar de offerte in Moneybird)" style={{ flex: 1, boxSizing: "border-box", border: `1px solid ${RAND}`, borderRadius: 8, padding: "6px 10px", fontSize: 13, background: "#fff" }} />
                          <button onClick={() => notitieNaarMB(L)} title="Notitie naar de Moneybird-offerte sturen" style={{ border: "none", background: teVaak[L.id] ? GRIJS : GROEN, color: "#fff", borderRadius: 8, padding: "6px 14px", fontSize: 12.5, fontWeight: 700, cursor: teVaak[L.id] ? "default" : "pointer", whiteSpace: "nowrap" }}>{teVaak[L.id] ? "Te vaak verzonden" : "Notitie naar Moneybird"}</button>
                        </div>
                      )}

                      {(L.acties || []).length > 0 && (
                        <div style={{ marginTop: 8, borderTop: `1px solid ${RAND}`, paddingTop: 6 }}>
                          {(L.acties || []).slice(0, 4).map((a) => (
                            <div key={a.id} style={{ fontSize: 11.5, color: GRIJS }}>• {a.door || "?"} {a.soort}{a.tekst ? ` — ${a.tekst}` : ""} · {new Date(a.datum).toLocaleString("nl-NL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
                {pijplijn.length === 0 && <p style={{ color: GRIJS }}>Geen leads in deze selectie. Tip: zet op "Jaar" of schakel "Alle leads" aan.</p>}
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
const kop: CSSProperties = { fontSize: 12.5, color: GRIJS, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5 };
const tabel: CSSProperties = { width: "100%", borderCollapse: "collapse", fontSize: 14 };
const th: CSSProperties = { textAlign: "left", fontSize: 11.5, color: GRIJS, textTransform: "uppercase", letterSpacing: 0.4, padding: "0 10px 8px 0", borderBottom: `1px solid ${RAND}` };
const td: CSSProperties = { padding: "9px 10px 9px 0", borderBottom: `1px solid ${RAND}` };
const pijl: CSSProperties = { border: `1px solid ${RAND}`, background: "#fff", color: GROEN, borderRadius: 8, padding: "6px 11px", fontSize: 13, cursor: "pointer", fontWeight: 700 };
const sel: CSSProperties = { border: `1px solid ${RAND}`, borderRadius: 8, padding: "6px 10px", fontSize: 13, background: "#fff", cursor: "pointer", fontFamily: "inherit" };
const pil: CSSProperties = { fontSize: 11, fontWeight: 800, background: "#f1efe8", color: GRIJS, borderRadius: 999, padding: "2px 8px" };
const knopje: CSSProperties = { border: `1px solid ${RAND}`, background: "#fff", color: TEKST, borderRadius: 8, padding: "6px 10px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" };
const toggle = (aan: boolean): CSSProperties => ({ border: `1.5px solid ${aan ? GROEN : RAND}`, background: aan ? GROEN : "#fff", color: aan ? "#fff" : GRIJS, borderRadius: 999, padding: "6px 13px", fontSize: 12.5, fontWeight: 700, cursor: "pointer" });
