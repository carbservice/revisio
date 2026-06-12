// app/api/werkplaats-stats/route.js
// Werkplaats-cijfers voor management, rechtstreeks uit Supabase.

import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const MB_ADMIN = process.env.MONEYBIRD_ADMIN;
const MB_TOKEN = process.env.MONEYBIRD_TOKEN;

// Map klus_id (= Moneybird estimate-id) naar ordernummer/klant/kenmerk.
// Faalt stil terug op een lege map, zodat het dashboard altijd laadt.
async function moneybirdMap() {
  try {
    if (!MB_ADMIN || !MB_TOKEN) return {};
    const map = {};
    let page = 1;
    while (true) {
      const res = await fetch(
        `https://moneybird.com/api/v2/${MB_ADMIN}/estimates.json?filter=${encodeURIComponent("period:this_year,state:accepted")}&per_page=100&page=${page}`,
        { headers: { Authorization: `Bearer ${MB_TOKEN}` }, cache: "no-store" }
      );
      if (!res.ok) break;
      const batch = await res.json();
      (batch || []).forEach((e) => {
        const c = e.contact;
        const klant = c ? (c.company_name || [c.firstname, c.lastname].filter(Boolean).join(" ") || "") : "";
        const voertuig = (e.reference || "").replace(/\s*,\s*,+/g, ", ").replace(/\s{2,}/g, " ").trim();
        map[e.id] = { nummer: e.estimate_id || "", klant, voertuig };
      });
      if (!batch || batch.length < 100) break;
      page++;
    }
    return map;
  } catch {
    return {};
  }
}

function ym(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; }
function maandVan(s) { if (!s) return ""; const d = new Date(s); return isNaN(d.getTime()) ? "" : ym(d); }
function dagenTussen(a, b) {
  const t1 = new Date(a).getTime(), t2 = new Date(b).getTime();
  if (isNaN(t1) || isNaN(t2)) return null;
  return Math.max(0, Math.round((t2 - t1) / 86400000));
}
function dagenGeleden(s) {
  const t = new Date(s).getTime();
  if (isNaN(t)) return null;
  return Math.floor((Date.now() - t) / 86400000);
}

export async function GET() {
  try {
    const now = new Date();
    const dezeM = ym(now);
    const vorigeM = ym(new Date(now.getFullYear(), now.getMonth() - 1, 1));

    const { data: tijd } = await supabase.from("tijdregels").select("klus_id, klus_label, monteur_naam, minuten, start_tijd, aangemaakt_op");
    const { data: voortgang } = await supabase.from("klus_voortgang").select("klus_id, stap, gedaan_op");
    const { data: retouren } = await supabase.from("werkbon_retour").select("klus_id, is_retour, reden, gemarkeerd_op");
    const { data: artikelenAll } = await supabase.from("werkbon_artikelen").select("klus_id, aangemaakt_op");
    const { data: opmerkingAll } = await supabase.from("werkbon_opmerking").select("klus_id, bijgewerkt_op");
    const { data: fotosAll } = await supabase.from("klus_fotos").select("klus_id, geupload_op");
    const { data: linksAll } = await supabase.from("werkbon_links").select("klus_id, nummer, klant, voertuig");
    const mb = await moneybirdMap();

    const ontvangen = {}, klaar = {};
    (voortgang || []).forEach((v) => {
      if (v.stap === "ontvangen") ontvangen[v.klus_id] = v.gedaan_op;
      if (v.stap === "klaar") klaar[v.klus_id] = v.gedaan_op;
    });

    const labels = {};
    (tijd || []).forEach((r) => { if (r.klus_label) labels[r.klus_id] = r.klus_label; });

    // Op de plank: ontvangen wel, klaar nog niet
    const plankLijst = [];
    Object.keys(ontvangen).forEach((id) => {
      if (!klaar[id]) {
        const dagen = dagenGeleden(ontvangen[id]);
        plankLijst.push({ klus_id: id, label: labels[id] || id, dagen: dagen == null ? 0 : dagen });
      }
    });
    plankLijst.sort((a, b) => b.dagen - a.dagen);
    const plankWeek = plankLijst.filter((p) => p.dagen >= 7 && p.dagen < 14).length;
    const plankAlert = plankLijst.filter((p) => p.dagen >= 14).length;

    // Klaar per maand
    const klaarDeze = Object.values(klaar).filter((d) => maandVan(d) === dezeM).length;
    const klaarVorige = Object.values(klaar).filter((d) => maandVan(d) === vorigeM).length;

    // Gemiddelde doorlooptijd (ontvangen tot klaar) voor klussen die in die maand klaar werden
    function gemDoorloop(maand) {
      const w = [];
      Object.keys(klaar).forEach((id) => {
        if (maandVan(klaar[id]) !== maand || !ontvangen[id]) return;
        const d = dagenTussen(ontvangen[id], klaar[id]);
        if (d != null) w.push(d);
      });
      if (!w.length) return null;
      return Math.round((w.reduce((s, x) => s + x, 0) / w.length) * 10) / 10;
    }

    // Uren per maand + per monteur
    function urenVan(maand) {
      const perMonteur = {};
      let totaal = 0;
      (tijd || []).forEach((r) => {
        if (r.minuten == null) return;
        if (maandVan(r.start_tijd || r.aangemaakt_op) !== maand) return;
        totaal += r.minuten;
        const naam = r.monteur_naam || "Onbekend";
        perMonteur[naam] = (perMonteur[naam] || 0) + r.minuten;
      });
      const lijst = Object.entries(perMonteur).map(([naam, min]) => ({ naam, min })).sort((a, b) => b.min - a.min);
      return { totaal_min: totaal, per_monteur: lijst };
    }

    // Uren per klus (cumulatief over alle afgeronde regels)
    const perKlus = {};
    (tijd || []).forEach((r) => { if (r.minuten != null) perKlus[r.klus_id] = (perKlus[r.klus_id] || 0) + r.minuten; });
    const urenPerKlus = Object.entries(perKlus).map(([id, min]) => ({ klus_id: id, label: labels[id] || id, min })).sort((a, b) => b.min - a.min);
    const klussenMetUren = urenPerKlus.length;
    const totaalAlleMin = urenPerKlus.reduce((s, x) => s + x.min, 0);
    const gemPerKlus = klussenMetUren ? Math.round(totaalAlleMin / klussenMetUren) : 0;

    // Retouren (comebacks)
    const retourActief = (retouren || []).filter((r) => r.is_retour);
    const retourDeze = retourActief.filter((r) => maandVan(r.gemarkeerd_op) === dezeM).length;
    const retourVorige = retourActief.filter((r) => maandVan(r.gemarkeerd_op) === vorigeM).length;
    const retourLijst = retourActief
      .slice()
      .sort((a, b) => new Date(b.gemarkeerd_op).getTime() - new Date(a.gemarkeerd_op).getTime())
      .map((r) => ({ klus_id: r.klus_id, label: labels[r.klus_id] || r.klus_id, reden: r.reden || "", datum: r.gemarkeerd_op }))
      .slice(0, 20);

    // Werkbonnen-lijst: alle klus_ids die ergens in de werkbon-data voorkomen.
    const STADIUM_PCT = { ontvangen: 20, gestart: 40, voor_ultrasoon: 60, na_ultrasoon: 80, schoon: 100, klaar: 100 };
    const linkVan = {};
    (linksAll || []).forEach((l) => { linkVan[l.klus_id] = l; });
    const fotoTel = {};
    (fotosAll || []).forEach((r) => { fotoTel[r.klus_id] = (fotoTel[r.klus_id] || 0) + 1; });
    const retourVan = {};
    (retouren || []).forEach((r) => { if (r.is_retour) retourVan[r.klus_id] = true; });
    const pctVan = {};
    (voortgang || []).forEach((v) => {
      const p = STADIUM_PCT[v.stap] || 0;
      if (p > (pctVan[v.klus_id] || 0)) pctVan[v.klus_id] = p;
    });

    const bonMap = {};
    function raak(id, datum) {
      if (!id) return;
      if (!bonMap[id]) bonMap[id] = { klus_id: id, laatste: null };
      if (datum) {
        const t = new Date(datum).getTime();
        if (!isNaN(t) && (bonMap[id].laatste == null || t > bonMap[id].laatste)) bonMap[id].laatste = t;
      }
    }
    (voortgang || []).forEach((v) => raak(v.klus_id, v.gedaan_op));
    (tijd || []).forEach((r) => raak(r.klus_id, r.start_tijd || r.aangemaakt_op));
    (retouren || []).forEach((r) => raak(r.klus_id, r.gemarkeerd_op));
    (artikelenAll || []).forEach((r) => raak(r.klus_id, r.aangemaakt_op));
    (opmerkingAll || []).forEach((r) => raak(r.klus_id, r.bijgewerkt_op));
    (fotosAll || []).forEach((r) => raak(r.klus_id, r.geupload_op));

    const bonnen = Object.values(bonMap).map((b) => {
      const link = linkVan[b.klus_id] || {};
      const mbi = mb[b.klus_id] || {};
      let nummer = mbi.nummer || link.nummer || "";
      let klant = mbi.klant || link.klant || "";
      const voertuig = mbi.voertuig || link.voertuig || "";
      if ((!nummer || !klant) && labels[b.klus_id]) {
        const lbl = String(labels[b.klus_id]);
        const sp = lbl.indexOf(" ");
        if (!nummer) nummer = sp > 0 ? lbl.slice(0, sp) : lbl;
        if (!klant) klant = sp > 0 ? lbl.slice(sp + 1) : "";
      }
      if (!nummer) nummer = b.klus_id;
      return {
        klus_id: b.klus_id,
        nummer,
        klant,
        voertuig,
        label: labels[b.klus_id] || (klant ? `${nummer} ${klant}` : nummer),
        pct: pctVan[b.klus_id] || 0,
        fotos: fotoTel[b.klus_id] || 0,
        is_retour: !!retourVan[b.klus_id],
        laatste: b.laatste,
      };
    }).sort((a, b) => (b.laatste || 0) - (a.laatste || 0));

    return Response.json({
      maand: dezeM,
      vorige_maand: vorigeM,
      plank: { totaal: plankLijst.length, week: plankWeek, alert: plankAlert, lijst: plankLijst.slice(0, 20) },
      klaar: { deze_maand: klaarDeze, vorige_maand: klaarVorige },
      doorlooptijd: { deze_maand: gemDoorloop(dezeM), vorige_maand: gemDoorloop(vorigeM) },
      uren: { deze_maand: urenVan(dezeM), vorige_maand: urenVan(vorigeM) },
      uren_per_klus: urenPerKlus.slice(0, 15),
      gem_uren_per_klus_min: gemPerKlus,
      klussen_met_uren: klussenMetUren,
      retour: { deze_maand: retourDeze, vorige_maand: retourVorige, totaal: retourActief.length, lijst: retourLijst },
      bonnen,
    });
  } catch (e) {
    return Response.json({ fout: String(e) }, { status: 500 });
  }
}