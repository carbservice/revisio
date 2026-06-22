// app/api/sales/route.js
// Lead + Marketing-dashboard data: leads per bron (ROAS), de lead-pijplijn met
// gekoppelde Moneybird-offerte en de actie-log, plus de spend. Voor CG/LE/JM/LV.

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { vereisIngelogd } from "@/lib/auth-server";
import { magSales } from "@/app/werkplaats-planning/planning-config";

const ADMIN = process.env.MONEYBIRD_ADMIN;
const offerteUrl = (id) => (id && ADMIN ? `https://moneybird.com/${ADMIN}/estimates/${id}` : null);

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

  // Actie-log per lead (laatste eerst).
  const ids = lijst.map((L) => L.id);
  let acties = [];
  if (ids.length) {
    const { data } = await supabaseAdmin.from("lead_actie").select("*").in("lead_id", ids).order("datum", { ascending: false });
    acties = data || [];
  }
  const actiePer = new Map();
  acties.forEach((a) => { if (!actiePer.has(a.lead_id)) actiePer.set(a.lead_id, []); actiePer.get(a.lead_id).push(a); });

  const verrijkt = lijst.map((L) => ({ ...L, offerte_url: offerteUrl(L.offerte_id), acties: actiePer.get(L.id) || [] }));

  // Marketing-aggregatie per bron (omzet = first-touch).
  const map = new Map();
  for (const L of lijst) {
    const b = L.bron || "organisch";
    if (!map.has(b)) map.set(b, { bron: b, leads: 0, klanten: 0, omzet: 0 });
    const s = map.get(b);
    s.leads++;
    if (Number(L.omzet_excl) > 0) { s.klanten++; s.omzet += Number(L.omzet_excl); }
  }
  const { data: spendRows } = await supabaseAdmin
    .from("ad_spend").select("*").gte("maand", van.slice(0, 10)).lt("maand", tot.slice(0, 10));
  const spendPer = new Map();
  (spendRows || []).forEach((r) => spendPer.set(r.kanaal, (spendPer.get(r.kanaal) || 0) + Number(r.bedrag || 0)));
  const perBron = [...map.values()].map((s) => {
    const spend = spendPer.get(s.bron) || 0;
    return { ...s, omzet: Math.round(s.omzet * 100) / 100, spend, roas: spend > 0 ? s.omzet / spend : null, conversie: s.leads ? s.klanten / s.leads : 0 };
  }).sort((a, b) => b.omzet - a.omzet);
  const totaalSpend = [...spendPer.values()].reduce((s, x) => s + x, 0);
  const totaalOmzet = perBron.reduce((s, x) => s + x.omzet, 0);
  const totaal = {
    leads: lijst.length,
    klanten: lijst.filter((L) => Number(L.omzet_excl) > 0).length,
    omzet: Math.round(totaalOmzet * 100) / 100, spend: totaalSpend,
    roas: totaalSpend > 0 ? totaalOmzet / totaalSpend : null,
  };

  return Response.json({ perBron, totaal, leads: verrijkt, spend: spendRows || [] });
}
