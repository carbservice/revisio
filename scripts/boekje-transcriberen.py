#!/usr/bin/env python3
# Transcribeert een carburateur-boekje (PDF) met Claude-vision en vertaalt het
# naar NL en ENG. Schrijft 3 tekstbestanden weg ter review; pas daarna gaat het
# (na menselijke controle van de getallen) de database in.
#
# Gebruik: python scripts/boekje-transcriberen.py <pdf> <uitvoermap>
# Vereist: ANTHROPIC_API_KEY in de omgeving, PyMuPDF (fitz).

import base64
import json
import os
import pathlib
import re
import sys
import time
import urllib.request

import fitz

KEY = os.environ["ANTHROPIC_API_KEY"]
MODEL = "claude-sonnet-4-6"
PDF = sys.argv[1] if len(sys.argv) > 1 else "bronnen/boekjes/ZENITH-Vergaser_35-40-INAT.pdf"
UIT = pathlib.Path(sys.argv[2] if len(sys.argv) > 2 else "carbhub/_werk_inat")
UIT.mkdir(parents=True, exist_ok=True)


def claude(blocks, max_tokens=4000):
    body = {"model": MODEL, "max_tokens": max_tokens, "messages": [{"role": "user", "content": blocks}]}
    req = urllib.request.Request(
        "https://api.anthropic.com/v1/messages",
        data=json.dumps(body).encode(),
        headers={"x-api-key": KEY, "anthropic-version": "2023-06-01", "content-type": "application/json"},
        method="POST",
    )
    for poging in range(4):
        try:
            r = json.load(urllib.request.urlopen(req, timeout=240))
            return r["content"][0]["text"]
        except urllib.error.HTTPError as e:
            if e.code == 429:
                time.sleep(5 * (poging + 1)); continue
            raise
    raise RuntimeError("Claude bleef falen")


TRANSCRIBE = (
    "Je transcribeert een pagina uit een Duitse carburateur-servicehandleiding "
    "(ZENITH/SOLEX). Neem ALLE Duitse tekst op deze pagina exact over. Wees "
    "extreem precies met getallen, sproeiermaten, maten en tabellen: neem "
    "tabellen over als nette tekst-tabel, met exact dezelfde cijfers. Verzin "
    "niets; onleesbaar = [onleesbaar]. Geef ALLEEN de Duitse transcriptie, geen "
    "uitleg. Een pure adres-/reclamepagina mag je samenvatten als "
    "'[geen technische inhoud]'."
)


def render(pdf):
    doc = fitz.open(pdf)
    paden = []
    for i, p in enumerate(doc):
        f = UIT / f"_p{i+1:02d}.png"
        p.get_pixmap(dpi=200).save(f)
        paden.append(f)
    return paden


def transcribeer(paden):
    delen = []
    for i, f in enumerate(paden, 1):
        b64 = base64.b64encode(f.read_bytes()).decode()
        blocks = [
            {"type": "image", "source": {"type": "base64", "media_type": "image/png", "data": b64}},
            {"type": "text", "text": TRANSCRIBE},
        ]
        tekst = claude(blocks, max_tokens=4000)
        print(f"  pagina {i}/{len(paden)}: {len(tekst)} tekens")
        delen.append(f"\n\n===== PAGINA {i} =====\n{tekst}")
        time.sleep(1)
    return "".join(delen).strip()


def vertaal(duits, taal):
    # Per pagina vertalen, anders kapt de token-limiet een lang boekje af.
    delen = [p for p in re.split(r"(?=^===== PAGINA )", duits, flags=re.M) if p.strip()]
    uit = []
    for i, d in enumerate(delen, 1):
        prompt = (
            f"Vertaal deze pagina van een Duitse carburateur-handleiding naar het {taal}. "
            "Behoud ALLE getallen, sproeiermaten en tabellen EXACT (vertaal cijfers niet, "
            "alleen de tekst eromheen) en de '===== PAGINA' marker. Geef alleen de vertaling."
            f"\n\n{d}"
        )
        uit.append(claude([{"type": "text", "text": prompt}], max_tokens=4000))
        print(f"  {taal} pagina {i}/{len(delen)}")
        time.sleep(1)
    return "\n\n".join(uit)


print(f"PDF: {PDF}")
paden = render(PDF)
print(f"{len(paden)} pagina's gerenderd. Transcriberen (Duits)...")
duits = transcribeer(paden)
(UIT / "transcriptie-de.txt").write_text(duits, encoding="utf-8")
print(f"Duits: {len(duits)} tekens -> transcriptie-de.txt")

print("Vertalen naar NL...")
nl = vertaal(duits, "Nederlands")
(UIT / "transcriptie-nl.txt").write_text(nl, encoding="utf-8")
print(f"NL: {len(nl)} tekens -> transcriptie-nl.txt")

print("Vertalen naar ENG...")
en = vertaal(duits, "Engels")
(UIT / "transcriptie-en.txt").write_text(en, encoding="utf-8")
print(f"EN: {len(en)} tekens -> transcriptie-en.txt")

# Werk-PNG's opruimen
for f in paden:
    try: f.unlink()
    except OSError: pass
print("Klaar.")
