// Aanvraag-endpoint voor de fotografie-funnel van Rin Hortulanus. app/api/rin/route.js
// Slaat een aanvraag op in de tabel rin_aanvragen. Faalt zacht: het formulier
// toont altijd het bedankt-scherm, ook als de tabel nog niet bestaat.

import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function POST(req) {
  const d = await req.json().catch(() => ({}));
  if (!d.naam || !d.email) return Response.json({ ok: true });
  try {
    await supabaseAdmin.from("rin_aanvragen").insert({
      datum: new Date().toISOString(),
      naam: d.naam,
      email: d.email,
      telefoon: d.telefoon || null,
      type: d.type || null,
      bericht: d.bericht || null,
    });
  } catch (e) {
    /* zacht falen: aanvraag mag nooit een foutmelding bij de bezoeker geven */
  }
  return Response.json({ ok: true });
}
