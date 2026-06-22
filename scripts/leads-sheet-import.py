#!/usr/bin/env python3
# Laadt de PRE-2026 leads uit de Elfsight-Sheet (CSV-export) in Supabase, met
# bron='onbekend' (de Sheet heeft geen bron/URL voor de oude rijen). De 2026-leads
# staan al geladen uit Gmail (mét bron), die raken we niet. Idempotent (upsert).
# Datum staat door de kolom-shift bij oude rijen in kolom 11, bij nieuwe in 12.

import json, base64, csv, io, re, pathlib, urllib.request, urllib.error

ROOT = pathlib.Path(r"c:\Users\cyrie\Documents\Revisio Project")
ENV = ROOT / "revisio" / ".env.local"
DL = pathlib.Path(r"C:\Users\cyrie\.claude\projects\c--Users-cyrie-Documents-Revisio-Project\9d0caae3-9847-4d27-8559-5272f2516712\tool-results\mcp-claude_ai_Google_Drive-download_file_content-1782147399211.txt")

def lees_env(p):
    d = {}
    for r in p.read_text(encoding="utf-8").splitlines():
        r = r.strip()
        if r and not r.startswith("#") and "=" in r:
            k, v = r.split("=", 1); d[k.strip()] = v.strip().strip('"').strip("'")
    return d

env = lees_env(ENV)
URL = env["NEXT_PUBLIC_SUPABASE_URL"].rstrip("/"); KEY = env["SUPABASE_SERVICE_ROLE_KEY"]

dl = json.loads(DL.read_text(encoding="utf-8"))
rows = list(csv.reader(io.StringIO(base64.b64decode(dl["content"]).decode("utf-8", "replace"))))
# vaste kolom-indexen
C = {"bedrijf": 0, "voornaam": 3, "achternaam": 4, "telefoon": 5, "email": 6, "carburateur": 7, "bericht": 9}
DATUMRE = re.compile(r"20\d\d-\d\d-\d\d[ T]\d\d:\d\d:\d\d")

def datum_van(r):
    for i in (11, 12, 10):
        if len(r) > i and DATUMRE.match((r[i] or "").strip()):
            return (r[i] or "").strip().replace(" ", "T")
    return None

records, gezien = [], set()
for r in rows[1:]:
    if len(r) <= C["email"]: continue
    email = (r[C["email"]] or "").strip()
    if "@" not in email or email.lower() == "cyrielgaemers@gmail.com": continue
    d = datum_van(r)
    if not d or d >= "2026-01-01": continue   # alleen pre-2026 (2026 staat al uit Gmail)
    sleutel = (email.lower(), d[:16])
    if sleutel in gezien: continue
    gezien.add(sleutel)
    naam = " ".join(x for x in [r[C["voornaam"]], r[C["achternaam"]]] if len(r) > C["achternaam"] and x).strip()
    records.append({
        "datum": d, "email": email, "naam": naam or None,
        "bedrijf": (r[C["bedrijf"]] or None) if len(r) > C["bedrijf"] else None,
        "telefoon": (r[C["telefoon"]] or None) if len(r) > C["telefoon"] else None,
        "carburateur": (r[C["carburateur"]] or None) if len(r) > C["carburateur"] else None,
        "bericht": (r[C["bericht"]] or None) if len(r) > C["bericht"] else None,
        "bron": "onbekend",
    })

print(f"pre-2026 records te laden: {len(records)}")

def post(batch):
    req = urllib.request.Request(f"{URL}/rest/v1/leads?on_conflict=email,datum", data=json.dumps(batch).encode(), method="POST",
        headers={"apikey": KEY, "Authorization": f"Bearer {KEY}", "Content-Type": "application/json", "Prefer": "resolution=merge-duplicates,return=minimal"})
    with urllib.request.urlopen(req) as r: return r.status

geladen = 0
for i in range(0, len(records), 100):
    b = records[i:i+100]
    try: post(b); geladen += len(b)
    except urllib.error.HTTPError as e: print("FOUT:", e.code, e.read().decode()[:300]); break
print(f"geladen/geupsert: {geladen}")
