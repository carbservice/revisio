// app/api/sales/actie/route.js
// Legt een actie op een lead vast (gebeld / notitie) in de actie-log, en schiet
// 'm als notitie naar de gekoppelde Moneybird-offerte. Archief-leads krijgen
// GEEN Moneybird-actie.

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { vereisIngelogd } from "@/lib/auth-server";
import { magSales, codeVoorEmail } from "@/app/werkplaats-planning/planning-config";
import { mbRaw, MB_ADMIN as ADMIN, MB_TOKEN as TOKEN } from "@/lib/moneybird";

async function moneybirdNotitie(offerteId, tekst) {
  if (!ADMIN || !TOKEN || !offerteId) return false;
  try {
    const res = await mbRaw(`estimates/${offerteId}/notes.json`, "POST", { note: { todo: false, note: tekst } });
    return res.ok;
  } catch { return false; }
}

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

  // Naar de Moneybird-offerte (niet voor archief-leads).
  let naarMoneybird = false;
  const { data: lead } = await supabaseAdmin.from("leads").select("offerte_id, archief").eq("id", lead_id).single();
  if (lead && lead.offerte_id && !lead.archief && soort !== "geaccepteerd") {
    const regel = (soort === "gebeld")
      ? `Gebeld${door ? ` door ${door}` : ""}${tekst ? `: ${tekst}` : ""} (via Revisio)`
      : (soort === "niet opgenomen")
      ? `Niet opgenomen${door ? ` door ${door}` : ""} (via Revisio)`
      : `Revisio notitie${door ? ` (${door})` : ""}: ${tekst || ""}`;
    naarMoneybird = await moneybirdNotitie(lead.offerte_id, regel);
  }
  return Response.json({ ok: true, door, naarMoneybird });
}
