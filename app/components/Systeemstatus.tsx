"use client";

// Live-statuspaneel voor het dashboard: checkt elke 15 minuten of de
// app, de API-routes en de externe diensten (Moneybird, Supabase, GitHub)
// bereikbaar zijn. Groen = live, rood = probleem, met responstijd.
// Let op: dit is de stand van NU, geen historische uptime.

import { useEffect, useState, CSSProperties } from "react";
import { GROEN, GROEN_BG, ROOD, ROOD_BG, GRIJS, RAND, TEKST, KAART_BG, KAART_SCHADUW } from "@/lib/theme";

type Service = { naam: string; ok: boolean; ms: number | null };

export default function Systeemstatus() {
  const [services, setServices] = useState<Service[] | null>(null);
  const [appOk, setAppOk] = useState(true);
  const [tijd, setTijd] = useState("");

  async function check() {
    try {
      const r = await fetch("/api/health", { cache: "no-store" }).then((x) => x.json());
      setServices(r.services || []);
      setAppOk(true);
      setTijd(new Date(r.checkedAt).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" }));
    } catch {
      setServices([]);
      setAppOk(false);
      setTijd(new Date().toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" }));
    }
  }

  useEffect(() => {
    check();
    const t = setInterval(check, 15 * 60 * 1000); // elk kwartier
    return () => clearInterval(t);
  }, []);

  const rijen: Service[] = [
    { naam: "App & hosting (Vercel)", ok: appOk, ms: null },
    { naam: "API-routes (Vercel)", ok: appOk, ms: null },
    ...(services || []),
  ];

  const geladen = services !== null;
  const allesOk = geladen && rijen.every((r) => r.ok);
  const aantalProblemen = rijen.filter((r) => !r.ok).length;

  const kaart: CSSProperties = { background: KAART_BG, border: `1px solid ${RAND}`, borderRadius: 16, padding: 18, marginBottom: 20, boxShadow: KAART_SCHADUW };
  const kop: CSSProperties = { fontSize: 13, color: GRIJS, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 };

  return (
    <div style={kaart}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 12 }}>
        <span style={kop}>Systeemstatus</span>
        {geladen && (
          <span style={{ fontSize: 12, fontWeight: 800, padding: "3px 10px", borderRadius: 999, color: allesOk ? GROEN : ROOD, background: allesOk ? GROEN_BG : ROOD_BG }}>
            {allesOk ? "Alles live" : `${aantalProblemen} probleem${aantalProblemen === 1 ? "" : "en"}`}
          </span>
        )}
      </div>

      {!geladen && <div style={{ fontSize: 13, color: GRIJS }}>Status controleren…</div>}

      {geladen && rijen.map((r) => (
        <div key={r.naam} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderTop: `1px solid ${RAND}` }}>
          <span style={{ width: 18, textAlign: "center", color: r.ok ? GROEN : ROOD, fontWeight: 800 }}>{r.ok ? "✓" : "✕"}</span>
          <span style={{ fontSize: 13.5, color: TEKST, flex: 1, minWidth: 0 }}>{r.naam}</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: r.ok ? GROEN : ROOD, whiteSpace: "nowrap" }}>
            {r.ok ? "live" : "offline"}{r.ok && r.ms != null ? ` · ${r.ms} ms` : ""}
          </span>
        </div>
      ))}

      {geladen && (
        <div style={{ fontSize: 11.5, color: GRIJS, marginTop: 12, borderTop: `1px solid ${RAND}`, paddingTop: 10 }}>
          Laatst gecheckt {tijd} · ververst automatisch elk kwartier. Dit is de stand van nu, geen uptime-geschiedenis.
        </div>
      )}
    </div>
  );
}
