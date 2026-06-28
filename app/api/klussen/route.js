// app/api/klussen/route.js
// Klussen voor de werkplaats-app. Twee bronnen, samengevoegd:
//  1. Geaccepteerde offertes uit Moneybird (de actieve klussen).
//  2. Klussen die wij zelf al behandeld hebben (staan in werkbon_links) maar
//     niet meer geaccepteerd zijn in Moneybird, omdat ze inmiddels gefactureerd
//     zijn. Zo blijft bv. Lude vindbaar en bewerkbaar na facturatie, ZONDER de
//     hele Moneybird-factuurhistorie binnen te trekken.

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { vereisIngelogd } from "@/lib/auth-server";
import { geoffreerdeArbeidUit } from "@/lib/tarief";
import { MB_ADMIN, MB_TOKEN } from "@/lib/moneybird";

const BASE = `https://moneybird.com/api/v2/${MB_ADMIN}`;
const HEADERS = { Authorization: `Bearer ${MB_TOKEN}` };

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

function klantNaam(c) {
  if (!c) return "Onbekende klant";
  if (c.company_name) return c.company_name;
  const n = [c.firstname, c.lastname].filter(Boolean).join(" ");
  return n || "Onbekende klant";
}

function klachtUit(velden) {
  const v = (velden || []).find((f) => (f.name || "").toLowerCase().startsWith("klacht"));
  return v ? v.value : "";
}

function schoon(ref) {
  if (!ref) return "";
  return ref.replace(/\s*,\s*,+/g, ", ").replace(/\s{2,}/g, " ").trim();
}

export async function GET(req) {
  const poort = await vereisIngelogd(req);
  if (!poort.ok) return poort.response;
  try {
    let page = 1;
    let alles = [];
    while (true) {
      const batch = await haal(`${BASE}/estimates.json?filter=${encodeURIComponent("period:this_year,state:accepted")}&per_page=100&page=${page}`);
      alles = alles.concat(batch);
      if (batch.length < 100) break;
      page++;
    }

    const klussen = alles.map((e) => ({
      id: e.id,
      nummer: e.estimate_id || "",
      klant: klantNaam(e.contact),
      voertuig: schoon(e.reference),
      klacht: klachtUit(e.custom_fields),
      bedrag: Number(e.total_price_incl_tax || 0),
      geoffreerdeArbeid: geoffreerdeArbeidUit(e),
      datum: e.accepted_at || e.estimate_date || "",
      getekend: e.accepted_at || "",
      status: "geaccepteerd",
    }));

    // Onze eigen behandelde klussen die niet (meer) geaccepteerd zijn: die zijn
    // gefactureerd. We halen ze uit werkbon_links (alleen wat wij behandeld
    // hebben), dus geen losse Moneybird-facturen.
    const acceptedIds = new Set(klussen.map((k) => k.id));
    try {
      const { data: links } = await supabaseAdmin
        .from("werkbon_links")
        .select("klus_id, nummer, klant, voertuig, klacht");
      const gezien = new Set();
      (links || []).forEach((l) => {
        if (!l.klus_id || acceptedIds.has(l.klus_id) || gezien.has(l.klus_id)) return;
        gezien.add(l.klus_id);
        klussen.push({
          id: l.klus_id,
          nummer: l.nummer || "",
          klant: l.klant || "",
          voertuig: l.voertuig || "",
          klacht: l.klacht || "",
          bedrag: 0,
          geoffreerdeArbeid: 0,
          datum: "",
          getekend: "",
          status: "gefactureerd",
        });
      });
    } catch {
      // Lukt de Supabase-aanvraag niet, dan tonen we gewoon de Moneybird-klussen.
    }

    klussen.sort((a, b) => (b.datum || "").localeCompare(a.datum || ""));

    return Response.json({ klussen });
  } catch (err) {
    return Response.json({ klussen: [], fout: err.message }, { status: 200 });
  }
}