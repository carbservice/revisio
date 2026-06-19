#!/usr/bin/env python3
# Back-up van de Supabase Storage-buckets (foto's + tekeningen).
# Loopt recursief door de mappen, downloadt elk bestand en zet het in
# ./foto-backup/<bucket>/<pad>. De GitHub Action bewaart die map als artifact.
# Gebruikt de service-role-sleutel (omzeilt RLS) uit de omgeving.

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
    aantal = 0
    for it in lijst(bucket, prefix):
        naam = it.get("name")
        if not naam or naam == ".emptyFolderPlaceholder":
            continue
        pad = f"{prefix}{naam}"
        if it.get("id") is None:  # map -> recursie
            aantal += loop(bucket, pad + "/")
        else:
            try:
                download(bucket, pad, OUT / bucket / pad)
                aantal += 1
            except Exception as e:  # noqa: BLE001
                print(f"  FOUT bij {bucket}/{pad}: {e}", file=sys.stderr)
    return aantal


totaal = 0
for b in BUCKETS:
    n = loop(b)
    print(f"{b}: {n} bestanden")
    totaal += n
print(f"TOTAAL: {totaal} bestanden")
if totaal == 0:
    print("WAARSCHUWING: 0 bestanden gedownload (klopt dat?)", file=sys.stderr)
    sys.exit(1)
