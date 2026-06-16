"use client";

// Interne welkom/start-pagina. app/start/page.tsx
// Begroeting naar dagdeel + naam, daaronder de modules waar je heen kunt
// (rol-bewust). Navigatie via next/link, dus de browser-terugknop werkt gewoon.

import Link from "next/link";
import { CSSProperties } from "react";
import { GROEN, GOUD, TEKST, GRIJS, RAND, BG, KAART_SCHADUW } from "@/lib/theme";
import AuthGate, { useGebruiker } from "@/app/components/AuthGate";

const SERIF = "'Karma', Georgia, serif";

function groet(): string {
  const h = new Date().getHours();
  if (h >= 6 && h < 12) return "Goedemorgen";
  if (h >= 12 && h < 18) return "Goedemiddag";
  return "Goedenavond";
}

const MODULES = [
  { href: "/werkbonnen", icon: "🧾", titel: "Werkbonnen", sub: "Klussen, timers en foto's", adminOnly: false },
  { href: "/hub", icon: "⚙️", titel: "Carburateur Hub", sub: "Kennbladen en tekeningen opzoeken", adminOnly: false },
  { href: "/dashboard", icon: "📊", titel: "Cijfers", sub: "Omzet, marges en KPI's", adminOnly: true },
  { href: "/dashboard/werkplaats", icon: "🔧", titel: "Werkplaats", sub: "Doorlooptijd, uren en retouren", adminOnly: true },
];

export default function StartPagina() {
  return (
    <AuthGate>
      <Start />
    </AuthGate>
  );
}

function Start() {
  const { naam, isAdmin, uitloggen } = useGebruiker();
  const modules = MODULES.filter((m) => !m.adminOnly || isAdmin);

  return (
    <main style={{ minHeight: "100vh", background: BG, color: TEKST, fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Karma:wght@400;500;600;700&display=swap" />
      <div style={{ maxWidth: 920, margin: "0 auto", padding: "40px 18px 60px" }}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 30 }}>
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", color: GROEN }}>Revisio</div>
          <button onClick={uitloggen} style={{ border: `1px solid ${RAND}`, background: "#fff", color: GRIJS, borderRadius: 999, padding: "7px 14px", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>Uitloggen</button>
        </div>

        <h1 style={{ fontFamily: SERIF, fontSize: 34, fontWeight: 700, color: GROEN, margin: "0 0 6px" }}>
          {groet()}, {naam || "collega"}
        </h1>
        <p style={{ fontSize: 16, color: GRIJS, margin: "0 0 28px" }}>Kies hieronder waar je heen wilt.</p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
          {modules.map((m) => (
            <Link key={m.href} href={m.href} style={tegel}>
              <div style={{ fontSize: 30 }}>{m.icon}</div>
              <div style={{ fontFamily: SERIF, fontSize: 20, fontWeight: 700, color: GROEN, marginTop: 8 }}>{m.titel}</div>
              <div style={{ fontSize: 13.5, color: GRIJS, marginTop: 3 }}>{m.sub}</div>
              {m.adminOnly && <span style={{ position: "absolute", top: 12, right: 12, fontSize: 10.5, fontWeight: 800, color: "#6b5410", background: "#f7f0db", border: `1px solid ${GOUD}`, borderRadius: 999, padding: "1px 7px" }}>ADMIN</span>}
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}

const tegel: CSSProperties = {
  position: "relative", display: "block", background: "#fff", border: `1px solid ${RAND}`, borderRadius: 16,
  padding: "20px 18px 22px", textDecoration: "none", color: TEKST, boxShadow: KAART_SCHADUW,
};
