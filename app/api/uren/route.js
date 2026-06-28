// app/api/uren/route.js
// Akkorderen van urenregistratie: goedkeuren of afkeuren van ingediende uren.
// Achter de portier (admin only), schrijft met de service-role-sleutel, zodat
// dit niet meer client-side met de anon-sleutel gebeurt. De client stuurt het
// inlogbewijs (Bearer-token) mee; vereisAdmin controleert rol + actief.

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { vereisAdmin } from "@/lib/auth-server";

export async function POST(req) {
  const poort = await vereisAdmin(req);
  if (!poort.ok) return poort.response;

  const body = await req.json().catch(() => ({}));
  const { id, user_id, maand, status } = body;
  if (status !== "goedgekeurd" && status !== "afgekeurd") {
    return Response.json({ fout: "Onbekende status." }, { status: 400 });
  }
  if (!id && !user_id) {
    return Response.json({ fout: "Geen rij of medewerker opgegeven." }, { status: 400 });
  }

  // We akkorderen op naam van de ingelogde beheerder. De naam halen we zelf uit
  // app_gebruikers (niet uit de client), zodat dit veld dezelfde waarde houdt als
  // toen de pagina nog met de display-naam schreef. Alleen ingediende uren worden
  // aangeraakt (net als voorheen client-side).
  const { data: ik } = await supabaseAdmin
    .from("app_gebruikers").select("naam").ilike("email", poort.personeel.email).maybeSingle();
  const door = (ik && ik.naam) || poort.personeel.email;
  const patch = { status, goedgekeurd_op: new Date().toISOString(), goedgekeurd_door: door };
  let q = supabaseAdmin.from("urenregistratie").update(patch).eq("status", "ingediend");
  if (id) q = q.eq("id", id);
  if (user_id) {
    if (!/^\d{4}-\d{2}$/.test(String(maand || ""))) {
      return Response.json({ fout: "Maand ontbreekt of klopt niet." }, { status: 400 });
    }
    const eerste = `${maand}-01`;
    const [j, m] = String(maand).split("-").map(Number);
    const laatste = new Date(j, m, 0).toISOString().slice(0, 10);
    q = q.eq("user_id", user_id).gte("datum", eerste).lte("datum", laatste);
  }
  const { error } = await q;
  if (error) return Response.json({ fout: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
