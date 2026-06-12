// app/api/klussen/route.js
// Geaccepteerde klussen (offertes) uit Moneybird voor de werkplaats-app.

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

export async function GET() {
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
      datum: e.accepted_at || e.estimate_date || "",
      getekend: e.accepted_at || "",
    }));

    klussen.sort((a, b) => (b.datum || "").localeCompare(a.datum || ""));

    return Response.json({ klussen });
  } catch (err) {
    return Response.json({ klussen: [], fout: err.message }, { status: 200 });
  }
}