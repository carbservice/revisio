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
