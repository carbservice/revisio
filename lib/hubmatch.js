// Hub-match: matcht een door de klant ingevulde carburateur (tagnummer OF
// merk/type, bijv. "Solex PDSI", "PDSI" of een tagnummer) tegen de interne
// Carburateur Hub: de Pierburg-kennbladen (carbhub) en de DVG-cross-reference.
// Puur lezen uit de statische data, geen Supabase nodig. Geeft null als er
// geen plausibele match is (dan geen ruis in de offerte).

import kbData from "@/carbhub/kennbladen-uniek.json";
import crossref from "@/public/hub/boeken-crossref.json";

const KENNBLADEN = (kbData && kbData.kennbladen) || [];
const CROSS = Array.isArray(crossref) ? crossref : [];

function norm(s) { return String(s || "").toUpperCase().replace(/[^A-Z0-9]/g, ""); }

export function zoekHub(tekst) {
  const ruw = String(tekst || "").trim();
  if (ruw.length < 3) return null;
  const n = norm(ruw);
  if (n.length < 3) return null;
  const woorden = ruw.toUpperCase().split(/[^A-Z0-9]+/).map(norm).filter((w) => w.length >= 3);

  // 1) Pierburg-kennbladen op tagnummer (exact of deeloverlap)
  for (const k of KENNBLADEN) {
    const tags = (k.tag_norm || []).map(norm);
    if (tags.some((t) => t && (t === n || t.includes(n) || n.includes(t))))
      return { titel: `${k.type} · ${k.vehicle}`, soort: "kennblad" };
  }
  // 2) Pierburg-kennbladen op type/voertuig (woord)
  for (const k of KENNBLADEN) {
    const t = norm(k.type), v = norm(k.vehicle);
    if (woorden.some((w) => (t && t.includes(w)) || (v && v.includes(w))))
      return { titel: `${k.type} · ${k.vehicle}`, soort: "kennblad" };
  }
  // 3) DVG cross-reference op exact tagnummer
  for (const r of CROSS) {
    if (r.tag && norm(r.tag) === n)
      return { titel: `${r.carb} · ${r.voertuig} (tag ${r.tag})`, soort: "dvg" };
  }
  // 4) DVG cross-reference op carb-type (woord, min. 4 tekens tegen ruis)
  let hits = 0, eerste = null;
  for (const r of CROSS) {
    const c = norm(r.carb);
    if (c && woorden.some((w) => w.length >= 4 && c.includes(w))) {
      hits++;
      if (!eerste) eerste = r;
    }
  }
  if (eerste) {
    const extra = hits > 1 ? ` (+${hits - 1} andere treffers)` : "";
    return { titel: `${eerste.carb} · ${eerste.voertuig}${extra}`, soort: "dvg" };
  }
  return null;
}
