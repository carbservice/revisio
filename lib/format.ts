// Gedeelde opmaak-helpers (geld, duur, datums) voor de hele Revisio-app.
// Eén plek aanpassen werkt door op alle pagina's die hieruit importeren.

export function euro(n: number) {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

export function duur(min: number) {
  const u = Math.floor(min / 60), m = min % 60;
  if (u && m) return `${u}u ${m}m`;
  if (u) return `${u}u`;
  return `${m}m`;
}

export function mmss(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export function dagenGeleden(d: string) {
  if (!d) return null;
  const iso = d.length <= 10 ? `${d}T00:00:00` : d;
  const t = new Date(iso).getTime();
  if (isNaN(t)) return null;
  return Math.floor((Date.now() - t) / 86400000);
}

export function datumKort(d: string) {
  if (!d) return "";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return "";
  return dt.toLocaleDateString("nl-NL", { day: "numeric", month: "short" });
}

export function datumTijd(d: string) {
  if (!d) return "";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return "";
  return dt.toLocaleString("nl-NL", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function datumStempel(d: string) {
  if (!d) return "";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return "";
  return dt.toLocaleString("nl-NL", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
