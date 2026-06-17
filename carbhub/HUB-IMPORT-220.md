# Carburateur Hub — import 220 Imprimo-scans (17 juni 2026)

Volledig logboek van de tweede grote import: 220 nieuwe Solex/Zenith/Stromberg/Pierburg
kennbladen uit de Imprimo-scans (boeken "Deutsche Vergasser Gesselschaft 02–07").
De Hub ging van **18 → 236 carburateurs**.

## Resultaat (live in Supabase)
| Tabel | Rijen |
|---|---|
| hub_carburateurs | 236 (18 origineel + 218 nieuw) |
| hub_onderdelen | 20.073 (incl. 18.680 nieuw) |
| hub_toepassingen | 251 |
| hub_uitvoeringen | 245 |
| hub_tags | 708 |
| hub_instel_labels | 15 |

## Wat er is gebeurd, stap voor stap

### 1. Inlezen (Fase A)
- 6 PDF's (440 pagina's). Structuur: **oneven pagina = datasheet (kop + Normaleinstellung + Ersatzteilliste), even pagina = explosietekening**.
- 220 datasheet-covers gerenderd op zoom 3.0 (bron is 150 dpi; hoger renderen = uitvergroten voor leesbaarheid).
- Per blad uitgelezen: fabrikant, type, Typenschild-Nr, **voertuig + bouwjaar + motor (pk/cc/toerental)**, kleur, onder-codering, en de insteltabel (werte). Via parallelle agent-workflows (chunked, met 2e pass tegen rate limits).
- kW en cilinders staan op deze oude bladen **niet** gedrukt (alleen pk/PS) — die nulls zijn echt.

### 2. Dedup (regel van de eigenaar)
Een blad is pas een duplicaat als **Typenschild-Nr ÉN onder-codering ("TKD Neuss, den …") ÉN bouwjaar ÉN voertuig** identiek zijn. Alleen gelijk typenummer is niet genoeg (kan ander bouwjaar/editie zijn — bouwjaar bewaren is heilig). Resultaat: van 220 sheets slechts **1 echt duplicaat** (samengevoegd). 218 unieke records.

### 3. Merken — van het blad gelezen, geen aannames
De OCR las eerst de bedrijfsnaam "Deutsche Vergaser Gesellschaft" (DVG) als merk — fout, want DVG is de holding, geen merk. Daarna het echte merk per blad uit de tekening-legenda ("<MERK>-Vergaser <type>") gelezen. Door de eigenaar bevestigd:
- **INAT → Zenith** (BMW, Mercedes, Opel)
- **175 CD/CDT/CDS/CDET → Solex/Stromberg**
- **4A1 → Solex/Zenith**
- **2B2 → Pierburg**
- rest → **Solex**

Eindstand: **165 Solex · 37 Zenith · 22 Pierburg · 10 Solex/Stromberg · 2 Solex/Zenith.** Nergens nog "DVG".

### 4. Tekeningen + specsheets (Storage)
- 218 explosietekeningen + 218 originele kennblad-scans (specsheets) gecomprimeerd (JPEG ~250 KB) en geüpload naar Supabase Storage bucket `carburateur-blueprints`.
- 6 gekantelde (liggende) tekeningen rechtgezet (dvg-117/205/206/209/210/218 → nu staand).
- Pagina toont per kaart: voertuig → uitvoeringen → insteltabel → **blueprint → specsheet-scan → onderdelenlijst**.

### 5. Onderdelenlijsten (Fase D)
- Alle 218 Ersatzteillisten uitgelezen (Bild-nr, Benennung, Stück, Bestell-Nr, Fabrik-Nr) → 18.680 regels. Eén blad (VW, oude dvg-187) had geen leesbare lijst.
- **Vertalingen**: 1199 unieke Duitse namen vertaald → naam_de = Duits (referentie), naam_nl = Nederlands, naam_en = Engels. NL/DE/EN-knop op elke kaart werkt.

### 6. ID-migratie (schoon, geen "dvg")
Tijdelijke import-id's `dvg-NNN` hernoemd naar beschrijvende slugs `type-voertuig` (bv. `35-pdsit-5-audi-60`, `175-cdt-db-200-8`). Ook de Storage-bestanden mee hernoemd. Alle koppelingen (tags, toepassingen, uitvoeringen, 18.680 onderdelen) meeverhuisd. Veilig uitgevoerd: eerst alles nieuw neergezet + geverifieerd, daarna pas de oude `dvg-` opgeruimd (DB + storage). Eindcontrole: **0 × "dvg" in id's, URL's of storage.**

## Backup
Volledige JSON-snapshot van alle hub-tabellen: `Downloads/hub-backup-2026-06-17/`.
Bron-afbeeldingen lokaal in `Downloads/scans/` (covers/, tekeningen/, kaften/).

## Code (gepusht naar main, Vercel-deployed)
`app/hub/page.tsx`: echte fabrikant i.p.v. hardcoded "Pierburg"; nette motorregel zonder null; generieke render van de insteltabel-labels; leeg merk = alleen type; specsheet-scan onder de blueprint.

## Nog te doen
- **Vrijdag 19 juni — beveiliging**: RLS weer aan op alle `hub_`-tabellen; Storage-policy `carburateur-blueprints` van anon-schrijven terug naar alleen-lezen. Vereist de service-role key van de eigenaar.
- Anthropic API-key in `.env.local` roteren (was ooit blootgesteld).
- Optioneel: 3 zwakke bladen (Ford 17M, VW-bladen) herlezen; onderdeel-vertaling fijnslijpen (12 namen zonder NL-vertaling, fallback = Duits).
