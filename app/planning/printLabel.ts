"use client";

// Print een intern label (102 x 150 mm thermisch verzendlabel) met groot
// offertenummer, kenmerk en klacht, plus een QR-code die naar de werkbon van
// die klus leidt. QR wordt client-side gegenereerd (geen externe dienst).

import QRCode from "qrcode";

function esc(s: string): string {
  return (s || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));
}

export async function printKlusLabel(opts: { nummer: string; kenmerk: string; klacht: string; klant: string; klusUrl: string }) {
  const { nummer, kenmerk, klacht, klant, klusUrl } = opts;
  let qr = "";
  try { qr = await QRCode.toDataURL(klusUrl, { margin: 1, width: 460, errorCorrectionLevel: "M" }); } catch { /* zonder QR printen we gewoon de tekst */ }

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Label ${esc(nummer)}</title>
  <style>
    @page { size: 102mm 150mm; margin: 6mm; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    body { font-family: Arial, Helvetica, sans-serif; color: #000; }
    .wrap { width: 90mm; }
    .merk { font-size: 11pt; letter-spacing: 4px; font-weight: 800; }
    hr { border: none; border-top: 2px solid #000; margin: 2.5mm 0 3mm; }
    .lbl { font-size: 9pt; letter-spacing: 2px; text-transform: uppercase; color: #333; }
    .nr { font-size: 38pt; font-weight: 900; line-height: 1; margin-top: 1mm; }
    .ken { font-size: 15pt; font-weight: 700; margin-top: 4mm; line-height: 1.2; }
    .klant { font-size: 12pt; margin-top: 3mm; }
    .klacht { font-size: 12pt; margin-top: 3mm; line-height: 1.3; }
    .qrrow { margin-top: 7mm; display: flex; align-items: center; gap: 5mm; }
    .qr { width: 38mm; height: 38mm; }
    .scan { font-size: 10.5pt; font-weight: 700; line-height: 1.3; }
  </style></head>
  <body><div class="wrap">
    <div class="merk">REVISIO</div>
    <hr/>
    <div class="lbl">Offertenummer</div>
    <div class="nr">${esc(nummer) || "-"}</div>
    ${kenmerk ? `<div class="ken">${esc(kenmerk)}</div>` : ""}
    ${klant ? `<div class="klant">Klant: ${esc(klant)}</div>` : ""}
    ${klacht ? `<div class="klacht"><b>Klacht:</b> ${esc(klacht)}</div>` : ""}
    <div class="qrrow">${qr ? `<img class="qr" src="${qr}" alt="QR"/>` : ""}<div class="scan">Scan voor<br/>de werkbon</div></div>
  </div></body></html>`;

  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
  document.body.appendChild(iframe);
  const doc = iframe.contentWindow?.document;
  if (!doc) { document.body.removeChild(iframe); return; }
  doc.open(); doc.write(html); doc.close();
  // Geef de QR (data-URL) even tijd om te renderen, dan printen.
  setTimeout(() => {
    try { iframe.contentWindow?.focus(); iframe.contentWindow?.print(); } catch { /* niets */ }
    setTimeout(() => { try { document.body.removeChild(iframe); } catch { /* al weg */ } }, 1500);
  }, 350);
}
