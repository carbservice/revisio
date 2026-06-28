// app/api/factuur/route.js
// Geeft de verzonden factuur-PDF van een klus terug. De klus is een Moneybird-
// offerte (estimate); de bijbehorende factuur (sales_invoice) matchen we op
// hetzelfde contact + dezelfde referentie (voertuig). Opent inline als PDF, dus
// we kunnen 'm vanaf de kaart koppelen met een simpele link.

import { vereisBeheer } from "@/lib/auth-server";
import { mbRaw as mb } from "@/lib/moneybird";

function bericht(tekst) {
  return new Response(`<!doctype html><meta charset="utf-8"><body style="font-family:system-ui,sans-serif;padding:40px;color:#23211c;background:#f1f7f1"><p style="font-size:17px">${tekst}</p></body>`, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}

export async function GET(req) {
  const poort = await vereisBeheer(req);
  if (!poort.ok) return poort.response;
  try {
    const klusId = new URL(req.url).searchParams.get("klus_id");
    if (!klusId) return bericht("Geen klus opgegeven.");

    const estRes = await mb(`estimates/${klusId}.json`);
    if (!estRes.ok) return bericht("Offerte niet gevonden in Moneybird.");
    const est = await estRes.json();
    const contactId = est.contact_id || (est.contact && est.contact.id);
    const ref = (est.reference || "").trim().toLowerCase();
    if (!contactId) return bericht("Geen contact aan deze klus gekoppeld.");

    const invRes = await mb(`sales_invoices.json?filter=contact_id:${contactId}`);
    const facturen = invRes.ok ? await invRes.json() : [];
    if (!facturen.length) return bericht("Nog geen factuur gevonden voor deze klus.");

    // Match op dezelfde referentie (voertuig); anders de nieuwste factuur.
    let inv = facturen.find((f) => (f.reference || "").trim().toLowerCase() === ref && ref);
    if (!inv) inv = [...facturen].sort((a, b) => (b.invoice_date || b.created_at || "").localeCompare(a.invoice_date || a.created_at || ""))[0];

    // download_pdf stuurt een 302 naar een tijdelijke signed URL; fetch volgt die
    // (de auth-header valt cross-origin weg, de URL is zelf-signed) en geeft de PDF.
    const pdfRes = await mb(`sales_invoices/${inv.id}/download_pdf`);
    if (!pdfRes.ok) return bericht("De factuur-PDF kon niet worden opgehaald.");
    const buf = await pdfRes.arrayBuffer();
    return new Response(buf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="factuur-${inv.invoice_id || klusId}.pdf"`,
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (err) {
    return bericht("Er ging iets mis bij het ophalen van de factuur: " + err.message);
  }
}
