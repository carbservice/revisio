"use client";

// Sales & Marketing. Alleen voor CG/LE/JM/LV.
// Boven: marketing-analyse (per bron leads/conversie/omzet/ROAS, spend-invoer).
// Onder: de lead-pijplijn = leads met een verstuurde Moneybird-offerte. Per lead:
// status, eigenaar, bel-actie met datum-log, opvolgdatum, en terugschrijven naar
// Moneybird (accepteren/afwijzen). "Mijn opvolging" = leads waar je eigenaar bent OF zelf een actie op deed.

import { useEffect, useState, useCallback, useRef, CSSProperties } from "react";
import AuthGate, { useGebruiker } from "@/app/components/AuthGate";
import PaginaKop from "@/app/components/PaginaKop";
import { supabase } from "@/lib/supabase";
import { apiFetch } from "@/lib/api";
import { euro } from "@/lib/format";
import { magSales, codeVoorEmail, naamVoorCode } from "@/app/werkplaats-planning/planning-config";
import { GROEN, GROEN_BG, GOUD, ROOD, ROOD_BG, TEKST, GRIJS, RAND, BG, KAART_BG } from "@/lib/theme";

type Actie = { id: string; soort: string; tekst: string; door: string; datum: string };
type Lead = { id: string; datum: string; naam: string; email: string; telefoon: string; bedrijf: string; carburateur: string; bericht: string; bron: string; status: string; eigenaar: string | null; sales_notitie: string | null; opvolgen_op: string | null; omzet_excl: number; offerte_id: string | null; offerte_nummer: string | null; offerte_state: string | null; offerte_bedrag: number | null; offerte_url: string | null; offerte_datum?: string | null; offerte_verstuurd_op?: string | null; offerte_kenmerk?: string | null; acties: Actie[] };
type PerBron = { bron: string; leads: number; klanten: number; omzet: number; spend: number; roas: number | null; conversie: number };
type Ltv = { bron: string; klanten: number; omzet: number; gem: number; aandeel: number; aandeelKlanten: number };
type Data = { perBron: PerBron[]; totaal: { leads: number; klanten: number; omzet: number; spend: number; omzetBetaald: number; roas: number | null }; leads: Lead[]; spend: { google_ads: number; facebook: number; marktplaats: number }; ltv: Ltv[]; ltvTotaal: { klanten: number; omzet: number; gem: number }; dagteller?: { totaal: number; perPersoon: Record<string, number> } };

const STATUS = ["nieuw", "gebeld", "vernieuwde offerte", "uitstellen", "geaccepteerd", "afgewezen"];
const STATUS_KLEUR: Record<string, string> = { nieuw: "#6b7280", gebeld: "#2f6f8f", "vernieuwde offerte": "#0d9488", uitstellen: "#b07d12", geaccepteerd: GROEN, afgewezen: ROOD };
// Sorteervolgorde: te-bellen bovenaan, afgehandelde leads zakken naar onderen.
const STATUS_PRIO: Record<string, number> = { nieuw: 0, "vernieuwde offerte": 1, gebeld: 2, uitstellen: 3, geaccepteerd: 4, afgewezen: 5 };
const EIGENAREN = ["", "CG", "LE", "JM", "LV"];
// Temperatuur-weergave (loopt mee met de staat van de lead).
const TEMP: Record<string, { lab: string; kl: string; bg: string }> = {
  heet: { lab: "🔥 Heet", kl: "#e8590c", bg: "#fff0e6" },
  warm: { lab: "🌤 Warm", kl: "#c98a12", bg: "#fbf3dc" },
  koud: { lab: "❄ Koud", kl: "#5c7c8a", bg: "#eef2f4" },
  gewonnen: { lab: "🏆 Gewonnen", kl: "#2f9e44", bg: "#e5f6ea" },
  afgerond: { lab: "Afgerond", kl: "#7b857d", bg: "#f0f1ef" },
};
const initialen = (L: Lead) => { const n = (L.naam || L.email || "?").trim(); const p = n.split(/[\s@._-]+/).filter(Boolean); return ((p[0]?.[0] || "") + (p[1]?.[0] || "")).toUpperCase() || "?"; };
// "Open sinds" telt vanaf het moment dat de offerte echt verstuurd is (sent_at),
// NIET vanaf de document-/conceptdatum (die kan teruggezet of leeg zijn).
const dagenOpen = (L: Lead) => { const d = L.offerte_verstuurd_op || L.datum; return Math.max(0, Math.floor((Date.now() - new Date(d).getTime()) / 86400000)); };
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
  const [tab, setTab] = useState<"open" | "nietop" | "gewonnen" | "afgerond">("open");
  const [zoek, setZoek] = useState("");
  const [flash, setFlash] = useState<Record<string, boolean>>({});      // groene "verzonden"-flash
  const [teVaak, setTeVaak] = useState<Record<string, boolean>>({});     // dedup-melding
  const [laadPopup, setLaadPopup] = useState<string | null>(null);       // kort "bezig…"-popupje na een actie
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
  // Kort, verzorgd "bezig…"-popupje na een actie (puur feedback, verdwijnt vanzelf).
  function flitsLaden(tekst = "Bezig met opslaan…") {
    setLaadPopup(tekst);
    setTimeout(() => setLaadPopup(null), 950);
  }
  async function wijzigLead(id: string, veld: string, waarde: string) {
    patchLokaal(id, { [veld]: waarde } as Partial<Lead>);
    try {
      const r = await apiFetch("/api/sales/lead", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, [veld]: waarde }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || j.fout) window.alert("Opslaan mislukt: " + (j.fout || r.status));
    } catch { window.alert("Opslaan mislukt (geen verbinding)."); }
  }
  // Je wordt eigenaar zodra je een actie/notitie op een lead doet. Binnen dezelfde dag
  // pakken we elkaars lead NIET af (wie 'm die dag oppakt, blijft eigenaar). Maar een
  // nieuwe dag is de lead weer vrij: is er vandaag nog door niemand iets gedaan, dan
  // word jij de nieuwe eigenaar. Iedereen blijft ze altijd zien in "Op te volgen".
  function claimEigenaar(L: Lead) {
    if (!mijnCode || L.eigenaar === mijnCode) return;
    const vndg = new Date().toISOString().slice(0, 10);
    const alVandaag = (L.acties || []).some((a) => (a.datum || "").slice(0, 10) === vndg);
    if (L.eigenaar && alVandaag) return; // vandaag is iemand al bezig -> laat 'm staan
    patchLokaal(L.id, { eigenaar: mijnCode });
    apiFetch("/api/sales/lead", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: L.id, eigenaar: mijnCode }) }).catch(() => {});
  }
  // Verplichte notitie vóór een actie die de kaart afsluit. Staat er al iets in het
  // notitieveld, dan gebruiken we dat (en maken het veld leeg). Anders een popup.
  // Return: de notitie, of null als de gebruiker annuleert (kaart blijft dan staan).
  function vraagNotitie(L: Lead): string | null {
    const bestaand = (L.sales_notitie || "").trim();
    if (bestaand) {
      patchLokaal(L.id, { sales_notitie: "" });
      apiFetch("/api/sales/lead", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: L.id, sales_notitie: "" }) }).catch(() => {});
      return bestaand;
    }
    const inp = window.prompt("Voeg eerst een korte notitie toe voor deze lead (verplicht):", "");
    if (inp === null) return null;
    const t = inp.trim();
    if (!t) { window.alert("Een notitie is verplicht om verder te kunnen."); return null; }
    return t;
  }
  async function logActie(L: Lead, soort: string, tekst: string): Promise<boolean> {
    flitsLaden();
    try {
      const r = await apiFetch("/api/sales/actie", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lead_id: L.id, soort, tekst }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || j.fout) { window.alert("Niet opgeslagen: " + (j.fout || r.status)); return false; }
      const nieuw: Actie = { id: Math.random().toString(36), soort, tekst, door: j.door || mijnCode || "", datum: new Date().toISOString() };
      const wordtGebeld = soort === "gebeld" && L.status === "nieuw";
      // Alleen bij een eerste "gebeld" de status aanraken. Anders NIET status meepatchen,
      // anders overschrijven we een net-gezette status (bv. afgewezen) met de oude waarde.
      patchLokaal(L.id, wordtGebeld ? { acties: [nieuw, ...(L.acties || [])], status: "gebeld" } : { acties: [nieuw, ...(L.acties || [])] });
      claimEigenaar(L);
      if (wordtGebeld) apiFetch("/api/sales/lead", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: L.id, status: "gebeld" }) });
      return true;
    } catch { window.alert("Niet opgeslagen (geen verbinding)."); return false; }
  }
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
  async function wijzigStatus(L: Lead, nieuw: string, note?: string) {
    flitsLaden();
    patchLokaal(L.id, { status: nieuw } as Partial<Lead>);
    claimEigenaar(L);
    if (note && note.trim()) await logActie(L, "notitie", note.trim());
    try {
      await apiFetch("/api/sales/lead", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: L.id, status: nieuw }) });
    } catch { window.alert("Opslaan mislukt (geen verbinding)."); }

    if (nieuw === "geaccepteerd") {
      await logActie(L, "geaccepteerd", "");
      // Ook de Moneybird-offerte op geaccepteerd zetten, zodat de klus automatisch in de
      // werkplaats (geaccepteerd-bak) belandt.
      if (L.offerte_id) {
        const r = await apiFetch("/api/sales/moneybird", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lead_id: L.id, actie: "accepted" }) });
        const j = await r.json().catch(() => ({}));
        if (j.fout) window.alert(`Moneybird: ${j.fout}\n\nDe winst staat hier wel goed.`);
        else laad();
      }
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
  // Tab-indeling: gewonnen (geaccepteerd) en afgerond (afgewezen) verlaten "Op te
  // volgen"; "Niet opgenomen" = actieve leads waarvan de laatste actie een gemiste
  // belpoging was (moeten opnieuw geprobeerd worden).
  const nietOpN = (L: Lead) => (L.acties || []).filter((a) => a.soort === "niet opgenomen").length;
  const laatstNietOp = (L: Lead) => (L.acties || [])[0]?.soort === "niet opgenomen";
  // Moneybird = de waarheid voor "gesloten": een offerte die geaccepteerd/gefactureerd
  // of afgewezen is hoort NIET meer in de actieve lijst, ook al staat de lead-status
  // nog open. Zo verdwijnt een gefactureerde/afgewezen lead vanzelf.
  const stOf = (L: Lead) => (L.status || "nieuw").trim().toLowerCase();
  const osOf = (L: Lead) => (L.offerte_state || "").trim().toLowerCase();
  // Gewonnen = alleen leads die het sales-team zelf op "geaccepteerd" zette (de echte
  // dashboard-winst). Afgerond = afgewezen OF een offerte die in Moneybird gesloten is
  // (geaccepteerd/gefactureerd/afgewezen) zonder dashboard-win: normale klussen die
  // niet meer opgevolgd hoeven te worden. Zo blijft "Gewonnen" zuiver.
  const gewonnenL = (L: Lead) => stOf(L) === "geaccepteerd";
  const afgerondL = (L: Lead) => !gewonnenL(L) && (stOf(L) === "afgewezen" || ["accepted", "billed", "rejected"].includes(osOf(L)));
  const isActief = (L: Lead) => !gewonnenL(L) && !afgerondL(L);
  const inTab = (L: Lead) => {
    if (tab === "gewonnen") return gewonnenL(L);
    if (tab === "afgerond") return afgerondL(L);
    if (tab === "nietop") return isActief(L) && nietOpN(L) > 0;
    return isActief(L) && !gemistVandaag(L); // "open" = openstaand; vandaag gemist verdwijnt tot morgen
  };
  // Sorteer-prioriteit: een uitstel-lead waarvan de terugbel-datum bereikt is gaat
  // bovenaan (-1); een uitstel in de toekomst zakt juist (nog niet aan de beurt).
  const vandaag = new Date().toISOString().slice(0, 10);
  // Net gemist? Als de laatste actie een niet-opgenomen van vandaag is, verdwijnt de
  // lead vandaag uit "Op te volgen" (je hebt 'm net geprobeerd) en komt morgen terug.
  // Hij blijft wel zichtbaar in het tabblad "Niet opgenomen".
  const gemistVandaag = (L: Lead) => {
    const acts = L.acties || [];                                    // door de API op datum aflopend gesorteerd
    const gemist = acts.find((a) => a.soort === "niet opgenomen");  // meest recente gemiste belpoging
    if (!gemist || (gemist.datum || "").slice(0, 10) !== vandaag) return false;
    const gesprokenNa = acts.some((a) => a.soort === "gebeld" && (a.datum || "") > (gemist.datum || ""));
    return !gesprokenNa;                                            // een losse notitie telt niet als contact
  };
  const sortPrio = (L: Lead) => {
    const s = L.status || "nieuw";
    if (s === "uitstellen") return (L.opvolgen_op && L.opvolgen_op <= vandaag) ? -1 : 3.5;
    return STATUS_PRIO[s] ?? 2;
  };
  const alleLeads = data?.leads || [];
  const pijplijn = alleLeads.filter((L) => {
    // "Mijn opvolging" = alles waar ik bij betrokken ben: ik ben eigenaar OF ik heb
    // er zelf een actie op gedaan (gebeld / niet opgenomen / notitie).
    const vanMij = !mijn || L.eigenaar === mijnCode || (L.acties || []).some((a) => a.door === mijnCode);
    const raakt = !zoekTerm || [L.naam, L.email, L.bedrijf, L.telefoon, L.carburateur, L.offerte_nummer].some((v) => (v || "").toLowerCase().includes(zoekTerm));
    return inTab(L) && vanMij && raakt;
  }).sort((a, b) => {
    const pa = sortPrio(a), pb = sortPrio(b);
    if (pa !== pb) return pa - pb;            // terugbel-datum bereikt bovenaan, toekomst-uitstel lager
    if (pa === -1) return (a.opvolgen_op || "").localeCompare(b.opvolgen_op || ""); // meest overdue eerst
    return (b.datum || "").localeCompare(a.datum || ""); // binnen een groep: nieuwste eerst
  });
  const aantalOpen = alleLeads.filter((L) => isActief(L) && !gemistVandaag(L)).length;
  const aantalNietOp = alleLeads.filter((L) => isActief(L) && nietOpN(L) > 0).length;
  const aantalGewonnen = alleLeads.filter(gewonnenL).length;
  const aantalAfgerond = alleLeads.filter(afgerondL).length;

  return (
    <main style={wrap}>
      {laadPopup && (
        <div style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, background: "rgba(20,40,30,0.10)", pointerEvents: "none" }}>
          <div style={{ background: "#fff", borderRadius: 14, padding: "16px 22px", minWidth: 230, boxShadow: "0 16px 44px rgba(20,40,30,0.22)", textAlign: "center", animation: "verzondenFade 1s ease forwards" }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: GROEN, marginBottom: 11 }}>⏳ {laadPopup}</div>
            <div style={{ position: "relative", height: 6, borderRadius: 999, background: "#e6efe9", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 0, bottom: 0, width: "38%", borderRadius: 999, background: `linear-gradient(90deg, ${GROEN}, #7bbf97)`, animation: "laadbalk 0.9s ease-in-out infinite" }} />
            </div>
          </div>
        </div>
      )}
      <div style={binnen}>
        <PaginaKop naam={naam} onUitloggen={uitloggen} titel="Sales & Marketing" streep />
        <style>{`@keyframes verzondenFade { 0%,60% { opacity: 1; } 100% { opacity: 0.15; } } @keyframes laadbalk { 0% { left: -35%; } 100% { left: 100%; } } .lc{position:relative;background:#fff;border:1px solid #e6e9e1;border-radius:16px;padding:12px 14px;box-shadow:0 6px 20px rgba(26,60,46,.07);overflow:hidden;transition:box-shadow .16s,transform .16s} .lc:hover{box-shadow:0 14px 34px rgba(26,60,46,.13);transform:translateY(-2px)} .lc-head{display:flex;align-items:flex-start;gap:11px} .lc-av{width:42px;height:42px;border-radius:12px;flex:none;display:flex;align-items:center;justify-content:center;font-family:'Fraunces',serif;font-weight:700;font-size:16px;color:#fff;background:linear-gradient(140deg,#27593f,#1a3c2e)} .lc-who{flex:1;min-width:0} .lc-naam{font-size:16px;font-weight:800;color:#1c211d} .lc-sub{color:#6f7770;font-weight:600;font-size:13px} .lc-chips{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:5px} .lc-chip{font-size:11px;font-weight:700;padding:3px 8px;border-radius:999px;background:#eef2ec;color:#5b665d} .lc-chip.bron{background:#eaf1fb;color:#3b6aa0} .lc-chip.eig{background:#efeafb;color:#6a4fb0} .lc-chip.nietop{background:#fdf3d6;color:#8a6d10} .lc-chip.nietop.hard{background:#fff0e6;color:#e8590c} .lc-rt{text-align:right;flex:none;display:flex;flex-direction:column;align-items:flex-end;gap:5px} .lc-temp{display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:800;padding:4px 10px;border-radius:999px;text-transform:uppercase;white-space:nowrap} .lc-waarde{font-family:'Fraunces',serif;font-weight:700;font-size:20px;color:#b8962e;line-height:1} .lc-mbchip{display:inline-flex;align-items:center;gap:4px;font-size:10.5px;font-weight:700;padding:3px 8px;border-radius:999px;background:#e7f0ea;color:#1a3c2e;text-decoration:none} .lc-mbchip:hover{background:#d8e8de} .lc-stages{position:relative;display:flex;justify-content:space-between;max-width:440px;flex:1} .lc-stages::before{content:"";position:absolute;top:6px;left:14px;right:14px;height:2px;background:#dfe3dc} .lc-stg{position:relative;display:flex;flex-direction:column;align-items:center;gap:6px;flex:1;text-align:center} .lc-dot{width:13px;height:13px;border-radius:50%;border:2px solid #dfe3dc;background:#fff;position:relative;z-index:1} .lc-stg.done .lc-dot{background:#1a3c2e;border-color:#1a3c2e} .lc-stg.now .lc-dot{background:#b8962e;border-color:#b8962e;box-shadow:0 0 0 4px rgba(184,150,46,.18)} .lc-stg.nietop .lc-dot{background:#e8590c;border-color:#e8590c;box-shadow:0 0 0 4px rgba(232,89,12,.16)} .lc-slbl{font-size:9.5px;font-weight:700;color:#8a938b;line-height:1.25} .lc-stg.done .lc-slbl,.lc-stg.now .lc-slbl{color:#1a3c2e} .lc-stg.nietop .lc-slbl{color:#e8590c} .lc-stg.wacht .lc-dot{background:#7048e8;border-color:#7048e8;box-shadow:0 0 0 4px rgba(112,72,232,.15)} .lc-stg.wacht .lc-slbl{color:#7048e8} .lc-open{font-size:11px;font-weight:700;color:#8a938b;white-space:nowrap;padding:1px 0 0 12px} .lc-tel{font-size:22px;font-weight:800;color:#1a3c2e;text-decoration:none} .lc-acts{display:flex;flex-wrap:wrap;gap:7px;margin:2px 0 10px} .lc-btn{display:inline-flex;align-items:center;gap:5px;font-size:12.5px;font-weight:700;padding:8px 12px;border-radius:10px;cursor:pointer;border:1.5px solid #e6e9e1;background:#fff;color:#4a544c;transition:all .13s;text-decoration:none} .lc-btn:hover{border-color:#1a3c2e;color:#1a3c2e} .lc-btn.bel{background:linear-gradient(135deg,#b8962e,#a07d1f);color:#fff;border:none} .lc-btn.wa{background:#25d366;color:#fff;border:none} .lc-btn.neg{color:#e8590c;border-color:#f0c6ad} .lc-btn.win{background:linear-gradient(135deg,#2f9e44,#37b24d);color:#fff;border:none} .lc-next{display:flex;align-items:center;gap:7px;background:#eef5f0;border:1px solid #d3e6da;border-radius:10px;padding:9px 12px;margin-bottom:10px;font-size:13px;font-weight:600;color:#1a3c2e}`}</style>
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
              {data.dagteller && (
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, marginBottom: 12, background: "linear-gradient(135deg,#eef5f0,#e3efe8)", border: "1px solid #cfe0d5", borderRadius: 12, padding: "10px 14px" }}>
                  <span style={{ fontSize: 15, fontWeight: 800, color: GROEN }}>📞 Vandaag {data.dagteller.totaal} behandeld</span>
                  <span style={{ fontSize: 12.5, color: GRIJS, fontWeight: 600 }}>· totaal van iedereen</span>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginLeft: "auto" }}>
                    {Object.entries(data.dagteller.perPersoon).sort((a, b) => b[1] - a[1]).map(([code, n]) => (
                      <span key={code} style={{ fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 999, background: code === mijnCode ? GROEN : "#fff", color: code === mijnCode ? "#fff" : "#4a544c", border: "1px solid #cfe0d5" }}>{naamVoorCode(code) || code} {n}</span>
                    ))}
                  </div>
                </div>
              )}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", marginBottom: 12 }}>
                <div style={kop}>Pijplijn ({pijplijn.length})</div>
                <div style={{ display: "flex", gap: 6, marginLeft: "auto", flexWrap: "wrap" }}>
                  <button onClick={() => setTab("open")} style={toggle(tab === "open")}>Op te volgen ({aantalOpen})</button>
                  <button onClick={() => setTab("nietop")} style={toggle(tab === "nietop")}>📵 Niet opgenomen ({aantalNietOp})</button>
                  <button onClick={() => setTab("gewonnen")} style={toggle(tab === "gewonnen")}>🏆 Gewonnen ({aantalGewonnen})</button>
                  <button onClick={() => setTab("afgerond")} style={toggle(tab === "afgerond")}>Afgerond ({aantalAfgerond})</button>
                  <button onClick={() => setMijn((v) => !v)} style={toggle(mijn)}>Mijn opvolging</button>
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
                  const afgewezen = afgerondL(L);
                  const gewonnen = gewonnenL(L);
                  const _nietOp = nietOpN(L);
                  const _st = L.status || "nieuw";
                  const _heeftContact = (L.acties || []).some((a) => a.soort === "gebeld" || a.soort === "notitie");
                  // Kleur-rand voor snelle triage.
                  const randKleur = gewonnen ? GROEN : afgewezen ? "#adb5bd" : _st === "uitstellen" ? "#7048e8" : laatstNietOp(L) ? "#e0a82e" : (!_heeftContact ? "#1c7ed6" : "#8aa79b");
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
                  // Het volledige kenmerk staat op de Moneybird-offerte (reference): voertuig +
                  // bouwjaar + cilinders + carburateur. Dat is leidend als het er is.
                  if (L.offerte_kenmerk && L.offerte_kenmerk.trim()) kenmerk = L.offerte_kenmerk.trim();
                  const _dagen = dagenOpen(L);
                  const _heeftOff = !!L.offerte_id;
                  const _verstuurdOp = L.offerte_verstuurd_op || null;      // sent_at: leeg = nog concept
                  const _isConcept = _heeftOff && !_verstuurdOp;             // offerte bestaat, maar nog niet de deur uit
                  const _offDat = _verstuurdOp;                              // Offerte-mijlpaal = wanneer verstuurd
                  const reached = (L.acties || []).some((a) => a.soort === "gebeld") || ["gebeld", "vernieuwde offerte", "geaccepteerd"].includes(_st);
                  const _temp = gewonnen ? "gewonnen" : afgewezen ? "afgerond" : (_nietOp >= 3 || _dagen > 25) ? "koud" : (!reached && _nietOp === 0 && _dagen <= 4) ? "heet" : (_dagen <= 12 ? "warm" : "koud");
                  const tm = TEMP[_temp];
                  // Echte actie-tijdlijn: Nieuw -> Offerte -> elke gebelde/gemiste poging als eigen bolletje -> (terugbellen) -> Gewonnen
                  const contactActs = (L.acties || []).filter((a) => a.soort === "gebeld" || a.soort === "niet opgenomen").slice().sort((a, b) => (a.datum || "").localeCompare(b.datum || ""));
                  type TLNode = { state: string; label: string; datum: string | null };
                  const tijdlijn: TLNode[] = [
                    { state: "done", label: "Nieuw", datum: L.datum },
                    { state: (_heeftOff && !_isConcept) ? "done" : "now", label: _isConcept ? "concept" : "Offerte", datum: _offDat },
                  ];
                  if (contactActs.length > 0) {
                    contactActs.forEach((a) => tijdlijn.push(a.soort === "gebeld"
                      ? { state: "done", label: "gesproken", datum: a.datum }
                      : { state: "nietop", label: "niet opgenomen", datum: a.datum }));
                  } else {
                    tijdlijn.push({ state: _heeftOff ? "now" : "", label: "Contact", datum: null });
                  }
                  if (_st === "uitstellen" && L.opvolgen_op) tijdlijn.push({ state: "wacht", label: "terugbellen", datum: L.opvolgen_op });
                  tijdlijn.push({ state: "", label: "Gewonnen", datum: null });
                  const volgende = (gewonnen || afgewezen) ? "" : _isConcept ? "Offerte staat nog op concept · verstuur 'm eerst" : (_st === "uitstellen" && L.opvolgen_op) ? (L.opvolgen_op <= vandaag ? `⏰ Nu terugbellen · stond gepland voor ${new Date(L.opvolgen_op).toLocaleDateString("nl-NL", { day: "numeric", month: "short" })}` : `Terugbellen gepland op ${new Date(L.opvolgen_op).toLocaleDateString("nl-NL", { day: "numeric", month: "short" })}`) : !reached ? (_nietOp > 0 ? (_nietOp >= 3 ? "Moeilijk bereikbaar · probeer nu WhatsApp of mail" : "Niet opgenomen · probeer opnieuw of stuur een appje") : (_dagen <= 3 ? "Eerste keer bellen · verse lead, sla nu toe" : `Nog bellen · al ${_dagen} dagen open`)) : "Opvolgen richting de close";
                  const waarde = (gewonnen && Number(L.omzet_excl) > 0) ? Number(L.omzet_excl) : (L.offerte_bedrag ? Number(L.offerte_bedrag) : null);
                  const telClean = (L.telefoon || "").replace(/[^\d+]/g, "");
                  const waNr = telClean.replace(/^\+/, "").replace(/^0/, "31");
                  const klantVoor = (L.naam || "").trim().split(/\s+/)[0] || "";
                  const mijnNaam = naamVoorCode(mijnCode) || "het team van Carburateur Service Nederland";
                  const offerteDeel = L.offerte_nummer ? `offerte ${L.offerte_nummer}` : "aanvraag";
                  const waTekst = `Hi ${klantVoor},\n\n${mijnNaam} hier, van Carburateur Service Nederland. We nemen contact op over je ${offerteDeel}, we vroegen ons af of je deze al gezien hebt, en of alles duidelijk is? We bellen of appen altijd even. Persoonlijk contact is altijd goed!\n\nWe horen graag of we deze klus mogen gaan inplannen.\n\nFijne dag,\n${mijnNaam}`;
                  return (
                    <div key={L.id} className="lc" style={{ borderLeftWidth: 5, borderLeftColor: tm.kl, ...(gewonnen ? { borderColor: "#bfe3c9", background: "#f4fbf6" } : afgewezen ? { background: "#fafbfa" } : {}) }}>
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
                      <div className="lc-head">
                        <div className="lc-av" style={gewonnen ? { background: "linear-gradient(140deg,#2f9e44,#37b24d)" } : undefined}>{initialen(L)}</div>
                        <div className="lc-who">
                          <div className="lc-naam">{L.naam || L.email}{L.bedrijf && <span className="lc-sub"> · {L.bedrijf}</span>}</div>
                          <div className="lc-chips">
                            <span className="lc-chip" style={{ background: (STATUS_KLEUR[L.status || "nieuw"] || GRIJS) + "1f", color: STATUS_KLEUR[L.status || "nieuw"] || GRIJS, fontWeight: 800 }}>{L.status || "nieuw"}</span>
                            <span className="lc-chip bron">{bronLabel(L.bron)}</span>
                            {L.eigenaar && <span className="lc-chip eig">👤 {L.eigenaar}</span>}
                          </div>
                        </div>
                        <div className="lc-rt">
                          <span className="lc-temp" style={{ background: tm.bg, color: tm.kl }}>{tm.lab}</span>
                          {waarde != null && <span className="lc-waarde" style={gewonnen ? { color: "#2f9e44" } : undefined}>{euro(waarde)}</span>}
                        </div>
                      </div>
                      {!gewonnen && (
                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", margin: "14px 0 8px" }}>
                          <div className="lc-stages">
                            {tijdlijn.map((n, i) => (
                              <div key={i} className={"lc-stg " + n.state}>
                                <span className="lc-dot" />
                                <span className="lc-slbl">
                                  <span style={(n.state === "nietop" || n.state === "wacht") ? { fontWeight: 800 } : undefined}>{n.label}</span>
                                  {n.datum && (() => {
                                    const d = new Date(n.datum);
                                    const heeftTijd = /T\d\d:\d\d/.test(n.datum) && !(d.getHours() === 0 && d.getMinutes() === 0);
                                    return <><br /><span style={{ fontSize: 8.5, fontWeight: 600, lineHeight: 1.25 }}>{d.toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" })}{heeftTijd ? <><br />{d.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })}</> : ""}</span></>;
                                  })()}
                                </span>
                              </div>
                            ))}
                          </div>
                          <span className="lc-open">{afgewezen ? "afgerond" : _isConcept ? "concept · nog niet verstuurd" : `${_dagen} dagen open`}</span>
                        </div>
                      )}
                      {volgende && <div className="lc-next"><span>🎯</span> {volgende}</div>}
                      {L.telefoon
                        ? <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", margin: "8px 0 2px" }}>
                            <a href={`tel:${telClean}`} className="lc-tel">📞 {L.telefoon}</a>
                            {!gewonnen && !afgewezen && waNr && <a href={`https://web.whatsapp.com/send?phone=${waNr}&text=${encodeURIComponent(waTekst)}`} target="cbwa" rel="noopener" className="lc-btn wa" style={{ marginLeft: "auto" }}>💬 WhatsApp</a>}
                          </div>
                        : <div style={{ margin: "6px 0 2px", fontSize: 14, color: ROOD, fontWeight: 700 }}>⚠ Geen telefoonnummer</div>}
                      <div style={{ fontSize: 12.5, color: GRIJS, marginBottom: 8 }}>{L.email}{L.carburateur ? ` · ${L.carburateur}` : ""}</div>
                      <div style={{ marginBottom: 8, background: "#fbf7ec", border: "1px solid #ecdcae", borderRadius: 8, padding: "9px 12px", lineHeight: 1.5 }}>
                        <div style={{ fontSize: 13.5, color: TEKST }}><span style={{ fontSize: 11, fontWeight: 800, color: "#9a7b1f", textTransform: "uppercase", letterSpacing: 0.4, marginRight: 6 }}>Kenmerk</span>{kenmerk || <span style={{ color: GRIJS, fontStyle: "italic" }}>niet opgegeven</span>}</div>
                        <div style={{ fontSize: klacht ? 15 : 13.5, color: TEKST, marginTop: 4 }}><span style={{ fontSize: 11, fontWeight: 800, color: "#9a7b1f", textTransform: "uppercase", letterSpacing: 0.4, marginRight: 6 }}>Klacht</span>{klacht || <span style={{ color: GRIJS, fontStyle: "italic", fontWeight: 400 }}>niet opgegeven</span>}</div>
                      </div>

                      {!gewonnen && !afgewezen && (
                        <div className="lc-acts">
                          <span className="lc-btn" onClick={() => { const n = vraagNotitie(L); if (n === null) return; logActie(L, "gebeld", n); }}>✅ Gesproken</span>
                          <span className="lc-btn neg" onClick={() => { const n = vraagNotitie(L); if (n === null) return; logActie(L, "niet opgenomen", n); }}>📵 Niet opgenomen{_nietOp > 0 ? ` (${_nietOp}×)` : ""}</span>
                          <span className="lc-btn" style={{ position: "relative" }} onClick={(e) => { const inp = e.currentTarget.querySelector("input") as HTMLInputElement | null; if (inp && (inp as unknown as { showPicker?: () => void }).showPicker) (inp as unknown as { showPicker: () => void }).showPicker(); else inp?.focus(); }}>💤 Uitstellen<input type="date" value={L.opvolgen_op || ""} onChange={(e) => { const d = e.target.value; if (d) { const n = vraagNotitie(L); if (n === null) return; wijzigLead(L.id, "opvolgen_op", d); wijzigStatus(L, "uitstellen", n); } }} onClick={(e) => e.stopPropagation()} style={{ position: "absolute", left: 10, bottom: 0, width: 1, height: 1, opacity: 0, pointerEvents: "none" }} /></span>
                          <span className="lc-btn" onClick={() => { const n = vraagNotitie(L); if (n === null) return; wijzigStatus(L, "geaccepteerd", n); }}>🏆 Gewonnen</span>
                          <span className="lc-btn" onClick={() => { if (!window.confirm("Deze lead op 'verloren / geen interesse' zetten? Hij gaat dan naar het tabblad Afgerond, uit je actieve lijst.")) return; const n = vraagNotitie(L); if (n === null) return; wijzigStatus(L, "afgewezen", n); }}>❌ Verloren</span>
                        </div>
                      )}
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                        {L.offerte_id && L.offerte_url && <a href={L.offerte_url} target="_blank" rel="noreferrer" style={{ ...knopje, color: GROEN, borderColor: "#cfe0d5", textDecoration: "none" }}>🧾 Open offerte ↗</a>}
                      </div>

                      {flash[L.id] ? (
                        <div style={{ marginTop: 8, background: GROEN_BG, color: GROEN, borderRadius: 8, padding: "9px 12px", fontSize: 13, fontWeight: 800, textAlign: "center", animation: "verzondenFade 1.7s ease forwards" }}>✓ Verzonden naar Moneybird</div>
                      ) : (
                        <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                          <input value={L.sales_notitie || ""} onChange={(e) => wijzigLead(L.id, "sales_notitie", e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") notitieNaarMB(L); }} onBlur={() => notitieNaarMB(L)} placeholder={teVaak[L.id] ? "Net verzonden · even wachten…" : "notitie…  (Enter of wegklikken = automatisch naar de Moneybird-offerte)"} style={{ flex: 1, boxSizing: "border-box", border: `1px solid ${RAND}`, borderRadius: 8, padding: "6px 10px", fontSize: 13, background: "#fff" }} />
                        </div>
                      )}

                      {(L.acties || []).length > 0 && (
                        <details style={{ marginTop: 8, borderTop: `1px solid ${RAND}`, paddingTop: 6 }}>
                          <summary style={{ fontSize: 11, fontWeight: 700, color: GRIJS, cursor: "pointer" }}>📋 Changelog ({(L.acties || []).length})</summary>
                          <div style={{ marginTop: 6 }}>
                            {(L.acties || []).slice(0, 10).map((a) => (
                              <div key={a.id} style={{ fontSize: 12, color: TEKST, marginBottom: 2 }}>• {a.door || "?"} <b>{a.soort}</b>{a.tekst ? `: ${a.tekst}` : ""} <span style={{ color: GRIJS }}>· {new Date(a.datum).toLocaleString("nl-NL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span></div>
                            ))}
                          </div>
                        </details>
                      )}
                    </div>
                  );
                })}
                {pijplijn.length === 0 && <p style={{ color: GRIJS }}>{tab === "open" ? "Geen openstaande leads, mooi opgeruimd! 🎉" : tab === "nietop" ? "Niemand die je nu opnieuw hoeft te bellen." : tab === "gewonnen" ? "Nog geen gewonnen deals in beeld." : "Nog niets afgerond."}</p>}
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
