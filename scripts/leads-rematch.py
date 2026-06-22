#!/usr/bin/env python3
# PER-DEAL matcher. Koppelt elke BETAALDE factuur aan de lead die juist die deal
# opleverde: factuur.original_estimate_id -> offerte -> dichtstbijzijnde lead van
# hetzelfde contact. De omzet van die deal komt op DIE lead (en dus die maand/dat
# kanaal). Zonder offerte-link: fallback naar de dichtstbijzijnde lead van het
# contact. Zet ook per lead z'n offerte (voor de pijplijn) en klant_sinds.
# ALLEEN-LEZEN op Moneybird; schrijft alleen naar de eigen leads-tabel.

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

def sb_patch(filter_or_id, body, is_filter=False):
    q = filter_or_id if is_filter else f"id=eq.{filter_or_id}"
    req = urllib.request.Request(f"{SURL}/rest/v1/leads?{q}", data=json.dumps(body).encode(), method="PATCH",
        headers={"apikey": SKEY, "Authorization": f"Bearer {SKEY}", "Content-Type": "application/json", "Prefer": "return=minimal"})
    with urllib.request.urlopen(req) as r: return r.status

def dagen(a, b):
    try: return (date.fromisoformat(a[:10]) - date.fromisoformat(b[:10])).days
    except Exception: return None

print("Moneybird ophalen...")
contacts = mb_all("contacts.json")
invoices = mb_all("sales_invoices.json?filter=" + urllib.parse.quote("state:paid"))
estimates = mb_all("estimates.json")
print(f"  contacts: {len(contacts)} | betaalde facturen: {len(invoices)} | offertes: {len(estimates)}")

email2cid = {}
for c in contacts:
    cid = str(c["id"])
    for key in ("email", "send_invoices_to_email"):
        e = (c.get(key) or "").strip().lower()
        if e: email2cid.setdefault(e, cid)
    for cp in (c.get("contact_people") or []):
        e = (cp.get("email") or "").strip().lower()
        if e: email2cid.setdefault(e, cid)

leads = sb_all("leads?select=id,email,datum,bron&order=datum.asc")
leads_by_cid = collections.defaultdict(list)
for L in leads:
    cid = email2cid.get((L["email"] or "").strip().lower())
    if cid: leads_by_cid[cid].append(L)
for cid in leads_by_cid: leads_by_cid[cid].sort(key=lambda x: x["datum"])

# offerte -> lead (dichtstbijzijnde lead van hetzelfde contact) + lead -> hoofd-offerte
estimate2lead = {}
lead_primary = {}  # lead_id -> (afstand, est, est_datum)
for e in estimates:
    cid = str(e.get("contact_id"))
    grp = leads_by_cid.get(cid)
    if not grp: continue
    ed = e.get("estimate_date") or (e.get("created_at") or "")[:10]
    if not ed: continue
    cand = [(abs(dagen(L["datum"], ed)), L) for L in grp if dagen(L["datum"], ed) is not None]
    if not cand: continue
    dist, L = min(cand, key=lambda x: x[0])
    estimate2lead[str(e["id"])] = L["id"]
    # hoofd-offerte van de lead voor de pijplijn: de meest recente
    if L["id"] not in lead_primary or ed > lead_primary[L["id"]][2]:
        lead_primary[L["id"]] = (dist, e, ed)

# per-deal omzet
lead_omzet = collections.defaultdict(float)
tr, fb, lost = 0.0, 0.0, 0.0
for inv in invoices:
    excl = float(inv.get("total_price_excl_tax") or 0)
    eid = inv.get("original_estimate_id")
    lid = estimate2lead.get(str(eid)) if eid else None
    if lid:
        tr += excl
    else:
        cid = str(inv.get("contact_id"))
        grp = leads_by_cid.get(cid)
        if grp:
            d = inv.get("invoice_date") or (inv.get("created_at") or "")[:10]
            lid = min(grp, key=lambda L: abs(dagen(L["datum"], d) or 99999))["id"]
            fb += excl
        else:
            lost += excl
    if lid: lead_omzet[lid] += excl

# klant_sinds per contact (vroegste factuurdatum)
sinds_by_cid = {}
for inv in invoices:
    cid = str(inv.get("contact_id")); d = inv.get("invoice_date") or (inv.get("created_at") or "")[:10]
    if d and (cid not in sinds_by_cid or d < sinds_by_cid[cid]): sinds_by_cid[cid] = d

tot = tr + fb + lost
print(f"omzet via offerte-link: EUR {tr:,.0f} ({100*tr/tot:.0f}%) | fallback contact: EUR {fb:,.0f} ({100*fb/tot:.0f}%) | geen lead: EUR {lost:,.0f} ({100*lost/tot:.0f}%)")

# RESET de oude (first-touch) waarden in een paar bulk-calls
print("reset oude waarden...")
sb_patch("omzet_excl=gt.0", {"omzet_excl": 0}, is_filter=True)
sb_patch("klant_sinds=not.is.null", {"klant_sinds": None}, is_filter=True)
sb_patch("offerte_id=not.is.null", {"offerte_id": None, "offerte_nummer": None, "offerte_state": None, "offerte_bedrag": None}, is_filter=True)

# zet de gematchte leads
patches = {}
for L in leads:
    lid = L["id"]
    o = round(lead_omzet.get(lid, 0.0), 2)
    pe = lead_primary.get(lid)
    cid = email2cid.get((L["email"] or "").strip().lower())
    sinds = sinds_by_cid.get(cid) if (o > 0 or pe) else None
    if o <= 0 and not pe: continue
    body = {"omzet_excl": o, "klant_sinds": sinds}
    if pe:
        e = pe[1]
        body.update({"offerte_id": str(e["id"]), "offerte_nummer": e.get("estimate_id") or "",
                     "offerte_state": e.get("state") or "", "offerte_bedrag": float(e.get("total_price_incl_tax") or 0)})
    patches[lid] = body

omzet_leads = sum(1 for b in patches.values() if b["omzet_excl"] > 0)
off_leads = sum(1 for b in patches.values() if b.get("offerte_id"))
print(f"te zetten: {len(patches)} leads | met omzet: {omzet_leads} | met offerte: {off_leads}")
for k, (lid, body) in enumerate(patches.items(), 1):
    try: sb_patch(lid, body)
    except urllib.error.HTTPError as e: print("PATCH-fout:", e.code, e.read().decode()[:160])
    if k % 100 == 0: print(f"  ...{k}/{len(patches)}")
print("KLAAR (per-deal).")
