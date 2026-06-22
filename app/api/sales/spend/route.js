// app/api/sales/spend/route.js
// Advertentie-spend per maand per kanaal opslaan (handmatige invoer).

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { vereisIngelogd } from "@/lib/auth-server";
import { magSales } from "@/app/werkplaats-planning/planning-config";

export async function POST(req) {
  const poort = await vereisIngelogd(req);
  if (!poort.ok) return poort.response;
  if (!magSales(poort.personeel.email)) return Response.json({ fout: "Geen sales-toegang." }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const { maand, kanaal, bedrag } = body; // maand = "2026-06-01"
  if (!maand || !kanaal) return Response.json({ fout: "Maand en kanaal vereist." }, { status: 400 });

  const { error } = await supabaseAdmin
    .from("ad_spend")
    .upsert({ maand, kanaal, bedrag: Number(bedrag) || 0 }, { onConflict: "maand,kanaal" });
  if (error) return Response.json({ fout: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
