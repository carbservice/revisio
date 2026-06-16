"use client";

// Breed laadscherm voor de dashboards: laat zien dat de API's live data
// ophalen, met een voortgangsbalk en per API een status (bezig / klaar).

import { GROEN, GROEN_BG, GRIJS, RAND, TEKST, KAART_SCHADUW } from "@/lib/theme";

export default function LaadScherm({ apis, titel = "Cijfers laden…" }: { apis: { naam: string; klaar: boolean }[]; titel?: string }) {
  const klaar = apis.filter((a) => a.klaar).length;
  const totaal = apis.length;
  const pct = totaal ? Math.round((klaar / totaal) * 100) : 0;

  return (
    <div style={{ background: "#fff", border: `1px solid ${RAND}`, borderRadius: 18, padding: "32px 28px", boxShadow: KAART_SCHADUW, maxWidth: 560, margin: "40px auto" }}>
      <style>{`
        @keyframes revpuls { 0%, 100% { opacity: .3 } 50% { opacity: 1 } }
        @keyframes revbar { from { background-position: 0 0 } to { background-position: 40px 0 } }
      `}</style>

      <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", color: GROEN }}>Revisio · live data</div>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: GROEN, margin: "8px 0 6px" }}>{titel}</h1>
      <p style={{ fontSize: 14.5, color: TEKST, lineHeight: 1.5, margin: "0 0 20px" }}>
        Alle API&apos;s draaien en halen de data live op. Moment geduld, dit kost soms even.
      </p>

      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, color: GRIJS, fontWeight: 700, marginBottom: 6, fontVariantNumeric: "tabular-nums" }}>
        <span>{klaar} / {totaal} API&apos;s klaar</span>
        <span>{pct}%</span>
      </div>
      <div style={{ height: 10, background: GROEN_BG, borderRadius: 999, overflow: "hidden" }}>
        <div style={{
          height: "100%",
          width: `${pct}%`,
          background: `repeating-linear-gradient(45deg, ${GROEN}, ${GROEN} 10px, #245a44 10px, #245a44 20px)`,
          backgroundSize: "40px 40px",
          borderRadius: 999,
          transition: "width .4s ease",
          animation: "revbar 1s linear infinite",
        }} />
      </div>

      <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 9 }}>
        {apis.map((a) => (
          <div key={a.naam} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13.5, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
            <span style={{ width: 18, textAlign: "center", color: a.klaar ? GROEN : GRIJS, animation: a.klaar ? "none" : "revpuls 1s ease-in-out infinite" }}>{a.klaar ? "✓" : "●"}</span>
            <span style={{ color: a.klaar ? TEKST : GRIJS }}>{a.naam}</span>
            <span style={{ marginLeft: "auto", fontSize: 12, fontWeight: 700, color: a.klaar ? GROEN : GRIJS }}>{a.klaar ? "klaar" : "bezig…"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
