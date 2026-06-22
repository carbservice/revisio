// app/api/sales/actie/route.js
// Legt een actie op een lead vast (bv. gebeld op datum) in de actie-log.

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { vereisIngelogd } from "@/lib/auth-server";
import { magSales, codeVoorEmail } from "@/app/werkplaats-planning/planning-config";

export async function POST(req) {
  const poort = await vereisIngelogd(req);
  if (!poort.ok) return poort.response;
  if (!magSales(poort.personeel.email)) return Response.json({ fout: "Geen sales-toegang." }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const { lead_id, soort, tekst } = body;
  if (!lead_id) return Response.json({ fout: "Geen lead_id." }, { status: 400 });

  const door = codeVoorEmail(poort.personeel.email) || "";
  const { error } = await supabaseAdmin.from("lead_actie").insert({
    lead_id, soort: soort || "notitie", tekst: tekst || "", door,
  });
  if (error) return Response.json({ fout: error.message }, { status: 500 });
  return Response.json({ ok: true, door });
}
