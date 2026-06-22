"use client";

// Twee grote knoppen bovenin de dashboards om snel tussen het cijfer-
// dashboard en het werkplaats-dashboard te wisselen. next/link doet
// client-side navigatie met prefetch, dus de overstap voelt direct.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, CSSProperties } from "react";
import { GROEN, GRIJS, RAND, ROOD, ROOD_BG } from "@/lib/theme";
import { useGebruiker } from "@/app/components/AuthGate";
import { supabase } from "@/lib/supabase";
import { magSales } from "@/app/werkplaats-planning/planning-config";

// rol bepaalt de toegang: "iedereen" (alle ingelogde collega's), "beheer"
// (admin of manager) of "admin" (alleen admin). Eén bron voor elke pagina.
const items = [
  { href: "/start", label: "🏠 Start", rol: "iedereen" },
  { href: "/werkplaats-planning", label: "🗂️ Werkplaats Planning", rol: "iedereen" },
  { href: "/werkbonnen", label: "🧾 Werkbonnen", rol: "iedereen" },
  { href: "/carburateur-database-hub", label: "⚙️ Carburateur Database Hub", rol: "iedereen" },
  { href: "/support-hub", label: "💬 Support Hub", rol: "iedereen" },
  { href: "/werkplaats-dashboard", label: "🔧 Werkplaats Dashboard", rol: "beheer" },
  { href: "/cijfers", label: "📊 Cijfers", rol: "admin" },
  { href: "/sales-marketing", label: "📊 Sales & Marketing", rol: "sales" },
] as const;

export default function DashboardNav({ isAdmin: isAdminProp }: { isAdmin?: boolean }) {
  const pad = usePathname();
  const { isAdmin: isAdminCtx, isManager } = useGebruiker();
  const isAdmin = isAdminProp ?? isAdminCtx;
  // Welke knop net een weigering toont (na een klik zonder toegang).
  const [weiger, setWeiger] = useState<string | null>(null);
  // Sales-dashboard is voor specifieke personen (CG/LE/JM/LV), niet per rol.
  const [magSalesU, setMagSalesU] = useState(false);
  useEffect(() => { supabase.auth.getUser().then(({ data }) => setMagSalesU(magSales(data.user?.email))); }, []);

  const mag = (rol: string) => rol === "iedereen" || (rol === "admin" && isAdmin) || (rol === "beheer" && (isAdmin || isManager)) || (rol === "sales" && magSalesU);

  const basis: CSSProperties = {
    flex: "1 1 110px", textAlign: "center", borderRadius: 12, padding: "13px 12px",
    fontSize: 15, fontWeight: 700, letterSpacing: 0.2, whiteSpace: "nowrap",
  };

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
      {items.map((it) => {
        if (it.rol === "sales" && !magSalesU) return null; // alleen voor het sales-team
        // /werkplaats-planning/[kaart_id] hoort ook bij Werkplaats Planning.
        const actief = pad === it.href || (it.href === "/werkplaats-planning" && pad.startsWith("/werkplaats-planning/"));
        const opSlot = !mag(it.rol); // wel zichtbaar, maar geen toegang

        if (opSlot) {
          const toon = weiger === it.href;
          const weigerTekst = it.rol === "admin" ? "Geen ADMIN" : "Geen toegang";
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
              {toon ? weigerTekst : `${it.label} 🔒`}
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
