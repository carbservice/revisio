# Carburateur Hub — Supabase schema (voorstel)

_Opgesteld 16 juni 2026. Ter goedkeuring vóór we bouwen._

## Uitgangspunten
1. **Schaalbaar** — moet van 18 naar honderden carburateurs kunnen. Onderweg: 220 scans (Imprimo) plus een complete database uit 5 boekjes met tags, meerdere merken (**Pierburg, Solex, Zenith**).
2. **Bewerkbaar** — toevoegen/corrigeren zonder code te wijzigen.
3. **Matchbaar** — de velden waarop we straks een kenteken (RDW: merk, bouwjaar, inhoud, cilinders) koppelen, staan als echte kolommen, niet verstopt in JSON. Daardoor is de cross-reference snel en betrouwbaar.

Kernidee: de **doorzoekbare/matchbare** delen worden echte tabellen/kolommen; de rest (insteltabel-waarden) mag JSON zijn.

## Doel (volgorde)
1. **Eerst**: de hele database uitleesbaar + schaalbaar + altijd oproepbaar. Tekeningen handmatig opzoekbaar in de Hub voor de monteurs.
2. **Daarna (later ontwikkelpunt)**: cross-reference — bij een Revisio-klus automatisch "de juiste tekening" klaarzetten op de juiste auto (via kenteken/RDW).

## Besloten (16 juni)
- **Bestelnummers**: **wel loggen** voor volledigheid (oude, omgenummerde Pierburg-nrs — functioneel niet meer bruikbaar, maar bewaren we als archief). In het schema als kolom, in de UI zichtbaar maar gemarkeerd als "oud". We zoeken/matchen er niet op. De **tag (Typenschild-Nr)** blijft de identiteit.
- **Kaft-scans**: bewaren én tonen, **onder de blueprint** in het detail.
- **Bucket**: technisch `carburateur-blueprints` (Supabase staat geen spaties/hoofdletters toe; weergavenaam mag "Carburateur Blueprints").
- **Geen voorraad / prijs / leverancier.**
- **Meerdere merken** ondersteund via het veld `fabrikant`.

## Tabellen

### 1. `hub_carburateurs` — één rij per uniek kennblad
| kolom | type | voorbeeld |
|---|---|---|
| id | text (PK) | `4a1-3254-db280-schwarz` |
| fabrikant | text | Pierburg |
| type | text | 4 A 1 - 32/54 |
| gasklep | text | 32/54 |
| cilinders | int | 6 |
| vehicle | text (weergave) | Mercedes 280 / 280 S |
| registrier | text | 003 111/4 |
| motor_kw / motor_ps / motor_cc / motor_rpm | int | 115 / 156 / 2746 / 5500 |
| bouwjaar_van | int (jaar) | 1980 |
| bouwjaar_van_tekst | text | juli 1980 |
| bouwjaar_tot | int (null = open →) | _null_ |
| bouwjaar_tot_tekst | text | _leeg_ |
| tekening_url | text | Storage-URL van de blueprint |
| kaft_url | text | Storage-URL van de originele kaft-scan |
| werte | jsonb | {"hauptduese":"X97,5", …} |
| onderdelen_bron | text | bronnotitie |
| controle | text | eventuele vlag |
| created_at / updated_at | timestamptz | |

### 2. `hub_tags` — tagnummers (dedupe + zoeken/matchen)
| kolom | type | voorbeeld |
|---|---|---|
| id | serial (PK) | |
| carb_id | text (FK) | 4a1-3254-db280-schwarz |
| tag | text | 001 070 66 04 |
| tag_norm | text (index) | 0010706604 |

Eén carburateur kan meerdere tags hebben. Index op `tag_norm` voor snel zoeken en dedupe-controle bij import. **Géén unieke constraint op `tag_norm`** — een tag mag bewust naar meerdere carburateurs wijzen (kruisverwijzing). Voorbeeld in de huidige data: tag `049 129 016 B` (Automatik) staat op zowel Audi 80 S als VW Passat 1,6.

### 3. `hub_toepassingen` — voertuigtoepassingen (DE matching-tabel)
| kolom | type | voorbeeld |
|---|---|---|
| id | serial (PK) | |
| carb_id | text (FK) | |
| merk | text | Mercedes |
| model | text | 280 S |
| merk_model | text (weergave) | Mercedes 280 S |
| chassis | text | W126 |
| motorcode | text | M110 |
| bouwjaar_van | int | 1980 |
| bouwjaar_tot | int (null = open) | _null_ |
| cc | int | 2746 |
| cilinders | int | 6 |

Eén carburateur op meerdere voertuigen = meerdere rijen (de kruisverwijzing). Hierop draait straks de kenteken-match: RDW geeft merk + bouwjaar + inhoud + cilinders → zoek de toepassing → carburateur.

**Afleiding bij migratie** (gecontroleerd, allemaal mogelijk uit de huidige data): `merk` = eerste woord van `merk_model` (Audi/VW/Mercedes); `model` = de rest; `bouwjaar_van/tot`, `cc`, `cilinders` worden overgenomen van de carburateur. Niets hoeft handmatig bijgemaakt te worden.

### 4. `hub_uitvoeringen` — varianten
| kolom | type | voorbeeld |
|---|---|---|
| id | serial (PK) | |
| carb_id | text (FK) | |
| volgorde | int | 1 |
| naam | text | Hand + Autom. |
| tag | text | 001 070 66 04 |
| kleur | text | zwart |
| ab_datum | text | 8 009 |
| bestel_nr_oud | text (archief) | 7.17825.01 |

### 5. `hub_onderdelen` — onderdelenlijst (Ersatzteilliste)
| kolom | type | voorbeeld |
|---|---|---|
| id | serial (PK) | |
| carb_id | text (FK) | |
| volgorde | int | 12 |
| nr | text | 40 |
| naam_nl / naam_de / naam_en | text | Hoofdsproeier / Hauptdüse / Main jet |
| aantal | text | 1 |
| bestell_oud | text (archief) | 3.33124.38 |

Als tabel (niet JSON) zodat je later kunt zoeken op onderdeelnaam over de hele database. Bestelnummer wordt gelogd (archief), niet voor gebruik.

### 6. `hub_instel_labels` — referentie: vaste vertaling van de insteltabel
| kolom | type | voorbeeld |
|---|---|---|
| sleutel | text (PK) | hauptduese |
| symbool | text | Gg |
| naam_nl / naam_de / naam_en | text | Hoofdsproeier / Hauptdüse / Main jet |
| volgorde | int | 2 |

Komt uit `labels.json`. De waarden per carburateur staan in `hub_carburateurs.werte`; de labels één keer hier.

## Opslag (Storage)
- Eén bucket **`carburateur-blueprints`** (publiek, zoals `werkbon-fotos`; weergavenaam "Carburateur Blueprints").
- Mappen: `tekeningen/<id>.jpg` (blueprint) en `kaften/<id>.jpg` (originele kaft-scan).
- `tekening_url` en `kaft_url` in tabel 1 wijzen hierheen. In het detail: specsheet → blueprint → kaft-scan → onderdelenlijst.

## Beveiliging (RLS)
- Achter de admin-login, net als nu. Lezen/schrijven alleen voor personeel (`is_staff()`), conform RLS-PLAN.md. Past in de vrijdag-sessie.

## Hoe `/hub` straks werkt
- De pagina haalt de carburateurs uit Supabase (i.p.v. statisch `data.ts`).
- Slim zoeken (laag 1) blijft werken — nu op data uit de database.
- Kenteken-match (laag 2) = een query op `hub_toepassingen` (merk + bouwjaar-bereik + cc).

## Import van de 220 scans
- Zelfde pijplijn als nu: scan → renderen/lezen → gestructureerde rijen → in Supabase.
- `tag_norm` blijft de dedupe-sleutel; bij import checken we tegen `hub_tags`.
- Veld voor "nog te controleren" zodat twijfelgevallen apart te zien zijn.

## Migratie-gereedheid (gecontroleerd 16 juni)
Audit (`audit_migratie.py`) over de 18 carburateurs: **alle 16 schema-velden 100% gevuld**, motor numeriek, bouwjaar afleidbaar, alle werte-sleutels in labels.json, alle onderdelen 3-talig, alle 36 afbeeldingen aanwezig. Geen ontbrekende data. De migratie kan in één keer schoon draaien.

## Status
Schema akkoord (16 juni). Klaar om te bouwen zodra de Supabase service-role-sleutel beschikbaar is (nu of in de vrijdag 19 juni-sessie samen met RLS). Bouwstappen: tabellen aanmaken → bucket → 18 carburateurs + tekeningen/kaften migreren → `/hub` laten lezen uit Supabase → importpijplijn klaarzetten voor de 220 scans en de 5 tag-boekjes.
