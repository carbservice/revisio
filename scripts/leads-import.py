#!/usr/bin/env python3
# Laadt de uit Gmail geextraheerde leads in de Supabase-tabel `leads`.
# Idempotent: upsert op (email, datum), dus opnieuw draaien geeft geen dubbele.
# Leest Supabase-sleutels uit revisio/.env.local. Sluit de eigen test-aanvraag uit.
# Gebruik: python scripts/leads-import.py [bestand1.json bestand2.json ...]
#   zonder argument laadt 'ie beide standaardbestanden als ze bestaan.

import json, os, sys, pathlib, urllib.request, urllib.error

ROOT = pathlib.Path(r"c:\Users\cyrie\Documents\Revisio Project")
ENV = ROOT / "revisio" / ".env.local"
STANDAARD = [ROOT / "_leads-2026-jan-apr.json", ROOT / "_leads-mei-juni.json"]
UITSLUITEN = {"cyrielgaemers@gmail.com"}  # eigen test-aanvragen

def lees_env(p):
    d = {}
    for r in p.read_text(encoding="utf-8").splitlines():
        r = r.strip()
        if r and not r.startswith("#") and "=" in r:
            k, v = r.split("=", 1)
            d[k.strip()] = v.strip().strip('"').strip("'")
    return d

env = lees_env(ENV)
URL = env["NEXT_PUBLIC_SUPABASE_URL"].rstrip("/")
KEY = env["SUPABASE_SERVICE_ROLE_KEY"]

bestanden = [pathlib.Path(a) for a in sys.argv[1:]] or [p for p in STANDAARD if p.exists()]
rows = []
for b in bestanden:
    if not b.exists():
        print(f"overslaan (niet gevonden): {b}"); continue
    data = json.loads(b.read_text(encoding="utf-8"))
    for L in data:
        email = (L.get("email") or "").strip()
        if not email or email.lower() in UITSLUITEN:
            continue
        naam = " ".join(x for x in [L.get("voornaam"), L.get("achternaam")] if x).strip()
        rows.append({
            "datum": L.get("datum"),
            "email": email,
            "naam": naam or None,
            "bedrijf": L.get("bedrijf") or None,
            "telefoon": L.get("telefoon") or None,
            "carburateur": L.get("carburateur") or None,
            "bericht": L.get("bericht") or None,
            "landing_url": L.get("landing_url") or None,
            "bron": L.get("bron") or "organisch",
        })
    print(f"gelezen: {b.name} ({len(data)} records)")

print(f"te laden (na filter): {len(rows)}")

def post(batch):
    body = json.dumps(batch).encode("utf-8")
    req = urllib.request.Request(
        f"{URL}/rest/v1/leads?on_conflict=email,datum",
        data=body, method="POST",
        headers={
            "apikey": KEY, "Authorization": f"Bearer {KEY}",
            "Content-Type": "application/json",
            "Prefer": "resolution=merge-duplicates,return=minimal",
        },
    )
    with urllib.request.urlopen(req) as r:
        return r.status

geladen = 0
for i in range(0, len(rows), 100):
    batch = rows[i:i+100]
    try:
        post(batch); geladen += len(batch)
    except urllib.error.HTTPError as e:
        print("FOUT:", e.code, e.read().decode("utf-8")[:300]); break
print(f"geladen/geupsert: {geladen}")
