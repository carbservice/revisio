"use client";

// Twee grote knoppen bovenin de dashboards om snel tussen het cijfer-
// dashboard en het werkplaats-dashboard te wisselen. next/link doet
// client-side navigatie met prefetch, dus de overstap voelt direct.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, CSSProperties } from "react";
import { GROEN, GRIJS, RAND, ROOD, ROOD_BG } from "@/lib/theme";

// adminOnly = alleen zichtbaar voor admins. Start, Kaartenbord, Werkbonnen en
// Hub zijn voor iedereen. Eén bron voor de navigatie op elke pagina.
const items = [
  { href: "/start", label: "🏠 Start", adminOnly: false },
  { href: "/planning", label: "🗂️ Kaartenbord", adminOnly: false },
  { href: "/werkbonnen", label: "🧾 Werkbonnen", adminOnly: false },
  { href: "/hub", label: "⚙️ Carburateur Hub", adminOnly: false },
  { href: "/dashboard", label: "📊 Cijfers", adminOnly: true },
  { href: "/dashboard/werkplaats", label: "🔧 Werkplaats Dashboard", adminOnly: true },
];

export default function DashboardNav({ isAdmin = false }: { isAdmin?: boolean }) {
  const pad = usePathname();
  // Welke admin-knop net "Geen ADMIN" toont (na een klik door een niet-admin).
  const [weiger, setWeiger] = useState<string | null>(null);

  const basis: CSSProperties = {
    flex: "1 1 110px", textAlign: "center", borderRadius: 12, padding: "13px 12px",
    fontSize: 15, fontWeight: 700, letterSpacing: 0.2, whiteSpace: "nowrap",
  };

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
      {items.map((it) => {
        // /planning/[kaart_id] hoort ook bij het Kaartenbord.
        const actief = pad === it.href || (it.href === "/planning" && pad.startsWith("/planning/"));
        const opSlot = it.adminOnly && !isAdmin; // wel zichtbaar, maar geen toegang

        if (opSlot) {
          const toon = weiger === it.href;
          return (
            <button
              key={it.href}
              onClick={() => { setWeiger(it.href); setTimeout(() => setWeiger((w) => (w === it.href ? null : w)), 1500); }}
              style={{
                ...basis, cursor: "pointer",
                background: toon ? ROOD_BG : "#f3f1ec",
                color: toon ? ROOD : GRIJS,
                border: `1.5px solid ${toon ? ROOD : RAND}`,
              }}
            >
              {toon ? "Geen ADMIN" : `${it.label} 🔒`}
            </button>
          );
        }

        return (
          <Link
            key={it.href}
            href={it.href}
            prefetch
            style={{
              ...basis, textDecoration: "none",
              background: actief ? GROEN : "#fff",
              color: actief ? "#fff" : GROEN,
              border: `1.5px solid ${GROEN}`,
            }}
          >
            {it.label}
          </Link>
        );
      })}
    </div>
  );
}
