#!/usr/bin/env python3
# Verwerkt de overige boekjes in een batch: per boekje transcriberen (Duits) +
# vertalen (NL/EN) + opslaan in support_kennis. Idempotent: types die er al in
# staan worden overgeslagen (zo kun je 'm veilig opnieuw draaien).
# Vereist: ANTHROPIC_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, PyMuPDF.

import base64
import json
import os
import pathlib
import re
import time
import urllib.parse
import urllib.request

import fitz

AKEY = os.environ["ANTHROPIC_API_KEY"]
SURL = os.environ["SUPABASE_URL"].rstrip("/")
SKEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
MODEL = "claude-sonnet-4-6"

# Bestandsnaam -> nette type-naam (ZENITH 35/40 INAT is al gedaan, staat er niet in).
TYPES = {
    "SOLEX-DoppelFallstromVergaser_35_35 EEIT.pdf": "SOLEX 35/35 EEIT (2x)",
    "SOLEX-DoppelFallstromVergaser_40-DDH.pdf": "SOLEX 40 DDH (2x)",
    "SOLEX-DoppelRegisterVergaser_4A1.pdf": "SOLEX 4A1",
    "SOLEX-FallstromRegisterVergaser_32_32 u-32_35 TDID.pdf": "SOLEX 32/32 & 32/35 TDID",
    "SOLEX-Fallstromvergaser_31-34 PICT-5 und 31 PIC (T)-5.pdf": "SOLEX 31-34 PICT-5",
    "SOLEX-Fallstromvergaser_35 PDSIT (Audi).pdf": "SOLEX 35 PDSIT",
    "SOLEX-Fallstromvergaser_40 DDH.pdf": "SOLEX 40 DDH",
    "SOLEX-RegisterVergaser_32_32u_32_35-DIDTA.pdf": "SOLEX 32/32 & 32/35 DIDTA",
    "ZENITH-Fallstrom-Registervergaser_2B2 u. 2B3.pdf": "ZENITH 2B2 & 2B3",
    "ZENITH-Stromberg-Vergaser_175 CDET.pdf": "ZENITH 175 CDET",
    "ZENITH-Stromberg-Vergaser_175 CDT.pdf": "ZENITH 175 CDT",
    "ZENITH-Vergaser_35-PDSI_35-PDSIT.pdf": "ZENITH 35 PDSI & PDSIT",
}

TRANS = (
    "Je transcribeert een pagina uit een Duitse carburateur-servicehandleiding "
    "(ZENITH/SOLEX). Neem ALLE Duitse tekst exact over. Wees extreem precies met "
    "getallen, sproeiermaten en tabellen (tabellen als nette tekst-tabel). Verzin "
    "niets; onleesbaar = [onleesbaar]. Geef ALLEEN de Duitse transcriptie. Een pure "
    "adres-/reclamepagina = '[geen technische inhoud]'."
)


def claude(blocks, max_tokens=4000):
    body = {"model": MODEL, "max_tokens": max_tokens, "messages": [{"role": "user", "content": blocks}]}
    req = urllib.request.Request(
        "https://api.anthropic.com/v1/messages",
        data=json.dumps(body).encode(),
        headers={"x-api-key": AKEY, "anthropic-version": "2023-06-01", "content-type": "application/json"},
        method="POST",
    )
    for poging in range(6):
        try:
            return json.load(urllib.request.urlopen(req, timeout=300))["content"][0]["text"]
        except urllib.error.HTTPError as e:
            if e.code in (429, 500, 503, 529):
                time.sleep(6 * (poging + 1)); continue
            raise
    raise RuntimeError("Claude bleef falen")


def transcribeer(pdf):
    doc = fitz.open(pdf)
    delen = []
    for i, p in enumerate(doc, 1):
        png = p.get_pixmap(dpi=200).tobytes("png")
        b64 = base64.b64encode(png).decode()
        t = claude([
            {"type": "image", "source": {"type": "base64", "media_type": "image/png", "data": b64}},
            {"type": "text", "text": TRANS},
        ], 4000)
        delen.append(f"\n\n===== PAGINA {i} =====\n{t}")
        time.sleep(1)
    return "".join(delen).strip()


def vertaal(duits, taal):
    delen = [d for d in re.split(r"(?=^===== PAGINA )", duits, flags=re.M) if d.strip()]
    uit = []
    for d in delen:
        pr = (
            f"Vertaal deze pagina van een Duitse carburateur-handleiding naar het {taal}. "
            "Behoud ALLE getallen/sproeiermaten/tabellen EXACT en de '===== PAGINA' marker. "
            f"Geef alleen de vertaling.\n\n{d}"
        )
        uit.append(claude([{"type": "text", "text": pr}], 4000))
        time.sleep(1)
    return "\n\n".join(uit)


def sb(method, path, data=None):
    h = {"apikey": SKEY, "Authorization": f"Bearer {SKEY}", "Content-Type": "application/json"}
    r = urllib.request.Request(SURL + path, data=(json.dumps(data).encode() if data is not None else None), headers=h, method=method)
    return urllib.request.urlopen(r, timeout=60)


def bestaat(type_):
    q = f"/rest/v1/support_kennis?type=eq.{urllib.parse.quote(type_)}&select=id&limit=1"
    return len(json.load(sb("GET", q))) > 0


def opslaan(type_, bron, de, nl, en):
    sb("DELETE", f"/rest/v1/support_kennis?type=eq.{urllib.parse.quote(type_)}")
    rows = [{"type": type_, "bron": bron, "taal": t, "inhoud": c} for t, c in (("de", de), ("nl", nl), ("en", en))]
    sb("POST", "/rest/v1/support_kennis", rows)


base = pathlib.Path("bronnen/boekjes")
gedaan = 0
for fname, type_ in TYPES.items():
    if bestaat(type_):
        print(f"OVERSLAAN (bestaat al): {type_}", flush=True); continue
    pdf = base / fname
    if not pdf.exists():
        print(f"MIST bestand: {fname}", flush=True); continue
    print(f"START: {type_}  ({fname})", flush=True)
    de = transcribeer(str(pdf)); print(f"  DE {len(de)} tekens", flush=True)
    nl = vertaal(de, "Nederlands"); print(f"  NL {len(nl)} tekens", flush=True)
    en = vertaal(de, "Engels"); print(f"  EN {len(en)} tekens", flush=True)
    opslaan(type_, fname, de, nl, en)
    gedaan += 1
    print(f"  OPGESLAGEN: {type_}", flush=True)
print(f"KLAAR met de batch. {gedaan} boekjes verwerkt.", flush=True)
