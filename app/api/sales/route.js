// app/api/sales/route.js
// Lead + Marketing-dashboard data: leads per bron (ROAS), de lead-pijplijn met
// gekoppelde Moneybird-offerte en de actie-log. Spend wordt automatisch uit
// Moneybird gehaald (grootboeken Google Ads / Facebook Ads / Marktplaats per
// periode), dus geen handmatige invoer. Voor CG/LE/JM/LV.

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { vereisIngelogd } from "@/lib/auth-server";
import { magSales } from "@/app/werkplaats-planning/planning-config";

export const dynamic = "force-dynamic";

const ADMIN = process.env.MONEYBIRD_ADMIN;
const TOKEN = process.env.MONEYBIRD_TOKEN;
const offerteUrl = (id) => (id && ADMIN ? `https://moneybird.com/${ADMIN}/estimates/${id}` : null);

// Grootboek-namen per advertentiekanaal (Moneybird). Som van alle rekeningen met
// die naam = de spend van dat kanaal.
const SPEND_LEDGERS = { google_ads: ["Google Ads"], facebook: ["Facebook Ads"], marktplaats: ["Marktplaats"] };
// Lead-bron -> spend-kanaal.
function kanaalVanBron(bron) {
  if (bron === "google_ads") return "google_ads";
  if (bron === "facebook") return "facebook";
  if ((bron || "").toLowerCase().includes("markt")) return "marktplaats";
  return null; // organisch / onbekend = geen betaald kanaal
}

async function mb(path) {
  const res = await fetch(`https://moneybird.com/api/v2/${ADMIN}/${path}`, { headers: { Authorization: `Bearer ${TOKEN}` }, cache: "no-store" });
  return res.ok ? res.json() : null;
}

// Spend per kanaal voor een periode (van/tot zijn ISO datums).
async function haalSpend(van, tot) {
  const leeg = { google_ads: 0, facebook: 0, marktplaats: 0 };
  if (!ADMIN || !TOKEN) return leeg;
  const ym = (d) => `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  const a = ym(new Date(van));
  const eind = new Date(tot); eind.setUTCDate(eind.getUTCDate() - 1);
  const b = ym(eind);
  const periode = a === b ? a : `${a}..${b}`;
  try {
    const [pl, la] = await Promise.all([mb(`reports/profit_loss.json?period=${periode}`), mb("ledger_accounts.json")]);
    if (!pl || !la) return leeg;
    const naamVan = {};
    la.forEach((x) => { naamVan[x.id] = x.name || ""; });
    const spend = { ...leeg };
    Object.values(pl).forEach((sec) => {
      if (sec && Array.isArray(sec.ledger_accounts)) {
        sec.ledger_accounts.forEach((ac) => {
          const naam = naamVan[ac.ledger_account_id] || "";
          if (SPEND_LEDGERS.google_ads.includes(naam)) spend.google_ads += Math.abs(Number(ac.value) || 0);
          if (SPEND_LEDGERS.facebook.includes(naam)) spend.facebook += Math.abs(Number(ac.value) || 0);
        });
      }
    });
    // Marktplaats: NIET het hele grootboek, maar alleen de 'Pro (Admarkt)'-regels.
    // De rest van dat grootboek zijn advertenties voor de verkoop van motoren
    // (andere bedrijfstak), die horen niet in de carb-lead-marketing.
    const marktLedger = Object.keys(naamVan).find((id) => naamVan[id] === "Marktplaats");
    if (marktLedger) spend.marktplaats = await marktplaatsPro(van, tot, marktLedger);
    return spend;
  } catch { return leeg; }
}

// Som van de 'Marktplaats Pro (Admarkt)'-regels op het Marktplaats-grootboek in de
// periode. Inkoopfacturen ondersteunen geen period-filter, dus we filteren op datum.
async function marktplaatsPro(van, tot, ledgerId) {
  const vanD = van.slice(0, 10), totD = tot.slice(0, 10);
  let som = 0;
  for (let page = 1; page <= 8; page++) {
    const inv = await mb(`documents/purchase_invoices.json?per_page=100&page=${page}`);
    if (!Array.isArray(inv) || !inv.length) break;
    for (const doc of inv) {
      const d = (doc.date || doc.invoice_date || "").slice(0, 10);
      if (!d || d < vanD || d >= totD) continue;
      for (const det of (doc.details || [])) {
        if (String(det.ledger_account_id) !== ledgerId) continue;
        const om = (det.description || "").toLowerCase();
        if (om.includes("admarkt") || om.includes("pro")) som += Math.abs(Number(det.total_price_excl_tax || det.price || 0));
      }
    }
    if (inv.length < 100) break;
  }
  return Math.round(som * 100) / 100;
}

export async function GET(req) {
  const poort = await vereisIngelogd(req);
  if (!poort.ok) return poort.response;
  if (!magSales(poort.personeel.email)) return Response.json({ fout: "Geen sales-toegang." }, { status: 403 });

  const url = new URL(req.url);
  const van = url.searchParams.get("van");
  const tot = url.searchParams.get("tot");
  if (!van || !tot) return Response.json({ fout: "Periode ontbreekt." }, { status: 400 });

  const { data: leads } = await supabaseAdmin
    .from("leads").select("*").gte("datum", van).lt("datum", tot).order("datum", { ascending: false });
  const lijst = leads || [];

  const ids = lijst.map((L) => L.id);
  let acties = [];
  if (ids.length) {
    const { data } = await supabaseAdmin.from("lead_actie").select("*").in("lead_id", ids).order("datum", { ascending: false });
    acties = data || [];
  }
  const actiePer = new Map();
  acties.forEach((a) => { if (!actiePer.has(a.lead_id)) actiePer.set(a.lead_id, []); actiePer.get(a.lead_id).push(a); });
  const verrijkt = lijst.map((L) => ({ ...L, offerte_url: offerteUrl(L.offerte_id), acties: actiePer.get(L.id) || [] }));

  // Spend automatisch uit Moneybird.
  const spend = await haalSpend(van, tot);

  // Aggregatie per bron + ROAS.
  const map = new Map();
  for (const L of lijst) {
    const b = L.bron || "organisch";
    if (!map.has(b)) map.set(b, { bron: b, leads: 0, klanten: 0, omzet: 0 });
    const s = map.get(b);
    s.leads++;
    if (Number(L.omzet_excl) > 0) { s.klanten++; s.omzet += Number(L.omzet_excl); }
  }
  const perBron = [...map.values()].map((s) => {
    const kan = kanaalVanBron(s.bron);
    const sp = kan ? (spend[kan] || 0) : 0;
    return { ...s, omzet: Math.round(s.omzet * 100) / 100, spend: sp, roas: sp > 0 ? s.omzet / sp : null, conversie: s.leads ? s.klanten / s.leads : 0 };
  }).sort((a, b) => b.omzet - a.omzet);

  const totaalSpend = spend.google_ads + spend.facebook + spend.marktplaats;
  const totaalOmzet = perBron.reduce((s, x) => s + x.omzet, 0);
  // ROAS alleen over BETAALDE kanalen: organische omzet is gratis en hoort niet
  // in de noemer van advertentierendement (anders krijg je een misleidend hoge ROAS).
  const omzetBetaald = perBron.filter((s) => kanaalVanBron(s.bron)).reduce((sum, s) => sum + s.omzet, 0);
  const totaal = {
    leads: lijst.length,
    klanten: lijst.filter((L) => Number(L.omzet_excl) > 0).length,
    omzet: Math.round(totaalOmzet * 100) / 100, spend: totaalSpend,
    omzetBetaald: Math.round(omzetBetaald * 100) / 100,
    roas: totaalSpend > 0 ? omzetBetaald / totaalSpend : null,
  };

  // LTV per kanaal (HELE historie, niet periode-afhankelijk): per klant z'n
  // lifetime omzet, gegroepeerd op het kanaal van z'n EERSTE lead (acquisitie).
  let alle = [];
  for (let off = 0; ; off += 1000) {
    const { data } = await supabaseAdmin.from("leads").select("email,bron,omzet_excl,datum").order("datum", { ascending: true }).range(off, off + 999);
    if (!data || !data.length) break;
    alle = alle.concat(data);
    if (data.length < 1000) break;
  }
  const perKlant = new Map();
  for (const L of alle) {
    const e = (L.email || "").toLowerCase(); if (!e) continue;
    if (!perKlant.has(e)) perKlant.set(e, { bron: L.bron || "organisch", omzet: 0 });
    perKlant.get(e).omzet += Number(L.omzet_excl) || 0;
  }
  const ltvMap = new Map();
  let ltvKlantenTot = 0, ltvOmzetTot = 0;
  for (const k of perKlant.values()) {
    if (k.omzet <= 0) continue;
    if (!ltvMap.has(k.bron)) ltvMap.set(k.bron, { bron: k.bron, klanten: 0, omzet: 0 });
    const s = ltvMap.get(k.bron); s.klanten++; s.omzet += k.omzet;
    ltvKlantenTot++; ltvOmzetTot += k.omzet;
  }
  const ltv = [...ltvMap.values()].map((s) => ({
    bron: s.bron, klanten: s.klanten, omzet: Math.round(s.omzet * 100) / 100,
    gem: s.klanten ? Math.round(s.omzet / s.klanten) : 0,
    aandeel: ltvOmzetTot ? s.omzet / ltvOmzetTot : 0,
    aandeelKlanten: ltvKlantenTot ? s.klanten / ltvKlantenTot : 0,
  })).sort((a, b) => b.omzet - a.omzet);
  const ltvTotaal = { klanten: ltvKlantenTot, omzet: Math.round(ltvOmzetTot * 100) / 100, gem: ltvKlantenTot ? Math.round(ltvOmzetTot / ltvKlantenTot) : 0 };

  return Response.json({ perBron, totaal, leads: verrijkt, spend, ltv, ltvTotaal });
}
