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
  try { qr = await QRCode.toDataURL(klusUrl, { margin: 1, width: 520, errorCorrectionLevel: "M" }); } catch { /* zonder QR printen we gewoon de tekst */ }

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Label ${esc(nummer)}</title>
  <style>
    @page { size: 102mm 150mm; margin: 7mm; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; height: 100%; }
    body { font-family: Arial, Helvetica, sans-serif; color: #000; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .wrap { display: flex; flex-direction: column; min-height: 136mm; width: 88mm; }
    .merk { font-size: 13pt; letter-spacing: 6px; font-weight: 800; }
    .line { border-top: 2px solid #000; margin: 3mm 0; }
    .lbl { font-size: 9pt; letter-spacing: 2px; text-transform: uppercase; color: #222; }
    .nr { font-size: 46pt; font-weight: 900; line-height: 0.95; letter-spacing: -1px; }
    .ken { font-size: 16pt; font-weight: 700; margin-top: 5mm; line-height: 1.25; }
    .klant { font-size: 13pt; margin-top: 3mm; }
    .klachtbox { border: 2px solid #000; border-radius: 2mm; padding: 3mm 3.5mm; margin-top: 5mm; }
    .klachtlbl { font-size: 9pt; letter-spacing: 2px; text-transform: uppercase; color: #222; margin-bottom: 1.5mm; }
    .klachttxt { font-size: 13.5pt; font-weight: 600; line-height: 1.3; }
    .bottom { margin-top: auto; }
    .qrrow { display: flex; align-items: center; gap: 6mm; margin-top: 4mm; }
    .qr { width: 44mm; height: 44mm; flex-shrink: 0; }
    .scan { font-size: 13pt; font-weight: 800; line-height: 1.3; }
    .scansub { font-size: 9.5pt; font-weight: 400; color: #222; margin-top: 1.5mm; word-break: break-all; }
  </style></head>
  <body><div class="wrap">
    <div class="merk">R E V I S I O</div>
    <div class="line"></div>
    <div class="lbl">Offertenummer</div>
    <div class="nr">${esc(nummer) || "-"}</div>
    ${kenmerk ? `<div class="ken">${esc(kenmerk)}</div>` : ""}
    ${klant ? `<div class="klant">Klant: ${esc(klant)}</div>` : ""}
    <div class="klachtbox">
      <div class="klachtlbl">Klacht</div>
      <div class="klachttxt">${esc(klacht) || "—"}</div>
    </div>
    <div class="bottom">
      <div class="line"></div>
      <div class="qrrow">
        ${qr ? `<img class="qr" src="${qr}" alt="QR"/>` : ""}
        <div><div class="scan">Scan voor<br/>de werkbon</div></div>
      </div>
    </div>
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
