# Revisio werkplaats, stand van zaken

_Laatst bijgewerkt: 13 juni 2026. Livegang: 13 juni 2026 (uitgevoerd)._

## Wat al af is

- Monteurs-app op `/werkbonnen` (heette eerst `/werkplaats`): stadia met voortgang, tijdregistratie (timer plus handmatig), afstelling en sproeierbezetting, extra artikelen, opmerkingen, eindcontrole, retour-vinkje, logspoor en foto's per stadium.
- Retour-teller op beide dashboards.
- Werkbonnen-dashboard met zoeken plus een aparte alleen-lezen leespagina op `/werkbon-bekijk`.
- Datum-tijd-stempel onder elke tijdregel.
- Stadia (intern): Ontvangst, Demontage, Ultrasoonreiniging, Heropbouwen, Eindcontrole.
- Lichte huisstijl met duidelijke blokafzetting.
- Fotocompressie bij upload (max 1600px, JPEG kwaliteit 0,7, valt veilig terug op origineel).

### Gedaan op 12 juni 2026

**Code en structuur**
- Alle code veiliggesteld op GitHub (`carbservice/revisio`); stond daarvoor deels alleen lokaal.
- Gedeelde basis in `/lib`: kleuren (`theme.ts`), opmaak-helpers (`format.ts`) en types (`types.ts`); alle pagina's importeren deze.
- Huisstijl gelijkgetrokken (rand, paginafond, euro-formaat) over alle pagina's.
- `werkbonnen/page.tsx` opgesplitst in losse componenten (`app/werkbonnen/components/`): BlokOpmerkingen, BlokArtikelen, BlokEindcontrole, BlokTijd, BlokAfstelling, WerkbonBekijk.
- Monteur-app verhuisd van `/werkplaats` naar `/werkbonnen`; oude pad redirect automatisch.
- Uniforme paginakop op de drie hoofdpagina's, vaste volgorde: statusbalk, ingelogd-als, titel, zoekbalk.

**Database**
- Ontbrekende tabellen `klus_voortgang` en `klus_fotos` aangemaakt (foto's en stadia werkten daardoor eerder niet).
- Tabel `werkbon_links` aangemaakt (klant-deellink, code, ordernummer, klant, voertuig, klacht).
- Velden `gepubliceerd_op` op `klus_voortgang` en `klus_fotos` (voor handmatig publiceren naar de klant).

**Login en beveiliging**
- E-maillogin via Supabase Auth (magic link plus inlogcode) vervangt de pincode. Alleen e-mailadressen in `app_gebruikers` mogen inloggen; admin-rol voor cyrielgaemers@gmail.com.
- Inlogcode (verifyOtp) naast de magic link, zodat inloggen op mobiel volledig in hetzelfde tabblad kan (geen mini-browser-probleem). Code is 8-cijferig (instelbaar in Supabase).
- Inlogmails in het Nederlands (Magic Link en Confirm signup), verstuurd via Gmail-SMTP.
- Dashboards achter login plus admin-rol (`AuthGate`): alleen ingelogde admins zien `/dashboard` en `/dashboard/werkplaats`; monteurs krijgen "geen toegang".

**Dashboards en monitoring**
- Drie-knops-navigatie (Cijfers, Werkplaats Dashboard, Werkbonnen) met prefetch.
- Data-buffer (`lib/cache.ts`): terugkeren toont direct de vorige cijfers en ververst op de achtergrond.
- Geeky laadscherm met per-API status.
- Systeemstatus-balk (App, API, Moneybird, Supabase, GitHub) met live-lampjes via `/api/health`, ververst elk kwartier; zichtbaar op de dashboards en de werkbonnen-app.
- Health-alert: een GitHub Action pingt elk kwartier `/api/health` en mailt bij een storing naar cyrielgaemers@gmail.com en info@carbservice.nl (onderwerp `URGENT SERVER DOWN`). Vereist de secrets `ALERT_GMAIL_USER` en `ALERT_GMAIL_PASS` in GitHub.
- Werkplaats-dashboard toont nu het echte ordernummer, klant en kenmerk uit Moneybird in plaats van de ruwe klus-id.

**Foto's**
- Bulk foto-upload met tellingoverzicht en thumbnails per stadium.
- Maximaal 3 foto's per stadium (zowel monteur- als klantkant).
- Lightbox: foto's openen groot in de app (vegen en pijlen, blijft binnen het stadium) in plaats van een los Supabase-tabblad. In beide apps.

**Extra**
- Scroll-naar-boven-knop op de drie hoofdpagina's.
- Standaardartikelen uitgebreid: Vacuumleiding, Benzineleiding, Membraandoek, Klemmen.
- Logo (carburateur) als favicon (`app/icon.png`) en bovenaan het klantportaal.

### Klantportal (`/volg`)

- Klant logt in met ordernummer plus code, of via een directe deel-link. Toont offertenummer, kenmerk, klacht en de revisievoortgang.
- Handmatig publiceren: de klant ziet alleen wat de monteur via "Stuur update naar klant" pusht. Geen auto-updates, geen triggers bij het afvinken van stadia.
- Klantvriendelijke stadium-namen: Ontvangen, Diagnose, Reviseren, Afbouwen en aftesten, Klaar om te verzenden of op te halen.
- Stadia onder elkaar met de gepubliceerde foto's per fase. Chique donkergroen-op-wit, grote leesbare tekst (oudere doelgroep), je-vorm.
- Meelopend carburateur-icoon dat de voortgangsbalk traag vult tot het huidige stadium, met percentage. Verticaal bij de klant, horizontaal in de monteur-app (loopt opnieuw bij elke bevestiging).
- Klant-data staat volledig in Supabase (`werkbon_links`, `klus_voortgang`, `klus_fotos`) en blijft zichtbaar via de URL en code, ook nadat de offerte gefactureerd is. Geverifieerd: de klant-API heeft geen Moneybird-afhankelijkheid en er is geen automatische opschoning.

### Gedaan op 13 juni 2026 (livegang)

Getest in de werkplaats door Rens en Lukas, onder andere op een offerte met twee carburateurs.

**Back-ups**
- Dagelijkse database-back-up via een GitHub Action (`.github/workflows/db-backup.yml`): elke nacht 02:00 UTC plus handmatig. Volledige dump met `pg_dump` (Postgres 17-client uit de PGDG-repo), bewaard als artifact (90 dagen). Vereist de secret `SUPABASE_DB_PASSWORD` in GitHub. Faalt hard (rood) als de dump leeg is, zodat een mislukte back-up niet als groen wordt gemeld.

**Mobiel (iPhone)**
- `viewport-fit: cover` plus safe-area-padding, zodat de inhoud netjes tot in de randen loopt en de vaste onderbalk boven de iPhone home-indicator blijft. Nette titel (Revisio) en theme-color.

**Foto's**
- Algemene foto-dump per revisie is nu onbeperkt (de max-3 geldt alleen per stadium).

**Klantportaal (`/volg`)**
- Monteur-voornaam zichtbaar ("onder behandeling van ..."); de API leest die uit `tijdregels` maar geeft nooit de tijd terug.
- Helderdere kop: welkomtekst, groot offertenummer, "Deze revisie is voor", de klacht, een groot percentage-vak en een verwachting-blok onderaan.
- Carburateur-animatie speelt opnieuw af zodra de voortgangsbalk weer in beeld komt (klant en monteur, via IntersectionObserver).
- Tijdlijn vloeiender: niet meer meten per frame, dus geen gehaper bij scrollen.
- Carburateur zakt bij 20% naar de onderkant van het ontvangst-vak in plaats van bovenin te blijven hangen.
- Deel-knop (WhatsApp) waarmee de klant zijn unieke volglink doorstuurt, plus social-balk (YouTube, Instagram, Facebook, TikTok, LinkedIn).

**Voortgang-telling herzien**
- Het actieve (hoogst afgevinkte) stadium telt als "bezig" en nog niet mee in het percentage; alleen voltooide stadia tellen. Ontvangst is een uitzondering: bevestigen (met foto) is meteen 20%. Het laatste stadium (100%) betekent klaar.
- Monteur-app en klantportaal rekenen met exact dezelfde formule en tonen hetzelfde percentage.

**Twee carburateurs per offerte**
- Bij een offerte met twee carburateurs kunnen beide monteurs tegelijk werken zonder elkaar te overschrijven. De technische werkbon (afstelling, sproeiers, checklist, artikelen, opmerking, retour) staat per carburateur apart via een afgeleide sleutel (`klus_id#2` voor carburateur 2). Stadia, foto's en tijd blijven gedeeld, zodat de klant een gecombineerde voortgang ziet. Keuzeknop Carburateur 1 / 2 bovenin de werkbon; standaard 1, dus losse klussen veranderen niet.
- Aandachtspunt: de pagina "Bekijk werkbon (alleen lezen)" toont nu alleen carburateur 1, en de klant ziet bij twee monteurs maar één naam.

**Klein**
- Kopieer-knop (klantlink) geeft een korte "Gekopieerd!"-bevestiging.

### Gedaan op 14 juni 2026 (backend en demo)

**Demo-omgeving (`/demo`)**
- Zelflopende demo van het klantportaal die automatisch door de stadia loopt (Ontvangen 20% tot Klaar 100%) en daarna opnieuw begint. Voor de website-banner ("Ga naar de DEMO omgeving").
- Typemachine-intro die de bezoeker meeneemt; Dubbele Dellorto DHLA 40 als voorbeeld.
- Showcase-foto's komen uit `public/demo/` (ontvangen/diagnose/reviseren/afbouwen/klaar.jpg), met terugval op tijdelijke foto's zolang die ontbreken.

**Foto-onderzoek**
- Geverifieerd dat alle foto's van Lude (offerte 2026-0566) zowel in `klus_fotos` als in de opslag staan; niets verloren. Ze staan genest per stadium; de foto's van beide monteurs staan samen onder de offerte-map.

**Klussen blijven vindbaar en bewerkbaar na facturatie (fase 1)**
- De monteur-app toonde alleen Moneybird-`accepted` offertes, waardoor een gefactureerde klus verdween. Nu voegt de klussen-API onze eigen behandelde klussen toe (uit `werkbon_links`) die niet meer accepted zijn. Die krijgen status `gefactureerd` en blijven volledig bewerkbaar. Bewust GEEN losse Moneybird-facturen, alleen offertes die wij behandeld hebben.
- Een GEFACTUREERD-label staat in de monteur-lijst, in de geopende werkbon en in de werkbonnen-lijst van het werkplaats-dashboard.
- Volgende stap (fase 2): een eigen `klussen`-tabel met opslaan-bij-openen, zodat ook nooit-gepubliceerde klussen waterdicht bewaard blijven.

**Interne foto's per carburateur**
- De bulk-fotostort is nu intern: onbeperkt aantal (50-100+ per monteur), opgeslagen in Supabase onder stadium `intern-<carburateur>` in een eigen opslagmap. Deze foto's worden NOOIT gepubliceerd; "Stuur update naar klant" publiceert alleen de stage-foto's (max 3 per stadium).

**Deelbare klus-URL**
- Bij het openen van een klus komt `?klus=<id>` in de URL; die opent automatisch weer en is via "Kopieer link" door te sturen naar een collega. (Let op: de parameter gaat verloren bij een verse magic-link-login.)

**Aandachtspunt opslag**
- Interne foto's groeien hard: gratis Supabase is 1 GB, dus ~30-40 zulke klussen. Richting Supabase Pro bij dit volume. Idee: opslag-meter in het dashboard en een opschoonscript.

## Livegang (13 juni 2026)

- Monteur-app gaat live; eerste klant gaat live op het portaal.
- Aandachtspunt: push de laatste klant-update (bijvoorbeeld "Klaar om op te halen") voordat je de offerte factureert. Na facturatie verdwijnt de klus uit de monteur-app (Moneybird-status niet meer `accepted`) en kun je geen update meer pushen. De klant blijft alles zien wat tot dan toe gedeeld is.
- Collega's informeren: de pincode werkt niet meer, voortaan inloggen via hun e-mailadres (de adressen staan klaar in `app_gebruikers`).

## Nog te doen, op korte termijn

- **Woensdag 17 juni 2026, 10:00 — showcase-foto's voor de demo uploaden.** Vijf foto's in `public/demo/`: `ontvangen.jpg`, `diagnose.jpg`, `reviseren.jpg`, `afbouwen.jpg`, `klaar.jpg` (vierkant, klein). Zolang ze ontbreken valt de demo terug op tijdelijke foto's.
- Anthropic API-key omdraaien: de sleutel is tijdens het werk in de chat zichtbaar geweest. Nieuwe key maken, oude intrekken, bijwerken in `.env.local` en in Vercel.
- Eigen domein instellen: `app.carbservice.nl` via Vercel (Domains) plus een CNAME in de Strikingly DNS Manager. Daarna in Supabase de Site URL en Redirect URLs naar dat domein zetten. De root `carbservice.nl` blijft de Strikingly-site, dus een subdomein gebruiken.
- Bon waterdicht maken (fase 2): fase 1 is gedaan (gefactureerde klussen blijven vindbaar via `werkbon_links`). Voor de echte sluitpost een eigen `klussen`-tabel met opslaan-bij-openen, zodat ook nooit-gepubliceerde klussen bewaard blijven.
- Opslag-beheer: opslag-meter in het dashboard en/of een opschoonscript voor oude, afgeronde klussen. Bij veel interne foto's richting Supabase Pro.

## Nog te doen, rond livegang

- Back-ups: GEDAAN. Gratis dagelijkse database-back-up via een GitHub Action (zie "Gedaan op 13 juni 2026"). Eventueel later nog Supabase Pro voor automatische point-in-time-back-ups.
- RLS dichtzetten (echte sluitpost): de dashboards zitten in de UI achter login plus admin-rol, maar de database-policies staan nog bewust ruim open en de API-routes checken de rol nog niet zelf. Volgende stap: RLS per rol plus rolcheck in de API-routes.
- E-mail later professioneel maken: nu verstuurt Gmail-SMTP de mails (prima voor dit volume). Vanaf `noreply@carbservice.nl` mailen kan met Resend plus domeinverificatie.

## Voor later, ideeën

- Coach-script dat periodiek de cijfers bekijkt (omzet, closing rate, doorlooptijd, retouren) en proactief ondernemerstips geeft.
- Oude foto's alsnog comprimeren (opschoonscript).
- Opschoning van afgeronde en betaalde klussen ouder dan bijvoorbeeld twee jaar, altijd handmatig te starten.
- Automatisch klant-mailtje met volglink bij een nieuwe update of het laatste stadium.

## Belangrijke aandachtspunten

- Foto's zijn de grootste slokop in opslag; daarom compressie plus maximaal 3 per stadium.
- Moneybird levert de live klantgegevens voor de monteur-app; Supabase is de eigen database voor de werkbon- en klantdata. De koppeling is `klus_id`.
- Het klantportaal staat los van Moneybird en blijft dus werken na facturatie.
- Omgevingsvariabelen staan op twee plekken: lokaal in `.env.local` en in Vercel. Wijzig je er een, werk dan ook de ander bij en deploy opnieuw.
- Auth-instellingen in Supabase: Site URL en Redirect URLs moeten elk domein bevatten waarop je inlogt (nu localhost en de Vercel-URL; straks ook het eigen domein).
