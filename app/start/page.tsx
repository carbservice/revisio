"use client";

// Interne welkom/start-pagina. app/start/page.tsx
// Begroeting naar dagdeel + naam, live systeemstatus, en de modules als
// sleepbare tegels (rol-bewust). Volgorde wordt per browser onthouden.
// Navigatie via next/link, dus de browser-terugknop werkt gewoon.

import Link from "next/link";
import { useEffect, useState, CSSProperties } from "react";
import { GROEN, GOUD, TEKST, GRIJS, RAND, BG, KAART_SCHADUW } from "@/lib/theme";
import AuthGate, { useGebruiker } from "@/app/components/AuthGate";
import Systeemstatus from "@/app/components/Systeemstatus";
import MeldingBanner from "@/app/werkplaats-planning/MeldingBanner";
import DagOverzicht from "@/app/werkplaats-planning/DagOverzicht";
import DashboardNav from "@/app/components/DashboardNav";
import RevisioLogo from "@/app/components/RevisioLogo";
import MeldingBel from "@/app/werkplaats-planning/MeldingBel";
import { supabase } from "@/lib/supabase";

const SERIF = "'Karma', Georgia, serif";

function groet(): string {
  const h = new Date().getHours();
  if (h >= 6 && h < 12) return "Goedemorgen";
  if (h >= 12 && h < 18) return "Goedemiddag";
  return "Goedenavond";
}

const MODULES = [
  { href: "/werkplaats-planning", icon: "🗂️", titel: "Werkplaats Planning", sub: "Het werkbord: van binnenkomst tot factureren", rol: "iedereen" },
  { href: "/werkbonnen", icon: "🧾", titel: "Werkbonnen", sub: "Geaccepteerde klussen klaar voor revisie", rol: "iedereen" },
  { href: "/carburateur-database-hub", icon: "⚙️", titel: "Carburateur Database Hub", sub: "Interne database voor alle blueprints", rol: "iedereen" },
  { href: "/support-hub", icon: "💬", titel: "Support Hub", sub: "AI-chat per carburateurtype, uit de servicehandleidingen", rol: "iedereen" },
  { href: "/werkplaats-dashboard", icon: "🔧", titel: "Werkplaats Dashboard", sub: "Dit is het interne werkplaatsdashboard", rol: "beheer" },
  { href: "/cijfers", icon: "📊", titel: "Cijfers", sub: "Omzet, marges, KPI's", rol: "admin" },
] as const;
const OPSLAG = "revisio-start-volgorde";

function magZien(rol: string, isAdmin: boolean, isManager: boolean) {
  return rol === "iedereen" || (rol === "admin" && isAdmin) || (rol === "beheer" && (isAdmin || isManager));
}

export default function StartPagina() {
  return (
    <AuthGate>
      <Start />
    </AuthGate>
  );
}

function Start() {
  const { naam, isAdmin, isManager, uitloggen } = useGebruiker();
  const toegestaan = MODULES.filter((m) => magZien(m.rol, isAdmin, isManager));
  const byHref: Record<string, typeof MODULES[number]> = Object.fromEntries(MODULES.map((m) => [m.href, m]));

  const [volgorde, setVolgorde] = useState<string[]>(toegestaan.map((m) => m.href));
  const [sleep, setSleep] = useState<string | null>(null);
  const [sleutel, setSleutel] = useState<string>(OPSLAG); // opslag gekoppeld aan de login (e-mail)

  // Volgorde laden, onthouden PER LOGIN: de opslagsleutel bevat het e-mailadres.
  useEffect(() => {
    let levend = true;
    const alle: string[] = MODULES.filter((m) => magZien(m.rol, isAdmin, isManager)).map((m) => m.href);
    supabase.auth.getUser().then(({ data }) => {
      if (!levend) return;
      const email = (data.user?.email || "").toLowerCase();
      const key = email ? `${OPSLAG}:${email}` : OPSLAG;
      setSleutel(key);
      try {
        const opg = JSON.parse(localStorage.getItem(key) || "null");
        if (Array.isArray(opg)) {
          setVolgorde([...opg.filter((h: string) => alle.includes(h)), ...alle.filter((h) => !opg.includes(h))]);
          return;
        }
      } catch {}
      setVolgorde(alle);
    });
    return () => { levend = false; };
  }, [isAdmin, isManager]);

  function verplaats(doel: string) {
    if (!sleep || sleep === doel) return;
    setVolgorde((v) => {
      const zonder = v.filter((h) => h !== sleep);
      const idx = zonder.indexOf(doel);
      zonder.splice(idx < 0 ? zonder.length : idx, 0, sleep);
      try { localStorage.setItem(sleutel, JSON.stringify(zonder)); } catch {}
      return zonder;
    });
    setSleep(null);
  }

  const zichtbaar = volgorde.filter((h) => toegestaan.some((m) => m.href === h));

  return (
    <main style={{ minHeight: "100vh", background: BG, color: TEKST, fontFamily: "'Karma', Georgia, serif" }}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Karma:wght@400;500;600;700&display=swap" />
      <div style={{ maxWidth: 920, margin: "0 auto", padding: "22px 18px 60px" }}>

        {/* Live systeemstatus bovenaan */}
        <Systeemstatus />

        {/* Naam + uitloggen rechtsboven */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, margin: "14px 0 26px" }}>
          <RevisioLogo hoogte={42} />
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <MeldingBel />
            <span style={{ fontSize: 13.5, color: TEKST }}>Ingelogd als <span style={{ fontWeight: 700, color: GROEN }}>{naam || "gebruiker"}</span></span>
            <button onClick={uitloggen} style={{ border: `1px solid ${RAND}`, background: "#fff", color: GRIJS, borderRadius: 999, padding: "7px 14px", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>Uitloggen</button>
          </div>
        </div>

        {/* Navigatiebalk: zelfde knoppen als op elke pagina */}
        <DashboardNav isAdmin={isAdmin} />

        <h1 style={{ fontFamily: SERIF, fontSize: 34, fontWeight: 700, color: GROEN, margin: "0 0 6px" }}>
          {groet()}, {naam || "collega"}
        </h1>
        <p style={{ fontSize: 16, color: GRIJS, margin: "0 0 18px" }}>Kies hieronder waar je heen wilt.</p>

        {/* Persoonlijke meldingen + dagoverzicht uit het planningsbord */}
        <MeldingBanner />
        <DagOverzicht />

        <p style={{ fontSize: 12.5, color: GRIJS, margin: "0 0 22px" }}>Tip: versleep de vakken om je eigen volgorde te bepalen.</p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
          {zichtbaar.map((href) => {
            const m = byHref[href];
            const wordtGesleept = sleep === href;
            return (
              <Link
                key={href}
                href={href}
                draggable
                onDragStart={(e) => { setSleep(href); e.dataTransfer.effectAllowed = "move"; }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); verplaats(href); }}
                onDragEnd={() => setSleep(null)}
                style={{ ...tegel, opacity: wordtGesleept ? 0.4 : 1, outline: wordtGesleept ? `2px dashed ${GROEN}` : "none", outlineOffset: 2, cursor: "grab" }}
              >
                <div style={{ fontSize: 30 }}>{m.icon}</div>
                <div style={{ fontFamily: SERIF, fontSize: 20, fontWeight: 700, color: GROEN, marginTop: 8 }}>{m.titel}</div>
                <div style={{ fontSize: 13.5, color: GRIJS, marginTop: 3 }}>{m.sub}</div>
                {m.rol !== "iedereen" && <span style={{ position: "absolute", top: 12, right: 12, fontSize: 10.5, fontWeight: 800, color: "#6b5410", background: "#f7f0db", border: `1px solid ${GOUD}`, borderRadius: 999, padding: "1px 7px" }}>{m.rol === "admin" ? "ADMIN" : "BEHEER"}</span>}
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}

const tegel: CSSProperties = {
  position: "relative", display: "block", background: "#fff", border: `1px solid ${RAND}`, borderRadius: 16,
  padding: "20px 18px 22px", textDecoration: "none", color: TEKST, boxShadow: KAART_SCHADUW,
};
