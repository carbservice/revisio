"use client";

// Uniforme bovenkant voor de drie hoofdpagina's, in vaste volgorde:
// 1) statusbalk  2) ingelogd-als  3) titel  4) (optioneel) zoekbalk.

import { ReactNode, CSSProperties } from "react";
import { GROEN, GRIJS, RAND, KAART_BG, KAART_SCHADUW } from "@/lib/theme";
import Systeemstatus from "@/app/components/Systeemstatus";
import DashboardNav from "@/app/components/DashboardNav";
import RevisioLogo from "@/app/components/RevisioLogo";
import MeldingBel from "@/app/werkplaats-planning/MeldingBel";
import { useGebruiker } from "@/app/components/AuthGate";

export default function PaginaKop({ naam, onUitloggen, titel, streep, children }: { naam: string; onUitloggen: () => void; titel: string; streep?: boolean; children?: ReactNode }) {
  const { isAdmin } = useGebruiker();
  const ingelogd: CSSProperties = {
    background: KAART_BG, border: `1px solid ${RAND}`, borderRadius: 14, padding: "11px 16px",
    marginBottom: 16, boxShadow: KAART_SCHADUW,
    display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10,
  };
  // Vaste volgorde op elke pagina: 1) statusbalk 2) ingelogd-als 3) navigatiebalk 4) titel.
  return (
    <>
      <Systeemstatus />
      <div style={ingelogd}>
        <RevisioLogo />
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <MeldingBel />
          <div style={{ fontSize: 13.5 }}>Ingelogd als <span style={{ fontWeight: 700, color: GROEN }}>{naam || "gebruiker"}</span></div>
          <button onClick={onUitloggen} style={{ border: `1px solid ${RAND}`, background: "#fff", color: GRIJS, borderRadius: 999, padding: "7px 14px", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>Uitloggen</button>
        </div>
      </div>
      <DashboardNav isAdmin={isAdmin} />
      <h1 style={{ fontSize: 24, fontWeight: 800, color: GROEN, margin: streep ? "0 0 10px" : "0 0 14px" }}>{titel}</h1>
      {/* Optionele groene scheidingslijn: zet de bovenkant (status/nav) los van
          de eigenlijke app eronder. Gebruikt op de werkbonnen-app (monteurfocus). */}
      {streep && <div style={{ height: 3, background: GROEN, borderRadius: 2, margin: "0 0 18px" }} />}
      {children}
    </>
  );
}
