// app/api/planning/sync/route.js
// Moneybird inbound voor het planningsbord. Maakt automatisch een klus-kaart
// in Binnenkomst zodra een offerte geaccepteerd is, en zet het label
// "Gefactureerd" zodra een klus niet meer geaccepteerd is (dus gefactureerd).
// De klus is de bron: klus_id (Moneybird estimate id) is de gedeelde sleutel.

import { supabase } from "@/lib/supabase";
import { STANDAARD_LEDEN, gewensteFase } from "@/app/planning/planning-config";

const ADMIN = process.env.MONEYBIRD_ADMIN;
const TOKEN = process.env.MONEYBIRD_TOKEN;
const BASE = `https://moneybird.com/api/v2/${ADMIN}`;
const HEADERS = { Authorization: `Bearer ${TOKEN}` };

function wacht(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function haal(url) {
  for (let poging = 0; poging < 3; poging++) {
    const res = await fetch(url, { headers: HEADERS, cache: "no-store" });
    if (res.status === 429) { await wacht(2000); continue; }
    if (!res.ok) throw new Error(`Moneybird ${res.status}`);
    return res.json();
  }
  throw new Error("Moneybird is even te druk");
}

function klantNaam(c) {
  if (!c) return "Onbekende klant";
  if (c.company_name) return c.company_name;
  return [c.firstname, c.lastname].filter(Boolean).join(" ") || "Onbekende klant";
}
function schoon(ref) {
  if (!ref) return "";
  return ref.replace(/\s*,\s*,+/g, ", ").replace(/\s{2,}/g, " ").trim();
}

export async function POST() {
  try {
    if (!ADMIN || !TOKEN) return Response.json({ fout: "Moneybird niet geconfigureerd", nieuw: 0, gefactureerd: 0 });

    // 1) Geaccepteerde offertes ophalen (de actieve klussen).
    let page = 1, alles = [];
    while (true) {
      const batch = await haal(`${BASE}/estimates.json?filter=${encodeURIComponent("period:this_year,state:accepted")}&per_page=100&page=${page}`);
      alles = alles.concat(batch);
      if (batch.length < 100) break;
      page++;
    }
    const accepted = new Map();
    alles.forEach((e) => {
      accepted.set(String(e.id), { titel: schoon(e.reference) || klantNaam(e.contact) });
    });

    // 2) Bestaande klus-kaarten ophalen.
    const { data: bestaand } = await supabase
      .from("kaart")
      .select("id, klus_id, fase, gefactureerd, archief, hand_verplaatst")
      .eq("type", "klus");
    const bekend = new Set((bestaand || []).map((k) => k.klus_id));

    // 3) Nieuwe klus-kaarten in Binnenkomst (achteraan).
    const { count: aantalBinnen } = await supabase
      .from("kaart").select("id", { count: "exact", head: true }).eq("fase", "binnenkomst");
    let positie = aantalBinnen || 0;
    const nieuweKaarten = [];
    accepted.forEach((info, klusId) => {
      if (bekend.has(klusId)) return;
      nieuweKaarten.push({
        klus_id: klusId, type: "klus", titel: info.titel, fase: "binnenkomst",
        positie: positie++, entered_stage_at: new Date().toISOString(),
      });
    });
    let nieuw = 0;
    if (nieuweKaarten.length) {
      const { data: ingevoegd } = await supabase.from("kaart").insert(nieuweKaarten).select("id");
      nieuw = (ingevoegd || []).length;
      const leden = [];
      const logs = [];
      (ingevoegd || []).forEach((k) => {
        STANDAARD_LEDEN.forEach((g) => leden.push({ kaart_id: k.id, gebruiker: g }));
        logs.push({ kaart_id: k.id, auteur: "Moneybird", soort: "log", tekst: "binnengekomen: geaccepteerde offerte automatisch op het bord gezet" });
      });
      if (leden.length) await supabase.from("kaart_lid").insert(leden);
      if (logs.length) await supabase.from("kaart_bericht").insert(logs);
    }

    // 4) Gefactureerd-label: klus-kaart niet meer geaccepteerd = gefactureerd.
    let gefactureerd = 0;
    const wordtGefactureerd = (bestaand || []).filter((k) => k.klus_id && !accepted.has(k.klus_id) && !k.archief && !k.gefactureerd);
    if (wordtGefactureerd.length) {
      const ids = wordtGefactureerd.map((k) => k.id);
      await supabase.from("kaart").update({ gefactureerd: true }).in("id", ids);
      await supabase.from("kaart_bericht").insert(ids.map((id) => ({ kaart_id: id, auteur: "Moneybird", soort: "log", tekst: "klus is gefactureerd in Moneybird" })));
      gefactureerd = wordtGefactureerd.length;
    }
    // Heropende klus: label weer weg.
    const weerOpen = (bestaand || []).filter((k) => k.klus_id && accepted.has(k.klus_id) && k.gefactureerd);
    if (weerOpen.length) await supabase.from("kaart").update({ gefactureerd: false }).in("id", weerOpen.map((k) => k.id));

    // 5) Reconcile met de monteurs-app: stadia/retour bepalen de kolom.
    // Alleen kaarten die NIET handmatig zijn versleept (dan respecteren we de
    // mens), niet gearchiveerd, en met een klus_id.
    let verplaatst = 0;
    const teReconcilen = (bestaand || []).filter((k) => k.klus_id && !k.archief && !k.hand_verplaatst);
    if (teReconcilen.length) {
      const klusIds = [...new Set(teReconcilen.map((k) => k.klus_id))];
      const [vRes, rRes] = await Promise.all([
        supabase.from("klus_voortgang").select("klus_id, stap").in("klus_id", klusIds),
        supabase.from("werkbon_retour").select("klus_id, is_retour, reden"),
      ]);
      const stappenPer = new Map();
      (vRes.data || []).forEach((v) => {
        if (!stappenPer.has(v.klus_id)) stappenPer.set(v.klus_id, []);
        stappenPer.get(v.klus_id).push(v.stap);
      });
      // Retour kan op klus_id of op klus_id#2 (tweede carburateur) staan.
      const retourReden = new Map();
      (rRes.data || []).forEach((r) => {
        if (!r.is_retour) return;
        const basis = String(r.klus_id).split("#")[0];
        if (!retourReden.has(basis)) retourReden.set(basis, r.reden || "");
      });

      for (const k of teReconcilen) {
        const isRetour = retourReden.has(k.klus_id);
        const doel = gewensteFase(stappenPer.get(k.klus_id) || [], isRetour);
        if (!doel || doel === k.fase) continue;
        await supabase.from("kaart").update({ fase: doel, entered_stage_at: new Date().toISOString() }).eq("id", k.id);
        await supabase.from("kaart_bericht").insert({
          kaart_id: k.id, auteur: "Werkplaats", soort: "log",
          tekst: isRetour ? `gemarkeerd als retour, automatisch naar Retouren${retourReden.get(k.klus_id) ? ` (${retourReden.get(k.klus_id)})` : ""}` : `automatisch verschoven op basis van de monteur-status`,
        });
        // Retour: leden een melding sturen.
        if (isRetour) {
          const { data: ld } = await supabase.from("kaart_lid").select("gebruiker").eq("kaart_id", k.id);
          if (ld && ld.length) {
            await supabase.from("melding").insert(ld.map((m) => ({
              ontvanger: m.gebruiker, kaart_id: k.id, van: "Werkplaats", soort: "activiteit",
              tekst: `Retour binnen${retourReden.get(k.klus_id) ? `: ${retourReden.get(k.klus_id)}` : ""}`,
            })));
          }
        }
        verplaatst++;
      }
    }

    return Response.json({ nieuw, gefactureerd, verplaatst });
  } catch (err) {
    return Response.json({ fout: err.message, nieuw: 0, gefactureerd: 0, verplaatst: 0 }, { status: 200 });
  }
}
