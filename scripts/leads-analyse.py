#!/usr/bin/env python3
# Eenmalige ALLEEN-LEZEN analyse: koppelt de mei+juni-leads (uit Gmail) aan
# Moneybird-facturen via het e-mailadres en telt de omzet per bron op.
# Leest Moneybird-sleutels uit revisio/.env.local. Schrijft NIETS weg.

import json, os, time, urllib.parse, urllib.request, pathlib, collections

ROOT = pathlib.Path(r"c:\Users\cyrie\Documents\Revisio Project")
ENV = ROOT / "revisio" / ".env.local"
LEADS = ROOT / "_leads-mei-juni.json"

def lees_env(p):
    d = {}
    for regel in p.read_text(encoding="utf-8").splitlines():
        regel = regel.strip()
        if not regel or regel.startswith("#") or "=" not in regel:
            continue
        k, v = regel.split("=", 1)
        d[k.strip()] = v.strip().strip('"').strip("'")
    return d

env = lees_env(ENV)
ADMIN = env["MONEYBIRD_ADMIN"]
TOKEN = env["MONEYBIRD_TOKEN"]
BASE = f"https://moneybird.com/api/v2/{ADMIN}"

def haal(path):
    url = f"{BASE}/{path}"
    for _ in range(4):
        req = urllib.request.Request(url, headers={"Authorization": f"Bearer {TOKEN}"})
        try:
            with urllib.request.urlopen(req) as r:
                return json.loads(r.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            if e.code == 429:
                time.sleep(2); continue
            if e.code == 404:
                return None
            raise
    return None

leads = json.loads(LEADS.read_text(encoding="utf-8"))
# Uniek per e-mail; eigen test-aanvraag eruit. Bron = de eerste (vroegste) lead.
per_email = {}
for L in sorted(leads, key=lambda x: x.get("datum", "")):
    e = (L.get("email") or "").strip().lower()
    if not e or e == "cyrielgaemers@gmail.com":
        continue
    if e not in per_email:
        per_email[e] = L.get("bron") or "organisch"

print(f"Unieke leads (excl. test): {len(per_email)}")

stat = collections.defaultdict(lambda: {"leads": 0, "klanten": 0, "facturen": 0, "omzet_excl": 0.0, "omzet_incl": 0.0})
gematcht = 0
for i, (email, bron) in enumerate(per_email.items(), 1):
    stat[bron]["leads"] += 1
    contacts = haal(f"contacts.json?query={urllib.parse.quote(email)}") or []
    contact = None
    for c in contacts:
        velden = [(c.get("email") or "").lower(), (c.get("send_invoices_to_email") or "").lower()]
        if email in velden:
            contact = c; break
    if not contact and contacts:
        contact = contacts[0]
    if not contact:
        continue
    facturen = haal(f"sales_invoices.json?filter={urllib.parse.quote('contact_id:'+str(contact['id']))}") or []
    betaald = [f for f in facturen if f.get("state") == "paid"]
    if betaald:
        gematcht += 1
        stat[bron]["klanten"] += 1
        stat[bron]["facturen"] += len(betaald)
        stat[bron]["omzet_excl"] += sum(float(f.get("total_price_excl_tax") or 0) for f in betaald)
        stat[bron]["omzet_incl"] += sum(float(f.get("total_price_incl_tax") or 0) for f in betaald)
    if i % 10 == 0:
        print(f"  ...{i}/{len(per_email)} verwerkt")
    time.sleep(0.25)

print(f"\nLeads met >=1 betaalde factuur (klant geworden): {gematcht}\n")
print(f"{'BRON':<14}{'leads':>7}{'klanten':>9}{'conv%':>7}{'omzet excl':>14}{'/lead':>10}")
print("-" * 62)
for bron, s in sorted(stat.items(), key=lambda kv: -kv[1]["omzet_excl"]):
    conv = (s["klanten"] / s["leads"] * 100) if s["leads"] else 0
    per_lead = (s["omzet_excl"] / s["leads"]) if s["leads"] else 0
    print(f"{bron:<14}{s['leads']:>7}{s['klanten']:>9}{conv:>6.0f}%{s['omzet_excl']:>14,.0f}{per_lead:>10,.0f}")
tot_omzet = sum(s["omzet_excl"] for s in stat.values())
tot_leads = sum(s["leads"] for s in stat.values())
print("-" * 62)
print(f"{'TOTAAL':<14}{tot_leads:>7}{gematcht:>9}{'':>7}{tot_omzet:>14,.0f}")
print("\nLet op: omzet = alle betaalde facturen van die klant (excl btw), niet")
print("alleen mei/juni. Spend per kanaal nog toevoegen voor de echte ROAS.")
