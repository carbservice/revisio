// app/api/werkbon-publiek/route.js

import { supabase } from "@/lib/supabase";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("t");
    if (!token) return Response.json({ fout: "Geen geldige code." }, { status: 400 });

    const { data: link } = await supabase
      .from("werkbon_links")
      .select("klus_id, nummer, klant, voertuig")
      .eq("token", token)
      .maybeSingle();
    if (!link) return Response.json({ fout: "Deze link is niet bekend." }, { status: 404 });

    const klusId = link.klus_id;
    const { data: voortgang } = await supabase.from("klus_voortgang").select("stap, bericht, gedaan_op").eq("klus_id", klusId);
    const { data: fotos } = await supabase.from("klus_fotos").select("stap, url, geupload_op").eq("klus_id", klusId).order("geupload_op");
    const { data: meting } = await supabase.from("werkbon_meting").select("moment, veld_type, label, positie, waarde").eq("klus_id", klusId);
    const { data: checklist } = await supabase.from("werkbon_checklist").select("check_naam, status").eq("klus_id", klusId);

    return Response.json({
      nummer: link.nummer, klant: link.klant, voertuig: link.voertuig,
      voortgang: voortgang || [], fotos: fotos || [],
      meting: meting || [], checklist: checklist || [],
    });
  } catch (e) {
    return Response.json({ fout: String(e) }, { status: 500 });
  }
}