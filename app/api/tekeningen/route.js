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
    // Modelcode-tokens uit het type (merk eruit), bv. ZENITH 35/40 INAT -> [35,40,inat].
    const tokens = type.toLowerCase().split(/[\s/&]+/)
      .map((t) => t.replace(/[^a-z0-9]/g, ""))
      .filter((t) => t.length >= 2 && t !== "solex" && t !== "zenith");
    if (!tokens.length) return Response.json({ tekeningen: [] });

    const { data, error } = await supabaseAdmin.storage
      .from("carburateur-blueprints")
      .list("tekeningen", { limit: 1000, sortBy: { column: "name", order: "asc" } });
    if (error) return Response.json({ tekeningen: [] });

    // Van achter naar voren: gebruik het eerste (meest specifieke) token met treffers.
    const alle = data || [];
    let match = [];
    for (const tok of tokens.slice().reverse()) {
      match = alle.filter((f) => f.name && f.name.toLowerCase().includes(tok));
      if (match.length) break;
    }
    const tekeningen = match.map((f) => ({
      naam: f.name.replace(/\.[a-z0-9]+$/i, "").replace(/-/g, " "),
      url: `${SBURL}/storage/v1/object/public/carburateur-blueprints/tekeningen/${encodeURIComponent(f.name)}`,
    }));
    return Response.json({ tekeningen });
  } catch (e) {
    return Response.json({ tekeningen: [], fout: e.message }, { status: 200 });
  }
}
