"use client";

// Support Hub: chat per carburateurtype, gegrond op de getranscribeerde
// servicehandleiding (support_kennis). Achter login. De AI antwoordt alleen uit
// de handleiding van het gekozen type.

import { useEffect, useRef, useState, CSSProperties } from "react";
import AuthGate, { useGebruiker } from "@/app/components/AuthGate";
import PaginaKop from "@/app/components/PaginaKop";
import { supabase } from "@/lib/supabase";
import { apiFetch } from "@/lib/api";
import { GROEN, GRIJS, BG } from "@/lib/theme";

// Claude-huisstijl voor het chatvenster: donkere achtergrond + oranje accent.
const CL_DONKER = "#262624";
const CL_KAART = "#31302c";
const CL_RAND = "#47453f";
const CL_ORANJE = "#d97757";
const CL_TEKST = "#ece9e3";
const CL_GRIJS = "#a39f97";

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
  const [tekeningen, setTekeningen] = useState<{ naam: string; url: string }[]>([]);
  const [groot, setGroot] = useState("");
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

  // Boekje (signed URL) + referentietekeningen van het gekozen type ophalen.
  useEffect(() => {
    setBoekjeUrl(""); setTekeningen([]);
    if (!type) return;
    const bron = bronVan[type];
    (async () => {
      try {
        if (bron) {
          const r = await apiFetch(`/api/boekje?bron=${encodeURIComponent(bron)}`);
          const j = await r.json();
          if (j.url) setBoekjeUrl(j.url);
        }
        const tr = await apiFetch(`/api/tekeningen?type=${encodeURIComponent(type)}`);
        const tj = await tr.json();
        setTekeningen(tj.tekeningen || []);
      } catch { /* geen viewer/tekeningen */ }
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

  const selVeld: CSSProperties = { border: `1px solid ${CL_RAND}`, borderRadius: 10, padding: "8px 11px", fontSize: 14.5, fontFamily: "inherit", background: CL_KAART, color: CL_TEKST };
  const taalKnop = (t: "nl" | "en"): CSSProperties => ({
    border: `1px solid ${taal === t ? CL_ORANJE : CL_RAND}`, background: taal === t ? CL_ORANJE : "transparent", color: taal === t ? "#fff" : CL_GRIJS,
    borderRadius: 8, padding: "7px 14px", fontSize: 13.5, fontWeight: 700, cursor: "pointer",
  });
  const paneel: CSSProperties = { background: CL_DONKER, border: `1px solid ${CL_RAND}`, borderRadius: 14, padding: 14, marginTop: 14 };
  const paneelKop: CSSProperties = { fontSize: 14, fontWeight: 800, color: CL_ORANJE, marginBottom: 10 };

  return (
    <main style={{ minHeight: "100vh", background: BG, fontFamily: "'Karma', Georgia, serif", paddingBottom: 30 }}>
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "14px 16px 0" }}>
        <PaginaKop naam={naam} onUitloggen={uitloggen} titel="" />

        {/* Gecentreerde titel + intro */}
        <div style={{ textAlign: "center", margin: "2px 0 16px" }}>
          <h1 style={{ fontSize: 32, fontWeight: 800, color: GROEN, margin: 0, letterSpacing: 0.5 }}>Support <span style={{ color: CL_ORANJE }}>HUB</span></h1>
          <p style={{ maxWidth: 680, margin: "10px auto 0", fontSize: 14.5, lineHeight: 1.6, color: GRIJS }}>
            Op deze pagina chat je met <b>Claude AI</b> om carburateurproblemen op te zoeken en klachten van klanten in te typen. Selecteer eerst het type carburateur. De werkplaatsdocumentatie is volledig ingeladen: <b>boekjes, blueprints en specsheets</b>. Gebruik de chat met mate, want we betalen per prompt via de zakelijke Anthropic Claude API.
          </p>
        </div>

        {/* Donker Claude-chatvenster met oranje kader */}
        <div style={{ background: CL_DONKER, border: `1.5px solid ${CL_ORANJE}`, borderRadius: 18, padding: 16, boxShadow: "0 18px 50px rgba(0,0,0,0.22)" }}>
          {/* Keuzebalk binnen het venster */}
          <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap", paddingBottom: 12, borderBottom: `1px solid ${CL_RAND}`, marginBottom: 12 }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontSize: 11, color: CL_GRIJS, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Carburateurtype</div>
              <select value={type} onChange={(e) => kiesType(e.target.value)} style={{ ...selVeld, width: "100%" }}>
                {types.length === 0 && <option value="">Laden…</option>}
                {types.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize: 11, color: CL_GRIJS, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Taal</div>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => setTaal("nl")} style={taalKnop("nl")}>NL</button>
                <button onClick={() => setTaal("en")} style={taalKnop("en")}>EN</button>
              </div>
            </div>
            <div style={{ marginLeft: "auto", textAlign: "right", fontSize: 11, color: CL_GRIJS, lineHeight: 1.45 }} title="Geschatte AI-kosten deze maand">
              <div style={{ fontWeight: 800, color: CL_ORANJE }}>{`Deze maand: $${maandUsd.toFixed(3)}`}</div>
              <div>limiet $45/mnd</div>
            </div>
          </div>

          {/* Berichten */}
          <div style={{ minHeight: 300, maxHeight: 540, overflowY: "auto", paddingRight: 4 }}>
            {berichten.length === 0 && (
              <div style={{ color: CL_GRIJS, fontSize: 14.5, lineHeight: 1.6, padding: "16px 4px" }}>
                Stel een vraag over de <b style={{ color: CL_TEKST }}>{type || "carburateur"}</b>. Bijvoorbeeld:
                <ul style={{ marginTop: 8 }}>
                  <li>Hoe werkt de startautomaat bij een koude motor?</li>
                  <li>Waarvoor dient de aanvullende mengselregelschroef?</li>
                  <li>Waar moet ik op letten bij het stationair afstellen?</li>
                </ul>
              </div>
            )}
            {berichten.map((m, i) => (
              <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", marginBottom: 10 }}>
                <div style={{
                  maxWidth: "86%", whiteSpace: "pre-wrap", fontSize: 14.5, lineHeight: 1.55, borderRadius: 12, padding: "10px 13px",
                  background: m.role === "user" ? CL_ORANJE : CL_KAART, color: m.role === "user" ? "#fff" : CL_TEKST,
                  border: m.role === "user" ? "none" : `1px solid ${CL_RAND}`,
                }}>{m.content}</div>
              </div>
            ))}
            {bezig && <div style={{ color: CL_ORANJE, fontSize: 13.5, fontStyle: "italic", padding: "4px 4px" }}>Claude leest de handleiding…</div>}
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
              style={{ flex: 1, resize: "vertical", minHeight: 46, border: `1px solid ${CL_RAND}`, borderRadius: 10, padding: "10px 12px", fontSize: 15, fontFamily: "inherit", background: CL_KAART, color: CL_TEKST }}
            />
            <button onClick={stuur} disabled={bezig || !vraag.trim() || !type} style={{
              background: CL_ORANJE, color: "#fff", border: "none", borderRadius: 10, padding: "0 22px", fontSize: 15, fontWeight: 800,
              cursor: bezig || !vraag.trim() ? "default" : "pointer", opacity: bezig || !vraag.trim() || !type ? 0.55 : 1, fontFamily: "inherit",
            }}>Stuur</button>
          </div>
        </div>

        {/* Servicehandleiding (klikbaar boekje) */}
        {boekjeUrl && (
          <div style={paneel}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, flexWrap: "wrap", gap: 8 }}>
              <div style={paneelKop}>📖 Servicehandleiding · {type}</div>
              <a href={boekjeUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12.5, fontWeight: 700, color: CL_ORANJE }}>Open in nieuw tabblad ↗</a>
            </div>
            <iframe src={boekjeUrl} title={`handleiding ${type}`} style={{ width: "100%", height: 560, border: "none", borderRadius: 8, background: "#fff" }} />
          </div>
        )}

        {/* Referentietekeningen als tegels */}
        {tekeningen.length > 0 && (
          <div style={paneel}>
            <div style={paneelKop}>{`📐 Referentietekeningen · ${type} (${tekeningen.length})`}</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(118px, 1fr))", gap: 10 }}>
              {tekeningen.map((t) => (
                <button key={t.url} onClick={() => setGroot(t.url)} title={t.naam} style={{ border: `1px solid ${CL_RAND}`, borderRadius: 10, background: "#fff", padding: 6, cursor: "zoom-in", textAlign: "center" }}>
                  <img src={t.url} alt={t.naam} loading="lazy" style={{ width: "100%", height: 90, objectFit: "contain", background: "#fff", borderRadius: 6 }} />
                  <div style={{ fontSize: 10, color: CL_GRIJS, marginTop: 4, lineHeight: 1.25, height: 26, overflow: "hidden" }}>{t.naam}</div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {groot && (
        <div onClick={() => setGroot("")} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.82)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, cursor: "zoom-out" }}>
          <img src={groot} alt="" style={{ maxWidth: "96%", maxHeight: "96%", objectFit: "contain", borderRadius: 8, background: "#fff" }} />
        </div>
      )}
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
