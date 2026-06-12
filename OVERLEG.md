# Revisio werkplaats, stand van zaken

_Laatst bijgewerkt: 12 juni 2026._

## Wat al af is

- Monteurs-app op `/werkplaats`: stadia met voortgang, tijdregistratie (timer plus handmatig), afstelling en sproeierbezetting, extra artikelen, opmerkingen, eindcontrole, retour-vinkje, logspoor en foto's per stadium.
- Retour-teller op beide dashboards.
- Werkbonnen-dashboard met zoeken plus een aparte alleen-lezen leespagina op `/werkbon-bekijk`.
- Datum-tijd-stempel onder elke tijdregel (naam groot, datum en tijd klein en grijs eronder).
- Stadia hernoemd naar: Ontvangst, Demontage, Ultrasoonreiniging, Heropbouwen, Eindcontrole.
- Voortgangsbalk netjes afgekaderd, lange namen breken binnen hun tegel.
- Visuele opfris: lichte stijl met duidelijke blokafzetting (rand plus zachte schaduw). Donkere modus geprobeerd en bewust teruggedraaid.
- Fotocompressie bij upload (verkleint naar max 1600px, JPEG kwaliteit 0,7, valt veilig terug op origineel).
- Claude Code voor VS Code geïnstalleerd en ingelogd op je Claude-abonnement.

### Gedaan op 12 juni 2026

- **Alle code veiliggesteld op GitHub** (`carbservice/revisio`). Tot dan stond een groot deel alleen lokaal.
- **Gedeelde basis in `/lib`**: kleuren (`theme.ts`), opmaak-helpers (`format.ts`) en types (`types.ts`) staan nu op één plek; alle 6 pagina's importeren ze in plaats van ze over te typen. Eén wijziging werkt overal door.
- **Huisstijl gelijkgetrokken**: rand, paginafond en het euro-formaat zijn nu consistent over alle pagina's.
- **`werkplaats/page.tsx` opgesplitst** (1137 → ~886 regels) in losse componenten in `app/werkplaats/components/`: BlokOpmerkingen, BlokArtikelen, BlokEindcontrole, BlokTijd, BlokAfstelling en de alleen-lezen WerkbonBekijk.
- **Database-gat gedicht**: tabellen `klus_voortgang` en `klus_fotos` ontbraken in Supabase (foto's en stadia werkten daardoor niet). Aangemaakt + foutmeldingen in de app zichtbaar gemaakt.
- **Bulk foto-upload**: onderaan de werkbon kun je in één keer meerdere foto's uploaden (verkleind), met een tellingoverzicht en thumbnails per stadium.
- **E-maillogin live** (Supabase Auth magic link): vervangt de pincode. Alleen e-mailadressen in `app_gebruikers` mogen inloggen; koppeling op e-mail, met admin-rol voor cyrielgaemers@gmail.com. Inlogmails in het Nederlands (Magic Link + Confirm signup sjablonen), verstuurd via Gmail-SMTP.
- **Productie draait**: app live op `revisio-umber.vercel.app`. Moneybird- en Anthropic-keys staan nu ook in Vercel (Environment Variables), dus klussen en de AI-knop werken live.

## Nog te doen, op korte termijn

- **Anthropic API-key omdraaien**: de sleutel is tijdens het werk in de chat zichtbaar geweest. Nieuwe key maken (console.anthropic.com), oude intrekken, bijwerken in `.env.local` én Vercel. Niet urgent, wel netjes.
- **Eigen domein instellen**: `app.carbservice.nl` via Vercel (Domains) + CNAME in de Strikingly DNS Manager. Daarna in Supabase de Site URL en Redirect URLs naar dat domein zetten. De root `carbservice.nl` blijft de Strikingly-site, dus een subdomein gebruiken.
- **Bon waterdicht maken**: bij het aanmaken van een werkbon de kerngegevens (nummer, klant, voertuig, bedrag) volledig in Supabase vastleggen, zodat een bon nooit verdwijnt als de Moneybird-status verandert.
- **Collega's informeren**: pincode werkt niet meer, voortaan inloggen via hun e-mailadres (de 5 staan klaar in `app_gebruikers`).

## Nog te doen, rond livegang

- **Back-ups regelen**: gratis Supabase heeft geen back-ups. Of naar Supabase Pro (25 dollar per maand, automatische back-ups plus meer opslag), of een gratis dagelijkse back-up via GitHub Actions opzetten.
- **RLS dichtzetten** en het dashboard achter de admin-rol (die staat al in `app_gebruikers`), voordat het volledig open op internet staat. Let op: nu staan de Supabase-policies bewust ruim open (`anon`).
- **E-mail later professioneel maken**: nu verstuurt Gmail-SMTP de inlogmails (prima voor dit volume). Wil je vanaf `noreply@carbservice.nl` mailen, dan is Resend met domeinverificatie de stap.

## Voor later, ideeën

- Coach-script dat dagelijks of wekelijks je cijfers bekijkt (omzet, closing rate, doorlooptijd, retouren) en proactief ondernemerstips geeft, in de geest van Dick.
- Oude foto's alsnog comprimeren (opschoonscript).
- Opschoning van afgeronde en betaalde klussen ouder dan bijvoorbeeld twee jaar, altijd handmatig te starten.
- Automatisch klant-mailtje met volglink bij het laatste stadium.

## Belangrijke aandachtspunten

- **Twee Claudes, houd ze gescheiden.** De Claude in VS Code doet de bouwwijzigingen (kan direct in je echte bestanden). De overleg-Claude gebruik je voor overleg, plannen en het opschrijven van duidelijke opdrachten.
- **Foto's zijn de grootste slokop** in opslag, daarom is compressie opgelost. Houd dit in de gaten bij livegang.
- **Moneybird levert de live klantgegevens**, Supabase is jouw eigen database voor de werkbon-data. De koppeling tussen beide is `klus_id`.
- **Omgevingsvariabelen staan op twee plekken**: lokaal in `.env.local` en in Vercel (Environment Variables). Wijzig je er één, werk dan ook de ander bij — en na een wijziging in Vercel altijd opnieuw deployen.
- **Auth-instellingen in Supabase**: Site URL en Redirect URLs moeten elk domein bevatten waarop je inlogt (nu localhost + de Vercel-URL; straks ook het eigen domein), anders werkt de inloglink daar niet.
