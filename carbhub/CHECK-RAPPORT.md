# Controle-rapport Carburateur Hub — nacht 15 juni 2026

Geautomatiseerde QA-pass over het werk van vandaag (18 kennbladen, ~1.350 onderdeelregels). Stand bij batterij bijna leeg; visuele hercontrole van de nummering nog niet af.

## Doorgevoerd (veilig, gepusht)
- **Bestelnummers komma → punt**: 230 nummers gecorrigeerd (bv. `7.17626,00` → `7.17626.00`). Het Duitse blad gebruikt een komma; ons formaat is een punt.
- **Vertaalconsistentie**: kernbegrippen uit de vaste woordenlijst gelijkgetrokken (6 afwijkingen ge-snapt).
- **Tag-placeholder** opgeschoond bij `31pic6-vwgolf-1093` (tweede uitvoering 9.79-, tagletter nog onbekend).

## Nummering — AFGEROND (16 juni)
Volgordecontrole (mono_check.py) gedraaid over alle 18 bladen. 8 bladen hadden
echte leesfouten in de Bild-nummers (verschoven reeksen). Alle 8 zijn opnieuw
scherp gelezen tegen hoge-res scans en gecorrigeerd:
- Audi 80, VW Passat (1B1), VW Iltis, VW LT 28 — 1B1-serie, reeksverschuivingen rechtgezet.
- Audi 80 S, VW Passat 1,6, Golf/Jetta/Scirocco — 1B3-serie, twee uitvoeringen, assembly-ranges hersteld.
- Mercedes 250 (laat), Mercedes 280 (zwart) — Solex 4A1, geneste samenstellingen met range-koppen.
Resultaat: 0 terugsprongen op alle gecorrigeerde bladen. De 4 resterende enkel-
sprongetjes (`53→43a`, `44→43a`, `52→43a`, `73→69`) zijn legitieme assembly-nesting,
geen fouten. Restonzekerheid: enkele bestelnummers (klein schrift) blijven steekproef;
de explosietekening blijft de canonieke nummer-bron.
2. **Vertalingen buiten de woordenlijst** (38 termen met meerdere varianten, meest kleine verschillen): bv. "Satz-…" als "Set X" vs "X set"; "Drosselhebel" → Gasklephendel/Smoorhendel; "Sechskantschraube" → Zeskantbout/Zeskantschroef. Eén standaard kiezen en gelijktrekken.
3. **Bestelnummers steekproef**: klein schrift, steekproefsgewijs gelezen. Bij twijfel scan naast leggen (staat al als notitie onder elke lijst).
4. **Audi 80**: handmatig ingelezen met eigen b/c-subnummers (40b, 42b, 43b, 78b) — die wijken af van de bladnummering; gelijktrekken met de agent-aanpak van de andere 17.

## Bestanden
- Brondata: `carbhub/kennbladen-uniek.json` (volledig, met onderdelen)
- App-data: `app/hub/data.ts` (gegenereerd, niet handmatig bewerken)
- Ruwe leesresultaten + scripts: `Downloads/hub-render/` (parts_*.json, qa_check.py, merge_parts.py)

## Volgende stap (afgesproken)
Push naar Supabase: data in tabellen + tekeningen/scans naar Storage, daarna kenteken/RDW-match. Doen we morgen samen.
