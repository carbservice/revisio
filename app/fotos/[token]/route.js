// Publieke (maar onraadbare) foto-galerij bij een aanvraag. De link hiernaartoe
// staat als interne notitie op de concept-offerte in Moneybird, zodat Lukas de
// klantfoto's kan bekijken zonder login en zonder Gmail-doorsturen.
// De foto's staan in Supabase Storage onder een random token (de mapnaam).

import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

const BUCKET = "aanvraag-fotos";
const SUPA = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");

function pagina(inhoud) {
  return `<!doctype html><html lang="nl"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>Foto's bij de aanvraag</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#f4f6f1;color:#23211c}
  .bar{background:linear-gradient(140deg,#27593f,#1a3c2e);color:#fff;padding:22px 22px}
  .bar .w{max-width:1000px;margin:0 auto}
  .bar h1{font-size:20px;font-weight:700}
  .bar p{color:rgba(255,255,255,.8);font-size:13.5px;margin-top:3px}
  .w{max-width:1000px;margin:0 auto;padding:22px}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px}
  .grid a{display:block;border-radius:12px;overflow:hidden;border:1px solid #e2ded2;background:#fff;box-shadow:0 2px 10px rgba(26,60,46,.06)}
  .grid img{width:100%;height:160px;object-fit:cover;display:block}
  .leeg{background:#fff;border:1px solid #e2ded2;border-radius:14px;padding:34px;text-align:center;color:#6f6c64}
</style></head><body>${inhoud}</body></html>`;
}

export async function GET(_req, ctx) {
  const { token } = await ctx.params;
  // alleen uuid-achtige tokens (geen path-traversal of rare invoer)
  if (!/^[a-f0-9-]{32,40}$/i.test(token || "")) {
    return new Response(pagina(`<div class="w"><div class="leeg">Niet gevonden.</div></div>`), { status: 404, headers: { "Content-Type": "text/html; charset=utf-8" } });
  }
  let bestanden = [];
  try {
    const { data } = await supabaseAdmin.storage.from(BUCKET).list(token, { limit: 100, sortBy: { column: "name", order: "asc" } });
    bestanden = (data || []).filter((f) => f.name && !f.name.startsWith("."));
  } catch (e) { /* leeg laten */ }

  const kop = `<div class="bar"><div class="w"><h1>Foto's bij de aanvraag</h1><p>${bestanden.length} foto${bestanden.length === 1 ? "" : "'s"} &middot; aangeleverd door de klant</p></div></div>`;
  let body;
  if (!bestanden.length) {
    body = `<div class="w"><div class="leeg">Er zijn (nog) geen foto's bij deze aanvraag.</div></div>`;
  } else {
    const items = bestanden.map((f) => {
      const u = `${SUPA}/storage/v1/object/public/${BUCKET}/${encodeURIComponent(token)}/${encodeURIComponent(f.name)}`;
      return `<a href="${u}" target="_blank" rel="noopener"><img src="${u}" loading="lazy" alt="Klantfoto"></a>`;
    }).join("");
    body = `<div class="w"><div class="grid">${items}</div></div>`;
  }
  return new Response(pagina(kop + body), { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } });
}
