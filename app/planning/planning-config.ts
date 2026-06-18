// Configuratie van het planningsbord. Eén plek voor de kolommen, het team en
// de verouderingsdrempels, zodat we die later makkelijk kunnen bijstellen.

import { GROEN, GOUD, ROOD, GRIJS } from "@/lib/theme";

// --- Kolommen (vaste volgorde, links naar rechts) -------------------------
export type FaseSleutel =
  | "werkplaats"
  | "retouren"
  | "binnenkomst"
  | "onderdelen"
  | "revisie"
  | "factureren"
  | "klaar";

export type Fase = { sleutel: FaseSleutel; titel: string; sub: string };

export const FASES: Fase[] = [
  { sleutel: "werkplaats", titel: "Werkplaats kaartenbak", sub: "Priors en dagplanning" },
  { sleutel: "retouren", titel: "Retouren", sub: "Om zicht te houden" },
  { sleutel: "binnenkomst", titel: "Geaccepteerd → Te verwachten", sub: "Geaccepteerd, nog niet fysiek binnen" },
  { sleutel: "onderdelen", titel: "Binnen - Onderdelen bestellen", sub: "Fysiek binnen, op de plank" },
  { sleutel: "revisie", titel: "Revisie uitvoeren", sub: "Onder behandeling" },
  { sleutel: "factureren", titel: "Klus factureren", sub: "Klaar om te factureren" },
  { sleutel: "klaar", titel: "Klaar / archief", sub: "Afgerond" },
];

export const FASE_SLEUTELS: FaseSleutel[] = FASES.map((f) => f.sleutel);
export const STANDAARD_FASE: FaseSleutel = "binnenkomst";

export function faseTitel(sleutel: string): string {
  return FASES.find((f) => f.sleutel === sleutel)?.titel || sleutel;
}

// --- Team -------------------------------------------------------------------
// Alle ingelogde collega's zijn kiesbaar als kaartlid. In het kaart-detail
// staan ze luchtgrijs; klik je erop, dan doen ze mee. STANDAARD_LEDEN staat
// automatisch op een nieuwe kaart (Jarno, Lukas, Cyriel).
export type Lid = { code: string; naam: string; kleur: string; email: string };

export const TEAM: Lid[] = [
  { code: "CG", naam: "Cyriel", kleur: "#1a3c2e", email: "cyrielgaemers@gmail.com" },
  { code: "JM", naam: "Jarno", kleur: "#2f6f8f", email: "morrienjarno@gmail.com" },
  { code: "LE", naam: "Lukas", kleur: "#8a5a2b", email: "lukas@carbservice.nl" },
  { code: "LV", naam: "Luuk", kleur: "#6b4e9e", email: "luukveenendaal@icloud.com" },
  { code: "RW", naam: "Rens", kleur: "#a23b2e", email: "rensdewilt@gmail.com" },
  { code: "OS", naam: "Olivier", kleur: "#2e7d5b", email: "oliviersprenkeler@icloud.com" },
];

// Vaste leden op een nieuwe kaart: Jarno, Lukas de Esch, Cyriel.
export const STANDAARD_LEDEN = ["JM", "LE", "CG"];

export function lidKleur(code: string): string {
  return TEAM.find((l) => l.code === code)?.kleur || GRIJS;
}

// De afkorting (kaartlid-code) bij een ingelogd e-mailadres.
export function codeVoorEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  const e = email.toLowerCase();
  return TEAM.find((l) => l.email.toLowerCase() === e)?.code || null;
}

// --- Koppeling met de monteurs-app (stadia/voortgang) ---------------------
// Dezelfde stadia als de werkbon-app (klus_voortgang.stap), met hun percentage.
export const STADIA_PCT: { id: string; pct: number }[] = [
  { id: "ontvangen", pct: 20 },
  { id: "gestart", pct: 40 },
  { id: "voor_ultrasoon", pct: 60 },
  { id: "na_ultrasoon", pct: 80 },
  { id: "schoon", pct: 100 },
];
// Stadia die betekenen dat de revisie daadwerkelijk loopt (voorbij ontvangst).
export const REVISIE_STAPPEN = ["gestart", "voor_ultrasoon", "na_ultrasoon", "schoon"];

// Voortgang in % uit de afgevinkte stappen. Zelfde model als het klantportaal:
// het hoogst afgevinkte stadium is "bezig" en telt nog niet mee, behalve
// ontvangst (voltooid feit, 20%) en het laatste stadium (klaar, 100%).
export function voortgangPct(gedaneStappen: string[]): number {
  const gedaan = STADIA_PCT.filter((s) => gedaneStappen.includes(s.id));
  if (!gedaan.length) return 0;
  const hoogste = gedaan[gedaan.length - 1];
  if (hoogste.pct >= 100) return 100;
  if (hoogste.id === "ontvangen") return hoogste.pct;
  return gedaan.slice(0, -1).reduce((m, s) => Math.max(m, s.pct), 0);
}

// De kolom waar een klus-kaart volgens de werkplaats zou moeten staan, of null
// als de monteur-status geen verschuiving rechtvaardigt (laat 'm dan staan).
export function gewensteFase(gedaneStappen: string[], isRetour: boolean): FaseSleutel | null {
  if (isRetour) return "retouren";
  if (voortgangPct(gedaneStappen) >= 100) return "factureren";
  if (REVISIE_STAPPEN.some((s) => gedaneStappen.includes(s))) return "revisie";
  // Ontvangst bevestigd = fysiek binnen → naar "Binnen - Onderdelen bestellen".
  if (gedaneStappen.includes("ontvangen")) return "onderdelen";
  return null;
}

// Revisie-doel: zodra de klus binnen is willen we binnen dit aantal dagen
// reviseren. De klok start bij de "plank-teller" (stadium Ontvangst).
// Tijdelijk op 14 (test); later eventueel strakker. Eén plek om aan te passen.
export const REVISIE_DOEL_DAGEN = 14;

export function dagenSinds(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return null;
  return Math.floor((Date.now() - t) / 86_400_000);
}

export function revisieKlokKleur(dagen: number): string {
  if (dagen >= REVISIE_DOEL_DAGEN) return ROOD;           // doel bereikt/over tijd
  if (dagen >= REVISIE_DOEL_DAGEN * 0.7) return GOUD;     // laatste ~30% richting doel
  return GROEN;
}

// Verwachte einddatum voor de klant: binnenkomst + het revisie-doel.
export function verwachteEinddatum(binnenOp: string | null | undefined): Date | null {
  if (!binnenOp) return null;
  const t = new Date(binnenOp).getTime();
  if (!Number.isFinite(t)) return null;
  return new Date(t + REVISIE_DOEL_DAGEN * 86_400_000);
}

// --- Verouderingsklok (dagen in de huidige kolom) -------------------------
// Drempels en kleuren bewust hier, zodat ze makkelijk bij te stellen zijn.
export const VEROUDERING = {
  geel: { dagen: 7, kleur: GOUD, label: "1 week+" },
  oranje: { dagen: 14, kleur: "#c4702a", label: "2 weken+" },
  rood: { dagen: 30, kleur: ROOD, label: "1 maand+" },
};

// Kolommen waar de verouderingsklok niet telt (afgeronde stapel).
const GEEN_KLOK: FaseSleutel[] = ["klaar"];

export type Signaal = { dagen: number; kleur: string; label: string } | null;

export function veroudering(enteredStageAt: string, fase: string): Signaal {
  if (GEEN_KLOK.includes(fase as FaseSleutel)) return null;
  const start = new Date(enteredStageAt).getTime();
  if (!Number.isFinite(start)) return null;
  const dagen = Math.floor((Date.now() - start) / 86_400_000);
  if (dagen >= VEROUDERING.rood.dagen) return { dagen, kleur: VEROUDERING.rood.kleur, label: VEROUDERING.rood.label };
  if (dagen >= VEROUDERING.oranje.dagen) return { dagen, kleur: VEROUDERING.oranje.kleur, label: VEROUDERING.oranje.label };
  if (dagen >= VEROUDERING.geel.dagen) return { dagen, kleur: VEROUDERING.geel.kleur, label: VEROUDERING.geel.label };
  return { dagen, kleur: GROEN, label: "" };
}

// --- Types voor de databron -----------------------------------------------
export type Kaart = {
  id: string;
  klus_id: string | null;
  type: "klus" | "planning";
  titel: string;
  omschrijving: string;
  fase: FaseSleutel;
  positie: number;
  entered_stage_at: string;
  gefactureerd: boolean;
  archief: boolean;
  hand_verplaatst: boolean;
  aangemaakt_op: string;
};

// Afgeleide klus-status uit de monteurs-app (klus_voortgang/werkbon_retour).
// binnenOp = wanneer de klus fysiek binnenkwam (plank-teller, stadium Ontvangst).
export type KlusStatus = { pct: number; retour: boolean; onuitgegeven: boolean; binnenOp: string | null; akkoord?: string | null };

export type ChecklistItem = {
  id: string;
  kaart_id: string;
  tekst: string;
  gedaan: boolean;
  volgorde: number;
};

export type Bericht = {
  id: string;
  kaart_id: string;
  auteur: string;
  tekst: string;
  soort: "chat" | "log";
  tijdstip: string;
};

export type Melding = {
  id: string;
  ontvanger: string;
  kaart_id: string | null;
  van: string;
  tekst: string;
  soort: "tag" | "lid" | "activiteit";
  gelezen: boolean;
  tijdstip: string;
};

// Live klusgegevens uit Moneybird (via /api/klussen), gekoppeld op klus_id.
export type Klus = {
  id: string;
  nummer: string;
  klant: string;
  voertuig: string;
  klacht: string;
  bedrag: number;
  datum: string;
  status: string;
};
