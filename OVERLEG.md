# Revisio werkplaats, stand van zaken

## Wat al af is

- Monteurs-app op `/werkplaats`: stadia met voortgang, tijdregistratie (timer plus handmatig), afstelling en sproeierbezetting, extra artikelen, opmerkingen, eindcontrole, retour-vinkje, logspoor en foto's per stadium.
- Pincode-login per monteur via de tabel `app_gebruikers` (interne drempel, nog geen echte beveiliging).
- Retour-teller op beide dashboards.
- Werkbonnen-dashboard met zoeken plus een aparte alleen-lezen leespagina op `/werkbon-bekijk`.
- Datum-tijd-stempel onder elke tijdregel (naam groot, datum en tijd klein en grijs eronder).
- Stadia hernoemd naar: Ontvangst, Demontage, Ultrasoonreiniging, Heropbouwen, Eindcontrole.
- Voortgangsbalk netjes afgekaderd, lange namen breken binnen hun tegel.
- Visuele opfris: lichte stijl met duidelijke blokafzetting (rand plus zachte schaduw). Donkere modus geprobeerd en bewust teruggedraaid.
- Fotocompressie bij upload (verkleint naar max 1600px, JPEG kwaliteit 0,7, valt veilig terug op origineel). Net via Claude Code in het project gezet.
- Claude Code voor VS Code geïnstalleerd en ingelogd op je Claude-abonnement.

## Nog te doen, op korte termijn

- **Code veiligstellen op GitHub** voordat je grote dingen verbouwt. Vangnet om altijd terug te kunnen.
- **`page.tsx` opsplitsen** in losse componenten (map `components` met `BlokTijd.tsx`, `BlokVoortgang.tsx`, `BlokEindcontrole.tsx`, `WerkbonBekijk.tsx`). Bestandsnaam moet `page.tsx` blijven, nummers kunnen niet. Doel: Ivo hoeft niet meer in 1200 regels te zoeken.
- **Bon waterdicht maken**: bij het aanmaken van een werkbon de kerngegevens (nummer, klant, voertuig, bedrag) volledig in Supabase vastleggen, zodat een bon nooit verdwijnt als de Moneybird-status verandert.

## Nog te doen, rond livegang

- **E-maillogin** (Supabase Auth magic link): alleen mailadressen die in `app_gebruikers` staan mogen inloggen. Vervangt de pincode.
- **Back-ups regelen**: gratis Supabase heeft geen back-ups. Of naar Supabase Pro (25 dollar per maand, automatische back-ups plus meer opslag), of een gratis dagelijkse back-up via GitHub Actions opzetten.
- **RLS dichtzetten** en het dashboard achter een admin-rol, voordat het op het open internet staat.
- Eigen domein, bijvoorbeeld app.carbservice.nl via Vercel plus Cloudflare.

## Voor later, ideeën

- Coach-script dat dagelijks of wekelijks je cijfers bekijkt (omzet, closing rate, doorlooptijd, retouren) en proactief ondernemerstips geeft, in de geest van Dick.
- Oude foto's alsnog comprimeren (opschoonscript).
- Opschoning van afgeronde en betaalde klussen ouder dan bijvoorbeeld twee jaar, altijd handmatig te starten.
- Automatisch klant-mailtje met volglink bij het laatste stadium.

## Belangrijke aandachtspunten

- **Twee Claudes, houd ze gescheiden.** De Claude in VS Code doet voortaan de bouwwijzigingen (kan direct in je echte bestanden). De overleg-Claude gebruik je voor overleg, plannen en het opschrijven van duidelijke opdrachten. Zo raak je niet de draad kwijt over welke versie de echte is.
- **Foto's zijn de grootste slokop** in opslag, daarom is compressie nu opgelost. Houd dit in de gaten bij livegang.
- **Moneybird levert de live klantgegevens**, Supabase is jouw eigen database voor de werkbon-data. De koppeling tussen beide is `klus_id`.
