# Controle-rapport Carburateur Hub — nacht 15 juni 2026

Geautomatiseerde QA-pass over het werk van vandaag (18 kennbladen, ~1.350 onderdeelregels). Stand bij batterij bijna leeg; visuele hercontrole van de nummering nog niet af.

## Doorgevoerd (veilig, gepusht)
- **Bestelnummers komma → punt**: 230 nummers gecorrigeerd (bv. `7.17626,00` → `7.17626.00`). Het Duitse blad gebruikt een komma; ons formaat is een punt.
- **Vertaalconsistentie**: kernbegrippen uit de vaste woordenlijst gelijkgetrokken (6 afwijkingen ge-snapt).
- **Tag-placeholder** opgeschoond bij `31pic6-vwgolf-1093` (tweede uitvoering 9.79-, tagletter nog onbekend).

## Nog visueel na te kijken (MORGEN, vóór Supabase)
1. **Nummering — hoogste prioriteit.** Elke kaart heeft "dubbele basisnummers". Een deel is terecht (Hand/Automatik-variant met eigen bestelnr, of a/b/c-subnummers), maar een deel kan een leesfout zijn. Per kaart de `nr`-kolom naast de scan leggen:
   - Veel dubbelen: `36-1b3-vwpassat-16`, `36-1b3-audi80s` (~12-13 stuks), de vier `4a1`-Mercedes-bladen, de PIC-types.
   - Aanpak morgen: per blad een verificatie-agent die de scan + onze nr-lijst vergelijkt en alleen afwijkingen meldt.
2. **Vertalingen buiten de woordenlijst** (38 termen met meerdere varianten, meest kleine verschillen): bv. "Satz-…" als "Set X" vs "X set"; "Drosselhebel" → Gasklephendel/Smoorhendel; "Sechskantschraube" → Zeskantbout/Zeskantschroef. Eén standaard kiezen en gelijktrekken.
3. **Bestelnummers steekproef**: klein schrift, steekproefsgewijs gelezen. Bij twijfel scan naast leggen (staat al als notitie onder elke lijst).
4. **Audi 80**: handmatig ingelezen met eigen b/c-subnummers (40b, 42b, 43b, 78b) — die wijken af van de bladnummering; gelijktrekken met de agent-aanpak van de andere 17.

## Bestanden
- Brondata: `carbhub/kennbladen-uniek.json` (volledig, met onderdelen)
- App-data: `app/hub/data.ts` (gegenereerd, niet handmatig bewerken)
- Ruwe leesresultaten + scripts: `Downloads/hub-render/` (parts_*.json, qa_check.py, merge_parts.py)

## Volgende stap (afgesproken)
Push naar Supabase: data in tabellen + tekeningen/scans naar Storage, daarna kenteken/RDW-match. Doen we morgen samen.
