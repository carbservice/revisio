// lib/rdw.js
// Kenteken normaliseren + voertuigdata ophalen bij de RDW (gratis open data, geen
// sleutel nodig). Mensen typen kentekens op alle manieren in; we maken er één
// nette sleutel van en doen één call. Geen kenteken/geen match -> null.

// "PL-TT-32", "pl tt 32", "pltt32" -> "PLTT32"
export function normaliseerKenteken(input) {
  return String(input || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

// Geeft een net voertuig-object terug, of null als er geen kenteken/match is.
export async function haalVoertuig(kentekenRuw) {
  const kenteken = normaliseerKenteken(kentekenRuw);
  if (kenteken.length < 4) return null;
  try {
    const res = await fetch(`https://opendata.rdw.nl/resource/m9d7-ebf2.json?kenteken=${kenteken}`, { cache: "no-store" });
    if (!res.ok) return null;
    const rijen = await res.json();
    const v = Array.isArray(rijen) && rijen[0];
    if (!v) return null;
    const bouwjaar = (v.datum_eerste_toelating || "").slice(0, 4);
    return {
      kenteken,
      merk: v.merk || "",
      model: v.handelsbenaming || "",
      voertuigsoort: v.voertuigsoort || "",
      bouwjaar,
      cilinderinhoud: v.cilinderinhoud || "",
      aantal_cilinders: v.aantal_cilinders || "",
      // nette regel voor de offerte / het overzicht
      omschrijving: [
        [v.merk, v.handelsbenaming].filter(Boolean).join(" "),
        bouwjaar,
        v.cilinderinhoud ? `${v.cilinderinhoud} cc` : "",
        v.aantal_cilinders ? `${v.aantal_cilinders} cil.` : "",
      ].filter(Boolean).join(" · "),
    };
  } catch {
    return null;
  }
}
