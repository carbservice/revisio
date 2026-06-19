// Revisio health-check. app/api/health/route.js
// Pingt de externe diensten waar de app van afhangt en geeft per dienst
// terug of die nu bereikbaar is, plus de responstijd. Server-side, zodat
// tokens veilig blijven en er geen CORS-gedoe is.

const MB_ADMIN = process.env.MONEYBIRD_ADMIN;
const MB_TOKEN = process.env.MONEYBIRD_TOKEN;
const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function metTimeout(url, opts = {}, ms = 6000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal, cache: "no-store" });
  } finally {
    clearTimeout(t);
  }
}

async function check(naam, fn) {
  const start = Date.now();
  try {
    const ok = await fn();
    return { naam, ok: !!ok, ms: Date.now() - start };
  } catch {
    return { naam, ok: false, ms: Date.now() - start };
  }
}

export async function GET() {
  const services = await Promise.all([
    check("Moneybird (cijfers & klussen)", async () => {
      const res = await metTimeout(`https://moneybird.com/api/v2/${MB_ADMIN}/estimates.json?per_page=1`, { headers: { Authorization: `Bearer ${MB_TOKEN}` } });
      return res.ok;
    }),
    check("Supabase (database & login)", async () => {
      const res = await metTimeout(`${SB_URL}/rest/v1/app_gebruikers?select=id&limit=1`, { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` } });
      return res.ok;
    }),
    check("GitHub (code)", async () => {
      const res = await metTimeout("https://api.github.com");
      return res.ok;
    }),
    check("Backblaze B2 (foto-backup)", async () => {
      // Elke respons (ook 401 zonder auth) betekent dat B2 bereikbaar is.
      const res = await metTimeout("https://api.backblazeb2.com/b2api/v3/b2_authorize_account");
      return res.status > 0;
    }),
  ]);

  // Diagnose: is de server-only service-role-sleutel runtime beschikbaar?
  // (alleen ja/nee, nooit de sleutel zelf). Nodig om te checken vóór RLS.
  const serviceRoleActief = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

  return Response.json({ checkedAt: new Date().toISOString(), services, serviceRoleActief });
}
