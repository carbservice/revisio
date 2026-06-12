// app/api/werkbon-publiek/route.js
// Publieke klant-API. Toegang via token (?t=) of via ordernummer + code
// (?nr=&code=). Toont alleen de GEPUBLICEERDE stand: de werkplaats bepaalt
// zelf wanneer een update zichtbaar wordt voor de klant.

import { supabase } from "@/lib/supabase";

const STADIA_PCT = { ontvangen: 20, gestart: 40, voor_ultrasoon: 60, na_ultrasoon: 80, schoon: 100 };
const STADIA_LABEL = { ontvangen: "Ontvangen op de werkbank", gestart: "Demontage", voor_ultrasoon: "Ultrasoonreiniging", na_ultrasoon: "Heropbouwen", schoon: "Klaar en gecontroleerd" };

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const token = (searchParams.get("t") || "").trim();
    const nr = (searchParams.get("nr") || "").trim();
    const code = (searchParams.get("code") || "").trim();

    let q = supabase.from("werkbon_links").select("klus_id, nummer, klant, voertuig, klacht, toegangscode");
    if (token) q = q.eq("token", token);
    else if (nr && code) q = q.eq("nummer", nr).ilike("toegangscode", code);
    else return Response.json({ fout: "Vul je ordernummer en code in." }, { status: 400 });

    const { data: link } = await q.maybeSingle();
    if (!link) return Response.json({ fout: "Onbekend ordernummer of code." }, { status: 404 });
    // Bij ordernummer + code: exacte (case-ongevoelige) controle op de code.
    if (!token && (link.toegangscode || "").toLowerCase() !== code.toLowerCase()) {
      return Response.json({ fout: "Onbekend ordernummer of code." }, { status: 404 });
    }

    // Alleen gepubliceerde stadia tellen mee voor de voortgang.
    const { data: voortgang } = await supabase
      .from("klus_voortgang")
      .select("stap, bericht, gedaan_op, gepubliceerd_op")
      .eq("klus_id", link.klus_id)
      .not("gepubliceerd_op", "is", null);

    const stappen = voortgang || [];
    let pct = 0, stadium = "";
    stappen.forEach((v) => {
      const p = STADIA_PCT[v.stap] || 0;
      if (p >= pct) { pct = p; stadium = STADIA_LABEL[v.stap] || ""; }
    });

    return Response.json({
      nummer: link.nummer,
      klant: link.klant,
      voertuig: link.voertuig,
      klacht: link.klacht || "",
      pct,
      stadium,
      gepubliceerd: stappen.length > 0,
    });
  } catch (e) {
    return Response.json({ fout: String(e) }, { status: 500 });
  }
}
