// Eenvoudige in-memory data-buffer voor API-resultaten.
// Blijft bestaan zolang de app open is (client-side navigatie behoudt
// module-state), zodat terugkeren naar een dashboard direct laadt.
// Patroon: toon de gebufferde data meteen, ververs op de achtergrond.

const store = new Map<string, unknown>();

export function uitCache(url: string): any {
  return store.get(url);
}

export async function haalEnCache(url: string, opts?: RequestInit): Promise<any> {
  const res = await fetch(url, opts);
  const data = await res.json();
  store.set(url, data);
  return data;
}
