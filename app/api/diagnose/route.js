// app/api/diagnose/route.js

import { vereisIngelogd } from "@/lib/auth-server";

export async function POST(req) {
  const poort = await vereisIngelogd(req);
  if (!poort.ok) return poort.response;
  try {
    const { klacht, voertuig } = await req.json();
    if (!klacht || !klacht.trim()) {
      return Response.json({ fout: "Geen klacht ingevuld op deze klus." }, { status: 400 });
    }
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) {
      return Response.json({ fout: "ANTHROPIC_API_KEY ontbreekt in .env.local" }, { status: 500 });
    }

    const prompt =
`Je bent een ervaren carburateurspecialist bij Carburateur Service Nederland, een revisiebedrijf voor klassiekers en oldtimers. Een monteur gaat een carburateur reviseren. Hieronder staan de voertuiggegevens (merk, type, bouwjaar, aantal cilinders, carburateurtype) en de klacht van de klant.

Gebruik de voertuiggegevens actief: bouwjaar, type en carburateurtype bepalen mede welke afstellingen en sproeierbezetting logisch zijn voor dit specifieke voertuig. Geef op basis daarvan en de klacht 3 tot 5 concrete aandachtspunten voor deze revisie: waar moet de monteur op letten, wat controleren of meten.

Voertuig: ${voertuig || "onbekend"}
Klacht: ${klacht}

Gebruik waar mogelijk deze werkbon-termen: vlotterhoogte, gasnaald positie, luchtschroef, CO schroef, stationairschroef, vlotter, hoofdsproeier, stationairsproeier, luchtremsproeier, choke sproeier, gasnaald codering, emulsiebuis codering, sproeierbuis codering, vlotterzitting maat.

Antwoord ALLEEN met geldige JSON: een array van 3 tot 5 objecten met de velden "oorzaak" (kort aandachtspunt) en "controleren" (1 zin wat te doen of meten). Geen tekst eromheen, geen markdown, geen codeblok.`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 700,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await res.json();
    if (data.error) {
      return Response.json({ fout: data.error.message || "AI gaf een fout terug." }, { status: 500 });
    }

    const tekst = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n").trim();
    try {
      const schoon = tekst.replace(/```json/gi, "").replace(/```/g, "").trim();
      const punten = JSON.parse(schoon);
      return Response.json({ punten });
    } catch {
      return Response.json({ tekst });
    }
  } catch (e) {
    return Response.json({ fout: String(e) }, { status: 500 });
  }
}