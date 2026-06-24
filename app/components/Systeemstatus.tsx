"use client";

// Compacte live-statusbalk voor het dashboard: één brede balk met per
// dienst een pill en een groen "lampje" dat brandt als de dienst leeft.
// Checkt elk kwartier of app, API en de externe diensten (Moneybird,
// Supabase, GitHub) bereikbaar zijn. Toont de stand van nu, geen uptime.

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

  const geladen = services !== null;
  const vind = (frag: string) => (services || []).find((s) => s.naam.includes(frag));
  const rijen = [
    { kort: "Revisio app", ok: appOk, ms: null as number | null },
    { kort: "Revisio API", ok: appOk, ms: null as number | null },
    { kort: "Moneybird", ok: !!vind("Moneybird")?.ok, ms: vind("Moneybird")?.ms ?? null },
    { kort: "Supabase", ok: !!vind("Supabase")?.ok, ms: vind("Supabase")?.ms ?? null },
    { kort: "GitHub", ok: !!vind("GitHub")?.ok, ms: vind("GitHub")?.ms ?? null },
    { kort: "Backblaze B2 backup", ok: !!vind("Backblaze")?.ok, ms: vind("Backblaze")?.ms ?? null },
  ];

  const kaart: CSSProperties = { background: KAART_BG, border: `1px solid ${RAND}`, borderRadius: 14, padding: "12px 16px", marginBottom: 20, boxShadow: KAART_SCHADUW };

  return (
    <div style={kaart}>
      <style>{`@keyframes revled { 0%,100% { opacity: 1 } 50% { opacity: .55 } }`}</style>
      <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 9 }}>
        <span style={{ fontSize: 12, color: GRIJS, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginRight: 2 }}>Status</span>

        {!geladen && <span style={{ fontSize: 13, color: GRIJS }}>controleren…</span>}

        {geladen && rijen.map((r) => (
          <span
            key={r.kort}
            title={r.ok ? `live${r.ms != null ? ` · ${r.ms} ms` : ""}` : "offline"}
            style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "7px 13px", borderRadius: 999, border: `1px solid ${r.ok ? RAND : ROOD}`, background: r.ok ? "#fff" : ROOD_BG, fontSize: 13, fontWeight: 600, color: r.ok ? TEKST : ROOD, whiteSpace: "nowrap", lineHeight: 1 }}
          >
            <span style={{
              width: 9, height: 9, borderRadius: "50%", flexShrink: 0,
              background: r.ok ? GROEN : ROOD,
              boxShadow: r.ok ? `0 0 0 2px ${GROEN_BG}, 0 0 7px ${GROEN}` : `0 0 0 2px ${ROOD_BG}, 0 0 7px ${ROOD}`,
              animation: r.ok ? "revled 2.4s ease-in-out infinite" : "none",
            }} />
            <span style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.4, lineHeight: 1, color: r.ok ? GROEN : ROOD }}>{r.ok ? "live" : "offline"}</span>
            <span style={{ lineHeight: 1 }}>{r.kort}</span>
          </span>
        ))}

        {geladen && <span style={{ marginLeft: "auto", fontSize: 11.5, color: GRIJS, whiteSpace: "nowrap" }}>{tijd}</span>}
      </div>
    </div>
  );
}
