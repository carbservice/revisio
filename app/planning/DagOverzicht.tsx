"use client";

// In-app dagoverzicht op het start-dashboard: "Sinds gisteren op jouw kaarten".
// Toont per kaart de activiteit (log + chat) van de kaarten waar je lid van
// bent, met een link naar de kaart. Inklapbaar, en verdwijnt als er niks is.

import Link from "next/link";
import { useEffect, useState, CSSProperties } from "react";
import { supabase } from "@/lib/supabase";
import { GROEN, TEKST, GRIJS, RAND, KAART_SCHADUW } from "@/lib/theme";
import { codeVoorEmail } from "./planning-config";
import { bouwDigest, sindsGisteren, type DigestKaart } from "./dagoverzicht-lib";

export default function DagOverzicht() {
  const [kaarten, setKaarten] = useState<DigestKaart[]>([]);
  const [open, setOpen] = useState(false); // standaard ingeklapt: rustige startpagina

  useEffect(() => {
    let levend = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      const code = codeVoorEmail(data.user?.email);
      if (!levend || !code) return;
      const d = await bouwDigest(code, sindsGisteren());
      // Ruis eruit: alleen chats (incl. @tags) en afvinken; geen automatische
      // verschuivingen, lid-/omschrijving- of systeemregels.
      const relevant = (soort: string, tekst: string) => soort === "chat" || /vinkte af|zette terug/i.test(tekst);
      const gefilterd = d
        .map((k) => ({ ...k, regels: k.regels.filter((r) => relevant(r.soort, r.tekst)) }))
        .filter((k) => k.regels.length > 0);
      if (levend) setKaarten(gefilterd);
    })();
    return () => { levend = false; };
  }, []);

  if (kaarten.length === 0) return null;
  const totaal = kaarten.reduce((n, k) => n + k.regels.length, 0);

  return (
    <div style={kaart}>
      <button onClick={() => setOpen((o) => !o)} style={kopRij}>
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 16 }}>📋</span>
          <span style={{ fontSize: 13.5, fontWeight: 800, color: GROEN }}>Sinds gisteren op jouw kaarten</span>
          <span style={{ fontSize: 12, color: GRIJS }}>{totaal} {totaal === 1 ? "update" : "updates"} op {kaarten.length} {kaarten.length === 1 ? "kaart" : "kaarten"}</span>
        </span>
        <span style={{ fontSize: 12, color: GRIJS, fontWeight: 700 }}>{open ? "Inklappen" : "Uitklappen"}</span>
      </button>

      {open && (
        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 12 }}>
          {kaarten.map((k) => (
            <div key={k.kaart_id}>
              <Link href={`/planning/${k.kaart_id}`} style={{ fontSize: 13, fontWeight: 800, color: GROEN, textDecoration: "none" }}>
                {k.titel} <span style={{ color: GRIJS, fontWeight: 600 }}>openen →</span>
              </Link>
              <ul style={{ margin: "5px 0 0", padding: 0, listStyle: "none" }}>
                {k.regels.map((r, i) => (
                  <li key={i} style={{ fontSize: 12.5, color: TEKST, padding: "2px 0", lineHeight: 1.4 }}>
                    <span style={{ color: GRIJS }}>{tijd(r.tijdstip)}</span>{" "}
                    {r.soort === "log"
                      ? <span style={{ color: GRIJS, fontStyle: "italic" }}>{r.auteur} {r.tekst}</span>
                      : <span><b style={{ color: GROEN }}>{r.auteur}:</b> {r.tekst}</span>}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function tijd(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "";
  const zelfdeDag = d.toDateString() === new Date().toDateString();
  const uur = d.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });
  return zelfdeDag ? uur : `${d.toLocaleDateString("nl-NL", { day: "numeric", month: "short" })} ${uur}`;
}

const kaart: CSSProperties = { background: "#fff", border: `1px solid ${RAND}`, borderRadius: 14, padding: "14px 16px", marginBottom: 22, boxShadow: KAART_SCHADUW };
const kopRij: CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, width: "100%", background: "transparent", border: "none", cursor: "pointer", padding: 0, textAlign: "left" };
