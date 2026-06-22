// app/api/sales/lead/route.js
// Werkt een lead bij in de sales-pijplijn (status, eigenaar, notitie).

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { vereisIngelogd } from "@/lib/auth-server";
import { magSales } from "@/app/werkplaats-planning/planning-config";

export async function PATCH(req) {
  const poort = await vereisIngelogd(req);
  if (!poort.ok) return poort.response;
  if (!magSales(poort.personeel.email)) return Response.json({ fout: "Geen sales-toegang." }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const { id, status, eigenaar, sales_notitie } = body;
  if (!id) return Response.json({ fout: "Geen id." }, { status: 400 });

  const patch = {};
  if (status !== undefined) patch.status = status;
  if (eigenaar !== undefined) patch.eigenaar = eigenaar || null;
  if (sales_notitie !== undefined) patch.sales_notitie = sales_notitie;
  if (!Object.keys(patch).length) return Response.json({ ok: true });

  const { error } = await supabaseAdmin.from("leads").update(patch).eq("id", id);
  if (error) return Response.json({ fout: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
