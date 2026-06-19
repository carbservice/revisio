// app/api/support/route.js
// Support-chat: beantwoordt vragen over een carburateurtype, UITSLUITEND op
// basis van de getranscribeerde servicehandleiding (support_kennis). Achter de
// portier (ingelogd personeel). De Anthropic-key blijft server-side.

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { vereisIngelogd } from "@/lib/auth-server";

const KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = "claude-sonnet-4-6";

export async function POST(req) {
  const poort = await vereisIngelogd(req);
  if (!poort.ok) return poort.response;
  try {
    const { type, taal = "nl", vraag, history = [] } = await req.json();
    if (!type || !vraag || !vraag.trim()) {
      return Response.json({ fout: "Type en vraag zijn verplicht." }, { status: 400 });
    }

    const { data } = await supabaseAdmin
      .from("support_kennis")
      .select("inhoud, bron")
      .eq("type", type)
      .eq("taal", taal)
      .limit(1);
    const kennis = data && data[0];
    if (!kennis) return Response.json({ fout: "Geen handleiding gevonden voor dit type/taal." }, { status: 404 });

    const taalNaam = taal === "en" ? "English" : taal === "de" ? "German" : "Dutch";
    const systeem =
      `Je bent de carburateur-support-assistent van Carburateur Service Nederland. ` +
      `Je beantwoordt vragen over de ${type} UITSLUITEND op basis van de meegegeven ` +
      `servicehandleiding hieronder. Antwoord in het ${taalNaam}. Regels: gebruik alleen ` +
      `informatie uit de handleiding; staat iets er niet in, zeg dat dan eerlijk en verzin ` +
      `NOOIT getallen, sproeiermaten, maten of specs. Wees praktisch en bondig, je praat ` +
      `met een ervaren monteur. Verwijs waar nuttig naar het onderdeel/de fase uit de tekst. ` +
      `Als het antwoord afhangt van de uitvoering, het bouwjaar, de motor of enkel-/dubbelvergasser, ` +
      `stel dan EERST een korte, gerichte tegenvraag (bv. "welk bouwjaar?", "welke uitvoering?", ` +
      `"enkel- of dubbelvergasser?") om de monteur te sturen, voordat je een definitief antwoord geeft. ` +
      `Gebruik GEEN lange streep (—) in je antwoord; gebruik een dubbele punt, komma of haakjes.` +
      `\n\n=== SERVICEHANDLEIDING ${type} (bron: ${kennis.bron}) ===\n${kennis.inhoud}`;

    const messages = [
      ...(Array.isArray(history) ? history : [])
        .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
        .slice(-10)
        .map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: vraag },
    ];

    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: MODEL, max_tokens: 1500, system: systeem, messages }),
    });
    if (!r.ok) {
      const t = await r.text();
      return Response.json({ fout: "AI-fout: " + t.slice(0, 200) }, { status: 200 });
    }
    const j = await r.json();
    const antwoord = (j.content && j.content[0] && j.content[0].text) || "Geen antwoord ontvangen.";
    // Kostenraming uit de token-usage (Sonnet: $3/M in, $15/M uit).
    const u = j.usage || {};
    const inT = u.input_tokens || 0;
    const outT = u.output_tokens || 0;
    const kostenUsd = (inT / 1e6) * 3 + (outT / 1e6) * 15;

    // Kosten loggen + maand-totaal (overleeft verversen).
    let maandUsd = kostenUsd;
    try {
      await supabaseAdmin.from("ai_kosten").insert({ route: "support", kosten_usd: kostenUsd, tokens_in: inT, tokens_uit: outT });
      const start = new Date(); start.setUTCDate(1); start.setUTCHours(0, 0, 0, 0);
      const { data: rows } = await supabaseAdmin.from("ai_kosten").select("kosten_usd").gte("aangemaakt_op", start.toISOString());
      maandUsd = (rows || []).reduce((s, r) => s + Number(r.kosten_usd || 0), 0);
    } catch { /* tellen is niet kritiek */ }

    return Response.json({ antwoord, kostenUsd, maandUsd, tokens: { in: inT, uit: outT } });
  } catch (e) {
    return Response.json({ fout: e.message }, { status: 200 });
  }
}
