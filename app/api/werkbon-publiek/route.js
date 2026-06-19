// app/api/werkbon-publiek/route.js
// Publieke klant-API. Toegang via token (?t=) of via ordernummer + code
// (?nr=&code=). Toont alleen de GEPUBLICEERDE stand: de werkplaats bepaalt
// zelf wanneer een update (en welke foto's) zichtbaar worden voor de klant.

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { REVISIE_DOEL_DAGEN } from "@/app/planning/planning-config";

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

    let q = supabaseAdmin.from("werkbon_links").select("klus_id, nummer, klant, voertuig, klacht, toegangscode");
    if (token) q = q.eq("token", token);
    else if (nr && code) q = q.eq("nummer", nr).ilike("toegangscode", code);
    else return Response.json({ fout: "Vul je ordernummer en code in." }, { status: 400 });

    const { data: link } = await q.maybeSingle();
    if (!link) return Response.json({ fout: "Onbekend ordernummer of code." }, { status: 404 });
    if (!token && (link.toegangscode || "").toLowerCase() !== code.toLowerCase()) {
      return Response.json({ fout: "Onbekend ordernummer of code." }, { status: 404 });
    }

    // Alleen gepubliceerde voortgang en foto's.
    const { data: voortgang } = await supabaseAdmin
      .from("klus_voortgang")
      .select("stap, bericht, gedaan_op")
      .eq("klus_id", link.klus_id)
      .not("gepubliceerd_op", "is", null);
    const { data: fotos } = await supabaseAdmin
      .from("klus_fotos")
      .select("*")
      .eq("klus_id", link.klus_id)
      .not("gepubliceerd_op", "is", null)
      .order("geupload_op");

    // Monteur-naam voor de klant: alleen de VOORNAAM, nooit de tijd. We lezen
    // dezelfde bron als de tijd-string (tijdregels), maar geven uitsluitend de
    // naam terug; valt terug op het werkbon-logspoor als er nog geen tijd is.
    let volledigeNaam = "";
    const { data: tr } = await supabaseAdmin
      .from("tijdregels")
      .select("monteur_naam, aangemaakt_op")
      .eq("klus_id", link.klus_id)
      .not("monteur_naam", "is", null)
      .order("aangemaakt_op")
      .limit(1);
    if (tr && tr[0] && tr[0].monteur_naam) {
      volledigeNaam = tr[0].monteur_naam;
    } else {
      const { data: lg } = await supabaseAdmin
        .from("werkbon_log")
        .select("monteur_naam, gedaan_op")
        .eq("klus_id", link.klus_id)
        .not("monteur_naam", "is", null)
        .order("gedaan_op")
        .limit(1);
      if (lg && lg[0] && lg[0].monteur_naam) volledigeNaam = lg[0].monteur_naam;
    }
    const monteur = (volledigeNaam || "").trim().split(/\s+/)[0] || "";

    const vMap = {};
    (voortgang || []).forEach((v) => { vMap[v.stap] = v; });
    const fByStap = {};
    (fotos || []).forEach((f) => { (fByStap[f.stap] = fByStap[f.stap] || []).push({ url: f.url, rotatie: f.rotatie || 0 }); });

    const stappen = STADIA.filter((s) => vMap[s.stap]).map((s) => ({
      stap: s.stap,
      label: s.label,
      pct: s.pct,
      bericht: vMap[s.stap].bericht || "",
      gedaan_op: vMap[s.stap].gedaan_op || null,
      fotos: fByStap[s.stap] || [],
    }));

    // "Actief stadium = bezig": het hoogst afgevinkte stadium telt als 'hier
    // zijn we nu mee bezig' en nog niet als voltooid. Het percentage telt dus
    // alleen de stadia die daarvoor liggen. Uitzondering: het laatste stadium
    // (100%) betekent juist dat de revisie klaar is.
    let actiefStap = null;
    let pct = 0;
    if (stappen.length) {
      const hoogste = stappen[stappen.length - 1];
      if (hoogste.pct >= 100) {
        pct = 100;
      } else if (hoogste.stap === "ontvangen") {
        // Ontvangst bevestigen (met foto) is een voltooid feit: meteen 20%.
        pct = hoogste.pct;
      } else {
        actiefStap = hoogste.stap;
        pct = stappen.slice(0, -1).reduce((m, s) => Math.max(m, s.pct), 0);
      }
    }
    const stadium = stappen.length ? stappen[stappen.length - 1].label : "";

    // Verwachte einddatum voor de klant: binnenkomst (Ontvangst) + revisie-doel.
    // Alleen zodra de klus binnen is en nog niet klaar.
    const binnenOp = (vMap["ontvangen"] && vMap["ontvangen"].gedaan_op) || null;
    let verwachteEind = null;
    if (binnenOp && pct < 100) {
      const d = new Date(new Date(binnenOp).getTime() + REVISIE_DOEL_DAGEN * 86400000);
      if (Number.isFinite(d.getTime())) verwachteEind = d.toISOString();
    }

    // Laatste klant-akkoord-verzoek (extra kosten). Open => klant moet tekenen;
    // beantwoord => we tonen een bevestiging. We sturen nooit de handtekening terug.
    const { data: akks } = await supabaseAdmin
      .from("klant_akkoord")
      .select("id, omschrijving, bedrag, status, aangemaakt_op, beantwoord_op, voornaam, achternaam")
      .eq("klus_id", link.klus_id)
      .order("aangemaakt_op", { ascending: false })
      .limit(1);
    const akkoordVerzoek = akks && akks[0] ? akks[0] : null;

    return Response.json({
      nummer: link.nummer,
      klant: link.klant,
      voertuig: link.voertuig,
      klacht: link.klacht || "",
      monteur,
      pct,
      actiefStap,
      stadium,
      stappen,
      verwachteEind,
      akkoordVerzoek,
      algemeneFotos: fByStap["algemeen"] || [],
      gepubliceerd: stappen.length > 0 || (fByStap["algemeen"] || []).length > 0,
    });
  } catch (e) {
    return Response.json({ fout: String(e) }, { status: 500 });
  }
}
