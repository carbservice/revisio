// app/api/tekeningen/route.js
// Geeft de referentietekeningen die bij een carburateurtype horen, gematcht op
// de carb-naam (laatste woord van het type, bv. INAT) tegen de bestandsnamen in
// de map tekeningen/ van de bucket carburateur-blueprints. Achter de portier.

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { vereisIngelogd } from "@/lib/auth-server";

const SBURL = process.env.NEXT_PUBLIC_SUPABASE_URL;

export async function GET(req) {
  const poort = await vereisIngelogd(req);
  if (!poort.ok) return poort.response;
  try {
    const type = new URL(req.url).searchParams.get("type") || "";
    const woorden = type.trim().split(/\s+/);
    const sleutel = (woorden[woorden.length - 1] || "").toLowerCase(); // bv. "inat"
    if (!sleutel) return Response.json({ tekeningen: [] });

    const { data, error } = await supabaseAdmin.storage
      .from("carburateur-blueprints")
      .list("tekeningen", { limit: 1000, sortBy: { column: "name", order: "asc" } });
    if (error) return Response.json({ tekeningen: [] });

    const match = (data || []).filter((f) => f.name && f.name.toLowerCase().includes(sleutel));
    const tekeningen = match.map((f) => ({
      naam: f.name.replace(/\.[a-z0-9]+$/i, "").replace(/-/g, " "),
      url: `${SBURL}/storage/v1/object/public/carburateur-blueprints/tekeningen/${encodeURIComponent(f.name)}`,
    }));
    return Response.json({ tekeningen });
  } catch (e) {
    return Response.json({ tekeningen: [], fout: e.message }, { status: 200 });
  }
}
