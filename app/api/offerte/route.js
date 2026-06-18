// app/api/offerte/route.js
// Stuurt door naar de offerte (estimate) in de Moneybird-app, zodat we 'm vanaf
// de kaart met één klik kunnen openen/bewerken. Houdt het administratie-id
// server-side; de werkplaats is in Moneybird ingelogd.

const ADMIN = process.env.MONEYBIRD_ADMIN;

export async function GET(req) {
  const klusId = new URL(req.url).searchParams.get("klus_id");
  if (!klusId || !ADMIN) {
    return new Response("Geen klus opgegeven.", { status: 400, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }
  return Response.redirect(`https://moneybird.com/${ADMIN}/estimates/${klusId}`, 302);
}
