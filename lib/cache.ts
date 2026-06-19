// Eenvoudige in-memory data-buffer voor API-resultaten.
// Blijft bestaan zolang de app open is (client-side navigatie behoudt
// module-state), zodat terugkeren naar een dashboard direct laadt.
// Patroon: toon de gebufferde data meteen, ververs op de achtergrond.

import { apiFetch } from "./api";

const store = new Map<string, unknown>();

export function uitCache(url: string): any {
  return store.get(url);
}

export async function haalEnCache(url: string, opts?: RequestInit): Promise<any> {
  // apiFetch stuurt automatisch het inlogbewijs mee, zodat de portier in de
  // route weet wie er belt (nodig voor de beveiligde dashboard-routes).
  const res = await apiFetch(url, opts);
  const data = await res.json();
  store.set(url, data);
  return data;
}
