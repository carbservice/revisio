// Aanvraag-endpoint voor de fotografie-funnel van Rin Hortulanus. app/api/rin/route.js
// 1) Slaat de aanvraag op in tabel rin_aanvragen (zacht falend).
// 2) Mailt de aanvraag naar Rin. LET OP: verstuurt voorlopig via Cyriels gedeelde
//    Gmail-SMTP (GMAIL_USER/GMAIL_APP_PASS), dus de mail gaat vanuit het Revisio-
//    account de deur uit. Tijdelijk, tot Rin een eigen verzendkanaal heeft.
//    Reply-to = de aanvrager, zodat Rin direct kan terugmailen.
//    Alles faalt zacht: de bezoeker ziet altijd het bedankt-scherm.

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import nodemailer from "nodemailer";

export const dynamic = "force-dynamic";

const MAIL_NAAR = process.env.RIN_MAIL_TO || "rindiesel@gmail.com";

export async function POST(req) {
  const d = await req.json().catch(() => ({}));
  if (!d.naam || !d.email) return Response.json({ ok: true });

  // 1) opslaan (zacht falend, ook als de tabel nog niet bestaat)
  try {
    await supabaseAdmin.from("rin_aanvragen").insert({
      datum: new Date().toISOString(),
      naam: d.naam,
      email: d.email,
      telefoon: d.telefoon || null,
      type: d.type || null,
      bericht: d.bericht || null,
    });
  } catch { /* nooit een foutmelding bij de bezoeker */ }

  // 2) mailtje naar Rin (voorlopig via Cyriels gedeelde Gmail-SMTP)
  const user = process.env.GMAIL_USER, pass = process.env.GMAIL_APP_PASS;
  if (user && pass) {
    try {
      const transport = nodemailer.createTransport({ host: "smtp.gmail.com", port: 465, secure: true, auth: { user, pass } });
      const regels = [
        `Naam: ${d.naam}`,
        `E-mail: ${d.email}`,
        d.telefoon ? `Telefoon: ${d.telefoon}` : null,
        d.type ? `Gelegenheid: ${d.type}` : null,
        "",
        d.bericht || "(geen extra bericht)",
      ].filter((x) => x !== null).join("\n");
      await transport.sendMail({
        from: `YourPersonalPaparazzi <${user}>`,
        to: MAIL_NAAR,
        replyTo: d.email,
        subject: "Nieuwe aanvraag · Bruiloft pagina",
        text: `Er is een nieuwe aanvraag binnengekomen:\n\n${regels}\n`,
      });
    } catch { /* mail niet kritiek */ }
  }

  return Response.json({ ok: true });
}
