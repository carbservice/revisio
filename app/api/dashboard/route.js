// Revisio dashboard, datalaag.
// app/api/dashboard/route.js

import { vereisAdmin } from "@/lib/auth-server";

const ADMIN = process.env.MONEYBIRD_ADMIN;
const TOKEN = process.env.MONEYBIRD_TOKEN;
const BASE = `https://moneybird.com/api/v2/${ADMIN}`;
const HEADERS = { Authorization: `Bearer ${TOKEN}` };

const BANKGROEP = "417531255605692035";
const BTW_SPAARPOT = "482563736709629049";
const DEBITEUREN = "417531255599400578";
const CREDITEUREN = "417531255607789190";

// Omzet per productgroep: grootboek-id naar groep. Onbekende id valt in Overig.
const OMZET_GROEPEN = {
  Werkplaats:    ["442436313943115052", "435582213564663034"],
  Onderdelen:    ["442436340752057790"],
  Transport:     ["445622503830717609"],
  Verzendkosten: ["442438892919981984"],
  Webshop:       ["420436498486134301", "476695444769998666", "476334104496834499"],
  Overig:        ["417531255610934921", "417531255618274958", "431017778742298420", "451310729716303763"],
};
const _idNaarGroep = {};
for (const [groep, ids] of Object.entries(OMZET_GROEPEN)) {
  for (const id of ids) _idNaarGroep[id] = groep;
}

let cache = { tijd: 0, data: null };
const CACHE_MS = 5 * 60 * 1000;

function wacht(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function haal(url) {
  for (let poging = 0; poging < 3; poging++) {
    const res = await fetch(url, { headers: HEADERS, cache: "no-store" });
    if (res.status === 429) { await wacht(2000); continue; }
    if (!res.ok) throw new Error(`Moneybird ${res.status}`);
    return res.json();
  }
  throw new Error("Moneybird is even te druk, probeer het over een minuut opnieuw");
}

async function wv(period) {
  return haal(`${BASE}/reports/profit_loss.json?period=${period}`);
}

async function haalAlles(pad, filter) {
  let page = 1;
  let alles = [];
  while (true) {
    const batch = await haal(`${BASE}/${pad}.json?filter=${encodeURIComponent(filter)}&per_page=100&page=${page}`);
    alles = alles.concat(batch);
    if (batch.length < 100) break;
    page++;
  }
  return alles;
}

function samenvatten(d) {
  const omzet = Number(d.total_revenue);
  const brutomarge = Number(d.gross_profit);
  const nettowinst = Number(d.net_profit);
  const kosten = Number(d.total_expenses);
  return {
    omzet, kosten, brutomarge, nettowinst,
    brutomarge_pct: omzet ? (brutomarge / omzet) * 100 : 0,
    netto_pct: omzet ? (nettowinst / omzet) * 100 : 0,
  };
}

function berekenOmzetPerProductgroep(raw) {
  const regels = (raw.revenue_by_ledger_account && raw.revenue_by_ledger_account.ledger_accounts) || [];
  const perGroep = {};
  for (const r of regels) {
    const groep = _idNaarGroep[r.ledger_account_id] || "Overig";
    perGroep[groep] = (perGroep[groep] || 0) + Number(r.value || 0);
  }
  const totaal = Object.values(perGroep).reduce((a, b) => a + b, 0);
  const groepen = Object.entries(perGroep)
    .map(([naam, omzet]) => ({ naam, omzet: Math.round(omzet * 100) / 100, aandeel: totaal ? omzet / totaal : 0 }))
    .filter((g) => g.omzet !== 0)
    .sort((a, b) => b.omzet - a.omzet);
  return { totaal: Math.round(totaal * 100) / 100, groepen };
}

function yoyVan(cur, vor) {
  const yoy = {};
  for (const k of ["omzet", "kosten", "brutomarge", "nettowinst"]) {
    const v = cur[k] - vor[k];
    yoy[k] = { absoluut: v, procent: vor[k] ? (v / Math.abs(vor[k])) * 100 : null };
  }
  return yoy;
}

function sumRaws(raws) {
  const out = { total_revenue: 0, gross_profit: 0, net_profit: 0, total_expenses: 0 };
  const dmap = {}, emap = {};
  for (const r of raws) {
    out.total_revenue += Number(r.total_revenue || 0);
    out.gross_profit += Number(r.gross_profit || 0);
    out.net_profit += Number(r.net_profit || 0);
    out.total_expenses += Number(r.total_expenses || 0);
    for (const a of (r.direct_costs_by_ledger_account && r.direct_costs_by_ledger_account.ledger_accounts) || []) dmap[a.ledger_account_id] = (dmap[a.ledger_account_id] || 0) + Number(a.value);
    for (const a of (r.expenses_by_ledger_account && r.expenses_by_ledger_account.ledger_accounts) || []) emap[a.ledger_account_id] = (emap[a.ledger_account_id] || 0) + Number(a.value);
  }
  out.direct_costs_by_ledger_account = { ledger_accounts: Object.entries(dmap).map(([id, v]) => ({ ledger_account_id: id, value: String(v) })) };
  out.expenses_by_ledger_account = { ledger_accounts: Object.entries(emap).map(([id, v]) => ({ ledger_account_id: id, value: String(v) })) };
  return out;
}

function topVan(raw, naamVan) {
  const lijst = [
    ...((raw.direct_costs_by_ledger_account && raw.direct_costs_by_ledger_account.ledger_accounts) || []),
    ...((raw.expenses_by_ledger_account && raw.expenses_by_ledger_account.ledger_accounts) || []),
  ];
  return lijst
    .map((r) => ({ naam: naamVan[r.ledger_account_id] || "Onbekend", bedrag: Number(r.value) }))
    .filter((r) => r.bedrag > 0)
    .sort((a, b) => b.bedrag - a.bedrag)
    .slice(0, 5);
}

function btwVan(lijst) {
  return lijst.reduce((s, f) => s + (Number(f.total_price_incl_tax || 0) - Number(f.total_price_excl_tax || 0)), 0);
}

function sumClosing(arr, from, to) {
  let verstuurd = 0, gewonnen = 0;
  for (let i = from; i <= to; i++) { verstuurd += arr[i].verstuurd; gewonnen += arr[i].gewonnen; }
  return { verstuurd, gewonnen };
}

const MAANDEN = ["januari","februari","maart","april","mei","juni","juli","augustus","september","oktober","november","december"];
const p2 = (n) => String(n).padStart(2, "0");
const kort = (i) => MAANDEN[i].charAt(0).toUpperCase() + MAANDEN[i].slice(1, 3);

export async function GET(req) {
  // Portier: alleen ingelogde admins mogen de cijfers ophalen.
  const poort = await vereisAdmin(req);
  if (!poort.ok) return poort.response;
  try {
    if (cache.data && Date.now() - cache.tijd < CACHE_MS) {
      return Response.json(cache.data);
    }

    const nu = new Date();
    const Y = nu.getFullYear();
    const curM = nu.getMonth();
    const M = Math.max(0, curM - 1);
    const qStart = Math.floor(M / 3) * 3;
    const q = Math.floor(M / 3) + 1;

    const grootboek = await haal(`${BASE}/ledger_accounts.json`);
    const naamVan = {};
    for (const g of grootboek) naamVan[g.id] = g.name;

    const wvJaarRaw = await wv("this_year");
    const jaarYTD = samenvatten(wvJaarRaw);
    const omzetPerProductgroep = berekenOmzetPerProductgroep(wvJaarRaw);

    const bs = await haal(`${BASE}/reports/balance_sheet.json?period=this_month`);
    const ca = (bs.debit && bs.debit.current_assets) || [];
    const cl = (bs.credit && bs.credit.current_liabilities) || [];
    const bankGroep = ca.find((e) => e.ledger_account_id === BANKGROEP);
    let saldoTotaal = 0, btwPot = 0;
    for (const ch of (bankGroep && bankGroep.children) || []) {
      saldoTotaal += Number(ch.value);
      if (ch.ledger_account_id === BTW_SPAARPOT) btwPot = Number(ch.value);
    }
    const debiteuren = Number((ca.find((e) => e.ledger_account_id === DEBITEUREN) || {}).value || 0);
    const crediteuren = Number((cl.find((e) => e.ledger_account_id === CREDITEUREN) || {}).value || 0);

    const status = {
      ytdLabel: `${Y} t/m ${MAANDEN[curM]}`,
      omzet: jaarYTD.omzet,
      nettowinst: jaarYTD.nettowinst,
      netto_pct: jaarYTD.netto_pct,
      saldoExclBtw: saldoTotaal - btwPot,
      btwPot,
      teOntvangen: debiteuren,
      teBetalen: crediteuren,
    };

    const curRaws = [], vorRaws = [];
    for (let i = 0; i <= curM; i++) {
      curRaws[i] = await wv(`${Y}${p2(i + 1)}`);
      vorRaws[i] = await wv(`${Y - 1}${p2(i + 1)}`);
    }

    const maanden = [];
    for (let i = 0; i <= curM; i++) {
      const c = samenvatten(curRaws[i]);
      const v = samenvatten(vorRaws[i]);
      maanden.push({ key: `${Y}${p2(i + 1)}`, kort: kort(i), loopt: i === curM, huidigLabel: `${MAANDEN[i]} ${Y}`, vorigLabel: `${MAANDEN[i]} ${Y - 1}`, cijfers: c, yoy: yoyVan(c, v), topKosten: topVan(curRaws[i], naamVan) });
    }

    // Closing rate: verstuurde offertes per maand (concepten tellen niet mee).
    let closing = Array.from({ length: curM + 1 }, () => ({ verstuurd: 0, gewonnen: 0 }));
    try {
      const offertes = await haalAlles("estimates", "period:this_year,state:open|late|accepted|rejected|billed|archived");
      for (const e of offertes) {
        if (!e.sent_at) continue;
        const d = e.estimate_date;
        if (!d) continue;
        const jr = Number(d.slice(0, 4));
        const mn = Number(d.slice(5, 7)) - 1;
        if (jr !== Y || mn < 0 || mn > curM) continue;
        closing[mn].verstuurd++;
        if (e.state === "accepted" || e.state === "billed") closing[mn].gewonnen++;
      }
    } catch (e) {
      // offertes ophalen mislukt; closing blijft op 0 zodat de rest blijft werken
    }
    for (let i = 0; i <= curM; i++) maanden[i].closing = closing[i];

    const kwCurSum = sumRaws(curRaws.slice(qStart, M + 1));
    const kwVorSum = sumRaws(vorRaws.slice(qStart, M + 1));
    const kwCur = samenvatten(kwCurSum), kwVor = samenvatten(kwVorSum);
    const jaarCurSum = sumRaws(curRaws.slice(0, M + 1));
    const jaarVorSum = sumRaws(vorRaws.slice(0, M + 1));
    const jaarCur = samenvatten(jaarCurSum), jaarVor = samenvatten(jaarVorSum);

    // Vooruitblik volgende maand: zelfde maand vorig jaar, bijgesteld met de trend van dit jaar.
    const volgendeM = (curM + 1) % 12;
    const volgendeY = curM === 11 ? Y + 1 : Y;
    const basisY = volgendeY - 1;
    const basis = samenvatten(await wv(`${basisY}${p2(volgendeM + 1)}`));
    const groeiOmzet = jaarVor.omzet ? jaarCur.omzet / jaarVor.omzet : 1;
    const groeiKosten = jaarVor.kosten ? jaarCur.kosten / jaarVor.kosten : 1;
    const vooruitblik = {
      maandLabel: `${MAANDEN[volgendeM]} ${volgendeY}`,
      basisLabel: `${MAANDEN[volgendeM]} ${basisY}`,
      omzet: basis.omzet * groeiOmzet,
      kosten: basis.kosten * groeiKosten,
      groeiPct: jaarVor.omzet ? (groeiOmzet - 1) * 100 : null,
    };

    const views = {
      kwartaal: { huidigLabel: `Q${q} ${Y} t/m ${MAANDEN[M]}`, vorigLabel: `Q${q} ${Y - 1} t/m ${MAANDEN[M]}`, cijfers: kwCur, yoy: yoyVan(kwCur, kwVor), topKosten: topVan(kwCurSum, naamVan), closing: sumClosing(closing, qStart, M) },
      jaar: { huidigLabel: `${Y} t/m ${MAANDEN[M]}`, vorigLabel: `${Y - 1} t/m ${MAANDEN[M]}`, cijfers: jaarCur, yoy: yoyVan(jaarCur, jaarVor), topKosten: topVan(jaarCurSum, naamVan), closing: sumClosing(closing, 0, M) },
    };

    const verkoopKwartaal = await haalAlles("sales_invoices", "period:this_quarter");
    const inkoopKwartaal = await haalAlles("documents/purchase_invoices", "period:this_quarter");
    const bonnenKwartaal = await haalAlles("documents/receipts", "period:this_quarter");
    const ontvangen = btwVan(verkoopKwartaal);
    const voorbelasting = btwVan(inkoopKwartaal) + btwVan(bonnenKwartaal);
    const btw = { ontvangen, voorbelasting, afTeDragen: ontvangen - voorbelasting };

    const data = { status, maanden, views, btw, omzetPerProductgroep, vooruitblik };

    cache = { tijd: Date.now(), data };
    return Response.json(data);
  } catch (err) {
    return Response.json({ fout: err.message }, { status: 500 });
  }
}