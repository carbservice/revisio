"use client";

// Klein, meescrollend pijltje rechtsonder. Verschijnt zodra je een stuk
// naar beneden bent gescrold; klik erop om soepel terug naar boven te
// springen.

import { useEffect, useState } from "react";
import { GROEN } from "@/lib/theme";

export default function ScrollNaarBoven({ bottom = 24 }: { bottom?: number }) {
  const [zichtbaar, setZichtbaar] = useState(false);

  useEffect(() => {
    const check = () => setZichtbaar(window.scrollY > 300);
    check();
    window.addEventListener("scroll", check, { passive: true });
    return () => window.removeEventListener("scroll", check);
  }, []);

  if (!zichtbaar) return null;

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Naar boven"
      title="Naar boven"
      style={{
        position: "fixed",
        right: 18,
        bottom,
        zIndex: 60,
        width: 44,
        height: 44,
        borderRadius: "50%",
        border: "none",
        background: GROEN,
        color: "#fff",
        boxShadow: "0 4px 14px rgba(26,60,46,0.35)",
        cursor: "pointer",
        fontSize: 22,
        lineHeight: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      ↑
    </button>
  );
}
