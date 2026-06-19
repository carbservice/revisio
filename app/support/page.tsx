"use client";

// Support Hub: een premium Claude-chat per carburateurtype, gegrond op de
// getranscribeerde servicehandleiding (support_kennis). Achter login. Onder de
// chat: de specifieke handleiding + de referentietekeningen.

import { useEffect, useRef, useState, CSSProperties } from "react";
import AuthGate, { useGebruiker } from "@/app/components/AuthGate";
import PaginaKop from "@/app/components/PaginaKop";
import { supabase } from "@/lib/supabase";
import { apiFetch } from "@/lib/api";
import { GROEN, GRIJS, BG, KAART_BG, KAART_SCHADUW, RAND, GOUD } from "@/lib/theme";

// Claude-huisstijl voor het chatvenster.
const CL_DONKER = "#262624";
const CL_KAART = "#33312d";
const CL_RAND = "#47453f";
const CL_ORANJE = "#d97757";
const CL_TEKST = "#ece9e3";
const CL_GRIJS = "#a8a39a";

type Bericht = { role: "user" | "assistant"; content: string };

function SupportChat() {
  const { naam, uitloggen } = useGebruiker();
  const [types, setTypes] = useState<string[]>([]);
  const [type, setType] = useState(""); // lege start
  const [taal, setTaal] = useState<"nl" | "en">("nl");
  const [berichten, setBerichten] = useState<Bericht[]>([]);
  const [vraag, setVraag] = useState("");
  const [bezig, setBezig] = useState(false);
  const [maandUsd, setMaandUsd] = useState(0);
  const [bronVan, setBronVan] = useState<Record<string, string>>({});
  const [boekjeUrl, setBoekjeUrl] = useState("");
  const [tekeningen, setTekeningen] = useState<{ naam: string; url: string }[]>([]);
  const [groot, setGroot] = useState("");
  const [kiezerOpen, setKiezerOpen] = useState(false);
  const lijstRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("support_kennis").select("type, bron").eq("taal", "nl");
      const rows = (data || []) as { type: string; bron: string }[];
      const uniek = [...new Set(rows.map((r) => r.type))].sort();
      const brn: Record<string, string> = {};
      rows.forEach((r) => { if (!brn[r.type]) brn[r.type] = r.bron; });
      setTypes(uniek); setBronVan(brn);
      const start = new Date(); start.setUTCDate(1); start.setUTCHours(0, 0, 0, 0);
      const { data: k } = await supabase.from("ai_kosten").select("kosten_usd").gte("aangemaakt_op", start.toISOString());
      setMaandUsd((k || []).reduce((s: number, r: { kosten_usd: number }) => s + Number(r.kosten_usd || 0), 0));
    })();
  }, []);

  // Boekje (signed URL) + referentietekeningen van het gekozen type.
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

  // Alleen het chatvakje zelf naar beneden scrollen, nooit de hele pagina.
  useEffect(() => { const el = lijstRef.current; if (el) el.scrollTop = el.scrollHeight; }, [berichten, bezig]);

  function kiesType(t: string) { setType(t); setBerichten([]); setKiezerOpen(false); }

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

  const taalKnop = (t: "nl" | "en"): CSSProperties => ({
    border: `1px solid ${taal === t ? CL_ORANJE : CL_RAND}`, background: taal === t ? CL_ORANJE : "transparent", color: taal === t ? "#fff" : CL_GRIJS,
    borderRadius: 8, padding: "7px 14px", fontSize: 13.5, fontWeight: 700, cursor: "pointer",
  });
  const sectieKop: CSSProperties = { fontSize: 20, fontWeight: 800, color: GROEN, margin: "0 0 2px" };
  const sectieSub: CSSProperties = { fontSize: 13.5, color: GRIJS, margin: "0 0 14px", lineHeight: 1.5 };
  const lichtKaart: CSSProperties = { background: KAART_BG, border: `1px solid ${RAND}`, borderRadius: 14, padding: 14, boxShadow: KAART_SCHADUW };

  return (
    <main style={{ minHeight: "100vh", background: BG, fontFamily: "'Karma', Georgia, serif", paddingBottom: 36 }}>
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "14px 16px 0" }}>
        <PaginaKop naam={naam} onUitloggen={uitloggen} titel="" />

        {/* Titel + uitnodigende intro */}
        <div style={{ textAlign: "center", margin: "4px 0 18px" }}>
          <h1 style={{ fontSize: "clamp(25px, 7vw, 34px)", fontWeight: 800, color: GROEN, margin: 0, letterSpacing: 0.5 }}>
            <span style={{ color: CL_ORANJE }}>✦</span> Support <span style={{ color: CL_ORANJE }}>HUB</span>
          </h1>
          <div style={{ maxWidth: 720, margin: "10px auto 0" }}>
            <p style={{ fontSize: 15, lineHeight: 1.6, color: GRIJS, margin: 0 }}>
              <b>Welkom bij de Support Hub.</b> We hebben een chat-agent getraind op alle originele auto- en carburateurdocumentatie: <b>blueprints, specsheets en handleidingboekjes</b>. Zo werkt het:
            </p>
            <ol style={{ textAlign: "left", fontSize: 14.5, lineHeight: 1.65, color: GRIJS, margin: "10px auto 0", paddingLeft: 22, maxWidth: 560 }}>
              <li>Selecteer je type carburateur.</li>
              <li>Geef zo duidelijk mogelijk informatie over je voertuig en carburateur (<b>merk, type, motor en bouwjaar</b>). Daarna kun je al je vragen stellen over die specifieke carburateur.</li>
            </ol>
            <p style={{ fontSize: 13.5, lineHeight: 1.6, color: GRIJS, margin: "10px 0 0" }}>
              Scroll naar beneden voor de bijbehorende handleiding (PDF) en de bouwtekeningen.
            </p>
          </div>
        </div>

        {/* Premium donker Claude-chatvenster */}
        <div style={{ position: "relative", background: "linear-gradient(165deg, #2c2a27 0%, #211f1d 100%)", border: `1.5px solid ${CL_ORANJE}`, borderRadius: 20, padding: 18, boxShadow: "0 24px 60px rgba(0,0,0,0.28), 0 0 0 1px rgba(217,119,87,0.10)" }}>
          {/* Topbalk: carburateur-kiezer + taal + kosten */}
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", paddingBottom: 14, borderBottom: `1px solid ${CL_RAND}`, marginBottom: 14 }}>
            <div style={{ position: "relative" }}>
              <button onClick={() => setKiezerOpen((o) => !o)} style={{
                border: `1.5px solid ${type ? CL_RAND : CL_ORANJE}`, background: type ? CL_KAART : CL_ORANJE, color: type ? CL_TEKST : "#fff",
                borderRadius: 10, padding: "10px 16px", fontSize: 14, fontWeight: 800, cursor: "pointer", letterSpacing: type ? 0 : 0.5, fontFamily: "inherit",
              }}>
                {type || "SELECTEER CARBURATEUR"} <span style={{ opacity: 0.8 }}>▾</span>
              </button>
              {kiezerOpen && (
                <>
                  <div onClick={() => setKiezerOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
                  <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 41, background: "#2b2926", border: `1px solid ${CL_RAND}`, borderRadius: 12, padding: 6, minWidth: 240, maxHeight: 320, overflowY: "auto", boxShadow: "0 16px 40px rgba(0,0,0,0.4)" }}>
                    {types.length === 0 && <div style={{ padding: "10px 12px", color: CL_GRIJS, fontSize: 13.5 }}>Laden…</div>}
                    {types.map((t) => (
                      <button key={t} onClick={() => kiesType(t)} style={{
                        display: "block", width: "100%", textAlign: "left", border: "none",
                        background: t === type ? CL_ORANJE : "transparent", color: t === type ? "#fff" : CL_TEKST,
                        borderRadius: 8, padding: "9px 12px", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                      }}>{t}</button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => setTaal("nl")} style={taalKnop("nl")}>NL</button>
              <button onClick={() => setTaal("en")} style={taalKnop("en")}>EN</button>
            </div>
            <div style={{ marginLeft: "auto", textAlign: "right", fontSize: 11, color: CL_GRIJS, lineHeight: 1.45 }} title="Geschatte AI-kosten deze maand">
              <div style={{ fontWeight: 800, color: CL_ORANJE }}>{`Deze maand: $${maandUsd.toFixed(3)}`}</div>
              <div>limiet $45/mnd</div>
            </div>
          </div>

          {/* Berichten / lege start */}
          <div ref={lijstRef} style={{ minHeight: 320, maxHeight: 540, overflowY: "auto", paddingRight: 4 }}>
            {!type ? (
              <div style={{ textAlign: "center", padding: "44px 16px", color: CL_GRIJS }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>✦</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: CL_TEKST, marginBottom: 6 }}>Klaar om aan de slag te gaan?</div>
                <div style={{ fontSize: 14.5, lineHeight: 1.6, maxWidth: 440, margin: "0 auto 18px" }}>
                  Kies eerst je carburateur. Daarna geef je het voertuig, bouwjaar en de klacht op, en Claude zoekt het voor je uit in de handleiding.
                </div>
                <button onClick={() => setKiezerOpen(true)} style={{ background: CL_ORANJE, color: "#fff", border: "none", borderRadius: 12, padding: "14px 26px", fontSize: 15, fontWeight: 800, letterSpacing: 0.5, cursor: "pointer", fontFamily: "inherit", boxShadow: "0 8px 22px rgba(217,119,87,0.35)" }}>
                  SELECTEER CARBURATEUR
                </button>
              </div>
            ) : (
              <>
                {berichten.length === 0 && (
                  <div style={{ color: CL_GRIJS, fontSize: 14.5, lineHeight: 1.6, padding: "16px 4px" }}>
                    Je werkt nu met de <b style={{ color: CL_TEKST }}>{type}</b>. Stel je vraag, bijvoorbeeld:
                    <ul style={{ marginTop: 8 }}>
                      <li>Klant klaagt over slecht stationair bij warme motor, waar begin ik?</li>
                      <li>Hoe werkt de startautomaat bij een koude motor?</li>
                      <li>Waarvoor dient de aanvullende mengselregelschroef?</li>
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
              </>
            )}
          </div>

          {/* Invoer */}
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <textarea
              value={vraag}
              onChange={(e) => setVraag(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); stuur(); } }}
              placeholder={type ? `Vraag iets over de ${type}…` : "Selecteer eerst een carburateur…"}
              disabled={!type}
              rows={2}
              style={{ flex: 1, resize: "vertical", minHeight: 46, border: `1px solid ${CL_RAND}`, borderRadius: 10, padding: "10px 12px", fontSize: 15, fontFamily: "inherit", background: CL_KAART, color: CL_TEKST, opacity: type ? 1 : 0.6 }}
            />
            <button onClick={stuur} disabled={bezig || !vraag.trim() || !type} style={{
              background: CL_ORANJE, color: "#fff", border: "none", borderRadius: 10, padding: "0 24px", fontSize: 15, fontWeight: 800,
              cursor: bezig || !vraag.trim() || !type ? "default" : "pointer", opacity: bezig || !vraag.trim() || !type ? 0.5 : 1, fontFamily: "inherit",
            }}>Stuur</button>
          </div>
        </div>

        {/* Servicehandleiding */}
        {boekjeUrl && (
          <section style={{ marginTop: 30 }}>
            <h2 style={sectieKop}>📖 Servicehandleiding</h2>
            <p style={sectieSub}>Hieronder staat de specifieke servicehandleiding van de <b>{type}</b>.</p>
            <div style={lichtKaart}>
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
                <a href={boekjeUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12.5, fontWeight: 700, color: GOUD }}>Open in nieuw tabblad ↗</a>
              </div>
              <iframe src={boekjeUrl} title={`handleiding ${type}`} style={{ width: "100%", height: "min(70vh, 600px)", border: `1px solid ${RAND}`, borderRadius: 8, background: "#fff" }} />
            </div>
          </section>
        )}

        {/* Referentietekeningen */}
        {tekeningen.length > 0 && (
          <section style={{ marginTop: 30 }}>
            <h2 style={sectieKop}>📐 Referentietekeningen</h2>
            <p style={sectieSub}>De bijbehorende referentie- en explosietekeningen van de <b>{type}</b> ({tekeningen.length} stuks). Klik op een tegel om te vergroten.</p>
            <div style={lichtKaart}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(118px, 1fr))", gap: 10 }}>
                {tekeningen.map((t) => (
                  <button key={t.url} onClick={() => setGroot(t.url)} title={t.naam} style={{ border: `1px solid ${RAND}`, borderRadius: 10, background: "#fff", padding: 6, cursor: "zoom-in", textAlign: "center" }}>
                    <img src={t.url} alt={t.naam} loading="lazy" style={{ width: "100%", height: 90, objectFit: "contain", background: "#fff", borderRadius: 6 }} />
                    <div style={{ fontSize: 10, color: GRIJS, marginTop: 4, lineHeight: 1.25, height: 26, overflow: "hidden" }}>{t.naam}</div>
                  </button>
                ))}
              </div>
            </div>
          </section>
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
