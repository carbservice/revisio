"use client";

// Automatisch uitloggen na een periode van inactiviteit (geen muis, toets,
// scroll of touch). Bedoeld voor gedeelde werkplaats-computers die open blijven
// staan. De laatste-activiteit-tijd staat ook in localStorage, zodat het ook
// klopt als de tab tussendoor dicht is geweest.

import { useEffect, useRef } from "react";

const KEY = "revisio-laatste-activiteit";
const STANDAARD_MIN = 120; // 2 uur; pas hier aan

// Wis het activiteits-stempel (aanroepen bij handmatig uitloggen).
export function wisInactiviteit() {
  try { localStorage.removeItem(KEY); } catch { /* localStorage kan ontbreken */ }
}

export function useInactiviteitsUitlog(actief: boolean, uitloggen: () => void, minuten: number = STANDAARD_MIN) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!actief) return;
    const limiet = minuten * 60_000;

    const opgeslagen = Number(localStorage.getItem(KEY));
    let laatste = Number.isFinite(opgeslagen) && opgeslagen > 0 ? opgeslagen : Date.now();
    let laatsteSchrijf = 0;

    const uitloggenNu = () => { wisInactiviteit(); uitloggen(); };

    // Altijd via setTimeout (ook bij een al verstreken limiet -> delay 0), zodat
    // we nooit synchroon in het effect uitloggen.
    const plan = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(uitloggenNu, Math.max(0, limiet - (Date.now() - laatste)));
    };

    const opActiviteit = () => {
      const t = Date.now();
      laatste = t;
      if (t - laatsteSchrijf > 15_000) { laatsteSchrijf = t; try { localStorage.setItem(KEY, String(t)); } catch { /* idem */ } }
      plan();
    };

    const opZichtbaar = () => { if (document.visibilityState === "visible") plan(); };

    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "click"];
    events.forEach((e) => window.addEventListener(e, opActiviteit, { passive: true }));
    document.addEventListener("visibilitychange", opZichtbaar);
    plan();

    return () => {
      if (timer.current) clearTimeout(timer.current);
      events.forEach((e) => window.removeEventListener(e, opActiviteit));
      document.removeEventListener("visibilitychange", opZichtbaar);
    };
  }, [actief, uitloggen, minuten]);
}
