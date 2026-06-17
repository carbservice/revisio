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

  async function gelezen(id: string) {
    await supabase.from("melding").update({ gelezen: true }).eq("id", id);
  }

  return (
    <div style={kaart}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 16 }}>🔔</span>
        <span style={{ fontSize: 13.5, fontWeight: 800, color: GROEN }}>Je hebt {items.length} {items.length === 1 ? "melding" : "meldingen"}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {items.map((m) => (
          <Link key={m.id} href={m.kaart_id ? `/planning/${m.kaart_id}` : "/planning"} onClick={() => gelezen(m.id)} style={rij}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: ROOD, flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: 13, color: TEKST }}>{m.tekst}</span>
            <span style={{ fontSize: 11.5, color: GROEN, fontWeight: 700, flexShrink: 0 }}>Openen →</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

const kaart: CSSProperties = { background: "#fff", border: `1px solid ${RAND}`, borderRadius: 14, padding: "14px 16px", marginBottom: 22, boxShadow: KAART_SCHADUW };
const rij: CSSProperties = { display: "flex", alignItems: "center", gap: 9, textDecoration: "none", padding: "7px 6px", borderRadius: 8 };
