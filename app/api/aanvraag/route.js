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
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://revisio-umber.vercel.app";
const FOTO_BUCKET = "aanvraag-fotos";

// CORS: carbservice.nl (Strikingly) mag dit publieke endpoint aanroepen.
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};
const json = (data, status = 200) => Response.json(data, { status, headers: CORS });
export function OPTIONS() { return new Response(null, { status: 204, headers: CORS }); }

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

// Standaard-productregels (zoals Zapier ze nu op de offerte zet). We verwijzen
// naar de PRODUCTEN in Moneybird (product_id), dus wijzig je een product, dan
// loopt dat mee in nieuwe offertes. Geen vaste tekst hier.
const STD_PRODUCTEN = [
  "418914796729009901", // Carburateur Revisie Arbeid
  "418915008206865415", // Luxe revisiekit
  "485911021308872537", // Ultrasoon-reiniging carburateur
  "485911014739543046", // Verbruiksmateriaal & schoonmaakprocedure
  "434480284167046191", // Transparant brandstoffilter
  "418915116419909338", // Aangetekende verzending DHL
  "445622443033233284", // Carburateur natstralen (renovatie)  -> OPTIONEEL
  "424857784786355328", // Spoedtoeslag                        -> OPTIONEEL
];

// Deze twee komen als OPTIONELE regel op de offerte (grijs, niet meegerekend in
// het totaal), tenzij de klant ze zelf aanvinkt. Moneybird verwacht dan
// is_optional=true en is_selected=false (zo staan de 182 oude offertes ook).
const OPTIONELE_PRODUCTEN = new Set([
  "445622443033233284", // Carburateur natstralen (renovatie)
  "424857784786355328", // Spoedtoeslag
]);

// Moneybird custom field "Klacht:" op de estimate (verschijnt onder het kenmerk).
const KLACHT_FIELD = "441017599027840196";

async function maakConceptOfferte(contactId, kenmerk, klachten) {
  const estimate = {
    contact_id: contactId,
    workflow_id: EST_WORKFLOW,
    document_style_id: DOC_STYLE,
    reference: kenmerk,
    details_attributes: STD_PRODUCTEN.map((pid) => {
      const regel = { product_id: pid, amount: "1" };
      if (OPTIONELE_PRODUCTEN.has(pid)) { regel.is_optional = true; regel.is_selected = false; }
      return regel;
    }),
  };
  if (klachten) estimate.custom_fields_attributes = [{ id: KLACHT_FIELD, value: klachten }];
  return mb("estimates.json", "POST", { estimate });
}

// Leesbare bron-omschrijving voor in de offerte-notitie. Splitst Meta in
// Instagram/Facebook waar de utm_source dat aangeeft (anders algemeen Meta).
function bronLabel(bron, tracking) {
  const s = String((tracking && tracking.utm_source) || "").toLowerCase();
  if (bron === "google_ads") return "Google Ads (advertentie)";
  if (bron === "facebook") {
    if (s.includes("insta") || s === "ig") return "Meta Instagram (advertentie)";
    if (s.includes("face") || s === "fb") return "Meta Facebook (advertentie)";
    return "Meta Facebook of Instagram (advertentie)";
  }
  if (bron === "marktplaats") return "Marktplaats (advertentie)";
  return "Organisch (geen advertentie)";
}

// Leesbaar voertuigtype/pagina waar de aanvraag vandaan komt.
function segmentLabel(seg) {
  const m = { automotive: "Automotive (auto)", motorfiets: "Motorfiets", marine: "Marine (boot)", home: "Homepage" };
  return m[seg] || seg || "onbekend";
}

// Foto's van de klant: opslaan in Supabase Storage onder een onraadbaar token,
// en de galerij-link als INTERNE notitie op de concept-offerte zetten (Lukas ziet
// 'm in Moneybird; niet aan de klant-offerte gehangen, niet meegestuurd).
async function uploadFotosEnNotitie(fotos, offerteId) {
  if (!Array.isArray(fotos) || !fotos.length) return null;
  const token = crypto.randomUUID();
  let n = 0;
  for (let i = 0; i < Math.min(fotos.length, 10); i++) {
    const m = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(fotos[i] || "");
    if (!m) continue;
    const ext = m[1] === "image/png" ? "png" : m[1] === "image/webp" ? "webp" : "jpg";
    const buf = Buffer.from(m[2], "base64");
    const { error } = await supabaseAdmin.storage.from(FOTO_BUCKET).upload(`${token}/${i}.${ext}`, buf, { contentType: m[1], upsert: true });
    if (!error) n++;
  }
  if (!n) return null;
  const url = `${SITE_URL}/fotos/${token}`;
  if (offerteId && ADMIN && TOKEN) {
    await mb(`estimates/${offerteId}/notes.json`, "POST", { note: { todo: false, note: `Foto's van de klant (${n} stuk${n > 1 ? "s" : ""}): ${url}` } });
  }
  return { token, url, aantal: n };
}

// Mailtje naar Cyriel via Resend (alleen als RESEND_API_KEY is ingesteld).
async function stuurMelding(d, voertuigTekst, offerteNr) {
  const key = process.env.RESEND_API_KEY;
  const naar = process.env.AANVRAAG_MAIL || "info@carbservice.nl";
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

// WhatsApp-melding bij een nieuwe lead, naar het eigen zakelijke nummer via
// CallMeBot (gratis, 1-op-1). Zacht falend: doet niets zonder WHATSAPP_APIKEY.
async function stuurWhatsapp(d, voertuigTekst, offerteUrl) {
  const apikey = process.env.WHATSAPP_APIKEY;
  const nummer = process.env.WHATSAPP_NUMMER || "31653864208";
  if (!apikey) return false;
  const tekst =
    `Dit is een automatisch bericht van Revisio.\n\n` +
    `Er is een nieuwe lead: ${voertuigTekst || "onbekend"}\n` +
    `Van: ${d.voornaam} ${d.achternaam} (${d.telefoon || "-"})` +
    (offerteUrl ? `\n\nConcept-offerte in Moneybird:\n${offerteUrl}` : "");
  try {
    await fetch(`https://api.callmebot.com/whatsapp.php?phone=${nummer}&text=${encodeURIComponent(tekst)}&apikey=${apikey}`);
    return true;
  } catch {
    return false;
  }
}

export async function POST(req) {
  const d = await req.json().catch(() => ({}));
  if (d.website) return json({ ok: true });           // honeypot: bots vullen dit
  if (!d.email || !d.voornaam) return json({ fout: "Naam en e-mail zijn verplicht." }, 400);

  // 1) RDW (alleen met geldig kenteken) + het KENMERK opbouwen voor de offerte.
  // Geen kenteken, of iets dat geen kenteken is (RDW geen match) en geen handmatig
  // merk/model/jaar -> "[Geen kenteken opgegeven]".
  const voertuig = d.kenteken ? await haalVoertuig(d.kenteken) : null;
  let kenmerk;
  if (voertuig) {
    kenmerk = `${voertuig.kenteken} - ${[voertuig.merk, voertuig.model].filter(Boolean).join(" ")}, ${voertuig.bouwjaar}${voertuig.cilinderinhoud ? `, ${voertuig.cilinderinhoud} cc` : ""}`;
  } else if ((d.merk_model_jaar || "").trim()) {
    kenmerk = d.merk_model_jaar.trim();
  } else {
    kenmerk = "[Geen kenteken opgegeven]";
  }
  if (d.carburateur) kenmerk += `, ${d.carburateur}`;

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
      bericht: [d.segment ? `Type: ${d.segment}` : null, kenmerk, d.klachten].filter(Boolean).join(" | ") || null,
      bron,
      segment: d.segment || null,
    }).select("id").single();
    leadId = data ? data.id : null;
  } catch (e) { /* lead-insert mag de rest niet blokkeren */ }

  // 3) Moneybird: contact + concept-offerte.
  let offerteNr = null, offerteId = null, mbFout = null;
  if (ADMIN && TOKEN) {
    const contact = await vindOfMaakContact(d);
    if (contact && contact.id) {
      const est = await maakConceptOfferte(contact.id, kenmerk, d.klachten);
      if (est && est.id) {
        offerteNr = est.estimate_id || null;
        offerteId = String(est.id);
        if (leadId) {
          await supabaseAdmin.from("leads").update({
            offerte_id: offerteId,
            offerte_nummer: offerteNr || "",
            offerte_state: est.state || "draft",
          }).eq("id", leadId);
        }
        // Interne notitie met bron + pagina/voertuigtype (de klacht zelf staat in
        // het eigen Moneybird-veld "Klacht:" onder het kenmerk, niet in de notitie).
        try {
          const aanvraagNotitie = [
            `Bron van deze aanvraag: ${bronLabel(bron, d.tracking)}`,
            d.segment ? `Aangevraagd via: ${segmentLabel(d.segment)}` : null,
          ].filter(Boolean).join("\n");
          await mb(`estimates/${offerteId}/notes.json`, "POST", { note: { todo: false, note: aanvraagNotitie } });
        } catch (e) {}
      } else {
        mbFout = "offerte: " + (est && est._tekst ? est._tekst : "onbekend");
      }
    } else {
      mbFout = "contact niet aangemaakt";
    }
  }

  // 3b) Foto's opslaan + galerij-link als notitie op de concept-offerte (zacht).
  let fotoInfo = null;
  try { fotoInfo = await uploadFotosEnNotitie(d.fotos, offerteId); } catch (e) { /* foto's mogen de aanvraag niet blokkeren */ }

  // 4) Melding (zacht).
  await stuurMelding(d, kenmerk, offerteNr);
  const mbAdmin = process.env.MONEYBIRD_ADMIN;
  const offerteLink = offerteId && mbAdmin ? `https://moneybird.com/${mbAdmin}/estimates/${offerteId}` : null;
  await stuurWhatsapp(d, kenmerk, offerteLink);

  return json({ ok: true, voertuig: kenmerk, offerte: offerteNr, fotos: fotoInfo ? fotoInfo.aantal : 0, mbFout });
}
