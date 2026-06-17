"use client";

// Belletje met ongelezen-teller voor de bord-kop. Realtime: licht meteen op
// zodra iemand je tagt of je op een kaart zet. Klik je een melding aan, dan
// opent de juiste kaart en is de melding gelezen.

import { useCallback, useEffect, useState, CSSProperties } from "react";
import { supabase } from "@/lib/supabase";
import { GROEN, TEKST, GRIJS, RAND, ROOD } from "@/lib/theme";
import { type Melding } from "./planning-config";

export default function MeldingBel({ code, onOpen }: { code: string | null; onOpen: (kaartId: string) => void }) {
  const [items, setItems] = useState<Melding[]>([]);
  const [open, setOpen] = useState(false);

  const laad = useCallback(async () => {
    if (!code) return;
    const { data } = await supabase.from("melding").select("*").eq("ontvanger", code).order("tijdstip", { ascending: false }).limit(30);
    setItems((data || []) as Melding[]);
  }, [code]);

  useEffect(() => {
    if (!code) return;
    (async () => { await laad(); })();
    const kanaal = supabase
      .channel(`melding-${code}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "melding", filter: `ontvanger=eq.${code}` }, laad)
      .subscribe();
    return () => { supabase.removeChannel(kanaal); };
  }, [code, laad]);

  const ongelezen = items.filter((m) => !m.gelezen).length;

  async function klik(m: Melding) {
    if (!m.gelezen) await supabase.from("melding").update({ gelezen: true }).eq("id", m.id);
    setOpen(false);
    if (m.kaart_id) onOpen(m.kaart_id);
  }
  async function allesGelezen() {
    if (!code) return;
    await supabase.from("melding").update({ gelezen: true }).eq("ontvanger", code).eq("gelezen", false);
    await laad();
  }

  if (!code) return null;

  return (
    <div style={{ position: "relative" }}>
      <button onClick={() => setOpen((o) => !o)} title="Meldingen" style={belKnop}>
        <span style={{ fontSize: 17 }}>🔔</span>
        {ongelezen > 0 && <span style={teller}>{ongelezen > 9 ? "9+" : ongelezen}</span>}
      </button>

      {open && (
        <>
          <div onClick={() => setOpen(false)} style={vanger} />
          <div style={paneel}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", borderBottom: `1px solid ${RAND}` }}>
              <span style={{ fontSize: 12.5, fontWeight: 800, color: GROEN }}>Meldingen</span>
              {ongelezen > 0 && <button onClick={allesGelezen} style={{ border: "none", background: "transparent", color: GRIJS, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Alles gelezen</button>}
            </div>
            <div style={{ maxHeight: 360, overflowY: "auto" }}>
              {items.length === 0 && <div style={{ padding: 16, color: GRIJS, fontSize: 13 }}>Geen meldingen.</div>}
              {items.map((m) => (
                <button key={m.id} onClick={() => klik(m)} style={{ ...rij, background: m.gelezen ? "#fff" : "#eef3ef" }}>
                  <span style={{ fontSize: 15, marginTop: 1 }}>{m.soort === "tag" ? "💬" : m.soort === "lid" ? "👤" : "🔧"}</span>
                  <span style={{ flex: 1 }}>
                    <span style={{ display: "block", fontSize: 12.5, color: TEKST, lineHeight: 1.35 }}>{m.tekst}</span>
                    <span style={{ display: "block", fontSize: 10.5, color: GRIJS, marginTop: 2 }}>{tijd(m.tijdstip)}</span>
                  </span>
                  {!m.gelezen && <span style={{ width: 8, height: 8, borderRadius: "50%", background: ROOD, marginTop: 5 }} />}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function tijd(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "";
  const zelfdeDag = d.toDateString() === new Date().toDateString();
  const uur = d.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });
  return zelfdeDag ? `vandaag ${uur}` : `${d.toLocaleDateString("nl-NL", { day: "numeric", month: "short" })} ${uur}`;
}

const belKnop: CSSProperties = { position: "relative", border: `1px solid ${RAND}`, background: "#fff", borderRadius: 999, width: 38, height: 34, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" };
const teller: CSSProperties = { position: "absolute", top: -5, right: -4, background: ROOD, color: "#fff", fontSize: 10, fontWeight: 800, borderRadius: 999, minWidth: 16, height: 16, padding: "0 4px", display: "inline-flex", alignItems: "center", justifyContent: "center", border: "2px solid #fff" };
const vanger: CSSProperties = { position: "fixed", inset: 0, zIndex: 40 };
const paneel: CSSProperties = { position: "absolute", top: 42, right: 0, width: 320, background: "#fff", border: `1px solid ${RAND}`, borderRadius: 12, boxShadow: "0 12px 32px rgba(26,60,46,0.18)", zIndex: 41, overflow: "hidden" };
const rij: CSSProperties = { display: "flex", gap: 9, alignItems: "flex-start", width: "100%", textAlign: "left", border: "none", borderBottom: `1px solid ${RAND}`, padding: "10px 12px", cursor: "pointer" };
