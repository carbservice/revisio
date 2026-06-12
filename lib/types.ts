// Gedeelde datatypes voor werkbonnen, klussen en monteurs.
// Eén plek aanpassen werkt door op alle pagina's die hieruit importeren.

export type Klus = { id: string; nummer: string; klant: string; voertuig: string; klacht: string; bedrag: number; datum: string; getekend: string };
export type Monteur = { id: string; naam: string };
export type Regel = { id: string; monteur_naam: string; minuten: number; notitie: string | null; aangemaakt_op: string };
export type Veld = { key: string; veld_type: string; label: string; eenheid: string; positie: number; binnenkomst: string; afleveren: string };
export type Check = { key: string; naam: string; status: string; notitie: string; vast: boolean };
export type Artikel = { key: string; naam: string; bedrag: string; vast: boolean };
