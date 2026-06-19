// app/api/boekje/route.js
// Geeft een tijdelijke, beveiligde link (signed URL) naar een boekje-PDF in de
// prive bucket support-boekjes. Achter de portier (ingelogd personeel).

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { vereisIngelogd } from "@/lib/auth-server";

export async function GET(req) {
  const poort = await vereisIngelogd(req);
  if (!poort.ok) return poort.response;
  const bron = new URL(req.url).searchParams.get("bron");
  if (!bron) return Response.json({ fout: "Geen bron opgegeven." }, { status: 400 });
  const { data, error } = await supabaseAdmin.storage.from("support-boekjes").createSignedUrl(bron, 3600);
  if (error || !data) return Response.json({ fout: "Handleiding niet gevonden." }, { status: 404 });
  return Response.json({ url: data.signedUrl });
}
