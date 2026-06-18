// app/api/akkoord/route.js
// De klant legt op /volg zijn akkoord (of afwijzing) vast voor extra kosten.
// Toegang via dezelfde sleutel als het klantportaal (token, of ordernr + code),
// zodat alleen de juiste klant kan tekenen. Bij akkoord/afwijzing krijgt de
// werkplaats (manager + admin) een melding.

import { supabase } from "@/lib/supabase";
import { codeVoorEmail } from "@/app/planning/planning-config";

export async function POST(request) {
  try {
    const body = await request.json();
    const token = (body.token || "").trim();
    const nr = (body.nr || "").trim();
    const code = (body.code || "").trim();
    const akkoordId = body.akkoord_id;
    const akkoord = body.akkoord !== false; // default ja
    const voornaam = (body.voornaam || "").trim();
    const achternaam = (body.achternaam || "").trim();
    const handtekening = body.handtekening || null;

    if (!akkoordId) return Response.json({ fout: "geen akkoord" }, { status: 400 });
    if (akkoord && (!voornaam || !achternaam || !handtekening)) return Response.json({ fout: "Vul je naam in en zet je handtekening." }, { status: 400 });

    // Klant authenticeren via werkbon_links (token of nummer + code).
    let q = supabase.from("werkbon_links").select("klus_id, toegangscode, klant");
    if (token) q = q.eq("token", token);
    else if (nr && code) q = q.eq("nummer", nr).ilike("toegangscode", code);
    else return Response.json({ fout: "Geen geldige toegang." }, { status: 400 });
    const { data: link } = await q.maybeSingle();
    if (!link) return Response.json({ fout: "Onbekend ordernummer of code." }, { status: 404 });
    if (!token && (link.toegangscode || "").toLowerCase() !== code.toLowerCase()) return Response.json({ fout: "Onbekend ordernummer of code." }, { status: 404 });
    const klusId = link.klus_id;

    // Het verzoek moet bij deze klus horen en nog open staan.
    const { data: akk } = await supabase.from("klant_akkoord").select("id, klus_id, status, bedrag, omschrijving").eq("id", akkoordId).maybeSingle();
    if (!akk || akk.klus_id !== klusId) return Response.json({ fout: "Verzoek niet gevonden." }, { status: 404 });
    if (akk.status !== "open") return Response.json({ alBeantwoord: true, status: akk.status });

    const nu = new Date().toISOString();
    const nieuweStatus = akkoord ? "akkoord" : "afgewezen";
    await supabase.from("klant_akkoord").update({
      status: nieuweStatus, voornaam, achternaam,
      handtekening: akkoord ? handtekening : null, beantwoord_op: nu,
    }).eq("id", akkoordId);

    // Werkplaats (manager + admin) op de hoogte stellen.
    const { data: team } = await supabase.from("app_gebruikers").select("email").in("rol", ["manager", "admin"]).eq("actief", true);
    const codes = [...new Set((team || []).map((t) => codeVoorEmail(t.email)).filter(Boolean))];
    const { data: ka } = await supabase.from("kaart").select("id").eq("type", "klus").eq("klus_id", klusId).limit(1);
    const kaartId = ka && ka[0] ? ka[0].id : null;
    const naam = `${voornaam} ${achternaam}`.trim() || link.klant || "De klant";
    const bedragTxt = akk.bedrag ? ` (EUR ${akk.bedrag})` : "";
    const tekst = akkoord
      ? `Klant ${naam} is AKKOORD met de extra kosten${bedragTxt}: ${akk.omschrijving}`
      : `Klant ${naam} is NIET akkoord met de extra kosten: ${akk.omschrijving}`;
    if (codes.length && kaartId) {
      await supabase.from("melding").insert(codes.map((c) => ({ ontvanger: c, kaart_id: kaartId, van: "Klant-akkoord", soort: "activiteit", tekst })));
    }

    return Response.json({ ok: true, status: nieuweStatus });
  } catch (err) {
    return Response.json({ fout: err.message }, { status: 200 });
  }
}
