"use client";

// Banner op het start-dashboard: na de welkomtekst zie je je openstaande
// meldingen, met een hyperlink die de juiste kaart opent. Verdwijnt zodra je
// niets ongelezen meer hebt.

import Link from "next/link";
import { useCallback, useEffect, useState, CSSProperties } from "react";
import { supabase } from "@/lib/supabase";
import { GROEN, TEKST, RAND, ROOD, KAART_SCHADUW } from "@/lib/theme";
import { codeVoorEmail, type Melding } from "./planning-config";

export default function MeldingBanner() {
  const [code, setCode] = useState<string | null>(null);
  const [items, setItems] = useState<Melding[]>([]);

  const laad = useCallback(async (c: string) => {
    const { data } = await supabase.from("melding").select("*").eq("ontvanger", c).eq("gelezen", false).order("tijdstip", { ascending: false }).limit(20);
    setItems((data || []) as Melding[]);
  }, []);

  useEffect(() => {
    let levend = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      const c = codeVoorEmail(data.user?.email);
      if (!levend || !c) return;
      setCode(c);
      await laad(c);
    })();
    return () => { levend = false; };
  }, [laad]);

  useEffect(() => {
    if (!code) return;
    const kanaal = supabase
      .channel(`banner-${code}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "melding", filter: `ontvanger=eq.${code}` }, () => laad(code))
      .subscribe();
    return () => { supabase.removeChannel(kanaal); };
  }, [code, laad]);

  if (!code || items.length === 0) return null;

  // Bij openen van de kaart: ook als gelezen markeren.
  async function gelezen(id: string) {
    await supabase.from("melding").update({ gelezen: true }).eq("id", id);
  }
  // "Gelezen"-knop: meteen uit de lijst + in de database op gelezen zetten.
  async function markeer(id: string) {
    setItems((xs) => xs.filter((x) => x.id !== id));
    await supabase.from("melding").update({ gelezen: true }).eq("id", id);
  }
  // Alles in één klik wegwerken.
  async function allesGelezen() {
    const c = code;
    setItems([]);
    if (c) await supabase.from("melding").update({ gelezen: true }).eq("ontvanger", c).eq("gelezen", false);
  }

  return (
    <div style={kaart}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 16 }}>🔔</span>
          <span style={{ fontSize: 13.5, fontWeight: 800, color: GROEN }}>Je hebt {items.length} {items.length === 1 ? "melding" : "meldingen"}</span>
        </div>
        <button onClick={allesGelezen} style={allesBtn}>✓ Alles gelezen</button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {items.map((m) => (
          <div key={m.id} style={rij}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: ROOD, flexShrink: 0 }} />
            <Link href={m.kaart_id ? `/werkplaats-planning/${m.kaart_id}` : "/werkplaats-planning"} onClick={() => gelezen(m.id)} style={{ flex: 1, display: "flex", alignItems: "center", gap: 9, textDecoration: "none", minWidth: 0 }}>
              <span style={{ flex: 1, fontSize: 13, color: TEKST, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.tekst}</span>
              <span style={{ fontSize: 11.5, color: GROEN, fontWeight: 700, flexShrink: 0 }}>Openen →</span>
            </Link>
            <button onClick={() => markeer(m.id)} style={gelezenBtn}>Gelezen</button>
          </div>
        ))}
      </div>
    </div>
  );
}

const kaart: CSSProperties = { background: "#fff", border: `1px solid ${RAND}`, borderRadius: 14, padding: "14px 16px", marginBottom: 22, boxShadow: KAART_SCHADUW };
const rij: CSSProperties = { display: "flex", alignItems: "center", gap: 9, padding: "7px 6px", borderRadius: 8 };
const allesBtn: CSSProperties = { flexShrink: 0, background: "transparent", color: GROEN, border: `1px solid ${RAND}`, borderRadius: 999, padding: "5px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" };
const gelezenBtn: CSSProperties = { flexShrink: 0, background: "#e7f0ea", color: GROEN, border: "none", borderRadius: 999, padding: "6px 12px", fontSize: 11.5, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" };
