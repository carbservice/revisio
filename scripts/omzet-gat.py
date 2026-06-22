#!/usr/bin/env python3
# ALLEEN-LEZEN gat-analyse: van de mei-2026 Moneybird-facturen, hoeveel omzet is
# herleidbaar naar een lead in onze leads-tabel (e-mail-match) en hoeveel niet
# (telefoon/herhaal/webshop/B2B of e-mail-mismatch)?

import json, time, pathlib, urllib.parse, urllib.request, urllib.error

ROOT = pathlib.Path(r"c:\Users\cyrie\Documents\Revisio Project")
ENV = ROOT / "revisio" / ".env.local"
MAAND = "2026-05"

def lees_env(p):
    d = {}
    for r in p.read_text(encoding="utf-8").splitlines():
        r = r.strip()
        if r and not r.startswith("#") and "=" in r:
            k, v = r.split("=", 1); d[k.strip()] = v.strip().strip('"').strip("'")
    return d

env = lees_env(ENV)
SURL = env["NEXT_PUBLIC_SUPABASE_URL"].rstrip("/"); SKEY = env["SUPABASE_SERVICE_ROLE_KEY"]
MB = f"https://moneybird.com/api/v2/{env['MONEYBIRD_ADMIN']}"; MBT = env["MONEYBIRD_TOKEN"]

def mb(path):
    for _ in range(4):
        req = urllib.request.Request(f"{MB}/{path}", headers={"Authorization": f"Bearer {MBT}"})
        try:
            with urllib.request.urlopen(req) as r: return json.loads(r.read().decode())
        except urllib.error.HTTPError as e:
            if e.code == 429: time.sleep(2); continue
            if e.code == 404: return None
            raise
    return None

def sb(path):
    req = urllib.request.Request(f"{SURL}/rest/v1/{path}", headers={"apikey": SKEY, "Authorization": f"Bearer {SKEY}"})
    with urllib.request.urlopen(req) as r: return json.loads(r.read().decode())

# Onze lead-e-mails (alle leads, niet alleen 2026).
lead_emails = set((row["email"] or "").strip().lower() for row in sb("leads?select=email") if row.get("email"))
print(f"lead-e-mails in db: {len(lead_emails)}")

# Mei-facturen ophalen (heel jaar, dan filteren op invoice_date).
facturen, page = [], 1
while True:
    batch = mb(f"sales_invoices.json?filter={urllib.parse.quote('period:this_year')}&per_page=100&page={page}") or []
    facturen += batch
    if len(batch) < 100: break
    page += 1
mei = [f for f in facturen if (f.get("invoice_date") or "").startswith(MAAND)]
print(f"facturen in {MAAND}: {len(mei)}")

tot = herleid = niet = 0.0
n_herleid = n_niet = 0
voorbeelden_niet = []
contact_cache = {}
for f in mei:
    excl = float(f.get("total_price_excl_tax") or 0)
    tot += excl
    email = ""
    c = f.get("contact") or {}
    email = (c.get("email") or c.get("send_invoices_to_email") or "").strip().lower()
    if not email and f.get("contact_id"):
        cid = f["contact_id"]
        if cid not in contact_cache:
            contact_cache[cid] = mb(f"contacts/{cid}.json") or {}
        cc = contact_cache[cid]
        email = (cc.get("email") or cc.get("send_invoices_to_email") or "").strip().lower()
    if email and email in lead_emails:
        herleid += excl; n_herleid += 1
    else:
        niet += excl; n_niet += 1
        naam = (c.get("company_name") or f"{c.get('firstname','')} {c.get('lastname','')}").strip()
        if len(voorbeelden_niet) < 12:
            voorbeelden_niet.append((naam or "?", email or "(geen e-mail)", round(excl)))

print(f"\n=== OMZET-GAT {MAAND} (excl btw) ===")
print(f"Totaal gefactureerd : EUR {tot:,.0f}  ({len(mei)} facturen)")
print(f"Herleidbaar naar lead: EUR {herleid:,.0f}  ({n_herleid} facturen)  = {herleid/tot*100:.0f}%" if tot else "geen")
print(f"NIET herleidbaar     : EUR {niet:,.0f}  ({n_niet} facturen)  = {niet/tot*100:.0f}%" if tot else "geen")
print(f"\nVoorbeelden NIET-herleidbaar (klant | e-mail | EUR excl):")
for naam, em, b in sorted(voorbeelden_niet, key=lambda x: -x[2]):
    print(f"  EUR {b:>6,}  {naam[:30]:30}  {em}")
