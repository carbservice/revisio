#!/usr/bin/env python3
# Koppelt elke lead aan z'n Moneybird-OFFERTE (estimate): nummer, state, bedrag, id.
# Match: contact op e-mail -> de offerte waarvan de datum het dichtst bij de lead
# ligt (en bij voorkeur op/na de leaddatum). ALLEEN-LEZEN op Moneybird.

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
    req = urllib.request.Request(f"{SURL}/rest/v1/leads?id=eq.{idd}", data=json.dumps(body).encode(), method="PATCH",
        headers={"apikey": SKEY, "Authorization": f"Bearer {SKEY}", "Content-Type": "application/json", "Prefer": "return=minimal"})
    with urllib.request.urlopen(req) as r: return r.status

leads = sb("leads?select=id,email,datum&order=datum.asc")
per_email = collections.defaultdict(list)
for L in leads:
    per_email[(L["email"] or "").strip().lower()].append(L)

print(f"unieke e-mails: {len(per_email)}")
gekoppeld = 0
for i, (email, groep) in enumerate(per_email.items(), 1):
    if not email: continue
    contacts = mb(f"contacts.json?query={urllib.parse.quote(email)}") or []
    contact = next((c for c in contacts if email in [(c.get('email') or '').lower(), (c.get('send_invoices_to_email') or '').lower()]), None) or (contacts[0] if contacts else None)
    estimates = []
    if contact:
        estimates = mb(f"estimates.json?filter={urllib.parse.quote('contact_id:'+str(contact['id']))}") or []
    for L in groep:
        best = None
        if estimates:
            ld = (L["datum"] or "")[:10]
            def afstand(e):
                ed = (e.get("estimate_date") or "")[:10]
                if not ed: return 9999
                from datetime import date
                try:
                    a = date.fromisoformat(ld); b = date.fromisoformat(ed)
                    d = (b - a).days
                    return d if d >= -2 else 1000 - d  # liefst op/na de lead, anders strafpunten
                except Exception: return 9999
            best = sorted(estimates, key=afstand)[0]
        if best:
            gekoppeld += 1
            body = {
                "offerte_id": str(best.get("id")),
                "offerte_nummer": best.get("estimate_id") or "",
                "offerte_state": best.get("state") or "",
                "offerte_bedrag": float(best.get("total_price_incl_tax") or 0),
            }
        else:
            body = {"offerte_id": None, "offerte_nummer": None, "offerte_state": None, "offerte_bedrag": None}
        try: sb_patch(L["id"], body)
        except urllib.error.HTTPError as e: print("PATCH-fout:", e.code, e.read().decode()[:200])
    if i % 10 == 0: print(f"  ...{i}/{len(per_email)}")
    time.sleep(0.2)

print(f"klaar. leads met een gekoppelde offerte: {gekoppeld}")
