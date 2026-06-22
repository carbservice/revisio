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
          for (const [kanaal, namen] of Object.entries(SPEND_LEDGERS)) {
            if (namen.includes(naam)) spend[kanaal] += Math.abs(Number(ac.value) || 0);
          }
        });
      }
    });
    return spend;
  } catch { return leeg; }
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
  const totaal = {
    leads: lijst.length,
    klanten: lijst.filter((L) => Number(L.omzet_excl) > 0).length,
    omzet: Math.round(totaalOmzet * 100) / 100, spend: totaalSpend,
    roas: totaalSpend > 0 ? totaalOmzet / totaalSpend : null,
  };

  return Response.json({ perBron, totaal, leads: verrijkt, spend });
}
