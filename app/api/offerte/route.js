// app/api/offerte/route.js
// Stuurt door naar de offerte (estimate) in de Moneybird-app, zodat we 'm vanaf
// de kaart met één klik kunnen openen/bewerken. Houdt het administratie-id
// server-side; de werkplaats is in Moneybird ingelogd.

import { vereisBeheer } from "@/lib/auth-server";

const ADMIN = process.env.MONEYBIRD_ADMIN;

export async function GET(req) {
  // Portier: alleen beheer (admin/manager) mag de offertelink ophalen.
  const poort = await vereisBeheer(req);
  if (!poort.ok) return poort.response;
  const klusId = new URL(req.url).searchParams.get("klus_id");
  if (!klusId || !ADMIN) {
    return Response.json({ fout: "Geen klus opgegeven." }, { status: 400 });
  }
  // Geen redirect (een fetch kan een cross-origin redirect niet volgen); we
  // geven de Moneybird-URL terug, de client opent 'm in een nieuw tabblad.
  return Response.json({ url: `https://moneybird.com/${ADMIN}/estimates/${klusId}` });
}
