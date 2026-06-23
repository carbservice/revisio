"use client";

// Adminportaal urenregistratie: bovenaan de uren die nog geAKKORDEERD moeten
// worden (per medewerker, per dag, met goedkeuren/afkeuren), daaronder de
// maandtotalen per medewerker (goedgekeurd = wat naar de loonaanvraag gaat).
// Alleen zichtbaar voor wie in app_admins staat (RLS: is_admin()).

import { useEffect, useState, useCallback, CSSProperties } from "react";
import AuthGate, { useGebruiker } from "@/app/components/AuthGate";
import PaginaKop from "@/app/components/PaginaKop";
import { supabase } from "@/lib/supabase";
import { GROEN, GROEN_BG, ROOD, ROOD_BG, TEKST, GRIJS, RAND, BG, KAART_BG } from "@/lib/theme";

const ORANJE = "#e0911e";
type Row = { id: string; user_id: string; naam: string | null; datum: string; start_tijd: string; eind_tijd: string; status: string; bruto_uren: number; pauze_uren: number; netto_uren: number };
const uur = (n: number) => Number(n).toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dezeMaand = () => new Date().toISOString().slice(0, 7);
const datkort = (d: string) => new Date(d).toLocaleDateString("nl-NL", { weekday: "short", day: "numeric", month: "short" });

export default function OverzichtPagina() {
  return <AuthGate><Overzicht /></AuthGate>;
}

function Overzicht() {
  const { naam, uitloggen } = useGebruiker();
  const [isAdm, setIsAdm] = useState<boolean | null>(null);
  const [maand, setMaand] = useState(dezeMaand());
  const [rows, setRows] = useState<Row[]>([]);
  const [laden, setLaden] = useState(true);
  const [fout, setFout] = useState<string | null>(null);

  useEffect(() => { supabase.from("app_admins").select("user_id").limit(1).then(({ data }) => setIsAdm(!!(data && data.length))); }, []);

  const laad = useCallback(async () => {
    if (!isAdm) return;
    setLaden(true); setFout(null);
    const eerste = `${maand}-01`;
    const [j, m] = maand.split("-").map(Number);
    const laatste = new Date(j, m, 0).toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from("urenregistratie").select("id, user_id, naam, datum, start_tijd, eind_tijd, status, bruto_uren, pauze_uren, netto_uren")
      .gte("datum", eerste).lte("datum", laatste)
      .order("datum", { ascending: true }).order("start_tijd", { ascending: true });
    if (error) setFout(error.message); else setRows((data || []) as Row[]);
    setLaden(false);
  }, [maand, isAdm]);

  useEffect(() => { laad(); }, [laad]);

  async function zet(filter: { id?: string; user_id?: string }, status: "goedgekeurd" | "afgekeurd") {
    const patch = { status, goedgekeurd_op: new Date().toISOString(), goedgekeurd_door: naam };
    let q = supabase.from("urenregistratie").update(patch).eq("status", "ingediend");
    if (filter.id) q = q.eq("id", filter.id);
    if (filter.user_id) {
      const eerste = `${maand}-01`; const [j, m] = maand.split("-").map(Number);
      const laatste = new Date(j, m, 0).toISOString().slice(0, 10);
      q = q.eq("user_id", filter.user_id).gte("datum", eerste).lte("datum", laatste);
    }
    const { error } = await q;
    if (error) setFout(error.message); else laad();
  }

  // Te akkorderen, gegroepeerd per medewerker
  const teAkk = rows.filter((r) => r.status === "ingediend");
  const perMed = new Map<string, { naam: string; entries: Row[] }>();
  teAkk.forEach((r) => { const k = r.user_id; if (!perMed.has(k)) perMed.set(k, { naam: r.naam || k.slice(0, 8), entries: [] }); perMed.get(k)!.entries.push(r); });

  // Maandtotalen per medewerker
  const totMap = new Map<string, { naam: string; goed: number; open: number; pauze: number; bruto: number }>();
  rows.forEach((r) => {
    const k = r.user_id; if (!totMap.has(k)) totMap.set(k, { naam: r.naam || k.slice(0, 8), goed: 0, open: 0, pauze: 0, bruto: 0 });
    const g = totMap.get(k)!; if (r.naam) g.naam = r.naam;
    if (r.status === "goedgekeurd") { g.goed += Number(r.netto_uren); g.pauze += Number(r.pauze_uren); g.bruto += Number(r.bruto_uren); }
    else if (r.status === "ingediend") g.open += Number(r.netto_uren);
  });
  const totalen = [...totMap.values()].sort((a, b) => a.naam.localeCompare(b.naam));

  return (
    <main style={wrap}><div style={binnen}>
      <PaginaKop naam={naam} onUitloggen={uitloggen} titel="Uren Akkorderen" />

      {isAdm === null ? <p style={{ color: GRIJS }}>Laden…</p> : !isAdm ? (
        <div style={{ ...kaart, color: GRIJS }}>Geen toegang. Dit portaal is alleen voor admins. Voeg je auth-user-id toe aan <b>app_admins</b> in Supabase.</div>
      ) : (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
            <span style={{ fontSize: 14, color: GRIJS }}>Maand:</span>
            <input type="month" value={maand} onChange={(e) => setMaand(e.target.value)} style={{ ...inp, width: "auto" }} />
            <a href="/uren" style={{ marginLeft: "auto", color: GROEN, fontWeight: 700, fontSize: 14, textDecoration: "none" }}>← Mijn uren</a>
          </div>
          {fout && <p style={{ color: ROOD, marginBottom: 12 }}>{fout}</p>}

          {/* TE AKKORDEREN */}
          <div style={{ ...kop, marginBottom: 10 }}>Te akkorderen {teAkk.length > 0 && <span style={{ color: ORANJE }}>({teAkk.length})</span>}</div>
          {laden ? <p style={{ color: GRIJS }}>Laden…</p> : perMed.size === 0 ? (
            <div style={{ ...kaart, color: GRIJS, textAlign: "center" }}>Niks te akkorderen deze maand. 🎉</div>
          ) : [...perMed.entries()].map(([uid, med]) => (
            <div key={uid} style={{ ...kaart, borderLeft: `4px solid ${ORANJE}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
                <span style={{ width: 11, height: 11, borderRadius: "50%", background: ORANJE }} />
                <div style={{ fontWeight: 800, fontSize: 16 }}>Uren akkorderen van {med.naam}</div>
                <button onClick={() => zet({ user_id: uid }, "goedgekeurd")} style={{ ...knop, marginLeft: "auto" }}>Alles goedkeuren ({med.entries.length})</button>
              </div>
              {med.entries.map((e) => (
                <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderTop: `1px solid ${RAND}`, flexWrap: "wrap" }}>
                  <div style={{ minWidth: 120, fontWeight: 700, textTransform: "capitalize" }}>{datkort(e.datum)}</div>
                  <div style={{ color: GRIJS, fontSize: 14 }}>{e.start_tijd.slice(0, 5)} – {e.eind_tijd.slice(0, 5)}</div>
                  <div style={{ marginLeft: "auto", fontWeight: 800 }}>{uur(Number(e.netto_uren))} u{Number(e.pauze_uren) > 0 && <span style={{ fontSize: 11.5, fontWeight: 400, color: GRIJS }}> (−{uur(Number(e.pauze_uren))} pauze)</span>}</div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => zet({ id: e.id }, "goedgekeurd")} style={miniGroen}>✓ Goed</button>
                    <button onClick={() => zet({ id: e.id }, "afgekeurd")} style={miniRood}>✗ Af</button>
                  </div>
                </div>
              ))}
            </div>
          ))}

          {/* MAANDTOTALEN */}
          <div style={{ ...kop, margin: "26px 0 10px" }}>Maandtotalen per medewerker</div>
          <div style={{ fontSize: 12.5, color: GRIJS, marginBottom: 10 }}>De kolom <b>Goedgekeurd</b> is wat je gebruikt voor de loonaanvraag.</div>
          <div style={{ ...kaart, padding: 0, overflow: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead><tr>{["Medewerker", "Bruto", "Pauze", "Goedgekeurd", "Nog open"].map((h, i) => (
                <th key={h} style={{ textAlign: i === 0 ? "left" : "right", fontSize: 11, color: GROEN, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.4, padding: "11px 14px", background: GROEN_BG, whiteSpace: "nowrap" }}>{h}</th>
              ))}</tr></thead>
              <tbody>
                {totalen.map((t, i) => (
                  <tr key={t.naam + i} style={{ background: i % 2 ? "#f4f8f5" : "#fff" }}>
                    <td style={{ ...td, fontWeight: 700 }}>{t.naam}</td>
                    <td style={{ ...td, textAlign: "right", color: GRIJS }}>{uur(t.bruto)}</td>
                    <td style={{ ...td, textAlign: "right", color: GRIJS }}>{uur(t.pauze)}</td>
                    <td style={{ ...td, textAlign: "right", fontWeight: 800, color: GROEN }}>{uur(t.goed)}</td>
                    <td style={{ ...td, textAlign: "right", color: t.open > 0 ? ORANJE : GRIJS }}>{uur(t.open)}</td>
                  </tr>
                ))}
                {totalen.length === 0 && <tr><td style={td} colSpan={5}>Geen uren in deze maand.</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div></main>
  );
}

const wrap: CSSProperties = { minHeight: "100vh", background: BG, color: TEKST, fontFamily: "'Karma', Georgia, serif", padding: "26px max(16px, 3vw)" };
const binnen: CSSProperties = { maxWidth: 820, margin: "0 auto" };
const kaart: CSSProperties = { background: KAART_BG, border: `1px solid ${RAND}`, borderRadius: 16, padding: 16, marginBottom: 16 };
const kop: CSSProperties = { fontSize: 12.5, color: GRIJS, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5 };
const inp: CSSProperties = { boxSizing: "border-box", border: `1.5px solid ${RAND}`, borderRadius: 10, padding: "9px 12px", fontSize: 15, fontFamily: "inherit", background: "#fff", color: TEKST };
const td: CSSProperties = { padding: "11px 14px", borderBottom: "1px solid #ecefe9" };
const knop: CSSProperties = { border: "none", background: GROEN, color: "#fff", borderRadius: 10, padding: "9px 16px", fontSize: 13.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" };
const miniGroen: CSSProperties = { border: "none", background: GROEN_BG, color: GROEN, borderRadius: 8, padding: "7px 11px", fontSize: 12.5, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" };
const miniRood: CSSProperties = { border: "none", background: ROOD_BG, color: ROOD, borderRadius: 8, padding: "7px 11px", fontSize: 12.5, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" };
