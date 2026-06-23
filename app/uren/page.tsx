"use client";

// Urenregistratie - medewerker vult eigen uren in (datum, start, eind, opmerking).
// Bruto/pauze/netto komen uit Postgres (generated columns); hier alleen een live
// preview. Ieder ziet/bewerkt alleen z'n eigen uren (RLS). Elke regel heeft een
// status: ingediend (oranje) -> goedgekeurd (groen) of afgekeurd (rood). Een
// goedgekeurde regel kan niet meer gewijzigd worden (afgedwongen via RLS).

import { useEffect, useState, useCallback, CSSProperties } from "react";
import AuthGate, { useGebruiker } from "@/app/components/AuthGate";
import PaginaKop from "@/app/components/PaginaKop";
import { supabase } from "@/lib/supabase";
import { GROEN, GROEN_BG, ROOD, TEKST, GRIJS, RAND, BG, KAART_BG } from "@/lib/theme";

const ORANJE = "#e0911e";

type Entry = {
  id: string; datum: string; start_tijd: string; eind_tijd: string;
  opmerking: string | null; bruto_uren: number; pauze_uren: number; netto_uren: number;
  status: string; goedgekeurd_door: string | null;
};

const STATUS: Record<string, { kleur: string; label: string }> = {
  ingediend: { kleur: ORANJE, label: "Ingediend" },
  goedgekeurd: { kleur: GROEN, label: "Goedgekeurd" },
  afgekeurd: { kleur: ROOD, label: "Afgekeurd" },
};
const uur = (n: number) => Number(n).toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const vandaag = () => new Date().toISOString().slice(0, 10);
const dezeMaand = () => new Date().toISOString().slice(0, 7);

function bereken(start: string, eind: string) {
  if (!start || !eind) return null;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = eind.split(":").map(Number);
  const min = eh * 60 + em - (sh * 60 + sm);
  if (min <= 0) return null;
  const bruto = min / 60;
  const pauze = bruto > 5.5 ? 0.5 : 0;
  return { bruto: Math.round(bruto * 100) / 100, pauze, netto: Math.round((bruto - pauze) * 100) / 100 };
}

export default function UrenPagina() {
  return <AuthGate><Uren /></AuthGate>;
}

function Uren() {
  const { naam, isAdmin, uitloggen } = useGebruiker();
  const [maand, setMaand] = useState(dezeMaand());
  const [entries, setEntries] = useState<Entry[]>([]);
  const [laden, setLaden] = useState(true);
  const [fout, setFout] = useState<string | null>(null);

  const leeg = { datum: vandaag(), start: "09:00", eind: "17:30", opmerking: "" };
  const [form, setForm] = useState(leeg);
  const [bezig, setBezig] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const preview = bereken(form.start, form.eind);

  const laad = useCallback(async () => {
    setLaden(true); setFout(null);
    const eerste = `${maand}-01`;
    const [j, m] = maand.split("-").map(Number);
    const laatste = new Date(j, m, 0).toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from("urenregistratie").select("*")
      .gte("datum", eerste).lte("datum", laatste)
      .order("datum", { ascending: true }).order("start_tijd", { ascending: true });
    if (error) setFout(error.message);
    else setEntries((data || []) as Entry[]);
    setLaden(false);
  }, [maand]);

  useEffect(() => { laad(); }, [laad]);

  async function opslaan() {
    setFout(null);
    if (!preview) { setFout("Eindtijd moet na de starttijd liggen."); return; }
    setBezig(true);
    const rij = { datum: form.datum, start_tijd: form.start, eind_tijd: form.eind, opmerking: form.opmerking.trim() || null, naam };
    const res = editId
      ? await supabase.from("urenregistratie").update(rij).eq("id", editId)
      : await supabase.from("urenregistratie").insert(rij);
    setBezig(false);
    if (res.error) { setFout(res.error.message); return; }
    setForm(leeg); setEditId(null); laad();
  }

  function bewerk(e: Entry) {
    setEditId(e.id);
    setForm({ datum: e.datum, start: e.start_tijd.slice(0, 5), eind: e.eind_tijd.slice(0, 5), opmerking: e.opmerking ?? "" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function verwijder(id: string) {
    if (!window.confirm("Deze regel verwijderen?")) return;
    const { error } = await supabase.from("urenregistratie").delete().eq("id", id);
    if (error) setFout(error.message); else laad();
  }

  const totaalNetto = entries.reduce((s, e) => s + Number(e.netto_uren), 0);
  const goedgekeurd = entries.filter((e) => e.status === "goedgekeurd").reduce((s, e) => s + Number(e.netto_uren), 0);

  return (
    <main style={wrap}><div style={binnen}>
      <PaginaKop naam={naam} onUitloggen={uitloggen} titel="Uren Registratie" />

      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
        <span style={{ fontSize: 14, color: GRIJS }}>Maand:</span>
        <input type="month" value={maand} onChange={(e) => setMaand(e.target.value)} style={{ ...inp, width: "auto" }} />
        {isAdmin && <a href="/uren/overzicht" style={{ marginLeft: "auto", color: GROEN, fontWeight: 700, fontSize: 14, textDecoration: "none" }}>Uren akkorderen →</a>}
      </div>

      {/* Invoer */}
      <div style={kaart}>
        <div style={kop}>{editId ? "Regel bewerken" : "Uren toevoegen"}</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 12 }}>
          <Veld label="Datum"><input type="date" value={form.datum} onChange={(e) => setForm({ ...form, datum: e.target.value })} style={inp} /></Veld>
          <Veld label="Start"><input type="time" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} style={inp} /></Veld>
          <Veld label="Eind"><input type="time" value={form.eind} onChange={(e) => setForm({ ...form, eind: e.target.value })} style={inp} /></Veld>
          <Veld label="Netto"><div style={{ ...inp, background: GROEN_BG, fontWeight: 800, color: GROEN }}>{preview ? `${uur(preview.netto)} u` : "—"}</div></Veld>
        </div>
        <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginTop: 14 }}>Opmerking (optioneel)
          <input type="text" value={form.opmerking} onChange={(e) => setForm({ ...form, opmerking: e.target.value })} placeholder="bijv. ophalen onderdelen" style={inp} />
        </label>
        {preview && preview.pauze > 0 && <p style={{ fontSize: 12.5, color: GRIJS, marginTop: 8 }}>Bruto {uur(preview.bruto)} u, minus 0,50 u pauze (dienst langer dan 5,5 u).</p>}
        {fout && <p style={{ fontSize: 13.5, color: ROOD, marginTop: 10 }}>{fout}</p>}
        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <button onClick={opslaan} disabled={bezig || !preview} style={{ ...knop, opacity: bezig || !preview ? 0.4 : 1 }}>{editId ? "Opslaan" : "Indienen"}</button>
          {editId && <button onClick={() => { setEditId(null); setForm(leeg); setFout(null); }} style={knopLicht}>Annuleren</button>}
        </div>
      </div>

      {/* Totaal */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: GROEN_BG, borderRadius: 14, padding: "14px 18px", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
        <span style={{ fontSize: 14, color: GROEN }}>Deze maand: <b>{uur(goedgekeurd)} u</b> goedgekeurd<span style={{ color: GRIJS }}> · {uur(totaalNetto)} u totaal ingediend</span></span>
      </div>

      {/* Lijst */}
      {laden ? <p style={{ color: GRIJS }}>Laden…</p> : entries.length === 0 ? (
        <div style={{ ...kaart, textAlign: "center", color: GRIJS, borderStyle: "dashed" }}>Nog geen uren in deze maand.</div>
      ) : (
        <div style={{ ...kaart, padding: 0, overflow: "hidden" }}>
          {entries.map((e) => {
            const st = STATUS[e.status] || STATUS.ingediend;
            const opSlot = e.status !== "ingediend";
            return (
              <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderBottom: `1px solid ${RAND}`, flexWrap: "wrap" }}>
                <span title={st.label} style={{ width: 11, height: 11, borderRadius: "50%", background: st.kleur, flex: "none" }} />
                <div style={{ minWidth: 84 }}>
                  <div style={{ fontWeight: 700 }}>{new Date(e.datum).toLocaleDateString("nl-NL", { day: "numeric", month: "short" })}</div>
                  {e.opmerking && <div style={{ fontSize: 12, color: GRIJS }}>{e.opmerking}</div>}
                </div>
                <div style={{ color: GRIJS, fontSize: 14 }}>{e.start_tijd.slice(0, 5)} – {e.eind_tijd.slice(0, 5)}</div>
                <div style={{ fontSize: 12, color: st.kleur, fontWeight: 700 }}>{st.label}</div>
                <div style={{ marginLeft: "auto", textAlign: "right" }}>
                  <div style={{ fontWeight: 800 }}>{uur(Number(e.netto_uren))} u</div>
                  {Number(e.pauze_uren) > 0 && <div style={{ fontSize: 11.5, color: GRIJS }}>bruto {uur(Number(e.bruto_uren))}</div>}
                </div>
                <div style={{ display: "flex", gap: 12, marginLeft: 8, minWidth: 90, justifyContent: "flex-end" }}>
                  {opSlot ? <span style={{ fontSize: 11.5, color: GRIJS }}>🔒 vast</span> : (
                    <>
                      <button onClick={() => bewerk(e)} style={linkBtn}>Bewerk</button>
                      <button onClick={() => verwijder(e.id)} style={{ ...linkBtn, color: ROOD }}>Verwijder</button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <p style={{ fontSize: 12.5, color: GRIJS, marginTop: 4 }}>🟠 ingediend (wacht op akkoord) · 🟢 goedgekeurd · 🔴 afgekeurd. Goedgekeurde uren staan vast en tellen mee voor je loon.</p>
    </div></main>
  );
}

function Veld({ label, children }: { label: string; children: React.ReactNode }) {
  return <label style={{ flex: "1 1 130px", fontSize: 13, fontWeight: 600, color: TEKST }}><span style={{ display: "block", color: GRIJS, marginBottom: 5 }}>{label}</span>{children}</label>;
}

const wrap: CSSProperties = { minHeight: "100vh", background: BG, color: TEKST, fontFamily: "'Karma', Georgia, serif", padding: "26px max(16px, 3vw)" };
const binnen: CSSProperties = { maxWidth: 760, margin: "0 auto" };
const kaart: CSSProperties = { background: KAART_BG, border: `1px solid ${RAND}`, borderRadius: 16, padding: 16, marginBottom: 16 };
const kop: CSSProperties = { fontSize: 12.5, color: GRIJS, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5 };
const inp: CSSProperties = { width: "100%", boxSizing: "border-box", marginTop: 6, border: `1.5px solid ${RAND}`, borderRadius: 10, padding: "10px 12px", fontSize: 15, fontFamily: "inherit", background: "#fff", color: TEKST };
const knop: CSSProperties = { border: "none", background: GROEN, color: "#fff", borderRadius: 10, padding: "11px 20px", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" };
const knopLicht: CSSProperties = { border: `1px solid ${RAND}`, background: "#fff", color: TEKST, borderRadius: 10, padding: "11px 18px", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" };
const linkBtn: CSSProperties = { border: "none", background: "none", color: GRIJS, fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", padding: 0 };
