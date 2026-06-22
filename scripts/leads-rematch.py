#!/usr/bin/env python3
# Bulk-matcher: koppelt alle leads in één keer aan Moneybird-omzet (betaalde
# facturen, first-touch naar de vroegste lead) en aan hun offerte (estimate,
# dichtst bij de leaddatum). Pagineert contacts/facturen/offertes elk één keer
# i.p.v. per e-mail pollen. ALLEEN-LEZEN op Moneybird; schrijft naar eigen leads.

import json, time, pathlib, urllib.parse, urllib.request, urllib.error, collections
from datetime import date

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
    for _ in range(5):
        req = urllib.request.Request(f"{MB}/{path}", headers={"Authorization": f"Bearer {MBT}"})
        try:
            with urllib.request.urlopen(req) as r: return json.loads(r.read().decode())
        except urllib.error.HTTPError as e:
            if e.code == 429: time.sleep(2); continue
            if e.code == 404: return None
            raise
    return None

def mb_all(base):
    out, page = [], 1
    while True:
        sep = "&" if "?" in base else "?"
        data = mb(f"{base}{sep}per_page=100&page={page}")
        if not isinstance(data, list) or not data: break
        out += data
        if len(data) < 100: break
        page += 1; time.sleep(0.12)
    return out

def sb_all(select):
    out, off = [], 0
    while True:
        req = urllib.request.Request(f"{SURL}/rest/v1/{select}&offset={off}&limit=1000",
            headers={"apikey": SKEY, "Authorization": f"Bearer {SKEY}"})
        with urllib.request.urlopen(req) as r: chunk = json.loads(r.read().decode())
        out += chunk
        if len(chunk) < 1000: break
        off += 1000
    return out

def sb_patch(idd, body):
    req = urllib.request.Request(f"{SURL}/rest/v1/leads?id=eq.{idd}", data=json.dumps(body).encode(), method="PATCH",
        headers={"apikey": SKEY, "Authorization": f"Bearer {SKEY}", "Content-Type": "application/json", "Prefer": "return=minimal"})
    with urllib.request.urlopen(req) as r: return r.status

print("Moneybird ophalen...")
contacts = mb_all("contacts.json")
invoices = mb_all("sales_invoices.json?filter=" + urllib.parse.quote("state:paid"))
estimates = mb_all("estimates.json")
print(f"  contacts: {len(contacts)} | betaalde facturen: {len(invoices)} | offertes: {len(estimates)}")

# e-mail -> contact_id (uit email, send_invoices_to_email en contactpersonen)
email2cid = {}
for c in contacts:
    cid = str(c["id"])
    for key in ("email", "send_invoices_to_email"):
        e = (c.get(key) or "").strip().lower()
        if e: email2cid.setdefault(e, cid)
    for cp in (c.get("contact_people") or []):
        e = (cp.get("email") or "").strip().lower()
        if e: email2cid.setdefault(e, cid)

# contact -> omzet (excl) + klant_sinds (vroegste factuurdatum)
omzet_by = collections.defaultdict(lambda: {"omzet": 0.0, "sinds": None})
for inv in invoices:
    cid = str(inv.get("contact_id"))
    omzet_by[cid]["omzet"] += float(inv.get("total_price_excl_tax") or 0)
    d = inv.get("invoice_date") or (inv.get("created_at") or "")[:10]
    if d:
        s = omzet_by[cid]["sinds"]
        omzet_by[cid]["sinds"] = d if (s is None or d < s) else s

# contact -> offertes
est_by = collections.defaultdict(list)
for e in estimates:
    cid = str(e.get("contact_id"))
    ed = e.get("estimate_date") or (e.get("created_at") or "")[:10]
    est_by[cid].append({"id": str(e.get("id")), "nr": e.get("estimate_id"), "state": e.get("state"),
                        "date": ed, "bedrag": float(e.get("total_price_incl_tax") or 0)})

leads = sb_all("leads?select=id,email,datum&order=datum.asc")
print(f"leads: {len(leads)}")
per_email = collections.defaultdict(list)
for L in leads:
    per_email[(L["email"] or "").strip().lower()].append(L)

def dagen(a, b):
    try: return (date.fromisoformat(a[:10]) - date.fromisoformat(b[:10])).days
    except Exception: return None

patches = {}
for email, grp in per_email.items():
    if not email: continue
    cid = email2cid.get(email)
    grp_sorted = sorted(grp, key=lambda x: x["datum"])
    # omzet first-touch: vroegste lead krijgt de omzet, rest 0; klant_sinds overal.
    if cid and omzet_by.get(cid, {}).get("omzet", 0) > 0:
        o = omzet_by[cid]
        for j, L in enumerate(grp_sorted):
            b = patches.setdefault(L["id"], {})
            b["omzet_excl"] = round(o["omzet"], 2) if j == 0 else 0
            b["klant_sinds"] = o["sinds"]
    # offerte: elke offerte naar de dichtstbijzijnde lead (1 offerte -> 1 lead).
    if cid and est_by.get(cid):
        lead_best = {}
        for e in est_by[cid]:
            if not e["date"]: continue
            cand = [(abs(dagen(L["datum"], e["date"])), L) for L in grp_sorted if dagen(L["datum"], e["date"]) is not None]
            if not cand: continue
            dist, L = min(cand, key=lambda x: x[0])
            if L["id"] not in lead_best or dist < lead_best[L["id"]][0]:
                lead_best[L["id"]] = (dist, e)
        for lid, (dist, e) in lead_best.items():
            b = patches.setdefault(lid, {})
            b["offerte_id"] = e["id"]; b["offerte_nummer"] = e["nr"] or ""
            b["offerte_state"] = e["state"] or ""; b["offerte_bedrag"] = e["bedrag"]

print(f"te patchen leads: {len(patches)}")
omzet_n = sum(1 for b in patches.values() if b.get("omzet_excl", 0) and b["omzet_excl"] > 0)
off_n = sum(1 for b in patches.values() if b.get("offerte_id"))
tot_omzet = sum(b.get("omzet_excl", 0) or 0 for b in patches.values())
print(f"  omzet-leads: {omzet_n} | offerte-leads: {off_n} | totale omzet: EUR {tot_omzet:,.2f}")

for k, (lid, body) in enumerate(patches.items(), 1):
    try: sb_patch(lid, body)
    except urllib.error.HTTPError as e: print("PATCH-fout:", e.code, e.read().decode()[:160])
    if k % 100 == 0: print(f"  ...gepatcht {k}/{len(patches)}")

print("KLAAR.")
