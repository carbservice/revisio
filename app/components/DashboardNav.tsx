"use client";

// Twee grote knoppen bovenin de dashboards om snel tussen het cijfer-
// dashboard en het werkplaats-dashboard te wisselen. next/link doet
// client-side navigatie met prefetch, dus de overstap voelt direct.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GROEN } from "@/lib/theme";

const items = [
  { href: "/dashboard", label: "📊 Cijfers" },
  { href: "/dashboard/werkplaats", label: "🔧 Werkplaats Dashboard" },
  { href: "/werkbonnen", label: "🧾 Werkbonnen" },
];

export default function DashboardNav() {
  const pad = usePathname();
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
      {items.map((it) => {
        const actief = pad === it.href;
        return (
          <Link
            key={it.href}
            href={it.href}
            prefetch
            style={{
              flex: "1 1 110px",
              textAlign: "center",
              textDecoration: "none",
              background: actief ? GROEN : "#fff",
              color: actief ? "#fff" : GROEN,
              border: `1.5px solid ${GROEN}`,
              borderRadius: 12,
              padding: "13px 12px",
              fontSize: 15,
              fontWeight: 700,
              letterSpacing: 0.2,
              whiteSpace: "nowrap",
            }}
          >
            {it.label}
          </Link>
        );
      })}
    </div>
  );
}
