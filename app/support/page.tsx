"use client";

// Support Hub: chat per carburateurtype, gegrond op de getranscribeerde
// servicehandleiding (support_kennis). Achter login. De AI antwoordt alleen uit
// de handleiding van het gekozen type.

import { useEffect, useRef, useState, CSSProperties } from "react";
import AuthGate, { useGebruiker } from "@/app/components/AuthGate";
import PaginaKop from "@/app/components/PaginaKop";
import { supabase } from "@/lib/supabase";
import { apiFetch } from "@/lib/api";
import { GROEN, GROEN_BG, GOUD, GOUD_BG, ROOD, TEKST, GRIJS, RAND, BG, KAART_BG, KAART_SCHADUW } from "@/lib/theme";

type Bericht = { role: "user" | "assistant"; content: string };

function SupportChat() {
  const { naam, uitloggen } = useGebruiker();
  const [types, setTypes] = useState<string[]>([]);
  const [type, setType] = useState("");
  const [taal, setTaal] = useState<"nl" | "en">("nl");
  const [berichten, setBerichten] = useState<Bericht[]>([]);
  const [vraag, setVraag] = useState("");
  const [bezig, setBezig] = useState(false);
  const [maandUsd, setMaandUsd] = useState(0);
  const [bronVan, setBronVan] = useState<Record<string, string>>({});
  const [boekjeUrl, setBoekjeUrl] = useState("");
  const eindRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("support_kennis").select("type, bron").eq("taal", "nl");
      const rows = (data || []) as { type: string; bron: string }[];
      const uniek = [...new Set(rows.map((r) => r.type))].sort();
      const brn: Record<string, string> = {};
      rows.forEach((r) => { if (!brn[r.type]) brn[r.type] = r.bron; });
      setTypes(uniek); setBronVan(brn);
      setType((t) => t || uniek[0] || "");
      const start = new Date(); start.setUTCDate(1); start.setUTCHours(0, 0, 0, 0);
      const { data: k } = await supabase.from("ai_kosten").select("kosten_usd").gte("aangemaakt_op", start.toISOString());
      setMaandUsd((k || []).reduce((s: number, r: { kosten_usd: number }) => s + Number(r.kosten_usd || 0), 0));
    })();
  }, []);

  // Beveiligde (tijdelijke) link naar het boekje van het gekozen type.
  useEffect(() => {
    setBoekjeUrl("");
    const bron = bronVan[type];
    if (!type || !bron) return;
    (async () => {
      try {
        const r = await apiFetch(`/api/boekje?bron=${encodeURIComponent(bron)}`);
        const j = await r.json();
        if (j.url) setBoekjeUrl(j.url);
      } catch { /* geen viewer beschikbaar */ }
    })();
  }, [type, bronVan]);

  useEffect(() => { eindRef.current?.scrollIntoView({ behavior: "smooth" }); }, [berichten, bezig]);

  function kiesType(t: string) { setType(t); setBerichten([]); }

  async function stuur() {
    const v = vraag.trim();
    if (!v || bezig || !type) return;
    const nieuw: Bericht[] = [...berichten, { role: "user", content: v }];
    setBerichten(nieuw); setVraag(""); setBezig(true);
    try {
      const r = await apiFetch("/api/support", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, taal, vraag: v, history: berichten }),
      });
      const j = await r.json();
      if (typeof j.maandUsd === "number") setMaandUsd(j.maandUsd);
      setBerichten([...nieuw, { role: "assistant", content: j.antwoord || `⚠ ${j.fout || "Geen antwoord."}` }]);
    } catch {
      setBerichten([...nieuw, { role: "assistant", content: "⚠ Er ging iets mis. Probeer het opnieuw." }]);
    } finally {
      setBezig(false);
    }
  }

  const veld: CSSProperties = { border: `1.5px solid ${RAND}`, borderRadius: 10, padding: "9px 12px", fontSize: 15, fontFamily: "inherit", background: "#fff", color: TEKST };
  const taalKnop = (t: "nl" | "en", label: string): CSSProperties => ({
    border: `1.5px solid ${taal === t ? GROEN : RAND}`, background: taal === t ? GROEN : "#fff", color: taal === t ? "#fff" : GRIJS,
    borderRadius: 8, padding: "7px 14px", fontSize: 13.5, fontWeight: 700, cursor: "pointer",
  });

  return (
    <main style={{ minHeight: "100vh", background: BG, fontFamily: "'Karma', Georgia, serif", paddingBottom: 30 }}>
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "14px 16px 0" }}>
        <PaginaKop naam={naam} onUitloggen={uitloggen} titel="Support Hub" />
        {/* Keuzebalk */}
        <div style={{ background: KAART_BG, border: `1px solid ${RAND}`, borderRadius: 14, padding: 14, boxShadow: KAART_SCHADUW, display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ fontSize: 12, color: GRIJS, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Carburateurtype</div>
            <select value={type} onChange={(e) => kiesType(e.target.value)} style={{ ...veld, width: "100%" }}>
              {types.length === 0 && <option value="">Laden…</option>}
              {types.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 12, color: GRIJS, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Taal</div>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => setTaal("nl")} style={taalKnop("nl", "NL")}>NL</button>
              <button onClick={() => setTaal("en")} style={taalKnop("en", "EN")}>EN</button>
            </div>
          </div>
          <div style={{ marginLeft: "auto", textAlign: "right", fontSize: 11.5, color: GRIJS, lineHeight: 1.45 }} title="Geschatte AI-kosten deze maand (alle gebruikers samen)">
            <div style={{ fontWeight: 800, color: GROEN }}>{`Deze maand: $${maandUsd.toFixed(3)}`}</div>
            <div>limiet $45/mnd</div>
          </div>
        </div>

        <div style={{ fontSize: 12.5, color: GRIJS, margin: "10px 2px 0", lineHeight: 1.5 }}>
          De assistent antwoordt <b>alleen</b> uit de servicehandleiding van het gekozen type. Voor exacte sproeiermaten: raadpleeg het kennblad (die staan niet altijd in het boekje).
        </div>

        {/* Chat */}
        <div style={{ background: KAART_BG, border: `1px solid ${RAND}`, borderRadius: 14, padding: 16, marginTop: 12, boxShadow: KAART_SCHADUW, minHeight: 320 }}>
          {berichten.length === 0 && (
            <div style={{ color: GRIJS, fontSize: 14.5, lineHeight: 1.6, padding: "20px 6px" }}>
              Stel een vraag over de <b>{type || "carburateur"}</b>. Bijvoorbeeld:
              <ul style={{ marginTop: 8 }}>
                <li>Hoe werkt de startautomaat bij een koude motor?</li>
                <li>Waarvoor dient de aanvullende mengselregelschroef?</li>
                <li>Wat moet ik letten op bij het stationair afstellen?</li>
              </ul>
            </div>
          )}
          {berichten.map((m, i) => (
            <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", marginBottom: 10 }}>
              <div style={{
                maxWidth: "85%", whiteSpace: "pre-wrap", fontSize: 14.5, lineHeight: 1.55, borderRadius: 12, padding: "10px 13px",
                background: m.role === "user" ? GROEN : GROEN_BG, color: m.role === "user" ? "#fff" : TEKST,
                border: m.role === "user" ? "none" : `1px solid ${RAND}`,
              }}>{m.content}</div>
            </div>
          ))}
          {bezig && <div style={{ color: GRIJS, fontSize: 13.5, fontStyle: "italic", padding: "4px 6px" }}>De assistent leest de handleiding…</div>}
          <div ref={eindRef} />
        </div>

        {/* Invoer */}
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <textarea
            value={vraag}
            onChange={(e) => setVraag(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); stuur(); } }}
            placeholder={`Vraag iets over de ${type || "carburateur"}…`}
            rows={2}
            style={{ ...veld, flex: 1, resize: "vertical", minHeight: 46 }}
          />
          <button onClick={stuur} disabled={bezig || !vraag.trim() || !type} style={{
            background: GROEN, color: "#fff", border: "none", borderRadius: 10, padding: "0 20px", fontSize: 15, fontWeight: 700,
            cursor: bezig || !vraag.trim() ? "default" : "pointer", opacity: bezig || !vraag.trim() || !type ? 0.6 : 1, fontFamily: "inherit",
          }}>Stuur</button>
        </div>

        {/* Servicehandleiding (klikbaar boekje) */}
        {boekjeUrl && (
          <div style={{ background: KAART_BG, border: `1px solid ${RAND}`, borderRadius: 14, padding: 12, marginTop: 16, boxShadow: KAART_SCHADUW }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, flexWrap: "wrap", gap: 8 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: GROEN }}>📖 Servicehandleiding · {type}</div>
              <a href={boekjeUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12.5, fontWeight: 700, color: GOUD }}>Open in nieuw tabblad ↗</a>
            </div>
            <iframe src={boekjeUrl} title={`handleiding ${type}`} style={{ width: "100%", height: 560, border: `1px solid ${RAND}`, borderRadius: 8, background: "#fff" }} />
          </div>
        )}
      </div>
    </main>
  );
}

export default function SupportPagina() {
  return (
    <AuthGate>
      <SupportChat />
    </AuthGate>
  );
}
