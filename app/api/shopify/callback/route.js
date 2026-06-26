// Shopify OAuth-callback. Wisselt de code in voor een permanent Admin-API-token
// en toont het zodat het in .env.local gezet kan worden. Eenmalige setup-route.
// app/api/shopify/callback/route.js

export const dynamic = "force-dynamic";
// (deploy-trigger zodat de SHOPIFY_-omgevingsvariabelen actief worden)

function html(body, status = 200) {
  return new Response(
    `<!doctype html><meta charset="utf-8"><body style="font-family:system-ui;max-width:640px;margin:40px auto;padding:0 16px;line-height:1.5">${body}</body>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}

export async function GET(req) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const shop = url.searchParams.get("shop") || process.env.SHOPIFY_STORE;
  const cid = process.env.SHOPIFY_CLIENT_ID;
  const secret = process.env.SHOPIFY_CLIENT_SECRET;
  if (!code) {
    return html(`<h3>Status-check (geen code meegegeven)</h3><ul>
      <li>SHOPIFY_CLIENT_ID: ${cid ? "✅ aanwezig" : "❌ ontbreekt"}</li>
      <li>SHOPIFY_CLIENT_SECRET: ${secret ? "✅ aanwezig" : "❌ ontbreekt"}</li>
      <li>SHOPIFY_STORE: ${process.env.SHOPIFY_STORE ? "✅ aanwezig" : "❌ ontbreekt"}</li></ul>
      <p>Staan deze alle drie op ✅? Dan is de deploy goed; open dan de autorisatie-link.</p>`);
  }
  if (!shop) return html("Ontbrekende <b>shop</b> in de callback.", 400);
  if (!cid || !secret) return html("SHOPIFY_CLIENT_ID / SHOPIFY_CLIENT_SECRET ontbreken in de Vercel-omgeving. Voeg ze toe en redeploy.", 500);

  try {
    const r = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: cid, client_secret: secret, code }),
    });
    const j = await r.json();
    if (!j.access_token) return html("Token-uitwisseling mislukt:<br><pre>" + JSON.stringify(j, null, 2) + "</pre>", 500);
    return html(
      `<h2 style="color:#1a3c2e">Gelukt! Shopify is gekoppeld. 🎉</h2>
       <p>Kopieer dit token naar <code>.env.local</code> als <b>SHOPIFY_ADMIN_TOKEN</b> (en houd het geheim):</p>
       <textarea readonly style="width:100%;height:70px;font-family:monospace;padding:8px" onclick="this.select()">${j.access_token}</textarea>
       <p>Daarna mag je dit tabblad sluiten.</p>`
    );
  } catch (e) {
    return html("Fout bij token-uitwisseling: " + e.message, 500);
  }
}
