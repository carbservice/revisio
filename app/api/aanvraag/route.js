// app/api/aanvraag/route.js
// PUBLIEK aanvraag-endpoint, vervangt de Zapier-backend. Eén binnenkomende
// aanvraag doorloopt:
//   1) RDW-voertuigdata ophalen (alleen als er een kenteken is)
//   2) lead in het Sales & Marketing-dashboard schrijven (met bron uit de URL)
//   3) Moneybird: contact zoeken/aanmaken (idempotent op e-mail) + CONCEPT-offerte
//   4) een mailtje naar Cyriel (als er een mailservice is ingesteld)
// Geen login (publiek), wel een honeypot tegen bots. Alles faalt "zacht": een
// aanvraag mag nooit verloren gaan, ook als Moneybird of mail even hapert.

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { haalVoertuig } from "@/lib/rdw";

export const dynamic = "force-dynamic";

const ADMIN = process.env.MONEYBIRD_ADMIN;
const TOKEN = process.env.MONEYBIRD_TOKEN;
const EST_WORKFLOW = "417531256412047023"; // EstimateWorkflow "Standaard"
const DOC_STYLE = "417607702940746976";    // document-stijl "Carburateur Service"

// Bron afleiden uit de tracking-parameters die de pagina meestuurt.
function bronUitTracking(p) {
  p = p || {};
  if (p.gclid || p.gad_source) return "google_ads";
  if (p.fbclid) return "facebook";
  const s = (p.utm_source || "").toLowerCase();
  if (s.includes("google")) return "google_ads";
  if (s.includes("facebook") || s === "fb" || s === "ig" || s === "meta") return "facebook";
  if (s.includes("markt")) return "marktplaats";
  if (s) return "organisch";
  return "organisch";
}

async function mb(path, method = "GET", body) {
  try {
    const res = await fetch(`https://moneybird.com/api/v2/${ADMIN}/${path}`, {
      method,
      headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
      cache: "no-store",
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) return { _fout: res.status, _tekst: (await res.text()).slice(0, 200) };
    return res.json();
  } catch (e) {
    return { _fout: 0, _tekst: String(e).slice(0, 200) };
  }
}

// Bestaand contact op e-mail hergebruiken, anders nieuw aanmaken (geen dubbels).
async function vindOfMaakContact(d) {
  const gevonden = await mb(`contacts.json?query=${encodeURIComponent(d.email)}`);
  if (Array.isArray(gevonden)) {
    const e = d.email.toLowerCase();
    const match = gevonden.find((c) => [(c.email || "").toLowerCase(), (c.send_invoices_to_email || "").toLowerCase()].includes(e));
    if (match) return match;
  }
  const contact = {
    firstname: d.voornaam || "",
    lastname: d.achternaam || "",
    email: d.email,
    phone: d.telefoon || "",
    send_invoices_to_email: d.email,
  };
  if (d.zakelijk) {
    contact.company_name = d.bedrijfsnaam || "";
    contact.chamber_of_commerce = d.kvk || "";
    contact.tax_number = d.btw || "";
  }
  const gemaakt = await mb("contacts.json", "POST", { contact });
  return gemaakt && gemaakt.id ? gemaakt : null;
}

async function maakConceptOfferte(contactId, regel) {
  const estimate = {
    contact_id: contactId,
    workflow_id: EST_WORKFLOW,
    document_style_id: DOC_STYLE,
    details_attributes: [{ description: regel, amount: "1", price: "0" }],
  };
  return mb("estimates.json", "POST", { estimate });
}

// Mailtje naar Cyriel via Resend (alleen als RESEND_API_KEY is ingesteld).
async function stuurMelding(d, voertuigTekst, offerteNr) {
  const key = process.env.RESEND_API_KEY;
  const naar = process.env.AANVRAAG_MAIL || "carburateurservice@gmail.com";
  const van = process.env.AANVRAAG_MAIL_VAN || "Revisio <onboarding@resend.dev>";
  if (!key) return false;
  const tekst =
    `Nieuwe aanvraag via de website\n\n` +
    `Naam: ${d.voornaam} ${d.achternaam}\n` +
    `E-mail: ${d.email}\nTelefoon: ${d.telefoon || "-"}\n` +
    `${d.zakelijk ? "Zakelijk: " + (d.bedrijfsnaam || "") + " (KVK " + (d.kvk || "-") + ", BTW " + (d.btw || "-") + ")" : "Particulier"}\n` +
    `Route: ${d.route === "partner" ? "Wil installatiepartner" : "Zelf opsturen/langsbrengen"}\n` +
    `Voertuig: ${voertuigTekst || "onbekend"}\n` +
    `Carburateur: ${d.carburateur || "-"}\n` +
    `Klachten: ${d.klachten || "-"}\n\n` +
    `Concept-offerte: ${offerteNr || "(niet aangemaakt)"}`;
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: van, to: [naar], subject: `Nieuwe aanvraag: ${d.voornaam} ${d.achternaam}`, text: tekst }),
    });
    return true;
  } catch {
    return false;
  }
}

export async function POST(req) {
  const d = await req.json().catch(() => ({}));
  if (d.website) return Response.json({ ok: true });           // honeypot: bots vullen dit
  if (!d.email || !d.voornaam) return Response.json({ fout: "Naam en e-mail zijn verplicht." }, { status: 400 });

  // 1) RDW (alleen met kenteken). Geen kenteken -> de handmatige merk/model/jaar.
  const voertuig = d.kenteken ? await haalVoertuig(d.kenteken) : null;
  const voertuigTekst = voertuig ? voertuig.omschrijving : (d.merk_model_jaar || "");
  const offerteRegel = [voertuigTekst, d.carburateur ? `Carburateur: ${d.carburateur}` : ""].filter(Boolean).join("\n") || "Carburateur-revisie (aanvraag via website)";

  // 2) Lead in het dashboard (met bron). Zacht falen: nooit een aanvraag kwijt.
  const naam = [d.voornaam, d.achternaam].filter(Boolean).join(" ");
  const bron = bronUitTracking(d.tracking);
  let leadId = null;
  try {
    const { data } = await supabaseAdmin.from("leads").insert({
      datum: new Date().toISOString(),
      email: d.email,
      naam,
      telefoon: d.telefoon || null,
      bedrijf: d.zakelijk ? (d.bedrijfsnaam || null) : null,
      carburateur: d.carburateur || null,
      bericht: [voertuigTekst, d.klachten].filter(Boolean).join(" | ") || null,
      bron,
    }).select("id").single();
    leadId = data ? data.id : null;
  } catch (e) { /* lead-insert mag de rest niet blokkeren */ }

  // 3) Moneybird: contact + concept-offerte.
  let offerteNr = null, mbFout = null;
  if (ADMIN && TOKEN) {
    const contact = await vindOfMaakContact(d);
    if (contact && contact.id) {
      const est = await maakConceptOfferte(contact.id, offerteRegel);
      if (est && est.id) {
        offerteNr = est.estimate_id || null;
        if (leadId) {
          await supabaseAdmin.from("leads").update({
            offerte_id: String(est.id),
            offerte_nummer: offerteNr || "",
            offerte_state: est.state || "draft",
          }).eq("id", leadId);
        }
      } else {
        mbFout = "offerte: " + (est && est._tekst ? est._tekst : "onbekend");
      }
    } else {
      mbFout = "contact niet aangemaakt";
    }
  }

  // 4) Melding (zacht).
  await stuurMelding(d, voertuigTekst, offerteNr);

  return Response.json({ ok: true, voertuig: voertuigTekst || null, offerte: offerteNr, mbFout });
}
