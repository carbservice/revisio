// Interne arbeid-instellingen voor het arbeid-discrepantie-alarm.
// Eén plek om aan te passen.

// Backend-uurtarief (ex btw) waarmee we de geschreven monteur-tijd waarderen.
export const UURTARIEF_EX_BTW = 106;

// Haalt de geoffreerde arbeid (euro, ex btw) uit een Moneybird-offerte: de som
// van de regels waarvan de omschrijving "arbeid" bevat. Geen arbeid-regel ->
// 0 (dan geen alarm voor die klus).
export function geoffreerdeArbeidUit(estimate: any): number {
  const det = (estimate && estimate.details) || [];
  let som = 0;
  for (const d of det) {
    if (/arbeid/i.test(d?.description || "")) {
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
