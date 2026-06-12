// app/api/werkbon-publiek/route.js
// Publieke klant-API. Toegang via token (?t=) of via ordernummer + code
// (?nr=&code=). Toont alleen de GEPUBLICEERDE stand: de werkplaats bepaalt
// zelf wanneer een update (en welke foto's) zichtbaar worden voor de klant.

import { supabase } from "@/lib/supabase";

const STADIA = [
  { stap: "ontvangen", label: "Ontvangen op de werkbank", pct: 20 },
  { stap: "gestart", label: "Demontage", pct: 40 },
  { stap: "voor_ultrasoon", label: "Ultrasoonreiniging", pct: 60 },
  { stap: "na_ultrasoon", label: "Heropbouwen", pct: 80 },
  { stap: "schoon", label: "Klaar en gecontroleerd", pct: 100 },
];

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
    if (!token && (link.toegangscode || "").toLowerCase() !== code.toLowerCase()) {
      return Response.json({ fout: "Onbekend ordernummer of code." }, { status: 404 });
    }

    // Alleen gepubliceerde voortgang en foto's.
    const { data: voortgang } = await supabase
      .from("klus_voortgang")
      .select("stap, bericht, gedaan_op")
      .eq("klus_id", link.klus_id)
      .not("gepubliceerd_op", "is", null);
    const { data: fotos } = await supabase
      .from("klus_fotos")
      .select("stap, url, geupload_op")
      .eq("klus_id", link.klus_id)
      .not("gepubliceerd_op", "is", null)
      .order("geupload_op");

    const vMap = {};
    (voortgang || []).forEach((v) => { vMap[v.stap] = v; });
    const fByStap = {};
    (fotos || []).forEach((f) => { (fByStap[f.stap] = fByStap[f.stap] || []).push(f.url); });

    const stappen = STADIA.filter((s) => vMap[s.stap]).map((s) => ({
      stap: s.stap,
      label: s.label,
      pct: s.pct,
      bericht: vMap[s.stap].bericht || "",
      gedaan_op: vMap[s.stap].gedaan_op || null,
      fotos: fByStap[s.stap] || [],
    }));

    const pct = stappen.reduce((m, s) => Math.max(m, s.pct), 0);
    const stadium = stappen.length ? stappen[stappen.length - 1].label : "";

    return Response.json({
      nummer: link.nummer,
      klant: link.klant,
      voertuig: link.voertuig,
      klacht: link.klacht || "",
      pct,
      stadium,
      stappen,
      algemeneFotos: fByStap["algemeen"] || [],
      gepubliceerd: stappen.length > 0 || (fByStap["algemeen"] || []).length > 0,
    });
  } catch (e) {
    return Response.json({ fout: String(e) }, { status: 500 });
  }
}
