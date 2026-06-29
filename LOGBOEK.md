# Revisio Logboek

## Dag 1 · 1 juni 2026
**Sessie: 13:20 tot 17:30 (~4 uur)**

### Tools geïnstalleerd
- Python, Node.js, VS Code, Git

### Accounts aangemaakt
- GitHub (carbservice), Supabase (Revisio), Vercel

### Eerste Next.js app
- Lokaal: localhost:3000
- Live: revisio-umber.vercel.app

### Supabase verbinding
- Testtabel 'test' met kolom 'bericht'
- Homepage haalt data uit Supabase

### Volgende stap
- Echte tabellen ontwerpen: klanten, voertuigen, revisies
- Moneybird API koppeling

## Dag 2 · 12 juni 2026
**Sessie met Claude Code in VS Code. Veel gebouwd; alles staat op GitHub en live op Vercel.**

### Code en structuur
- Alle code veiliggesteld op GitHub (was deels alleen lokaal).
- Gedeelde basis in /lib (kleuren, opmaak-helpers, types) voor alle pagina's.
- Huisstijl gelijkgetrokken over alle pagina's.
- Grote monteur-pagina opgesplitst in losse componenten.
- Monteur-app verhuisd van /werkplaats naar /werkbonnen (oude URL redirect).
- Uniforme paginakop op de drie hoofdpagina's: statusbalk, ingelogd-als, titel, zoekbalk.

### Database
- Ontbrekende tabellen klus_voortgang en klus_fotos aangemaakt.
- Tabel werkbon_links aangemaakt voor de klant-deellink en code.
- Veld gepubliceerd_op op klus_voortgang en klus_fotos.

### Login en beveiliging
- E-maillogin via Supabase Auth (magic link plus inlogcode) vervangt de pincode.
- Inlogcode voor mobiel (geen mini-browser-probleem); 8-cijferige code.
- Nederlandse inlogmails via Gmail-SMTP.
- Dashboards achter login plus admin-rol; monteurs zien alleen de werkbonnen.

### Dashboards en monitoring
- Drie-knops-navigatie tussen Cijfers, Werkplaats Dashboard en Werkbonnen.
- Data-buffer zodat terugkeren direct laadt.
- Systeemstatus-balk met live-lampjes (App, API, Moneybird, Supabase, GitHub), ververst elk kwartier.
- Health-alert via GitHub Action: mail bij storing naar twee adressen.
- Werkplaats-dashboard toont echte ordernummers uit Moneybird.

### Foto's
- Bulk foto-upload met tellingoverzicht.
- Maximaal 3 foto's per stadium.
- Lightbox om foto's groot in de app te bekijken en te bladeren binnen een stadium.

### Klantportal (/volg)
- Klant logt in met ordernummer plus code, of via directe link.
- Handmatig publiceren: klant ziet alleen wat de monteur pusht.
- Chique donkergroen-op-wit, grote leesbare tekst, je-vorm.
- Klantvriendelijke stadium-namen met omschrijving.
- Stadia onder elkaar met foto's per fase.
- Meelopend carburateur-icoon dat de balk traag vult tot het huidige stadium, met percentage.
- Logo en favicon (carburateur).
- Klant-data blijft staan na facturatie (los van Moneybird).

### Volgende stap
- Livegang 13 juni: monteur-app en eerste klant.
- Push de laatste klant-update voor facturatie.
- Eigen domein (app.carbservice.nl), Anthropic-key omdraaien, RLS echt dichtzetten, back-ups.

## Dag 3 · 13 juni 2026 (livegang)
**Livegang-dag. Monteur-app live, eerste klant. Getest in de werkplaats door Rens en Lukas, onder andere op een offerte met twee carburateurs.**

### Back-ups geregeld
- Dagelijkse database-back-up via een GitHub Action (elke nacht 02:00 UTC, plus handmatig te starten). Maakt een volledige dump (pg_dump, Postgres 17-client) en bewaart die als artifact, 90 dagen. Vereist de secret SUPABASE_DB_PASSWORD in GitHub. Faalt hard als de dump leeg is.

### Mobiel (iPhone)
- viewport-fit cover plus safe-area, zodat de inhoud netjes tot in de randen loopt en de vaste onderbalk boven de iPhone home-indicator blijft.
- Nette titel (Revisio) en theme-color in plaats van de standaard "Create Next App".

### Foto's
- Algemene foto-dump per revisie nu onbeperkt (de max-3 geldt alleen per stadium).

### Klantportaal verbeterd
- Monteur-voornaam zichtbaar ("onder behandeling van ..."), nooit de tijd.
- Helderdere kop: welkomtekst, groot offertenummer, "Deze revisie is voor", de klacht, een groot percentage-vak en een verwachting-blok onderaan ("binnen enkele dagen klaar").
- Carburateur-animatie speelt opnieuw af zodra de voortgangsbalk weer in beeld komt (klant en monteur).
- Tijdlijn vloeiender gemaakt (geen metingen per frame meer, geen gehaper bij scrollen).
- Carburateur zakt bij 20% naar de onderkant van het ontvangst-vak in plaats van bovenin te blijven hangen.
- Deel-knop (WhatsApp) waarmee de klant zijn unieke volglink doorstuurt naar zijn omgeving, plus social-balk (YouTube, Instagram, Facebook, TikTok, LinkedIn).

### Voortgang-telling herzien
- Het actieve stadium telt nu als "bezig" en nog niet mee in het percentage; alleen voltooide stadia tellen. Ontvangst is een uitzondering: bevestigen (met foto) is meteen 20%.
- Monteur-app en klantportaal tonen nu exact hetzelfde percentage.

### Twee carburateurs per offerte
- Bij een offerte met twee carburateurs kunnen beide monteurs tegelijk werken zonder elkaar te overschrijven.
- De technische werkbon (afstelling, sproeiers, checklist, artikelen, opmerking, retour) staat per carburateur apart, via een afgeleide sleutel (#2 voor carburateur 2).
- Stadia, foto's en tijd blijven gedeeld, zodat de klant een gecombineerde voortgang ziet.
- Keuzeknop Carburateur 1 / 2 bovenin de werkbon. Standaard 1, dus losse klussen veranderen niet.

### Klein
- Kopieer-knop (klantlink) geeft een korte "Gekopieerd!"-bevestiging.

### Nog te doen
- Anthropic-key omdraaien, eigen domein (app.carbservice.nl), RLS echt dichtzetten.
- "Bekijk werkbon (alleen lezen)" toont nu alleen carburateur 1.
- Bij twee monteurs ziet de klant maar één naam ("onder behandeling van ...").

## Dag 4 · 14 juni 2026 (backend en demo)
**Backend-verbeteringen na de eerste echte klussen, plus een demo-omgeving voor de website.**

### Demo-omgeving (/demo)
- Zelflopende demo van het klantportaal: loopt automatisch door de stadia (Ontvangen tot Klaar) en begint opnieuw. Voor de website-banner.
- Typemachine-intro en een Dubbele Dellorto DHLA 40 als voorbeeld.
- Showcase-foto's uit public/demo/, met terugval op tijdelijke foto's.

### Foto-onderzoek
- Geverifieerd dat alle foto's van Lude zowel in de database als in de opslag staan; niets verloren. Genest per stadium, foto's van beide monteurs samen onder de offerte-map.

### Klussen blijven vindbaar na facturatie (fase 1)
- De monteur-app voegt nu onze eigen behandelde klussen toe (uit werkbon_links) die niet meer geaccepteerd zijn, met een GEFACTUREERD-label. Volledig bewerkbaar. Geen losse Moneybird-facturen.
- Het label staat in de lijst, in de geopende werkbon en op het werkplaats-dashboard.

### Interne foto's per carburateur
- Onbeperkte interne fotostort per carburateur (50-100+ per monteur), opgeslagen in Supabase, nooit zichtbaar voor de klant. Stage-foto's (max 3) blijven de klant-foto's.

### Deelbare klus-URL
- Bij openen komt ?klus=<id> in de URL; opent automatisch weer en is via "Kopieer link" door te sturen naar een collega.

### Aandachtspunt
- Interne foto's vullen de opslag snel (gratis Supabase = 1 GB). Richting Supabase Pro bij dit volume; idee voor opslag-meter en opschoonscript.

### Nog te doen
- Fase 2: eigen klussen-tabel met opslaan-bij-openen (waterdicht).
- RLS dichtzetten, Anthropic-key omdraaien, eigen domein, opslag-beheer.

## Dag 5 · 17 juni 2026 (avond)
**Intern planningsbord (kanban, vervanger van Trello).**

### Werkplaats Planning
- Sleepbaar kanban-bord met kolommen van Werkplaats kaartenbak tot Klaar/archief. Elke klus is een kaart (gedeelde klus_id met de werkbon-app en Moneybird).
- Klus-kaarten en vrije planningskaarten, kaartleden (initialen-bollen), checklist met X/Y op de voorkant, kaart-detail met chat en automatisch activiteitenlog (realtime via Supabase).
- Verouderingskleur: geel 7+, oranje 14+, rood 30+ dagen in dezelfde kolom.
- Moneybird-inbound: een geaccepteerde offerte wordt automatisch een klus-kaart in Binnenkomst; label Gefactureerd zodra de klus niet meer geaccepteerd is.

### Meldingen en dagoverzicht
- @taggen in de kaart-chat en iemand op een kaart zetten geeft een melding. Belletje met realtime teller in de kop, banner op /start.
- Dagoverzicht "sinds gisteren op jouw kaarten" in de app, plus een e-mail om 18:00 (GitHub Action).

## Dag 6 · 18 juni 2026
**Slimmer en klantgericht.**

### Arbeid-alarm
- Seintje (in-app en mail) naar manager en admin als de geschreven monteurstijd hoger is dan de geoffreerde arbeid (uit Moneybird-grootboek "Werplaats uren", uurtarief 106 ex btw).

### Klant-akkoord en kaart-knoppen
- Digitale handtekening voor extra kosten op /volg, met label op het bord.
- Factuur-PDF en offerte-in-Moneybird als knoppen op de planningskaart.
- Stadia-foto's nu ook uit de galerij (meerdere tegelijk).
- Klus-herstel na facturatie: niets raakt kwijt.

## Dag 7 · 18-19 juni 2026
**Op slot en slim: beveiliging, back-up en AI-support.**

### Beveiliging live
- Portier op alle API-routes (login plus rolcheck) en RLS op alle tabellen, storage-policy en signed URLs. Service-role-sleutel server-only. Anthropic-sleutel omgedraaid.
- Learning: een pagina-login sluit de API's er niet vanzelf af; die moesten apart dicht.

### Foto-back-up en monitoring
- Dagelijkse back-up van alle foto-buckets naar Backblaze B2 (de database-back-up dekte de bestanden niet).
- B2-statuslamp toegevoegd aan de statusbalk op elke pagina.

### Support Hub
- AI-chat per carburateurtype, gegrond op de getranscribeerde en vertaalde servicehandleidingen (13 boekjes: Solex en Zenith). Klikbaar boekje (PDF) en referentietekeningen onder de chat. Maand-kostenteller en een premium Claude-look.

### Carburateur Database Hub
- /hub hernoemd naar Carburateur Database Hub. Overzicht als compacte foto-tegels (6 naast elkaar) met explosietekening, merk/type, voertuig en bouwjaar; volledig detail bij doorklikken.

### Nette URL's
- Alle pagina-URL's gelijkgetrokken met de paginatitels (/werkplaats-planning, /carburateur-database-hub, /support-hub, /cijfers, /werkplaats-dashboard). Alle interne links, deeplinks en import-aliassen meegewijzigd; geen redirects (oude URL's geven 404).

### Overig
- Breedtes gelijkgetrokken (kop op 920, werkplaats-dashboard vol-breed). Werkinstructie voor Lukas (manager) geschreven.

## Dag 8 · 22-23 juni 2026
**Sales & Marketing-dashboard van nul opgebouwd, een nieuwe conversie-landingspagina ontworpen, en de start van een eigen aanvraag-backend (Zapier + HubSpot eruit).**

### Sales & Marketing-dashboard (/sales-marketing, voor CG/LE/JM/LV)
- Leads herbouwd uit de volledige Gmail-extractie van label "website aanvraag": 1959 aanvragen terug tot okt 2023, bronnen genormaliseerd (organisch/google_ads/facebook/marktplaats).
- Per-deal attributie: elke betaalde Moneybird-factuur via de offerte gekoppeld aan de lead die 'm opleverde (script `leads-rematch.py`). Omzet telt in de maand/het kanaal van die lead.
- Groene banner met omzet-splitsing: totaal / zonder advertenties (organisch, gratis) / uit advertenties, met %.
- ROAS per kanaal, eerlijk: alleen betaalde-kanaal-omzet gedeeld door advertentiekosten (organisch telt niet mee). Per kaart de rekensom + uitleg, in gewone taal.
- Marktplaats-spend = alleen de Pro/Admarkt-facturen (de rest van dat grootboek = motoren-advertenties, andere tak).
- LTV-blok: gemiddelde klantwaarde per kanaal over de hele historie (organisch ~€537, Google ~€480).
- Bugfixes/perf: tijdzone-bug (maandgrenzen op UTC), spend/LTV/leads parallel, Marktplaats via datumfilter (1 call), laadbalk-overlay.
- "Groene cockpit"-redesign: gradient-hero, accent-tegels, detailtabellen ingeklapt (lichtgroene kop + zebra-rijen). Alle koppen/kolommen in gewone taal + begrippenlijst, zodat de jongens de termen leren.
- Pijplijn-notities schieten naar de gekoppelde Moneybird-offerte (met "Verzonden"-flash + dedup).

### Mail naar Google Ads-specialist (Stephan)
- Onderbouwd antwoord op basis van de data: lead→sale 18% (Google), ROAS 2026 4,6x, trend per kwartaal (Q1 4,3x, Q2 5,5x).

### Nieuwe Automotive-landingspagina (interne mockup: `automotive-nieuw.html`, nog niet live)
- Conversie via probleemherkenning: interactieve "Herken je dit?"-klachtenchecker (15 klachten, 3 brandgevaarlijk = rood/urgent), "uitstellen kost je motor"-blok (benzine koelt mee), werkwijze, USP's, merken, prijs.
- Aanvraagformulier met openingsvraag zelf/installatiepartner + particulier/zakelijk (bedrijfsvelden klappen uit); klachten vullen live vanuit de checker. Wordt de basis voor een volledig eigen carbservice.nl.

### Aanvraag-backend, start (branch `lead-intake-backend`, NIET live)
- Doel: Zapier (~€30/mnd) + HubSpot (€25/mnd) vervangen door een eigen pijplijn = ~€55/mnd besparing.
- Gebouwd: publiek `/api/aanvraag` + Revisio-formulier `/aanvraag`. Kenteken normaliseren + RDW-voertuigdata (gratis, geen sleutel), Moneybird contact (idempotent op e-mail) + CONCEPT-offerte, lead direct in het dashboard met bron, mailtje naar Cyriel. Alles faalt "zacht" (aanvraag nooit kwijt).
- Open: Resend-mailsleutel, Moneybird-template bevestigen, Google Contacts-OAuth, live zetten. Zie de takenlijst voor Cyriel.

## Dag 9 · 23 juni 2026 (publieke site live + tracking strak)
**De aanvraag-backend live gezet en de hele klantkant van carbservice.nl opnieuw opgebouwd: 3 snelle voertuig-landingspagina's + diensten + homepage op eigen subdomeinen, met volledige tracking.**

### Aanvraag-backend live (gemerged naar main)
- `/api/aanvraag` live: kenteken -> RDW (live) -> Moneybird CONCEPT-offerte (kenmerk = kenteken+voertuig+carburateur op 1 regel, of "[Geen kenteken opgegeven]") met 8 standaard-productregels als product-referenties -> lead in het dashboard met bron. CORS aan voor cross-origin.
- 65 Moneybird-contacten met cyrielgaemers@gmail.com (telefoon/inloop-noodvulling) opgeschoond.

### Drie voertuig-landingspagina's live op eigen subdomeinen
- automotive / motorfiets / boot(=marine & aggregaat, nu puur watersport).carbservice.nl, elk met eigen teksten (klachten, merken, stakes, prijs 165/85/100).
- Bewust GEEN Strikingly-embed (dat was traag = iframe + brak de tracking). In plaats daarvan statische pagina's op Vercel met host-rewrites in next.config (per subdomein de root naar de juiste .html). Razendsnel (~0,1 s).
- Mobiele conversie-fix: compacte klacht-chips + advies-balk plakt sticky onderaan in beeld. Favicon (favicon.svg), alle dashes weg (em/en-dash -> middendot/komma), spellcheck.
- Marine: "aggregaat" overal weg, watersport-framing (sloep/motorboot/dinghy, binnenboord/buitenboord) + blok "onze marinemonteur komt naar je boot" (op locatie/jachthaven).

### Diensten-overzicht + homepage
- `diensten.html`: 3 kaarten met foto's -> de subdomeinen, knop "Doe de klachtencheck".
- `home.html` (nieuwe homepage): banner + diensten + USP + Elfsight Google-reviews + FAQ + aanvraagformulier + Elfsight Carbie-chatbot. Shop linkt naar de bestaande Strikingly-winkel (die blijft Strikingly).

### Foto-upload bij aanvraag
- Klant uploadt max 10 foto's (in de browser gecomprimeerd) -> Supabase Storage (bucket aanvraag-fotos, onraadbaar token) -> galerij-link als INTERNE notitie op de concept-offerte in Moneybird. Lukas ziet de foto's vanuit Moneybird, geen Gmail-doorsturen meer.

### Moneybird = de waarheid (dashboard)
- Het Sales-dashboard synchroniseert bij elke load de offerte-status uit Moneybird (afgewezen/geaccepteerd verdwijnen uit de pijplijn) en wist offertes die in Moneybird verwijderd zijn.

### Tracking strak (GTM op alle pagina's)
- Google Tag Manager (GTM-MC3B7HR2) + `<noscript>` op elke landingspagina, plus een conversie-event `aanvraag_verstuurd` (met voertuigtype) bij formulier-succes. GA4 + Google Ads-tags vuren nu overal (waren op All Pages).
- In GTM gepubliceerd (Versie 11): trigger "Aanvraag verstuurd" + tag "GA4 - Aanvraag verstuurd" (event generate_lead, GA4-property Carburateur Service Nederland / G-C4SXRYSSQK).
- End-to-end getest: testaanvraag op automotive kwam binnen (segment automotive, RDW Peugeot 306, concept-offerte), test-lead daarna opgeruimd.
- Eigen bron-tracking (gclid/utm -> leads-tabel) blijft daarnaast bestaan en voedt het ROAS-dashboard.

### Strikingly
- De 3 Diensten-knoppen op carbservice.nl wijzen nu naar de subdomeinen -> die leads lopen via onze backend (niet meer via Zapier). Zapier blijft AAN tot ook de homepage-form is omgezet.

### Open voor morgen (24 juni)
- GA4: `generate_lead` als sleutelgebeurtenis markeren + importeren in Google Ads (reminder staat klaar voor 9:00).
- Betere, voertuig-specifieke foto's per pagina (nu demo-placeholders).
- Homepage aanscherpen (boodschap/FAQ/secties), dan home + diensten subdomeinen toevoegen en Strikingly "Home/Offerte" erheen -> homepage-leads ook van Zapier af.
- Pas als alles via de subdomeinen loopt: Zapier + HubSpot uitzetten.

## Dag 10 · 24 juni 2026
**Cijfers in een nieuw jasje en alles met datum + tijd.**

### Cijfer-dashboard uitgebouwd (/cijfers)
- Actieve **Offerte-aanvragen-teller** die meebeweegt met de filter maand / kwartaal / jaar (uit de Supabase-leads).
- **ROAS (Google + Meta)** en **Omzet uit advertenties** als periode-bewuste, sleepbare kaarten. De spend komt uit de maand-rapporten die er al waren (geen extra Moneybird-calls); het Marktplaats-detail blijft op /sales-marketing.
- **Futuristische gradient-groene hero** met de headline-KPI's: omzet, nettowinst, ROAS en aanvragen dit jaar.
- Learning: door de aanvragen + ROAS aan de bestaande maand/views-structuur te hangen, tellen alle filters automatisch correct mee.

### Logs: overal volledige datum + tijd
- `datumTijd` krijgt het jaar erbij (werkbon-logspoor en tijdregels), de planning-activiteitenlog toont nu altijd de volledige datum + tijd in plaats van alleen de tijd bij vandaag, en de lead-acties krijgen het jaar erbij.

### Fotografie-funnel voor Rin (/rin, zijproject)
- /rin omgebouwd tot een fotografie-funnel voor **YourPersonalPaparazzi** (Rin Hortulanus), in haar eigen merk en toon (gebaseerd op yourpersonalpaparazzi.eu). Aanvraag → /api/rin → tabel `rin_aanvragen` (zacht falend). Open: SQL draaien, eigen URL koppelen, echte foto's. Samen verder op dinsdag 30 juni.

### Sales-pijplijn flink verbeterd (/sales-marketing)
- Leadkaart overzichtelijk: **telefoonnummer groot en klikbaar** (tel:-link), **Kenmerk en Klacht altijd apart** en duidelijk (met "niet opgegeven" als een veld leeg is, zodat elke kaart consistent/waterdicht is), **changelog** met eigen kop en groter.
- Data-inzicht: van 40 recente leads zijn er maar 2 het gestructureerde aanvraag-formaat; de rest is vrije tekst (`bericht` = klacht, `carburateur` = kenmerk). De parsing is daarop afgestemd.
- Nieuwe status **"vernieuwde offerte"**; pijplijn **sorteert op status** (te-bellen bovenaan, afgehandelde zakken naar onderen).
- Belknop: alleen nog **"Niet opgenomen"** (de "Gesproken"-knop is op verzoek verwijderd).
- **Geaccepteerd** wordt gelogd (datum + persoon) maar doet **geen actie meer in Moneybird**; de gewonnen lead blijft staan met een feestelijke **groene balk + vlaggetjes-slinger** ("GEWONNEN, YEAH BABY!"). Telt mee als gewonnen.
- **"Gewonnen"-filter + teller** bij de pijplijn.

### Cijfer-dashboard: sales-activiteit per dag
- Nieuwe sleepbare kaart **"Sales-activiteit per dag"**: per dag en per persoon de gebelde/gemiste leads en de gewonnen deals (laatste 14 dagen, uit `lead_actie`).

### Meldingen + kleine UX
- **WhatsApp-melding bij elke nieuwe lead** ingebouwd (CallMeBot → +31653864208); wacht alleen nog op de `WHATSAPP_APIKEY` in Vercel. Ontdekt: de aanvraag-mail ging nooit af doordat de **Resend-sleutel** ontbreekt; ontvanger staat nu standaard op info@carbservice.nl.
- Statusbalk toont **volledige namen** (Revisio app, Revisio API, Backblaze B2 backup, ...).
- Auto-uitlog van 2 uur naar **18 uur** (de 2-uurs-cap logde mensen midden in de werkdag uit).

### Stephan (Google Ads): SEO-advies
- Stephan adviseert de landingspagina's als **subdirectory** (carbservice.nl/auto-carburateur-reviseren etc.) i.p.v. subdomeinen. Plan: **Cloudflare path-routing** (alleen die paden naar onze Vercel-backend, de rest rechtstreeks naar Strikingly), zodat de webshop niet trager wordt. Feedback gelogd, concept-reply opgesteld. Stephan pakt de Ads-conversie (primary) + offline conversies op.

### Open / volgende
- **Beslissen + bouwen**: Stephan-subdirectory via **Cloudflare path-routing** (apex-routing, webshop eerst testen).
- **Volgende ronde**: dag-afsluiting per medewerker (push/WhatsApp/mail): "Naam: X leads behandeld, X geaccepteerd".
- `WHATSAPP_APIKEY` in Vercel zetten (activeren vanaf +31653864208) en de melding live testen.
- GA4 `generate_lead` als sleutelgebeurtenis bevestigen + importeren in Google Ads.
- Resend-mailsleutel → automatische bevestigingsmail naar de klant.
- Dagelijkse auto-sync (cron) voor omzet/leads/spend; nu nog momentopnames.
- Betere, voertuig-specifieke foto's op de landingspagina's.
- planning-schema.sql eenmalig in Supabase draaien; service-role-key roteren + rol-test.

## Dag 11 · 29-30 juni 2026 (de aanvraag-machine + fundament)
**Van losse pagina's naar één strakke conversie-machine, plus de basis op orde.**

### Homepage + navigatie
- Volwaardige nav (Diensten · Blog · FAQ · Volg je revisie · Shop · Offerte) + **hamburger-menu** op mobiel + Blog/FAQ/Privacy in de footer.

### Blog afgemaakt
- **47 artikelen** gemigreerd (eigen herhoste foto's, BlogPosting-schema), index met **filters** (type + 10 merken), **7 artikelen met YouTube-Short** (incl. verbussen). Blog-foto's openen nu in een **lightbox** i.p.v. nieuw tabblad. Solex-blog: USP "zeldzame fabrieksdocumentatie & jetting".

### Aanvraagformulier gecentraliseerd (forms.js)
- Alle formulier-logica (versturen, tracking, foto-upload) in één gedeeld `public/forms.js` → 4 pagina's, **één bron**. Laadbalk verhuisd naar **IN de verzendknop** (vult zich tijdens upload + "aanvraag verwerken"-fase met trickle).
- Linkje bij het klachtveld → springt naar de **klachten-checker** (die het veld automatisch invult).

### Klachten-checkers gelijkgetrokken
- Auto/motor/boot-landingspagina's nu ook **3-niveaus geel/oranje/rood** met legenda (zoals de homepage), brandgevaar-chips neutraal tot aangeklikt.

### Bezoekers-spoor per lead
- `track.js` op elke pagina houdt **bron + klik-spoor** bij; meegestuurd met de aanvraag → leesbaar in de Moneybird-offertenotitie.

### Hub-match bij aanvragen
- Nieuwe `lib/hubmatch.js`: matcht de opgegeven carburateur (tagnummer of type, bv. "Solex PDSI") tegen de kennbladen + DVG-crossref. Bij een treffer een **"🎯 HUB-MATCH!"-notitie** op de offerte (link `?q=` naar de Hub). Draait via **`after()`** ná de respons, zodat de klant er niet op wacht.

### Planning
- URL's in de kaart-chat worden nu **klikbare hyperlinks** (`linkifyUrls`).

### Privacy / consent uitgezocht
- Eigen `privacy.html` (algemeen + compliant) + footer-links. Cookie-banner = **iubenda via GTM** (de "Cookiebanner"-tag) → besluit: **houden** (gratis, correct, Consent Mode v2). Vercel-popje is een domein-kwestie, weg na cutover.

### Back-up zuiniger
- Foto-back-up naar Backblaze B2 nu **dagelijks + incrementeel** (alleen nieuwe bestanden t.o.v. B2) i.p.v. wekelijks-alles → veilig binnen de gratis Supabase-egress.

### Domein-cutover (Mijndomein)
- Mijndomein bevestigt: domein verhuizen + e-mail (info@/lukas@) voortzetten via **IMAPsync** + zelf DNS beheren + **zero-downtime via "verhuis later"**. Kosten ± €95/jaar ex btw. Besluit: deze week **LIVE via snelle Strikingly-DNS-route**, daarna pas de transfer.

### Klein
- Meldingen-centrum (/start): **"Alles gelezen"** + per-melding "Gelezen"-knop. Marine-formulier placeholder → "Yamaha 9.9 of Volvo Penta B12".

### Open / volgende
- WhatsApp-knop + social op de site · Google **Ads-conversie-tag** (Stephan) · **iubenda-config** afmaken (met Stephan) · **EPP-code** bij Strikingly opvragen voor de domeintransfer.
