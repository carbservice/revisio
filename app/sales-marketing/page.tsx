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

const STATUS = ["nieuw", "gebeld", "vernieuwde offerte", "uitstellen", "geaccepteerd", "afgewezen"];
const STATUS_KLEUR: Record<string, string> = { nieuw: "#6b7280", gebeld: "#2f6f8f", "vernieuwde offerte": "#0d9488", uitstellen: "#b07d12", geaccepteerd: GROEN, afgewezen: ROOD };
// Sorteervolgorde: te-bellen bovenaan, afgehandelde leads zakken naar onderen.
const STATUS_PRIO: Record<string, number> = { nieuw: 0, "vernieuwde offerte": 1, gebeld: 2, uitstellen: 3, geaccepteerd: 4, afgewezen: 5 };
const EIGENAREN = ["", "CG", "LE", "JM", "LV"];
const BRON_LABEL: Record<string, string> = { google_ads: "Google Ads", facebook: "Facebook", marktplaats: "Marktplaats", organisch: "Organisch" };
const bronLabel = (b: string) => BRON_LABEL[b] || b;
const OFFERTE_LABEL: Record<string, string> = { open: "verstuurd", late: "verlopen", accepted: "geaccepteerd", rejected: "afgewezen", draft: "concept", billed: "gefactureerd" };
const VERSTUURD = ["draft", "open", "late"]; // concepten ook tonen (= direct opvolgen)

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
  const [gewonnenFilter, setGewonnenFilter] = useState(false);
  const [zoek, setZoek] = useState("");
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

    if (nieuw === "geaccepteerd") {
      // Geaccepteerd alleen loggen (telt mee in het sales-dagoverzicht); GEEN actie in Moneybird.
      logActie(L, "geaccepteerd", "");
    } else if (L.offerte_id && nieuw === "afgewezen") {
      if (window.confirm(`Offerte ${L.offerte_nummer || ""} ook in Moneybird afwijzen?`)) {
        const r = await apiFetch("/api/sales/moneybird", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lead_id: L.id, actie: "declined" }) });
        const j = await r.json().catch(() => ({}));
        if (j.fout) window.alert(`Moneybird: ${j.fout}\n\nDe status staat hier wel goed.`);
        else laad();
      }
    }
  }

  const modeKnop = (m: string): CSSProperties => ({ border: `1.5px solid ${GROEN}`, background: mode === m ? GROEN : "#fff", color: mode === m ? "#fff" : GROEN, borderRadius: 10, padding: "8px 16px", fontSize: 14, fontWeight: 700, cursor: "pointer" });

  // ROAS per kanaal: elk betaald kanaal z'n eigen omzet ÷ eigen spend. Alle
  // getallen staan altijd zichtbaar (geen knoppen) — dashboard = 1 oogopslag.
  const roasInfo = (key: string): { spend: number; omzet: number; roas: number | null } => {
    if (!data) return { spend: 0, omzet: 0, roas: null };
    const spend = (key === "totaal" || key === "alle") ? data.totaal.spend : (data.spend[key as keyof typeof data.spend] || 0);
    const omzet = key === "alle" ? data.totaal.omzet : key === "totaal" ? data.totaal.omzetBetaald : (data.perBron.find((s) => s.bron === key)?.omzet || 0);
    return { spend, omzet, roas: spend > 0 ? omzet / spend : null };
  };
  const roasTotaal = roasInfo("totaal").roas;

  const zoekTerm = zoek.trim().toLowerCase();
  const pijplijn = (data?.leads || []).filter((L) => {
    const inPijp = gewonnenFilter ? L.status === "geaccepteerd" : (toonAlle || L.status === "geaccepteerd" || VERSTUURD.includes(L.offerte_state || ""));
    const vanMij = !mijn || L.eigenaar === mijnCode;
    const raakt = !zoekTerm || [L.naam, L.email, L.bedrijf, L.telefoon, L.carburateur, L.offerte_nummer].some((v) => (v || "").toLowerCase().includes(zoekTerm));
    return inPijp && vanMij && raakt;
  }).sort((a, b) => {
    const pa = STATUS_PRIO[a.status || "nieuw"] ?? 2, pb = STATUS_PRIO[b.status || "nieuw"] ?? 2;
    if (pa !== pb) return pa - pb;            // op te volgen bovenaan, afgerond onderaan
    return (b.datum || "").localeCompare(a.datum || ""); // binnen een groep: nieuwste eerst
  });
  const aantalGewonnen = (data?.leads || []).filter((L) => L.status === "geaccepteerd").length;

  return (
    <main style={wrap}>
      <div style={binnen}>
        <PaginaKop naam={naam} onUitloggen={uitloggen} titel="Sales & Marketing" streep />
        <style>{`@keyframes verzondenFade { 0%,60% { opacity: 1; } 100% { opacity: 0.15; } } @keyframes laadbalk { 0% { left: -35%; } 100% { left: 100%; } }`}</style>
        {laden && (
          <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: 3, background: "rgba(0,0,0,0.07)", zIndex: 60, overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, height: "100%", width: "35%", background: GROEN, animation: "laadbalk 1s ease-in-out infinite" }} />
          </div>
        )}

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
            {/* HERO: groen-gradient cockpit met de hoofdcijfers */}
            <div style={hero}>
              <div style={heroGlow} />
              <div style={{ position: "relative", display: "flex", flexWrap: "wrap", gap: 22, alignItems: "flex-end" }}>
                {heroKpi("Totale omzet", euro(data.totaal.omzet), "alles bij elkaar")}
                {heroKpi("Omzet zonder advertenties", euro(data.totaal.omzet - data.totaal.omzetBetaald), data.totaal.omzet ? `${pct((data.totaal.omzet - data.totaal.omzetBetaald) / data.totaal.omzet)} van de omzet · gratis binnen` : "", "#86e0b0")}
                {heroKpi("Omzet uit advertenties", euro(data.totaal.omzetBetaald), data.totaal.omzet ? `${pct(data.totaal.omzetBetaald / data.totaal.omzet)} van de omzet` : "", "#e9cd8a")}
              </div>
            </div>

            {/* Secundaire stats */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
              {statChip("Aanvragen", String(data.totaal.leads), GROEN, "via het formulier (= 'leads')")}
              {statChip("Betaalde klussen", String(data.totaal.klanten), GROEN, "aanvragen die klant werden")}
              {statChip("Conversie", data.totaal.leads ? pct(data.totaal.klanten / data.totaal.leads) : "—", GROEN, "% aanvragen dat klant wordt")}
              {statChip("Advertentiekosten", euro(data.totaal.spend), data.totaal.spend ? TEKST : GRIJS, "wat je aan ads uitgaf (= 'spend')")}
            </div>

            {/* Rendement (ROAS) per kanaal: lichtgroene tegels met uitleg per kaart */}
            <div style={{ margin: "0 2px 10px" }}>
              <div style={kop}>Rendement van je advertenties <span style={{ fontWeight: 600, textTransform: "none", letterSpacing: 0, color: GRIJS }}>(dit heet ROAS)</span></div>
              <div style={{ fontSize: 12.5, color: GRIJS, marginTop: 4, lineHeight: 1.5, maxWidth: 760 }}>
                Hoeveel <b>omzet</b> je terugkrijgt per <b>€ 1</b> die je aan advertenties uitgeeft. <b>1× = je geld precies terug</b>, <b>3× = drie keer zoveel</b> als je uitgaf. Hoe hoger, hoe beter. Onder de 1× (rood) verdient de advertentie zichzelf niet terug. <b>Let op:</b> dit zet de omzet alleen tegenover de <b>advertentiekosten</b>. Je werk, onderdelen en vaste lasten zitten er niet in, dus het is geen nettowinst.
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 18 }}>
              {[
                { key: "totaal", label: "Alle advertenties samen" },
                ...(["google_ads", "facebook", "marktplaats"] as const).filter((c) => (data.spend[c] || 0) > 0).map((c) => ({ key: c as string, label: bronLabel(c) })),
              ].map((o) => {
                const r = roasInfo(o.key);
                const kleur = r.roas == null ? GRIJS : r.roas >= 1 ? GROEN : ROOD;
                const zin = r.roas == null
                  ? "nog geen advertentiekosten deze periode"
                  : `Elke € 1 advertenties → brengt ${euro(r.roas)} omzet, dat is ${r.roas >= 1 ? "nog geen winst maar een positief resultaat" : "minder dan je uitgaf"}`;
                return (
                  <div key={o.key} style={{ flex: "1 1 240px", minWidth: 215, background: "linear-gradient(160deg, #ffffff 0%, #e7f0ea 100%)", border: `1px solid ${RAND}`, borderLeft: `5px solid ${kleur}`, borderRadius: 14, padding: "14px 16px", boxShadow: "0 1px 3px rgba(26,60,46,0.06)" }}>
                    <div style={{ fontSize: 13, color: TEKST, fontWeight: 800 }}>{o.label}</div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 7, marginTop: 7 }}>
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: GRIJS, letterSpacing: 0.3 }}>ROAS</span>
                      <span style={{ fontSize: 31, fontWeight: 800, lineHeight: 1.05, color: kleur }}>{r.roas != null ? r.roas.toFixed(1) + "×" : "—"}</span>
                      {r.roas != null && <span style={{ fontSize: 15, fontWeight: 700, color: kleur }}>= {Math.round(r.roas * 100)}%</span>}
                    </div>
                    <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginTop: 11 }}>
                      <div>
                        <div style={{ fontSize: 20, fontWeight: 800, color: GROEN, lineHeight: 1.1 }}>{euro(r.omzet)}</div>
                        <div style={{ fontSize: 11, color: GRIJS }}>omzet</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 20, fontWeight: 800, color: TEKST, lineHeight: 1.1 }}>{euro(r.spend)}</div>
                        <div style={{ fontSize: 11, color: GRIJS }}>advertentiekosten</div>
                      </div>
                    </div>
                    <div style={{ fontSize: 12, color: kleur, fontWeight: 600, marginTop: 11, borderTop: "1px solid rgba(0,0,0,0.07)", paddingTop: 8, lineHeight: 1.4 }}>{zin}</div>
                  </div>
                );
              })}
            </div>

            {/* Detailsecties: standaard ingeklapt = rust */}
            <details style={kaart}>
              <summary style={detSummary}>📊 Waar komen je aanvragen vandaan? (per kanaal)</summary>
              <div style={{ marginTop: 12, border: `1px solid ${RAND}`, borderRadius: 12, overflow: "auto" }}>
                <table style={tabel}>
                  <thead><tr>{["Kanaal", "Aanvragen", "Klanten", "Conversie", "Omzet", "Aandeel omzet", "Advertentiekosten", "Rendement"].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
                  <tbody>
                    {data.perBron.map((s, i) => (
                      <tr key={s.bron} style={{ background: i % 2 ? "#f4f8f5" : "#fff" }}>
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
                      <tr style={{ borderTop: `2px solid ${GROEN}`, background: GROEN_BG }}>
                        <td style={{ ...td, fontWeight: 800, borderBottom: "none" }}>Totaal</td>
                        <td style={{ ...td, fontWeight: 800, borderBottom: "none" }}>{data.totaal.leads}</td>
                        <td style={{ ...td, fontWeight: 800, borderBottom: "none" }}>{data.totaal.klanten}</td>
                        <td style={{ ...td, fontWeight: 800, borderBottom: "none" }}>{data.totaal.leads ? pct(data.totaal.klanten / data.totaal.leads) : "—"}</td>
                        <td style={{ ...td, fontWeight: 800, borderBottom: "none" }}>{euro(data.totaal.omzet)}</td>
                        <td style={{ ...td, fontWeight: 800, borderBottom: "none" }}>{data.totaal.omzet ? "100%" : "—"}</td>
                        <td style={{ ...td, fontWeight: 800, borderBottom: "none" }}>{data.totaal.spend ? euro(data.totaal.spend) : "—"}</td>
                        <td style={{ ...td, fontWeight: 800, borderBottom: "none", color: roasTotaal == null ? GRIJS : roasTotaal >= 1 ? GROEN : ROOD }}>{roasTotaal != null ? roasTotaal.toFixed(1) + "x" : "—"}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div style={{ fontSize: 12, color: GRIJS, marginTop: 10 }}>
                De advertentiekosten komen automatisch uit Moneybird. Het rendement van een maand kan nog veranderen als de advertentiefactuur van die maand later geboekt wordt.
              </div>
            </details>

            {/* LTV per kanaal (hele historie) — ingeklapt */}
            {data.ltv && data.ltv.length > 0 && (
              <details style={kaart}>
                <summary style={detSummary}>💎 Wat is een klant gemiddeld waard? (over alle jaren)</summary>
                <div style={{ marginTop: 12, border: `1px solid ${RAND}`, borderRadius: 12, overflow: "auto" }}>
                  <table style={tabel}>
                    <thead><tr>{["Kanaal", "Klanten", "Aandeel klanten", "Totale omzet", "Aandeel omzet", "Gemiddeld per klant"].map((h, i) => <th key={i} style={th}>{h}</th>)}</tr></thead>
                    <tbody>
                      {data.ltv.map((s, i) => (
                        <tr key={s.bron} style={{ background: i % 2 ? "#f4f8f5" : "#fff" }}>
                          <td style={{ ...td, fontWeight: 700 }}>{bronLabel(s.bron)}</td>
                          <td style={td}>{s.klanten}</td>
                          <td style={td}>{pct(s.aandeelKlanten)}</td>
                          <td style={{ ...td, fontWeight: 700 }}>{euro(s.omzet)}</td>
                          <td style={td}>{pct(s.aandeel)}</td>
                          <td style={{ ...td, fontWeight: 800, color: GROEN }}>{euro(s.gem)}</td>
                        </tr>
                      ))}
                      <tr style={{ borderTop: `2px solid ${GROEN}`, background: GROEN_BG }}>
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
              </details>
            )}

            {/* Hoe lees je dit — onderaan, ingeklapt */}
            <details style={{ ...kaart, fontSize: 13.5 }}>
              <summary style={detSummary}>ⓘ Wat betekenen deze begrippen? (lees dit even)</summary>
              <ul style={{ margin: "10px 0 0", paddingLeft: 18, lineHeight: 1.75, color: GRIJS }}>
                <li><b>Aanvraag (lead)</b> = iemand die via het formulier op de site een aanvraag doet.</li>
                <li><b>Klant / betaalde klus</b> = een aanvraag die uiteindelijk een betaalde factuur werd.</li>
                <li><b>Conversie</b> = welk deel van de aanvragen klant wordt (klanten ÷ aanvragen). Bijv. 13% = ruim 1 op de 8.</li>
                <li><b>Omzet</b> = wat de klussen opbrachten (excl. btw). We rekenen <b>per klus</b>: elke betaalde factuur telt bij de aanvraag die 'm opleverde, in díé maand.</li>
                <li><b>Omzet zonder advertenties (organisch)</b> = klanten die je <b>gratis</b> vond, via Google-zoeken of mond-tot-mond, zonder ervoor te betalen.</li>
                <li><b>Omzet uit advertenties</b> = klanten die binnenkwamen via een <b>betaalde</b> advertentie (Google / Facebook / Marktplaats).</li>
                <li><b>Rendement (ROAS)</b> = hoeveel omzet je terugkrijgt per € 1 advertentie. 3× = drie keer je geld terug. Dit gaat <b>alleen</b> over de advertentiekosten, niet over je werk, onderdelen en vaste lasten, dus het is géén nettowinst.</li>
                <li><b>Advertentiekosten (spend)</b> = wat je aan advertenties uitgaf; komt automatisch uit Moneybird.</li>
                <li><b>Gemiddelde klantwaarde</b> = wat een klant je over alle jaren gemiddeld oplevert (sommigen komen vaker terug).</li>
                <li>Let op: een <b>recente maand of kwartaal groeit nog aan</b> — klussen worden vaak pas weken later betaald.</li>
              </ul>
            </details>

            {/* Pijplijn */}
            <div style={kaart}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", marginBottom: 12 }}>
                <div style={kop}>{gewonnenFilter ? "Gewonnen" : "Op te volgen"} ({pijplijn.length})</div>
                <div style={{ display: "flex", gap: 6, marginLeft: "auto", flexWrap: "wrap" }}>
                  <button onClick={() => setMijn((v) => !v)} style={toggle(mijn)}>Mijn opvolging</button>
                  <button onClick={() => setToonAlle((v) => !v)} style={toggle(toonAlle)}>{toonAlle ? "Alle aanvragen" : "Op te volgen"}</button>
                  <button onClick={() => setGewonnenFilter((v) => !v)} style={toggle(gewonnenFilter)}>🏆 Gewonnen ({aantalGewonnen})</button>
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
                  const gewonnen = L.status === "geaccepteerd";
                  const _ruw = (L.bericht || "").trim();
                  const _delen = _ruw.split(" | ").map((s) => s.trim()).filter(Boolean);
                  let kenmerk = "", klacht = "";
                  if (_delen.length > 1 || /^Type:/i.test(_ruw)) {
                    // Gestructureerde aanvraag: Type | kenmerk | klacht
                    const _zt = _delen.filter((d) => !/^Type:/i.test(d));
                    kenmerk = _zt[0] || L.carburateur || "";
                    klacht = _zt.slice(1).join(" · ");
                  } else {
                    // Vrije tekst = de klacht/het bericht van de klant zelf
                    kenmerk = L.carburateur || "";
                    klacht = _ruw;
                  }
                  return (
                    <div key={L.id} style={{ border: `${gewonnen ? 2 : 1}px solid ${gewonnen ? GROEN : afgewezen ? "#e0b3a8" : RAND}`, background: gewonnen ? GROEN_BG : afgewezen ? ROOD_BG : "#fff", borderRadius: 10, padding: "10px 12px", overflow: "hidden" }}>
                      {gewonnen && (
                        <div style={{ margin: "-10px -12px 8px", padding: "6px 12px 8px", background: "linear-gradient(90deg,#2f9e44,#37b24d,#2f9e44)" }}>
                          <div style={{ display: "flex", gap: 5, justifyContent: "center", marginBottom: 4, flexWrap: "wrap" }}>
                            {Array.from({ length: 16 }).map((_, i) => (
                              <span key={i} style={{ width: 0, height: 0, borderLeft: "6px solid transparent", borderRight: "6px solid transparent", borderTop: `11px solid ${["#ffd43b", "#ff8787", "#ffffff", "#74c0fc", "#f783ac"][i % 5]}` }} />
                            ))}
                          </div>
                          <div style={{ textAlign: "center", color: "#fff", fontWeight: 800, fontSize: 14, letterSpacing: ".5px" }}>🎉 GEWONNEN, YEAH BABY! 🎉</div>
                        </div>
                      )}
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ minWidth: 0 }}>
                          <span style={{ fontWeight: 800, color: TEKST }}>{L.naam || L.email}</span>
                          {L.bedrijf && <span style={{ color: GRIJS, fontSize: 13 }}> · {L.bedrijf}</span>}
                          <span style={{ ...pil, marginLeft: 8 }}>{bronLabel(L.bron)}</span>
                          {L.offerte_state === "draft" && L.offerte_url && <a href={L.offerte_url} target="_blank" rel="noreferrer" style={{ ...pil, background: GROEN, color: "#fff", fontWeight: 800, marginLeft: 6, textDecoration: "none" }}>🟢 Concept · direct opvolgen ↗</a>}
                          {L.offerte_nummer && L.offerte_url && <a href={L.offerte_url} target="_blank" rel="noreferrer" style={{ ...pil, background: "#e7f0ea", color: GROEN, marginLeft: 6, textDecoration: "none" }}>🧾 {L.offerte_nummer}{L.offerte_state ? ` · ${OFFERTE_LABEL[L.offerte_state] || L.offerte_state}` : ""}{L.offerte_bedrag ? ` · ${euro(Number(L.offerte_bedrag))}` : ""}</a>}
                        </div>
                        <div style={{ fontSize: 12, color: GRIJS, whiteSpace: "nowrap" }}>{datkort(L.datum)}</div>
                      </div>
                      {L.telefoon
                        ? <a href={`tel:${L.telefoon.replace(/[^\d+]/g, "")}`} style={{ display: "inline-block", margin: "6px 0 2px", fontSize: 23, fontWeight: 800, color: GROEN, textDecoration: "none", letterSpacing: ".5px" }}>📞 {L.telefoon}</a>
                        : <div style={{ margin: "6px 0 2px", fontSize: 14, color: ROOD, fontWeight: 700 }}>⚠ Geen telefoonnummer</div>}
                      <div style={{ fontSize: 12.5, color: GRIJS, marginBottom: 8 }}>{L.email}{L.carburateur ? ` · ${L.carburateur}` : ""}</div>
                      <div style={{ marginBottom: 8, background: "#fbf7ec", border: "1px solid #ecdcae", borderRadius: 8, padding: "9px 12px", lineHeight: 1.5 }}>
                        <div style={{ fontSize: 13.5, color: TEKST }}><span style={{ fontSize: 11, fontWeight: 800, color: "#9a7b1f", textTransform: "uppercase", letterSpacing: 0.4, marginRight: 6 }}>Kenmerk</span>{kenmerk || <span style={{ color: GRIJS, fontStyle: "italic" }}>niet opgegeven</span>}</div>
                        <div style={{ fontSize: klacht ? 15 : 13.5, color: TEKST, marginTop: 4 }}><span style={{ fontSize: 11, fontWeight: 800, color: "#9a7b1f", textTransform: "uppercase", letterSpacing: 0.4, marginRight: 6 }}>Klacht</span>{klacht || <span style={{ color: GRIJS, fontStyle: "italic", fontWeight: 400 }}>niet opgegeven</span>}</div>
                      </div>

                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                        <select value={L.status || "nieuw"} onChange={(e) => wijzigStatus(L, e.target.value)} style={{ ...sel, borderColor: STATUS_KLEUR[L.status || "nieuw"], color: STATUS_KLEUR[L.status || "nieuw"], fontWeight: 700 }}>
                          {STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <select value={L.eigenaar || ""} onChange={(e) => wijzigLead(L.id, "eigenaar", e.target.value)} style={sel}>
                          {EIGENAREN.map((e) => <option key={e} value={e}>{e || "— eigenaar —"}</option>)}
                        </select>
                        <button onClick={() => belActie(L)} style={knopje} title="Klant gesproken">📞 Gesproken</button>
                        <button onClick={() => logActie(L, "niet opgenomen", "")} style={{ ...knopje, color: ROOD, borderColor: "#e6b8ad", background: ROOD_BG }} title="Gebeld, maar de klant nam niet op">📵 Niet opgenomen</button>
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
                        <div style={{ marginTop: 10, borderTop: `1px solid ${RAND}`, paddingTop: 8 }}>
                          <div style={{ fontSize: 11, fontWeight: 800, color: GRIJS, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 5 }}>Changelog</div>
                          {(L.acties || []).slice(0, 6).map((a) => (
                            <div key={a.id} style={{ fontSize: 13, color: TEKST, marginBottom: 3 }}>• {a.door || "?"} <b>{a.soort}</b>{a.tekst ? `: ${a.tekst}` : ""} <span style={{ color: GRIJS }}>· {new Date(a.datum).toLocaleString("nl-NL", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span></div>
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

function heroKpi(titel: string, waarde: string, onder?: string, accent?: string) {
  return (
    <div style={{ flex: "1 1 150px", minWidth: 140 }}>
      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.72)", fontWeight: 600, letterSpacing: 0.3, textTransform: "uppercase" }}>{titel}</div>
      <div style={{ fontSize: 32, fontWeight: 800, lineHeight: 1.04, marginTop: 4, color: accent || "#fff" }}>{waarde}</div>
      {onder && <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", marginTop: 3 }}>{onder}</div>}
    </div>
  );
}
function statChip(titel: string, waarde: string, kleur: string, onder?: string) {
  return (
    <div style={{ flex: "1 1 150px", minWidth: 140, background: KAART_BG, border: `1px solid ${RAND}`, borderRadius: 12, padding: "10px 14px" }}>
      <div style={{ fontSize: 11.5, color: GRIJS, fontWeight: 600 }}>{titel}</div>
      <div style={{ fontSize: 21, fontWeight: 800, color: kleur, marginTop: 2 }}>{waarde}</div>
      {onder && <div style={{ fontSize: 11, color: GRIJS, marginTop: 1, lineHeight: 1.3 }}>{onder}</div>}
    </div>
  );
}
const hero: CSSProperties = {
  background: "linear-gradient(135deg, #2a6044 0%, #1a3c2e 55%, #0f2a1f 100%)",
  borderRadius: 18, padding: "22px 24px", marginBottom: 14, color: "#fff",
  boxShadow: "0 14px 36px rgba(26,60,46,0.30)", position: "relative", overflow: "hidden",
};
const heroGlow: CSSProperties = {
  position: "absolute", top: -70, right: -50, width: 240, height: 240,
  background: "radial-gradient(circle, rgba(184,150,46,0.25), transparent 68%)", borderRadius: "50%", pointerEvents: "none",
};
const detSummary: CSSProperties = { cursor: "pointer", fontWeight: 800, color: GROEN, fontSize: 13.5 };

const wrap: CSSProperties = { minHeight: "100vh", background: BG, color: TEKST, fontFamily: "'Karma', Georgia, serif", padding: "26px max(20px, 3vw)" };
const wrapL: CSSProperties = { minHeight: "100vh", background: BG, color: TEKST, fontFamily: "'Karma', Georgia, serif", padding: 24 };
const binnen: CSSProperties = { maxWidth: 1100, margin: "0 auto" };
const kaart: CSSProperties = { background: KAART_BG, border: `1px solid ${RAND}`, borderRadius: 16, padding: 16, marginBottom: 16 };
const kop: CSSProperties = { fontSize: 12.5, color: GRIJS, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5 };
const tabel: CSSProperties = { width: "100%", borderCollapse: "collapse", fontSize: 14 };
const th: CSSProperties = { textAlign: "left", fontSize: 11, color: GROEN, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.4, padding: "11px 14px", background: GROEN_BG, whiteSpace: "nowrap" };
const td: CSSProperties = { padding: "11px 14px", borderBottom: "1px solid #ecefe9" };
const pijl: CSSProperties = { border: `1px solid ${RAND}`, background: "#fff", color: GROEN, borderRadius: 8, padding: "6px 11px", fontSize: 13, cursor: "pointer", fontWeight: 700 };
const sel: CSSProperties = { border: `1px solid ${RAND}`, borderRadius: 8, padding: "6px 10px", fontSize: 13, background: "#fff", cursor: "pointer", fontFamily: "inherit" };
const pil: CSSProperties = { fontSize: 11, fontWeight: 800, background: "#f1efe8", color: GRIJS, borderRadius: 999, padding: "2px 8px" };
const knopje: CSSProperties = { border: `1px solid ${RAND}`, background: "#fff", color: TEKST, borderRadius: 8, padding: "6px 10px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" };
const toggle = (aan: boolean): CSSProperties => ({ border: `1.5px solid ${aan ? GROEN : RAND}`, background: aan ? GROEN : "#fff", color: aan ? "#fff" : GRIJS, borderRadius: 999, padding: "6px 13px", fontSize: 12.5, fontWeight: 700, cursor: "pointer" });
