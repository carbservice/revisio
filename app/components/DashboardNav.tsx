"use client";

// Twee grote knoppen bovenin de dashboards om snel tussen het cijfer-
// dashboard en het werkplaats-dashboard te wisselen. next/link doet
// client-side navigatie met prefetch, dus de overstap voelt direct.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GROEN } from "@/lib/theme";

// adminOnly = alleen zichtbaar voor admins. Start, Werkbonnen en Hub zijn voor iedereen.
const items = [
  { href: "/start", label: "🏠 Start", adminOnly: false },
  { href: "/dashboard", label: "📊 Cijfers", adminOnly: true },
  { href: "/dashboard/werkplaats", label: "🔧 Werkplaats Dashboard", adminOnly: true },
  { href: "/werkbonnen", label: "🧾 Werkbonnen", adminOnly: false },
  { href: "/hub", label: "⚙️ Carburateur Hub", adminOnly: false },
];

export default function DashboardNav({ isAdmin = false }: { isAdmin?: boolean }) {
  const pad = usePathname();
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
      {items.filter((it) => !it.adminOnly || isAdmin).map((it) => {
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
