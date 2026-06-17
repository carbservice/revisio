import Link from "next/link";
import { GROEN, GRIJS, BG, RAND } from "@/lib/theme";

// Publieke root staat bewust "under construction": geen openbare toegang tot de
// Revisio-omgeving. Medewerkers loggen in via /start; klanten volgen hun
// revisie via hun eigen link (/volg).
export default function Home() {
  return (
    <main style={{ minHeight: "100vh", background: BG, color: GROEN, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "'Karma', Georgia, serif" }}>
      <div style={{ textAlign: "center", maxWidth: 460 }}>
        <img src="/revisio-logo.svg" alt="Revisio" style={{ height: 60, width: "auto", margin: "0 auto 24px", display: "block" }} />
        <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", color: GRIJS }}>Under construction</div>
        <p style={{ fontSize: 16, color: GRIJS, margin: "14px 0 0", lineHeight: 1.6 }}>Deze omgeving is in aanbouw.</p>
        <div style={{ marginTop: 30, paddingTop: 20, borderTop: `1px solid ${RAND}` }}>
          <Link href="/start" style={{ fontSize: 12.5, color: GRIJS, opacity: 0.6, textDecoration: "none" }}>Medewerker? Inloggen</Link>
        </div>
      </div>
    </main>
  );
}
