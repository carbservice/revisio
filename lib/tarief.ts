// Interne arbeid-instellingen voor het arbeid-discrepantie-alarm.
// Eén plek om aan te passen.

// Backend-uurtarief (ex btw) waarmee we de geschreven monteur-tijd waarderen.
export const UURTARIEF_EX_BTW = 106;

// Grootboekrekening waarop ALLE arbeid wordt geboekt: "Werplaats uren" (80500.01).
// We tellen alle offerte-regels op deze rekening op (meerdere arbeidsregels per
// klus mogelijk, verschillende teksten). Dit is het backend-referentiepunt.
export const WERKPLAATS_UREN_LEDGER_ID = "442436313943115052";

// Geoffreerde arbeid (euro, ex btw) uit een Moneybird-offerte = som van alle
// regels op de grootboekrekening Werplaats uren. Geen zulke regel -> 0 (dan geen
// alarm voor die klus).
export function geoffreerdeArbeidUit(estimate: any): number {
  const det = (estimate && estimate.details) || [];
  let som = 0;
  for (const d of det) {
    if (String(d?.ledger_account_id || "") === WERKPLAATS_UREN_LEDGER_ID) {
      const prijs = parseFloat(d?.price || "0") || 0;
      const aantal = parseFloat(d?.amount || "1") || 1;
      som += prijs * aantal;
    }
  }
  return Math.round(som * 100) / 100;
}

// Geoffreerde uren = arbeidbedrag / uurtarief.
export function geoffreerdeUren(arbeidEuro: number): number {
  return UURTARIEF_EX_BTW > 0 ? arbeidEuro / UURTARIEF_EX_BTW : 0;
}
