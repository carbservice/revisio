"use client";

// Kaart-detail (modaal). Titel, omschrijving, leden, checklist en een chat met
// automatisch activiteitenlog. Alles realtime via Supabase, zodat we elkaar
// live zien schrijven en afvinken. Omdat de kaart aan klus_id hangt, leest de
// werkbon-app op dezelfde klus mee.

import { useEffect, useRef, useState, CSSProperties, ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { GROEN, GOUD, TEKST, GRIJS, RAND } from "@/lib/theme";
import {
  TEAM, faseTitel, veroudering, dagenSinds, revisieKlokKleur, REVISIE_DOEL_DAGEN,
  type Kaart, type Klus, type ChecklistItem, type Bericht,
} from "./planning-config";

const SERIF = "'Karma', Georgia, serif";

type KlusRef = { nummer: string; klus_id: string; klant: string; kaart_id: string | null };

export default function KaartDetail({
  kaart, klus, gebruiker, mijnCode, klantOnuitgegeven, binnenOp, klusIndex, onSluit, onWijzig,
}: {
  kaart: Kaart; klus?: Klus; gebruiker: string; mijnCode: string | null; klantOnuitgegeven?: boolean; binnenOp?: string | null; klusIndex?: KlusRef[]; onSluit: () => void; onWijzig: () => void;
}) {
  const [titel, setTitel] = useState(kaart.titel);
  const [omschrijving, setOmschrijving] = useState(kaart.omschrijving);
  const [leden, setLeden] = useState<string[]>([]);
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [berichten, setBerichten] = useState<Bericht[]>([]);
  const [nieuwItem, setNieuwItem] = useState("");
  const [sleepItem, setSleepItem] = useState<string | null>(null); // checklist-item dat gesleept wordt
  const [chat, setChat] = useState("");
  const [gekopieerd, setGekopieerd] = useState(false);
  const [smal, setSmal] = useState(() => typeof window !== "undefined" && window.innerWidth < 720);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Op een telefoon de twee kolommen onder elkaar stapelen.
  useEffect(() => {
    const meet = () => setSmal(window.innerWidth < 720);
    window.addEventListener("resize", meet);
    return () => window.removeEventListener("resize", meet);
  }, []);
  // De ouder geeft dit component een key per kaart-id, dus de bewerkvelden
  // starten vanzelf met de juiste titel/omschrijving (geen reset-effect nodig).

  async function laad() {
    const [l, c, b] = await Promise.all([
      supabase.from("kaart_lid").select("gebruiker").eq("kaart_id", kaart.id),
      supabase.from("kaart_checklist_item").select("*").eq("kaart_id", kaart.id).order("volgorde"),
      supabase.from("kaart_bericht").select("*").eq("kaart_id", kaart.id).order("tijdstip"),
    ]);
    setLeden((l.data || []).map((r: { gebruiker: string }) => r.gebruiker));
    setItems((c.data || []) as ChecklistItem[]);
    setBerichten((b.data || []) as Bericht[]);
  }

  useEffect(() => {
    (async () => { await laad(); })();
    const kanaal = supabase
      .channel(`kaart-${kaart.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "kaart_lid", filter: `kaart_id=eq.${kaart.id}` }, laad)
      .on("postgres_changes", { event: "*", schema: "public", table: "kaart_checklist_item", filter: `kaart_id=eq.${kaart.id}` }, laad)
      .on("postgres_changes", { event: "*", schema: "public", table: "kaart_bericht", filter: `kaart_id=eq.${kaart.id}` }, laad)
      .subscribe();
    return () => { supabase.removeChannel(kanaal); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kaart.id]);

  // Naar onderen scrollen bij een nieuw bericht.
  useEffect(() => { const el = scrollRef.current; if (el) el.scrollTop = el.scrollHeight; }, [berichten.length]);

  async function log(tekst: string) {
    await supabase.from("kaart_bericht").insert({ kaart_id: kaart.id, auteur: gebruiker, tekst, soort: "log" });
  }

  // --- Titel / omschrijving ------------------------------------------------
  async function bewaarTitel() {
    const t = titel.trim();
    if (t === kaart.titel) return;
    await supabase.from("kaart").update({ titel: t }).eq("id", kaart.id);
    await log(`hernoemde de kaart naar "${t}"`);
    onWijzig();
  }
  async function bewaarOmschrijving() {
    if (omschrijving === kaart.omschrijving) return;
    await supabase.from("kaart").update({ omschrijving }).eq("id", kaart.id);
    await log("werkte de omschrijving bij");
    onWijzig();
  }

  // --- Leden ---------------------------------------------------------------
  async function wisselLid(code: string) {
    if (leden.includes(code)) {
      await supabase.from("kaart_lid").delete().eq("kaart_id", kaart.id).eq("gebruiker", code);
      await log(`haalde ${code} van de kaart`);
    } else {
      await supabase.from("kaart_lid").insert({ kaart_id: kaart.id, gebruiker: code });
      await log(`voegde ${code} toe aan de kaart`);
      if (code !== mijnCode) {
        await supabase.from("melding").insert({
          ontvanger: code, kaart_id: kaart.id, van: gebruiker, soort: "lid",
          tekst: `${gebruiker} zette je op de kaart "${kaart.titel || klus?.voertuig || "planning"}"`,
        });
      }
    }
    await laad();
    onWijzig();
  }

  // --- Checklist -----------------------------------------------------------
  async function voegItemToe() {
    const tekst = nieuwItem.trim();
    if (!tekst) return;
    setNieuwItem("");
    const volgorde = items.length;
    await supabase.from("kaart_checklist_item").insert({ kaart_id: kaart.id, tekst, volgorde });
    await log(`voegde checklist-punt toe: "${tekst}"`);
    await laad();
    onWijzig();
  }
  async function wisselItem(it: ChecklistItem) {
    await supabase.from("kaart_checklist_item").update({ gedaan: !it.gedaan }).eq("id", it.id);
    await log(`${it.gedaan ? "zette terug" : "vinkte af"}: "${it.tekst}"`);
    await laad();
    onWijzig();
  }
  async function verwijderItem(it: ChecklistItem) {
    await supabase.from("kaart_checklist_item").delete().eq("id", it.id);
    await log(`verwijderde checklist-punt: "${it.tekst}"`);
    await laad();
    onWijzig();
  }
  // Sleep een checklist-punt naar de plek van een ander punt; volgorde opslaan.
  async function verplaatsItem(doelId: string) {
    const sleep = sleepItem;
    setSleepItem(null);
    if (!sleep || sleep === doelId) return;
    const lijst = [...items].sort((a, b) => a.volgorde - b.volgorde);
    const van = lijst.findIndex((i) => i.id === sleep);
    const naar = lijst.findIndex((i) => i.id === doelId);
    if (van < 0 || naar < 0) return;
    const [verplaatst] = lijst.splice(van, 1);
    lijst.splice(naar, 0, verplaatst);
    const nieuw = lijst.map((i, idx) => ({ ...i, volgorde: idx }));
    setItems(nieuw); // optimistisch; realtime houdt het bij andere kijkers gelijk
    await Promise.all(nieuw.map((i) => supabase.from("kaart_checklist_item").update({ volgorde: i.volgorde }).eq("id", i.id)));
  }

  // --- Chat met @taggen (collega's en offertenummers) ----------------------
  // Keuzelijstje zodra het laatste woord met @ begint. Begint het met een
  // cijfer, dan suggereren we offertenummers (klussen); anders collega's.
  const mentionMatch = /(?:^|\s)@([\w-]*)$/.exec(chat);
  const q = mentionMatch ? mentionMatch[1] : "";
  const qLaag = q.toLowerCase();
  const isNummer = /^\d/.test(q);
  type Sug = { soort: "persoon" | "klus"; waarde: string; titel: string; sub: string };
  const suggesties: Sug[] = !mentionMatch ? [] : isNummer
    ? (klusIndex || []).filter((k) => k.nummer && k.nummer.toLowerCase().includes(qLaag)).slice(0, 8)
        .map((k) => ({ soort: "klus", waarde: k.nummer, titel: k.nummer, sub: k.klant }))
    : TEAM.filter((l) => l.code !== mijnCode && (l.naam.toLowerCase().startsWith(qLaag) || l.code.toLowerCase().startsWith(qLaag)))
        .map((l) => ({ soort: "persoon", waarde: l.naam, titel: l.naam, sub: l.code }));

  function kies(waarde: string) {
    setChat((prev) => prev.replace(/@([\w-]*)$/, `@${waarde} `));
  }

  // Maakt van @2026-XXXX in een bericht een klikbare link naar de kaart (of de
  // werkbon als er nog geen kaart is).
  function renderTekst(tekst: string): ReactNode[] {
    const re = /@(\d{4}-\d{2,6})/g;
    const out: ReactNode[] = [];
    let last = 0, m: RegExpExecArray | null, i = 0;
    while ((m = re.exec(tekst)) !== null) {
      if (m.index > last) out.push(tekst.slice(last, m.index));
      const nummer = m[1];
      const k = (klusIndex || []).find((x) => x.nummer === nummer);
      const href = k ? (k.kaart_id ? `/planning/${k.kaart_id}` : `/werkbonnen?klus=${k.klus_id}`) : null;
      out.push(href
        ? <a key={`r${i}`} href={href} title={k?.klant} style={{ color: GROEN, fontWeight: 700, textDecoration: "none", background: "#e7f0ea", borderRadius: 5, padding: "0 4px" }}>@{nummer}</a>
        : `@${nummer}`);
      last = m.index + m[0].length; i++;
    }
    if (last < tekst.length) out.push(tekst.slice(last));
    return out;
  }

  async function stuur() {
    const tekst = chat.trim();
    if (!tekst) return;
    setChat("");
    await supabase.from("kaart_bericht").insert({ kaart_id: kaart.id, auteur: gebruiker, tekst, soort: "chat" });

    // Getagde collega's een melding sturen (niet jezelf).
    const genoemd = TEAM.filter((l) => l.code !== mijnCode && new RegExp(`@(?:${l.code}|${l.naam})\\b`, "i").test(tekst));
    if (genoemd.length) {
      await supabase.from("melding").insert(genoemd.map((l) => ({
        ontvanger: l.code, kaart_id: kaart.id, van: gebruiker, soort: "tag",
        tekst: `${gebruiker} noemde je: "${tekst.length > 90 ? tekst.slice(0, 90) + "..." : tekst}"`,
      })));
    }
  }

  function kopieerLink() {
    navigator.clipboard?.writeText(window.location.href).then(() => {
      setGekopieerd(true); setTimeout(() => setGekopieerd(false), 1500);
    }).catch(() => {});
  }

  const gedaan = items.filter((i) => i.gedaan).length;
  const sig = veroudering(kaart.entered_stage_at, kaart.fase);

  return (
    <div onClick={onSluit} style={overlay}>
      <div onClick={(e) => e.stopPropagation()} style={paneel}>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Karma:wght@400;500;600;700&display=swap" />

        {/* Kop */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 4 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            <span style={pil}>{faseTitel(kaart.fase)}</span>
            {kaart.type === "klus" ? <span style={{ ...pil, background: "#e7f0ea", color: GROEN }}>Klus</span> : <span style={{ ...pil, background: "#f1efe8" }}>Planning</span>}
            {kaart.gefactureerd && <span style={{ ...pil, background: "#f7f0db", color: "#6b5410", border: `1px solid ${GOUD}` }}>Gefactureerd</span>}
            {sig && sig.label && <span style={{ ...pil, background: "#fff", color: sig.kleur, border: `1px solid ${sig.kleur}` }}>{sig.dagen} dgn in kolom</span>}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={kopieerLink} style={knopLicht}>{gekopieerd ? "Gekopieerd!" : "Kopieer link"}</button>
            <button onClick={onSluit} style={knopLicht}>Sluiten</button>
          </div>
        </div>

        <input
          value={titel} onChange={(e) => setTitel(e.target.value)} onBlur={bewaarTitel}
          placeholder="Titel" style={titelVeld}
        />

        {klus && (
          <div style={klusBlok}>
            <div style={{ fontSize: 13, color: TEKST }}><b>{klus.klant}</b>{klus.nummer ? ` · ${klus.nummer}` : ""}</div>
            {klus.voertuig && <div style={{ fontSize: 12.5, color: GRIJS, marginTop: 2 }}>{klus.voertuig}</div>}
            {klus.klacht && <div style={{ fontSize: 12.5, color: GRIJS, marginTop: 2 }}>Klacht: {klus.klacht}</div>}
            <a href={`/werkbonnen?klus=${kaart.klus_id}`} style={{ display: "inline-block", marginTop: 8, fontSize: 12.5, fontWeight: 700, color: GROEN }}>Open in de werkbon-app →</a>
          </div>
        )}

        {/* Timers: informatief tot binnenkomst, daarna de 5-dagen revisie-klok. */}
        {kaart.type === "klus" && (() => {
          const binnenDagen = dagenSinds(binnenOp);
          if (binnenDagen != null) {
            const kleur = revisieKlokKleur(binnenDagen);
            return (
              <div style={{ marginTop: 8, background: "#fff", border: `1px solid ${kleur}`, borderRadius: 10, padding: "9px 12px" }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: kleur }}>⏱ Binnen sinds {datumKort(binnenOp)} · dag {binnenDagen} van {REVISIE_DOEL_DAGEN}</span>
                <span style={{ fontSize: 12.5, color: GRIJS }}> {binnenDagen >= REVISIE_DOEL_DAGEN ? " (over de revisie-deadline van 5 dagen)" : ` (nog ${REVISIE_DOEL_DAGEN - binnenDagen} ${REVISIE_DOEL_DAGEN - binnenDagen === 1 ? "dag" : "dagen"} tot het doel)`}</span>
              </div>
            );
          }
          const acceptDagen = dagenSinds(kaart.aangemaakt_op);
          return (
            <div style={{ marginTop: 8, background: "#f4f2ec", border: `1px solid ${RAND}`, borderRadius: 10, padding: "9px 12px" }}>
              <span style={{ fontSize: 12.5, color: TEKST }}>Geaccepteerd op {datumKort(kaart.aangemaakt_op)}{acceptDagen != null ? ` (${acceptDagen} ${acceptDagen === 1 ? "dag" : "dagen"} geleden)` : ""}. Wacht op binnenkomst; de revisie-klok start zodra de monteur Ontvangst bevestigt.</span>
            </div>
          );
        })()}

        {klantOnuitgegeven && (
          <div style={{ background: "#f7e4de", border: "1px solid #e0b3a8", borderRadius: 10, padding: "9px 12px", marginTop: 8 }}>
            <span style={{ fontSize: 12.5, color: "#8a2a1c", fontWeight: 700 }}>Let op: de laatste klant-update is nog niet gepusht.</span>
            <span style={{ fontSize: 12, color: "#8a2a1c" }}> Doe dat vóór je factureert, anders kan het daarna niet meer. </span>
            <a href={`/werkbonnen?klus=${kaart.klus_id}`} style={{ fontSize: 12.5, fontWeight: 700, color: "#8a2a1c", textDecoration: "underline" }}>Naar de werkbon →</a>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: smal ? "1fr" : "1fr 1fr", gap: 18, marginTop: 14 }}>
          {/* Links: omschrijving, leden, checklist */}
          <div>
            <div style={kopje}>Omschrijving</div>
            <textarea
              value={omschrijving} onChange={(e) => setOmschrijving(e.target.value)} onBlur={bewaarOmschrijving}
              placeholder="Voeg een omschrijving toe..." rows={3} style={tekstVlak}
            />

            <div style={{ ...kopje, marginTop: 14 }}>Leden</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {TEAM.map((l) => {
                const aan = leden.includes(l.code);
                return (
                  <button key={l.code} onClick={() => wisselLid(l.code)} title={l.naam}
                    style={{ display: "flex", alignItems: "center", gap: 6, border: `1px solid ${aan ? GROEN : RAND}`, background: aan ? "#fff" : "#f7f5f0", borderRadius: 999, padding: "4px 10px 4px 4px", cursor: "pointer", opacity: aan ? 1 : 0.7 }}>
                    <span style={{ ...lidBol, background: aan ? GROEN : "#cfcabf" }}>{l.code}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: aan ? TEKST : GRIJS }}>{l.naam}</span>
                  </button>
                );
              })}
            </div>

            <div style={{ ...kopje, marginTop: 14, display: "flex", justifyContent: "space-between" }}>
              <span>Checklist</span>
              {items.length > 0 && <span style={{ color: GRIJS, fontWeight: 700 }}>{gedaan}/{items.length}</span>}
            </div>
            {items.length > 0 && (
              <div style={{ height: 6, background: "#e7e3d9", borderRadius: 4, overflow: "hidden", marginBottom: 8 }}>
                <div style={{ height: "100%", width: `${Math.round((gedaan / items.length) * 100)}%`, background: GROEN }} />
              </div>
            )}
            {items.map((it) => (
              <div
                key={it.id}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); verplaatsItem(it.id); }}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "3px 0", opacity: sleepItem === it.id ? 0.4 : 1 }}
              >
                <span
                  draggable
                  onDragStart={(e) => { setSleepItem(it.id); e.dataTransfer.effectAllowed = "move"; }}
                  onDragEnd={() => setSleepItem(null)}
                  title="Sleep om te ordenen"
                  style={{ cursor: "grab", color: "#b9b4a8", fontSize: 14, lineHeight: 1, userSelect: "none" }}
                >⠿</span>
                <input type="checkbox" checked={it.gedaan} onChange={() => wisselItem(it)} style={{ width: 16, height: 16, cursor: "pointer" }} />
                <span style={{ flex: 1, fontSize: 13, color: it.gedaan ? GRIJS : TEKST, textDecoration: it.gedaan ? "line-through" : "none" }}>{it.tekst}</span>
                <button onClick={() => verwijderItem(it)} style={{ border: "none", background: "transparent", color: GRIJS, cursor: "pointer", fontSize: 15, lineHeight: 1 }}>×</button>
              </div>
            ))}
            <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
              <input value={nieuwItem} onChange={(e) => setNieuwItem(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") voegItemToe(); }}
                placeholder="Nieuw punt" style={{ flex: 1, boxSizing: "border-box", border: `1.5px solid ${RAND}`, borderRadius: 8, padding: "8px 10px", fontSize: 13 }} />
              <button onClick={voegItemToe} style={knopGroen}>+</button>
            </div>
          </div>

          {/* Rechts: chat + log */}
          <div style={{ display: "flex", flexDirection: "column", minHeight: 320 }}>
            <div style={kopje}>Chat en log</div>
            <div ref={scrollRef} style={chatVlak}>
              {berichten.length === 0 && <div style={{ color: GRIJS, fontSize: 12.5 }}>Nog geen berichten.</div>}
              {berichten.map((b) => b.soort === "log" ? (
                <div key={b.id} style={{ fontSize: 11.5, color: GRIJS, fontStyle: "italic", margin: "5px 0" }}>
                  {b.auteur} {b.tekst} · {tijd(b.tijdstip)}
                </div>
              ) : (
                <div key={b.id} style={{ margin: "7px 0" }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: GROEN }}>{b.auteur} <span style={{ color: GRIJS, fontWeight: 600 }}>· {tijd(b.tijdstip)}</span></div>
                  <div style={{ fontSize: 13, color: TEKST, background: "#fff", border: `1px solid ${RAND}`, borderRadius: 8, padding: "7px 9px", marginTop: 2, whiteSpace: "pre-wrap" }}>{renderTekst(b.tekst)}</div>
                </div>
              ))}
            </div>
            <div style={{ position: "relative", marginTop: 8 }}>
              {suggesties.length > 0 && (
                <div style={mentionLijst}>
                  {suggesties.map((s) => (
                    <button key={s.soort + s.waarde} onMouseDown={(e) => { e.preventDefault(); kies(s.waarde); }} style={mentionRij}>
                      <span style={{ width: 20, height: 20, borderRadius: "50%", background: GROEN, color: "#fff", fontSize: s.soort === "klus" ? 12 : 9, fontWeight: 800, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{s.soort === "klus" ? "#" : s.sub}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: TEKST }}>{s.titel}</span>
                      {s.soort === "klus" && s.sub && <span style={{ fontSize: 12, color: GRIJS, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.sub}</span>}
                    </button>
                  ))}
                </div>
              )}
              <div style={{ display: "flex", gap: 6 }}>
                <input
                  value={chat} onChange={(e) => setChat(e.target.value)}
                  onKeyDown={(e) => {
                    if (suggesties.length && (e.key === "Enter" || e.key === "Tab")) { e.preventDefault(); kies(suggesties[0].waarde); return; }
                    if (e.key === "Enter") stuur();
                  }}
                  placeholder="Schrijf een bericht...  (@ om te taggen)"
                  style={{ flex: 1, boxSizing: "border-box", border: `1.5px solid ${RAND}`, borderRadius: 8, padding: "9px 11px", fontSize: 13 }}
                />
                <button onClick={stuur} style={{ ...knopGroen, padding: "9px 16px" }}>Stuur</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function datumKort(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isFinite(d.getTime()) ? d.toLocaleDateString("nl-NL", { day: "numeric", month: "short" }) : "";
}

function tijd(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "";
  const vandaag = new Date();
  const zelfdeDag = d.toDateString() === vandaag.toDateString();
  const uur = d.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });
  return zelfdeDag ? uur : `${d.toLocaleDateString("nl-NL", { day: "numeric", month: "short" })} ${uur}`;
}

// --- Stijl -----------------------------------------------------------------
const overlay: CSSProperties = {
  position: "fixed", inset: 0, background: "rgba(26,33,28,0.45)", display: "flex",
  alignItems: "flex-start", justifyContent: "center", padding: "5vh 16px", zIndex: 50, overflowY: "auto",
};
const paneel: CSSProperties = {
  background: "#faf8f3", border: `1px solid ${RAND}`, borderRadius: 16, padding: 20,
  width: "100%", maxWidth: 760, boxShadow: "0 12px 40px rgba(26,60,46,0.22)",
};
const pil: CSSProperties = {
  fontSize: 10.5, fontWeight: 800, letterSpacing: 0.5, color: GRIJS, background: "#f1efe8",
  borderRadius: 999, padding: "3px 9px", textTransform: "uppercase",
};
const titelVeld: CSSProperties = {
  width: "100%", boxSizing: "border-box", border: "1px solid transparent", background: "transparent",
  fontFamily: SERIF, fontSize: 22, fontWeight: 700, color: GROEN, padding: "4px 6px", marginTop: 6, borderRadius: 8,
};
const klusBlok: CSSProperties = { background: "#fff", border: `1px solid ${RAND}`, borderRadius: 10, padding: "10px 12px", marginTop: 8 };
const kopje: CSSProperties = { fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: GROEN, marginBottom: 7 };
const tekstVlak: CSSProperties = { width: "100%", boxSizing: "border-box", border: `1.5px solid ${RAND}`, borderRadius: 10, padding: "9px 11px", fontSize: 13, fontFamily: "inherit", resize: "vertical" };
const chatVlak: CSSProperties = { flex: 1, background: "#f4f2ec", border: `1px solid ${RAND}`, borderRadius: 10, padding: "8px 11px", overflowY: "auto", maxHeight: 360, minHeight: 220 };
const lidBol: CSSProperties = { width: 22, height: 22, borderRadius: "50%", color: "#fff", fontSize: 9.5, fontWeight: 800, display: "inline-flex", alignItems: "center", justifyContent: "center" };
const knopLicht: CSSProperties = { border: `1px solid ${RAND}`, background: "#fff", color: GRIJS, borderRadius: 999, padding: "6px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" };
const knopGroen: CSSProperties = { border: "none", background: GROEN, color: "#fff", borderRadius: 8, padding: "8px 12px", fontSize: 14, fontWeight: 700, cursor: "pointer" };
const mentionLijst: CSSProperties = { position: "absolute", bottom: "calc(100% + 4px)", left: 0, right: 56, background: "#fff", border: `1px solid ${RAND}`, borderRadius: 10, boxShadow: "0 8px 24px rgba(26,60,46,0.16)", overflow: "hidden", zIndex: 5 };
const mentionRij: CSSProperties = { display: "flex", alignItems: "center", gap: 8, width: "100%", textAlign: "left", border: "none", background: "transparent", padding: "8px 11px", cursor: "pointer" };
