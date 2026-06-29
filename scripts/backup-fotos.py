#!/usr/bin/env python3
# Back-up van de Supabase Storage-buckets (foto's + tekeningen) naar ./foto-backup.
# INCREMENTEEL: downloadt alleen bestanden die nog NIET in Backblaze B2 staan
# (lijst meegegeven via env B2_BESTAAND, gemaakt met 'rclone lsf'), zodat we niet
# elke dag alles opnieuw downloaden -> scheelt Supabase-egress (belangrijk op de
# gratis tier). De GitHub Action kopieert ./foto-backup daarna met 'rclone copy'
# naar B2. Gebruikt de service-role-sleutel (omzeilt RLS) uit de omgeving.

import json
import os
import pathlib
import sys
import urllib.parse
import urllib.request

URL = os.environ["SUPABASE_URL"].rstrip("/")
KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
BUCKETS = ["werkbon-fotos", "carburateur-blueprints", "support-boekjes"]
OUT = pathlib.Path("foto-backup")

# Reeds in B2 aanwezige bestanden (relatief pad "<bucket>/<pad>") om over te slaan.
BESTAAND = set()
_lijstpad = os.environ.get("B2_BESTAAND")
if _lijstpad and os.path.exists(_lijstpad):
    with open(_lijstpad, encoding="utf-8") as f:
        BESTAAND = {r.strip() for r in f if r.strip()}
    print(f"Al in B2: {len(BESTAAND)} bestanden (worden overgeslagen)")


def api_post(path, data):
    req = urllib.request.Request(
        URL + path,
        data=json.dumps(data).encode(),
        headers={"apikey": KEY, "Authorization": f"Bearer {KEY}", "Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)


def lijst(bucket, prefix):
    items, offset = [], 0
    while True:
        batch = api_post(
            f"/storage/v1/object/list/{bucket}",
            {"prefix": prefix, "limit": 1000, "offset": offset, "sortBy": {"column": "name", "order": "asc"}},
        )
        if not batch:
            break
        items.extend(batch)
        if len(batch) < 1000:
            break
        offset += 1000
    return items


def download(bucket, pad, doel):
    req = urllib.request.Request(
        f"{URL}/storage/v1/object/{bucket}/{urllib.parse.quote(pad)}",
        headers={"apikey": KEY, "Authorization": f"Bearer {KEY}"},
    )
    doel.parent.mkdir(parents=True, exist_ok=True)
    with urllib.request.urlopen(req, timeout=120) as r, open(doel, "wb") as f:
        f.write(r.read())


def loop(bucket, prefix=""):
    gezien = gedown = 0
    for it in lijst(bucket, prefix):
        naam = it.get("name")
        if not naam or naam == ".emptyFolderPlaceholder":
            continue
        pad = f"{prefix}{naam}"
        if it.get("id") is None:  # map -> recursie
            g, d = loop(bucket, pad + "/")
            gezien += g
            gedown += d
        else:
            gezien += 1
            rel = f"{bucket}/{pad}"
            if rel in BESTAAND:
                continue  # staat al in B2 -> niet opnieuw downloaden
            try:
                download(bucket, pad, OUT / bucket / pad)
                gedown += 1
            except Exception as e:  # noqa: BLE001
                print(f"  FOUT bij {bucket}/{pad}: {e}", file=sys.stderr)
    return gezien, gedown


totaal_gezien = totaal_down = 0
for b in BUCKETS:
    g, d = loop(b)
    print(f"{b}: {d} nieuw / {g} totaal")
    totaal_gezien += g
    totaal_down += d
print(f"TOTAAL: {totaal_down} nieuw gedownload, {totaal_gezien} bestaan in Supabase")

# 0 nieuwe bestanden is normaal (niks veranderd). Alleen alarmeren als Supabase
# helemaal niets teruggeeft -> dat duidt op een fout (verkeerde sleutel/URL).
if totaal_gezien == 0:
    print("WAARSCHUWING: 0 bestanden in Supabase gevonden (mogelijk een fout)", file=sys.stderr)
    sys.exit(1)
