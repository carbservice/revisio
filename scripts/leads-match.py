#!/usr/bin/env python3
# Koppelt de leads in Supabase aan Moneybird-facturen (op e-mail) en schrijft de
# omzet terug. First-touch attributie: de omzet van een klant gaat naar z'n
# VROEGSTE lead (die bepaalt de bron); latere leads van dezelfde klant krijgen 0.
# ALLEEN-LEZEN op Moneybird; schrijft alleen naar de eigen `leads`-tabel.

import json, time, pathlib, urllib.parse, urllib.request, urllib.error, collections

ROOT = pathlib.Path(r"c:\Users\cyrie\Documents\Revisio Project")
ENV = ROOT / "revisio" / ".env.local"

def lees_env(p):
    d = {}
    for r in p.read_text(encoding="utf-8").splitlines():
        r = r.strip()
        if r and not r.startswith("#") and "=" in r:
            k, v = r.split("=", 1); d[k.strip()] = v.strip().strip('"').strip("'")
    return d

env = lees_env(ENV)
SURL = env["NEXT_PUBLIC_SUPABASE_URL"].rstrip("/")
SKEY = env["SUPABASE_SERVICE_ROLE_KEY"]
MB = f"https://moneybird.com/api/v2/{env['MONEYBIRD_ADMIN']}"
MBT = env["MONEYBIRD_TOKEN"]

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

def sb_patch(idd, body):
    req = urllib.request.Request(
        f"{SURL}/rest/v1/leads?id=eq.{idd}", data=json.dumps(body).encode(), method="PATCH",
        headers={"apikey": SKEY, "Authorization": f"Bearer {SKEY}", "Content-Type": "application/json", "Prefer": "return=minimal"})
    with urllib.request.urlopen(req) as r: return r.status

leads = sb("leads?select=id,email,datum&order=datum.asc")
per_email = collections.defaultdict(list)
for L in leads:
    per_email[(L["email"] or "").strip().lower()].append(L)

print(f"unieke e-mails: {len(per_email)}")
nu = None  # we laten gematcht_op door de DB/now niet zetten; we zetten een vaste stempel client-side niet nodig
klanten = 0
for i, (email, groep) in enumerate(per_email.items(), 1):
    if not email: continue
    contacts = mb(f"contacts.json?query={urllib.parse.quote(email)}") or []
    contact = next((c for c in contacts if email in [(c.get('email') or '').lower(), (c.get('send_invoices_to_email') or '').lower()]), None) or (contacts[0] if contacts else None)
    omzet, sinds = 0.0, None
    if contact:
        facturen = mb(f"sales_invoices.json?filter={urllib.parse.quote('contact_id:'+str(contact['id']))}") or []
        betaald = [f for f in facturen if f.get("state") == "paid"]
        if betaald:
            klanten += 1
            omzet = sum(float(f.get("total_price_excl_tax") or 0) for f in betaald)
            datums = [f.get("invoice_date") or f.get("created_at") for f in betaald if f.get("invoice_date") or f.get("created_at")]
            sinds = min(datums) if datums else None
    # First-touch: vroegste lead krijgt de omzet; rest 0 maar wel klant_sinds.
    groep_sorted = sorted(groep, key=lambda x: x["datum"])
    for j, L in enumerate(groep_sorted):
        body = {"omzet_excl": round(omzet, 2) if j == 0 else 0, "klant_sinds": sinds}
        try: sb_patch(L["id"], body)
        except urllib.error.HTTPError as e: print("PATCH-fout:", e.code, e.read().decode()[:200])
    if i % 10 == 0: print(f"  ...{i}/{len(per_email)}")
    time.sleep(0.2)

print(f"klaar. klanten met betaalde factuur: {klanten}")
