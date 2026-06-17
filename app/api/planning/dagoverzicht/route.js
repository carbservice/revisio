// app/api/planning/dagoverzicht/route.js
// Stuurt elk kaartlid een einde-dag opsomming van wat er op zijn kaarten
// gebeurde. Wordt om 18:00 aangetikt door een GitHub Action. Beveiligd met
// een geheime header, zodat niemand anders dit kan afvuren.
//
// Testen zonder te mailen: voeg ?dry=1 toe, dan krijg je een JSON-voorbeeld.
// Mailen vereist de env-variabelen GMAIL_USER, GMAIL_APP_PASS (en CRON_SECRET).

import nodemailer from "nodemailer";
import { TEAM } from "@/app/planning/planning-config";
import { bouwDigest } from "@/app/planning/dagoverzicht-lib";

const SITE = "https://revisio-umber.vercel.app";

function dverdag() {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;
}

function tijd(iso) {
  const d = new Date(iso);
  return Number.isFinite(d.getTime()) ? d.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" }) : "";
}

// Eenvoudige platte-tekst body (nette template komt later).
function bouwBody(naam, kaarten) {
  const blokken = kaarten.map((k) => {
    const regels = k.regels.map((r) =>
      r.soort === "log" ? `  - ${tijd(r.tijdstip)}  ${r.auteur} ${r.tekst}` : `  - ${tijd(r.tijdstip)}  ${r.auteur}: ${r.tekst}`
    ).join("\n");
    return `== ${k.titel} ==\n${regels}\n  ${SITE}/planning/${k.kaart_id}`;
  }).join("\n\n");
  return `Hoi ${naam},\n\nDit is je Revisio-dagoverzicht. Sinds gisteren gebeurde dit op jouw kaarten:\n\n${blokken}\n\nNaar het bord: ${SITE}/planning\n\n(Automatisch verstuurd om 18:00.)`;
}

export async function POST(request) {
  try {
    const url = new URL(request.url);
    const dry = url.searchParams.get("dry") === "1";

    const secret = process.env.CRON_SECRET;
    const user = process.env.GMAIL_USER;
    const pass = process.env.GMAIL_APP_PASS;
    const kanMailen = Boolean(user && pass);

    // Beveiliging: als er een echte mail uit moet, moet het geheim kloppen.
    if (!dry && secret && request.headers.get("x-cron-secret") !== secret) {
      return Response.json({ fout: "geen toegang" }, { status: 401 });
    }

    // Sinds 24 uur (tijdzone-robuust voor een dagelijkse 18:00-mail).
    const sinds = new Date(Date.now() - 24 * 3600 * 1000).toISOString();

    const resultaten = [];
    for (const lid of TEAM) {
      const kaarten = await bouwDigest(lid.code, sinds);
      if (kaarten.length === 0) continue;
      const updates = kaarten.reduce((n, k) => n + k.regels.length, 0);
      resultaten.push({ code: lid.code, naam: lid.naam, email: lid.email, kaarten: kaarten.length, updates, body: bouwBody(lid.naam, kaarten) });
    }

    // Droogdraaien of geen mail-config: alleen het voorbeeld teruggeven.
    if (dry || !kanMailen) {
      return Response.json({ dry: true, kanMailen, ontvangers: resultaten.map(({ code, naam, email, kaarten, updates }) => ({ code, naam, email, kaarten, updates })), voorbeeld: resultaten[0]?.body || null });
    }

    const transport = nodemailer.createTransport({ host: "smtp.gmail.com", port: 465, secure: true, auth: { user, pass } });
    let verstuurd = 0;
    for (const r of resultaten) {
      await transport.sendMail({ from: `Revisio <${user}>`, to: r.email, subject: `Revisio dagoverzicht - ${dverdag()}`, text: r.body });
      verstuurd++;
    }
    return Response.json({ verstuurd, ontvangers: resultaten.length });
  } catch (err) {
    return Response.json({ fout: err.message }, { status: 200 });
  }
}
