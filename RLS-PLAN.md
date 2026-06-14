# Plan: RLS dichtzetten (beveiliging)

_Opgesteld 14 juni 2026. Ingepland: vrijdag 19 juni 2026._

## Waarom
De anon-sleutel mag publiek zijn (dat is by design), maar er staat nu **geen RLS** op de tabellen. Daardoor geeft die publieke sleutel volledige lees- en schrijftoegang tot alle data: klantgegevens, foto's, deel-tokens en codes. Dit is het grootste beveiligingsrisico van de app.

Extra punt: Supabase Auth laat **iedereen** inloggen via een magic link, ook niet-personeel. Dus "ingelogd = vertrouwd" klopt niet. De policies moeten checken of iemand **echt personeel** is (`is_staff()`), niet alleen of die is ingelogd.

## De volgorde is cruciaal
Eerst de server-routes op de service-role-sleutel zetten, DAN pas RLS aanzetten. Andersom breekt het klantportaal en de dashboards.

## Fase 0 — Voorbereiding (geen risico)
- Service-role-sleutel uit Supabase halen en als secret zetten in Vercel én `.env.local` (`SUPABASE_SERVICE_ROLE_KEY`). Server-only, komt nooit in de browser.
- Een aparte server-client maken (`lib/supabaseAdmin.ts`) die alleen in API-routes gebruikt wordt.

## Fase 1 — Server-routes ombouwen (VOOR RLS aanzetten)
- Overzetten naar de admin-client: `/api/werkbon-publiek` (klantportaal), `/api/werkplaats-stats`, `/api/dashboard`, en de `werkbon_links`-lezing in `/api/klussen`.
- Deze bypassen straks RLS en houden hun eigen check (klant: token + code; dashboards: achter admin).
- Controleren of `/api/health` ergens een anon-Supabase-lezing doet; zo ja, ook naar de admin-client.

## Fase 2 — is_staff() plus RLS op de werkbon-tabellen
- `SECURITY DEFINER`-functie `is_staff()`: kijkt of `auth.email()` in `app_gebruikers` staat en actief is.
- RLS aanzetten op: `klus_voortgang`, `klus_fotos`, `tijdregels`, `werkbon_meting`, `werkbon_checklist`, `werkbon_artikelen`, `werkbon_opmerking`, `werkbon_retour`, `werkbon_links`, `werkbon_log`.
- Policy per tabel: alleen `is_staff()` mag lezen/schrijven. Anoniem niets.
- Monteur-app grondig testen.

## Fase 3 — app_gebruikers
- RLS aan; policy: ingelogde gebruiker mag alleen zijn eigen rij lezen (`auth.email() = email`) voor de login-match. Geen schrijven vanuit de browser.

## Fase 4 — Opslag (storage)
- Upload-policy aanscherpen naar alleen `is_staff()`.
- Later, optioneel: private bucket + signed URLs voor de echt interne foto's (klant-foto's kunnen publiek blijven). Grotere klus, aparte fase.

## Fase 5 — Auth dichter (optioneel, dubbel slot)
- Open signups in Supabase uitzetten en de monteur-accounts vooraf aanmaken. `is_staff()` dekt dit al af.

## Bij de uitrol
- Rustig moment kiezen.
- Testchecklist: monteur inloggen, werkbon bewerken, foto uploaden; klantportaal via token EN via nummer+code; beide dashboards.
- Back-up draait door: `pg_dump` gebruikt het databasewachtwoord (directe verbinding), staat los van RLS.
- Snelle terugval: per tabel `ALTER TABLE ... DISABLE ROW LEVEL SECURITY`. Rollback-SQL wordt erbij geleverd.

## Nodig van de eigenaar
- Service-role-sleutel in Vercel + `.env.local`.
- Eventueel akkoord om open signups uit te zetten (Fase 5).

## Aanpak per fase
Per fase wordt kant-en-klare SQL (met rollback) plus de code-aanpassing geleverd, een voor een, zodat elke stap getest kan worden voor de volgende.
