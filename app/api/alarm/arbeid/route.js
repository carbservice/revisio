// app/api/alarm/arbeid/route.js
// Arbeid-discrepantie-alarm: zodra de geschreven monteur-tijd de geoffreerde
// arbeid (uit Moneybird) voorbijloopt, krijgt de manager een in-app melding en
// (indien geconfigureerd) een e-mail. Idempotent: één keer per klus.

import nodemailer from "nodemailer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { vereisIngelogd } from "@/lib/auth-server";
import { geoffreerdeArbeidUit, geoffreerdeUren, UURTARIEF_EX_BTW } from "@/lib/tarief";
import { codeVoorEmail } from "@/app/werkplaats-planning/planning-config";

const ADMIN = process.env.MONEYBIRD_ADMIN;
const TOKEN = process.env.MONEYBIRD_TOKEN;
const SITE = "https://revisio-umber.vercel.app";

export async function POST(request) {
  const poort = await vereisIngelogd(request);
  if (!poort.ok) return poort.response;
  try {
    const { klus_id } = await request.json();
    if (!klus_id) return Response.json({ fout: "geen klus_id" }, { status: 400 });

    // Idempotent: al gemeld? (kolom werkbon_links.arbeid_gemeld)
    const { data: links } = await supabaseAdmin.from("werkbon_links").select("nummer, klant, arbeid_gemeld").eq("klus_id", klus_id).limit(1);
    const link = links && links[0];
    if (link && link.arbeid_gemeld) return Response.json({ alGemeld: true });

    // Geoffreerde arbeid uit Moneybird.
    let geofArbeid = 0, nummer = (link && link.nummer) || "", klant = (link && link.klant) || "";
    try {
      const res = await fetch(`https://moneybird.com/api/v2/${ADMIN}/estimates/${klus_id}.json`, { headers: { Authorization: `Bearer ${TOKEN}` }, cache: "no-store" });
      if (res.ok) {
        const e = await res.json();
        geofArbeid = geoffreerdeArbeidUit(e);
        nummer = e.estimate_id || nummer;
        const c = e.contact || {};
        klant = c.company_name || [c.firstname, c.lastname].filter(Boolean).join(" ") || klant;
      }
    } catch { /* zonder Moneybird geen arbeid bekend */ }
    if (geofArbeid <= 0) return Response.json({ geenArbeidRegel: true });

    // Geschreven tijd uit de werkbon.
    const { data: tr } = await supabaseAdmin.from("tijdregels").select("minuten").eq("klus_id", klus_id);
    const minuten = (tr || []).reduce((s, r) => s + (r.minuten || 0), 0);
    const werkUren = minuten / 60;
    const geofUren = geoffreerdeUren(geofArbeid);
    if (!(werkUren > geofUren)) return Response.json({ nogNietOver: true });

    // Managers en admins krijgen het alarm.
    const { data: mgrs } = await supabaseAdmin.from("app_gebruikers").select("naam, email").in("rol", ["manager", "admin"]).eq("actief", true);
    const managers = (mgrs || []).map((m) => ({ naam: m.naam, email: m.email, code: codeVoorEmail(m.email) })).filter((m) => m.code);

    // Kaart van deze klus (voor de melding-link).
    const { data: ka } = await supabaseAdmin.from("kaart").select("id").eq("type", "klus").eq("klus_id", klus_id).limit(1);
    const kaartId = ka && ka[0] ? ka[0].id : null;

    const tekst = `Arbeid voorbij: klus ${nummer} (${klant}) zit op ${werkUren.toFixed(1)} u van ${geofUren.toFixed(1)} u geoffreerd. Klant bellen of een interne keuze maken.`;

    // In-app melding voor de manager(s).
    if (managers.length && kaartId) {
      await supabaseAdmin.from("melding").insert(managers.map((m) => ({ ontvanger: m.code, kaart_id: kaartId, van: "Arbeid-alarm", soort: "activiteit", tekst })));
    }

    // E-mail (indien GMAIL_USER/GMAIL_APP_PASS in de env staan).
    let gemaild = 0;
    const user = process.env.GMAIL_USER, pass = process.env.GMAIL_APP_PASS;
    if (user && pass && managers.length) {
      try {
        const transport = nodemailer.createTransport({ host: "smtp.gmail.com", port: 465, secure: true, auth: { user, pass } });
        const body = `Let op: een klus loopt voorbij de geoffreerde arbeid.\n\nKlus: ${nummer} (${klant})\nGeschreven: ${werkUren.toFixed(1)} u\nGeoffreerd: ${geofUren.toFixed(1)} u (EUR ${geofArbeid} arbeid, EUR ${UURTARIEF_EX_BTW}/u ex btw)\n\nKlant bellen of een interne keuze maken.\nWerkbon: ${SITE}/werkbonnen?klus=${klus_id}`;
        await transport.sendMail({ from: `Revisio <${user}>`, to: managers.map((m) => m.email).join(", "), subject: `Arbeid voorbij: ${nummer} ${klant}`, text: body });
        gemaild = managers.length;
      } catch { /* mail niet kritiek */ }
    }

    // Markeer als gemeld (idempotent).
    if (link) await supabaseAdmin.from("werkbon_links").update({ arbeid_gemeld: true }).eq("klus_id", klus_id);

    return Response.json({ gemeld: true, managers: managers.length, gemaild });
  } catch (err) {
    return Response.json({ fout: err.message }, { status: 200 });
  }
}
