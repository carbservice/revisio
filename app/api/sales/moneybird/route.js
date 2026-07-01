// app/api/sales/moneybird/route.js
// Schrijft de beslissing terug naar de Moneybird-offerte: accepteren of afwijzen.
// Alleen op expliciete (bevestigde) actie vanuit het dashboard. Werkt ook de
// lokale lead bij. Bij een Moneybird-fout: nette melding terug, niets stilletjes.

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { vereisIngelogd } from "@/lib/auth-server";
import { magSales, codeVoorEmail } from "@/app/werkplaats-planning/planning-config";
import { mbRaw, MB_ADMIN as ADMIN, MB_TOKEN as TOKEN } from "@/lib/moneybird";

// dashboard-actie -> (Moneybird-state, lokale lead-status)
const ACTIES = {
  accepted: { state: "accepted", status: "geaccepteerd" },
  declined: { state: "rejected", status: "afgewezen" },
};

export async function POST(req) {
  const poort = await vereisIngelogd(req);
  if (!poort.ok) return poort.response;
  if (!magSales(poort.personeel.email)) return Response.json({ fout: "Geen sales-toegang." }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const { lead_id, actie } = body;
  const map = ACTIES[actie];
  if (!lead_id || !map) return Response.json({ fout: "Onbekende actie." }, { status: 400 });
  if (!ADMIN || !TOKEN) return Response.json({ fout: "Moneybird niet geconfigureerd." }, { status: 500 });

  const { data: lead } = await supabaseAdmin.from("leads").select("id, offerte_id").eq("id", lead_id).single();
  if (!lead || !lead.offerte_id) return Response.json({ fout: "Geen gekoppelde offerte voor deze lead." }, { status: 400 });

  // Moneybird-state wijzigen.
  let mbFout = null, nieuweState = map.state;
  try {
    const res = await mbRaw(`estimates/${lead.offerte_id}/change_state.json`, "PATCH", { state: map.state });
    if (!res.ok) {
      const t = await res.text();
      // Al in deze (of een eind-)staat? Moneybird geeft dan "State is invalid" /
      // "can_not_change_x_to_x". Voor ons = al gebeurd, dus geen fout.
      const alGedaan = res.status === 400 && (t.includes("can_not_change") || t.includes("State is invalid"));
      if (alGedaan) {
        mbFout = null;
      } else if (res.status === 422) {
        mbFout = "Moneybird weigert: de offerte heeft geen geselecteerde regel (zet eerst een regel vast).";
      } else {
        mbFout = `Moneybird gaf ${res.status}. ${t.slice(0, 160)}`;
      }
    }
  } catch (e) {
    mbFout = "Moneybird onbereikbaar: " + e.message;
  }

  // Lokale lead altijd bijwerken naar de beslissing (ook als Moneybird faalt, dan
  // staat de status hier al goed en kan Moneybird met de hand).
  const patch = { status: map.status };
  if (!mbFout) patch.offerte_state = nieuweState;
  await supabaseAdmin.from("leads").update(patch).eq("id", lead_id);
  await supabaseAdmin.from("lead_actie").insert({
    lead_id, soort: "status",
    tekst: mbFout ? `${map.status} (Moneybird mislukt: ${mbFout})` : `${map.status}, ook in Moneybird gezet`,
    door: codeVoorEmail(poort.personeel.email) || "",
  });

  if (mbFout) return Response.json({ ok: false, fout: mbFout, lokaal: true });
  return Response.json({ ok: true });
}
