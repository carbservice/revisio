"use client";

// Het Revisio-logo op de vaste plek (linksboven) van elke pagina. Klikt naar
// /start en valt netjes terug op de tekst "Revisio" als het bestand ontbreekt.

import { useState } from "react";
import { GROEN } from "@/lib/theme";

export default function RevisioLogo({ hoogte = 38 }: { hoogte?: number }) {
  const [ok, setOk] = useState(true);
  return (
    <a href="/start" aria-label="Revisio" style={{ display: "inline-flex", alignItems: "center", textDecoration: "none" }}>
      {ok ? (
        <img src="/revisio-logo.svg" alt="Revisio" onError={() => setOk(false)} style={{ height: hoogte, width: "auto", display: "block" }} />
      ) : (
        <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", color: GROEN }}>Revisio</span>
      )}
    </a>
  );
}
