#!/usr/bin/env python3
# Decodeert de volledige Elfsight-Sheet (CSV-export) en herhaalt de mei-gat-analyse
# met ALLE historische lead-e-mails (dus ook 2024/2025). ALLEEN-LEZEN.

import json, base64, csv, io, time, pathlib, urllib.parse, urllib.request, urllib.error

ROOT = pathlib.Path(r"c:\Users\cyrie\Documents\Revisio Project")
ENV = ROOT / "revisio" / ".env.local"
DL = pathlib.Path(r"C:\Users\cyrie\.claude\projects\c--Users-cyrie-Documents-Revisio-Project\9d0caae3-9847-4d27-8559-5272f2516712\tool-results\mcp-claude_ai_Google_Drive-download_file_content-1782147399211.txt")
MAAND = "2026-05"

def lees_env(p):
    d = {}
    for r in p.read_text(encoding="utf-8").splitlines():
        r = r.strip()
        if r and not r.startswith("#") and "=" in r:
            k, v = r.split("=", 1); d[k.strip()] = v.strip().strip('"').strip("'")
    return d

env = lees_env(ENV)
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

# Sheet decoderen.
dl = json.loads(DL.read_text(encoding="utf-8"))
csvtekst = base64.b64decode(dl["content"]).decode("utf-8", "replace")
rows = list(csv.reader(io.StringIO(csvtekst)))
kop = rows[0]
ix_email = kop.index("Email") if "Email" in kop else 6
ix_date = kop.index("Date") if "Date" in kop else len(kop) - 1
emails, datums = set(), []
for r in rows[1:]:
    if len(r) <= max(ix_email, ix_date): continue
    e = (r[ix_email] or "").strip().lower()
    if "@" in e: emails.add(e)
    d = (r[ix_date] or "").strip()
    if d: datums.append(d[:10])
print(f"Sheet-rijen: {len(rows)-1}  |  unieke e-mails: {len(emails)}")
print(f"datumrange: {min(datums)} -> {max(datums)}")

# Mei-facturen.
facturen, page = [], 1
while True:
    batch = mb(f"sales_invoices.json?filter={urllib.parse.quote('period:this_year')}&per_page=100&page={page}") or []
    facturen += batch
    if len(batch) < 100: break
    page += 1
mei = [f for f in facturen if (f.get("invoice_date") or "").startswith(MAAND)]

tot = herleid = niet = 0.0; n_h = n_n = 0; nog_niet = []
cache = {}
for f in mei:
    excl = float(f.get("total_price_excl_tax") or 0); tot += excl
    c = f.get("contact") or {}
    email = (c.get("email") or c.get("send_invoices_to_email") or "").strip().lower()
    if not email and f.get("contact_id"):
        cid = f["contact_id"]
        if cid not in cache: cache[cid] = mb(f"contacts/{cid}.json") or {}
        email = (cache[cid].get("email") or cache[cid].get("send_invoices_to_email") or "").strip().lower()
    if email and email in emails:
        herleid += excl; n_h += 1
    else:
        niet += excl; n_n += 1
        naam = (c.get("company_name") or f"{c.get('firstname','')} {c.get('lastname','')}").strip()
        if len(nog_niet) < 12: nog_niet.append((naam or "?", email or "(geen e-mail)", round(excl)))

print(f"\n=== MEI-GAT met ALLE historische leads (excl btw) ===")
print(f"Totaal gefactureerd  : EUR {tot:,.0f} ({len(mei)} facturen)")
print(f"Herleidbaar naar lead: EUR {herleid:,.0f} ({n_h})  = {herleid/tot*100:.0f}%")
print(f"NIET herleidbaar     : EUR {niet:,.0f} ({n_n})  = {niet/tot*100:.0f}%")
print(f"\nNog steeds NIET herleidbaar (geen formulier-mail in de hele Sheet):")
for naam, em, b in sorted(nog_niet, key=lambda x: -x[2]):
    print(f"  EUR {b:>6,}  {naam[:30]:30}  {em}")
