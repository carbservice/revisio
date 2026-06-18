"use client";

// Het planningsbord (intern kanban, vervanger van Trello). Toont de vaste
// kolommen met sleepbare kaarten, leden, checklist-voortgang en een
// verouderingskleur per kaart. De klus is de bron: een klus-kaart hangt aan
// klus_id, dezelfde sleutel als in de werkbon-app en Moneybird.

import { useCallback, useEffect, useMemo, useRef, useState, CSSProperties } from "react";
import { supabase } from "@/lib/supabase";
import { GROEN, GOUD, TEKST, GRIJS, RAND, BG, KAART_SCHADUW } from "@/lib/theme";
import { useGebruiker } from "@/app/components/AuthGate";
import Systeemstatus from "@/app/components/Systeemstatus";
import DashboardNav from "@/app/components/DashboardNav";
import RevisioLogo from "@/app/components/RevisioLogo";
import {
  FASES, faseTitel, veroudering, STANDAARD_LEDEN, codeVoorEmail, voortgangPct,
  dagenSinds, revisieKlokKleur, REVISIE_DOEL_DAGEN,
  type Kaart, type FaseSleutel, type Klus, type KlusStatus,
} from "./planning-config";
import KaartDetail from "./KaartDetail";
import MeldingBel from "./MeldingBel";

const SERIF = "'Karma', Georgia, serif";

type Tellingen = { gedaan: number; totaal: number };

export default function Bord({ startKaartId }: { startKaartId?: string }) {
  const { naam, isAdmin, uitloggen } = useGebruiker();
  const [kaarten, setKaarten] = useState<Kaart[]>([]);
  const [leden, setLeden] = useState<Record<string, string[]>>({});
  const [checklist, setChecklist] = useState<Record<string, Tellingen>>({});
  const [klussen, setKlussen] = useState<Record<string, Klus>>({});
  const [klusStatus, setKlusStatus] = useState<Record<string, KlusStatus>>({});
  const [laden, setLaden] = useState(true);
  const [synct, setSynct] = useState(false);
  const [openId, setOpenId] = useState<string | null>(startKaartId || null);
  const [sleepId, setSleepId] = useState<string | null>(null);
  const [nieuwInFase, setNieuwInFase] = useState<FaseSleutel | null>(null);
  const [nieuwTekst, setNieuwTekst] = useState("");
  const [mijnCode, setMijnCode] = useState<string | null>(null);
  const [meldingPerKaart, setMeldingPerKaart] = useState<Record<string, number>>({});
  const herlaadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Slepen op de achtergrond om horizontaal te scrollen (pannen).
  const bordRef = useRef<HTMLDivElement | null>(null);
  const pan = useRef({ actief: false, startX: 0, startScroll: 0 });
  const [pannen, setPannen] = useState(false);

  // --- Data laden ----------------------------------------------------------
  // Leest de stadia/retour uit de monteurs-app en leidt per klus af: voortgang
  // in %, of het een retour is, en of er nog een onuitgegeven klant-update is.
  const laadKlusStatus = useCallback(async (klusIds: string[]) => {
    const ids = [...new Set(klusIds)];
    if (ids.length === 0) { setKlusStatus({}); return; }
    const [vRes, rRes] = await Promise.all([
      supabase.from("klus_voortgang").select("klus_id, stap, gedaan_op, gepubliceerd_op").in("klus_id", ids),
      supabase.from("werkbon_retour").select("klus_id, is_retour"),
    ]);
    const stappen: Record<string, string[]> = {};
    const onuitgegeven: Record<string, boolean> = {};
    const binnenOp: Record<string, string> = {};
    (vRes.data || []).forEach((v: { klus_id: string; stap: string; gedaan_op: string | null; gepubliceerd_op: string | null }) => {
      (stappen[v.klus_id] = stappen[v.klus_id] || []).push(v.stap);
      if (!v.gepubliceerd_op) onuitgegeven[v.klus_id] = true;
      if (v.stap === "ontvangen" && v.gedaan_op) binnenOp[v.klus_id] = v.gedaan_op; // plank-teller start
    });
    const retour = new Set<string>();
    (rRes.data || []).forEach((r: { klus_id: string; is_retour: boolean }) => { if (r.is_retour) retour.add(String(r.klus_id).split("#")[0]); });
    const uit: Record<string, KlusStatus> = {};
    ids.forEach((id) => { uit[id] = { pct: voortgangPct(stappen[id] || []), retour: retour.has(id), onuitgegeven: !!onuitgegeven[id], binnenOp: binnenOp[id] || null }; });
    setKlusStatus(uit);
  }, []);

  const herlaad = useCallback(async () => {
    const [k, l, c] = await Promise.all([
      supabase.from("kaart").select("*").order("fase").order("positie"),
      supabase.from("kaart_lid").select("kaart_id, gebruiker"),
      supabase.from("kaart_checklist_item").select("kaart_id, gedaan"),
    ]);
    if (k.data) setKaarten(k.data as Kaart[]);
    const ld: Record<string, string[]> = {};
    (l.data || []).forEach((r: { kaart_id: string; gebruiker: string }) => {
      (ld[r.kaart_id] = ld[r.kaart_id] || []).push(r.gebruiker);
    });
    setLeden(ld);
    const cl: Record<string, Tellingen> = {};
    (c.data || []).forEach((r: { kaart_id: string; gedaan: boolean }) => {
      const t = (cl[r.kaart_id] = cl[r.kaart_id] || { gedaan: 0, totaal: 0 });
      t.totaal++;
      if (r.gedaan) t.gedaan++;
    });
    setChecklist(cl);
    setLaden(false);
    // Monteur-status (voortgang %, retour, niet-gepubliceerde klant-update).
    await laadKlusStatus(((k.data || []) as Kaart[]).map((x) => x.klus_id).filter(Boolean) as string[]);
  }, [laadKlusStatus]);

  const herlaadStraks = useCallback(() => {
    if (herlaadTimer.current) clearTimeout(herlaadTimer.current);
    herlaadTimer.current = setTimeout(() => { herlaad(); }, 250);
  }, [herlaad]);

  // Ongelezen meldingen (@tags / op kaart gezet) per kaart, voor jou.
  const laadMeldingen = useCallback(async (code: string | null) => {
    if (!code) { setMeldingPerKaart({}); return; }
    const { data } = await supabase.from("melding").select("kaart_id").eq("ontvanger", code).eq("gelezen", false);
    const m: Record<string, number> = {};
    (data || []).forEach((r: { kaart_id: string | null }) => { if (r.kaart_id) m[r.kaart_id] = (m[r.kaart_id] || 0) + 1; });
    setMeldingPerKaart(m);
  }, []);

  const laadKlussen = useCallback(async () => {
    try {
      const res = await fetch("/api/klussen", { cache: "no-store" });
      const j = await res.json();
      const map: Record<string, Klus> = {};
      (j.klussen || []).forEach((kl: Klus) => { map[String(kl.id)] = kl; });
      setKlussen(map);
    } catch { /* zonder Moneybird tonen we gewoon de kaart-titel */ }
  }, []);

  const synchroniseer = useCallback(async () => {
    setSynct(true);
    try { await fetch("/api/planning/sync", { method: "POST" }); } catch { /* niet kritiek */ }
    await herlaad();
    setSynct(false);
  }, [herlaad]);

  // Eerste keer: Moneybird-sync, daarna bord + klusgegevens laden.
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const code = codeVoorEmail(data.user?.email);
      setMijnCode(code);
      await synchroniseer();
      await laadKlussen();
      await laadMeldingen(code);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Realtime: zien we elkaar live slepen / leden / checklist wijzigen.
  useEffect(() => {
    const kanaal = supabase
      .channel("planning-bord")
      .on("postgres_changes", { event: "*", schema: "public", table: "kaart" }, herlaadStraks)
      .on("postgres_changes", { event: "*", schema: "public", table: "kaart_lid" }, herlaadStraks)
      .on("postgres_changes", { event: "*", schema: "public", table: "kaart_checklist_item" }, herlaadStraks)
      .subscribe();
    return () => { supabase.removeChannel(kanaal); };
  }, [herlaadStraks]);

  // Realtime: per-kaart belletje meteen bijwerken bij een nieuwe/gelezen melding.
  useEffect(() => {
    if (!mijnCode) return;
    const kanaal = supabase
      .channel(`bord-melding-${mijnCode}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "melding", filter: `ontvanger=eq.${mijnCode}` }, () => laadMeldingen(mijnCode))
      .subscribe();
    return () => { supabase.removeChannel(kanaal); };
  }, [mijnCode, laadMeldingen]);

  // Deep-link: kaart-URL bijhouden zonder de pagina te herladen.
  useEffect(() => {
    function uitPad() {
      const m = window.location.pathname.match(/^\/planning\/([^/]+)/);
      setOpenId(m ? decodeURIComponent(m[1]) : null);
    }
    window.addEventListener("popstate", uitPad);
    return () => window.removeEventListener("popstate", uitPad);
  }, []);

  // In-place een kaart openen (vanuit een @klus-link of een melding) zonder
  // volledige paginanavigatie -> geen remount/herlaad van het hele bord.
  useEffect(() => {
    function opOpen(e: Event) {
      const id = (e as CustomEvent).detail as string;
      if (!id) return;
      setOpenId(id);
      window.history.pushState({}, "", `/planning/${id}`);
    }
    window.addEventListener("revisio:open-kaart", opOpen as EventListener);
    return () => window.removeEventListener("revisio:open-kaart", opOpen as EventListener);
  }, []);

  function open(id: string) {
    setOpenId(id);
    window.history.pushState({}, "", `/planning/${id}`);
  }
  function sluit() {
    setOpenId(null);
    window.history.pushState({}, "", "/planning");
  }

  // --- Slepen --------------------------------------------------------------
  async function logActie(kaartId: string, tekst: string) {
    await supabase.from("kaart_bericht").insert({ kaart_id: kaartId, auteur: naam || "iemand", tekst, soort: "log" });
  }

  async function dropIn(naarFase: FaseSleutel, index: number) {
    const id = sleepId;
    setSleepId(null);
    if (!id) return;
    const huidig = kaarten.find((k) => k.id === id);
    if (!huidig) return;
    const veranderdeFase = huidig.fase !== naarFase;
    const nieuweTijd = veranderdeFase ? new Date().toISOString() : huidig.entered_stage_at;

    const doel = kaarten.filter((k) => k.fase === naarFase && k.id !== id).sort((a, b) => a.positie - b.positie);
    const plek = Math.max(0, Math.min(index, doel.length));
    doel.splice(plek, 0, { ...huidig, fase: naarFase });

    // Optimistisch in beeld.
    setKaarten((prev) => {
      const map = new Map(prev.map((k) => [k.id, { ...k }]));
      doel.forEach((k, i) => {
        const cur = map.get(k.id);
        if (cur) { cur.fase = naarFase; cur.positie = i; if (k.id === id) cur.entered_stage_at = nieuweTijd; }
      });
      return [...map.values()];
    });

    if (veranderdeFase) await logActie(id, `verplaatste de kaart van "${faseTitel(huidig.fase)}" naar "${faseTitel(naarFase)}"`);
    await Promise.all(
      doel.map((k, i) =>
        supabase.from("kaart").update({
          fase: naarFase, positie: i,
          ...(k.id === id ? { entered_stage_at: nieuweTijd, ...(veranderdeFase ? { hand_verplaatst: true } : {}) } : {}),
        }).eq("id", k.id)
      )
    );
  }

  // --- Nieuwe (vrije) planningskaart ---------------------------------------
  async function maakKaart(fase: FaseSleutel) {
    const titel = nieuwTekst.trim();
    if (!titel) return;
    setNieuwTekst("");
    setNieuwInFase(null);
    const positie = kaarten.filter((k) => k.fase === fase).length;
    const { data } = await supabase.from("kaart")
      .insert({ type: "planning", titel, fase, positie, entered_stage_at: new Date().toISOString() })
      .select("id").single();
    const id = data?.id as string | undefined;
    if (id) {
      await supabase.from("kaart_lid").insert(STANDAARD_LEDEN.map((g) => ({ kaart_id: id, gebruiker: g })));
      await logActie(id, "maakte de kaart aan");
    }
    await herlaad();
  }

  // Pannen: start alleen op de achtergrond, niet op een kaart/knop/invoer.
  function panStart(e: React.MouseEvent) {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest('[draggable="true"], button, input, textarea, a, select')) return;
    const el = bordRef.current;
    if (!el) return;
    pan.current = { actief: true, startX: e.clientX, startScroll: el.scrollLeft };
    setPannen(true);
  }
  function panMove(e: React.MouseEvent) {
    if (!pan.current.actief || !bordRef.current) return;
    bordRef.current.scrollLeft = pan.current.startScroll - (e.clientX - pan.current.startX);
  }
  function panEind() {
    if (pan.current.actief) { pan.current.actief = false; setPannen(false); }
  }

  const openKaart = openId ? kaarten.find((k) => k.id === openId) || null : null;

  // Offertenummer -> klus/kaart, voor het @taggen van orders in de chat.
  const klusIndex = useMemo(() => {
    const kaartByKlus = new Map<string, string>();
    kaarten.forEach((k) => { if (k.type === "klus" && k.klus_id) kaartByKlus.set(k.klus_id, k.id); });
    return Object.values(klussen)
      .filter((kl) => kl.nummer)
      .map((kl) => ({ nummer: kl.nummer, klus_id: String(kl.id), klant: kl.klant, kaart_id: kaartByKlus.get(String(kl.id)) || null }));
  }, [klussen, kaarten]);

  // --- Render --------------------------------------------------------------
  return (
    <main style={{ minHeight: "100vh", background: BG, color: TEKST, fontFamily: "'Karma', Georgia, serif" }}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Karma:wght@400;500;600;700&display=swap" />

      {/* Kop: statusbalk, ingelogd-als (vaste plek), daaronder titel + sync */}
      <div style={{ maxWidth: 1600, margin: "0 auto", padding: "14px 16px 0" }}>
        <Systeemstatus />
        <div style={ingelogdBalk}>
          <RevisioLogo />
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 13.5 }}>Ingelogd als <span style={{ fontWeight: 700, color: GROEN }}>{naam || "gebruiker"}</span></span>
            <MeldingBel />
            <button onClick={uitloggen} style={knopLicht}>Uitloggen</button>
          </div>
        </div>
        <DashboardNav isAdmin={isAdmin} />
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <h1 style={{ fontFamily: SERIF, fontSize: 23, fontWeight: 700, color: GROEN, margin: 0 }}>Werkplaats kaartenbord</h1>
          <button onClick={synchroniseer} disabled={synct} style={knopLicht}>{synct ? "Synct..." : "Synchroniseer Moneybird"}</button>
        </div>
        <p style={{ fontSize: 13, color: GRIJS, margin: "0 0 12px" }}>
          Sleep kaarten tussen de kolommen. Geaccepteerde offertes landen vanzelf in Binnenkomst. De kleur links toont hoe lang een kaart in deze kolom staat.
        </p>
      </div>

      {/* Kolommen: horizontaal scrollbaar (touch), of slepen op de achtergrond. */}
      <div
        ref={bordRef}
        className="revisio-scroll"
        onMouseDown={panStart}
        onMouseMove={panMove}
        onMouseUp={panEind}
        onMouseLeave={panEind}
        style={{ display: "flex", gap: 14, padding: "0 16px 40px", overflowX: "auto", WebkitOverflowScrolling: "touch", alignItems: "flex-start", cursor: pannen ? "grabbing" : "grab", userSelect: pannen ? "none" : "auto" }}
      >
        {FASES.map((f) => {
          const kolomKaarten = kaarten.filter((k) => k.fase === f.sleutel).sort((a, b) => a.positie - b.positie);
          return (
            <div
              key={f.sleutel}
              className="revisio-scroll"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); dropIn(f.sleutel, kolomKaarten.length); }}
              style={kolom}
            >
              <div style={{ padding: "2px 4px 10px" }}>
                <div style={{ fontFamily: SERIF, fontSize: 18.5, fontWeight: 800, color: GROEN, lineHeight: 1.2 }}>
                  {f.titel} <span style={{ color: GRIJS, fontWeight: 700, fontSize: 15 }}>{kolomKaarten.length}</span>
                </div>
                <div style={{ fontSize: 12, color: GRIJS, marginTop: 1 }}>{f.sub}</div>
              </div>

              {kolomKaarten.map((k, i) => (
                <Tegel
                  key={k.id}
                  kaart={k}
                  klus={k.klus_id ? klussen[k.klus_id] : undefined}
                  status={k.klus_id ? klusStatus[k.klus_id] : undefined}
                  meldingen={meldingPerKaart[k.id] || 0}
                  leden={leden[k.id] || []}
                  tel={checklist[k.id]}
                  gesleept={sleepId === k.id}
                  onDragStart={() => setSleepId(k.id)}
                  onDragEnd={() => setSleepId(null)}
                  onDropVoor={(e) => { e.preventDefault(); e.stopPropagation(); dropIn(f.sleutel, i); }}
                  onOpen={() => open(k.id)}
                />
              ))}

              {nieuwInFase === f.sleutel ? (
                <div style={{ padding: 4 }}>
                  <input
                    autoFocus value={nieuwTekst}
                    onChange={(e) => setNieuwTekst(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") maakKaart(f.sleutel); if (e.key === "Escape") { setNieuwInFase(null); setNieuwTekst(""); } }}
                    placeholder="Titel van de kaart"
                    style={{ width: "100%", boxSizing: "border-box", border: `1.5px solid ${RAND}`, borderRadius: 8, padding: "9px 10px", fontSize: 13.5 }}
                  />
                  <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                    <button onClick={() => maakKaart(f.sleutel)} style={{ ...knopGroen, padding: "7px 12px" }}>Toevoegen</button>
                    <button onClick={() => { setNieuwInFase(null); setNieuwTekst(""); }} style={knopLicht}>Annuleer</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => { setNieuwInFase(f.sleutel); setNieuwTekst(""); }} style={kaartToevoegKnop}>+ Kaart</button>
              )}
            </div>
          );
        })}
      </div>

      {laden && <div style={{ textAlign: "center", color: GRIJS, padding: 30 }}>Laden...</div>}

      {openKaart && (
        <KaartDetail
          key={openKaart.id}
          kaart={openKaart}
          klus={openKaart.klus_id ? klussen[openKaart.klus_id] : undefined}
          gebruiker={naam || "iemand"}
          mijnCode={mijnCode}
          klantOnuitgegeven={openKaart.klus_id ? !!klusStatus[openKaart.klus_id]?.onuitgegeven : false}
          binnenOp={openKaart.klus_id ? klusStatus[openKaart.klus_id]?.binnenOp ?? null : null}
          klusIndex={klusIndex}
          onSluit={sluit}
          onWijzig={herlaad}
        />
      )}
    </main>
  );
}

// --- Kaart-tegel -----------------------------------------------------------
function Tegel({
  kaart, klus, status, meldingen = 0, leden, tel, gesleept, onDragStart, onDragEnd, onDropVoor, onOpen,
}: {
  kaart: Kaart; klus?: Klus; status?: KlusStatus; meldingen?: number; leden: string[]; tel?: Tellingen; gesleept: boolean;
  onDragStart: () => void; onDragEnd: () => void; onDropVoor: (e: React.DragEvent) => void; onOpen: () => void;
}) {
  const sig = veroudering(kaart.entered_stage_at, kaart.fase);
  const titel = kaart.titel || klus?.voertuig || klus?.klant || "Naamloze kaart";
  const klantWaarschuwing = kaart.fase === "factureren" && status?.onuitgegeven;
  const binnenDagen = dagenSinds(status?.binnenOp);
  return (
    <div
      draggable
      onDragStart={(e) => { onDragStart(); e.dataTransfer.effectAllowed = "move"; }}
      onDragEnd={onDragEnd}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDropVoor}
      onClick={onOpen}
      style={{
        ...tegel,
        borderLeft: `5px solid ${sig ? sig.kleur : RAND}`,
        opacity: gesleept ? 0.4 : 1,
        outline: gesleept ? `2px dashed ${GROEN}` : "none",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: TEKST, lineHeight: 1.3 }}>{titel}</div>
        <div style={{ display: "flex", gap: 5, flexShrink: 0, alignItems: "center" }}>
          {meldingen > 0 && <span title={`${meldingen} nieuwe melding(en) voor jou`} style={belBadge}>🔔 {meldingen}</span>}
          {kaart.gefactureerd && <span style={labelGefactureerd}>Gefactureerd</span>}
        </div>
      </div>

      {klus && (
        <div style={{ fontSize: 11.5, color: GRIJS, marginTop: 3 }}>
          {klus.klant}{klus.nummer ? ` · ${klus.nummer}` : ""}
        </div>
      )}
      {kaart.type === "planning" && <div style={{ fontSize: 10.5, color: GRIJS, marginTop: 3, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>Planning</div>}

      {status && status.pct > 0 && (
        <div style={{ marginTop: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: GRIJS, marginBottom: 2 }}>
            <span>Revisie</span><span style={{ fontWeight: 700 }}>{status.pct}%</span>
          </div>
          <div style={{ height: 5, background: "#e7e3d9", borderRadius: 3, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${status.pct}%`, background: status.pct >= 100 ? GROEN : "#2f6f8f" }} />
          </div>
        </div>
      )}

      {binnenDagen != null && (
        <div style={{ marginTop: 8, display: "inline-flex", alignItems: "center", gap: 6, fontSize: 10.5, fontWeight: 800, color: revisieKlokKleur(binnenDagen), background: "#f4f2ec", border: `1px solid ${revisieKlokKleur(binnenDagen)}`, borderRadius: 6, padding: "3px 8px" }}>
          ⏱ Binnen {binnenDagen} / {REVISIE_DOEL_DAGEN} dgn{binnenDagen >= REVISIE_DOEL_DAGEN ? " (over tijd)" : ""}
        </div>
      )}

      {klantWaarschuwing && (
        <div style={{ marginTop: 8, fontSize: 10.5, fontWeight: 700, color: "#8a2a1c", background: "#f7e4de", border: "1px solid #e0b3a8", borderRadius: 6, padding: "4px 7px" }}>
          ⚠ Klant nog niet bijgewerkt
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginTop: 9 }}>
        <div style={{ display: "flex" }}>
          {leden.map((code, i) => (
            <span key={code} title={code} style={{ ...lidBol, background: GROEN, marginLeft: i === 0 ? 0 : -6 }}>{code}</span>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {sig && sig.label && <span style={{ fontSize: 10.5, fontWeight: 700, color: sig.kleur }}>{sig.label}</span>}
          {tel && tel.totaal > 0 && (
            <span style={{ ...checklistBadge, background: tel.gedaan === tel.totaal ? "#e7f0ea" : "#f1efe8", color: tel.gedaan === tel.totaal ? GROEN : GRIJS }}>
              ✓ {tel.gedaan}/{tel.totaal}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// --- Stijl -----------------------------------------------------------------
const ingelogdBalk: CSSProperties = {
  background: "#fff", border: `1px solid ${RAND}`, borderRadius: 14, padding: "10px 16px",
  marginBottom: 12, boxShadow: KAART_SCHADUW, display: "flex", flexWrap: "wrap",
  justifyContent: "space-between", alignItems: "center", gap: 8,
};
const kolom: CSSProperties = {
  flex: "0 0 282px", width: 282, maxWidth: "85vw", background: "#f4f2ec", border: `1px solid ${RAND}`,
  borderRadius: 14, padding: 8, minHeight: 120, maxHeight: "calc(100vh - 210px)", overflowY: "auto",
};
const tegel: CSSProperties = {
  background: "#fff", border: `1px solid ${RAND}`, borderRadius: 10, padding: "10px 11px",
  marginBottom: 8, boxShadow: KAART_SCHADUW, cursor: "grab",
};
const lidBol: CSSProperties = {
  width: 24, height: 24, borderRadius: "50%", color: "#fff", fontSize: 10, fontWeight: 800,
  display: "inline-flex", alignItems: "center", justifyContent: "center", border: "2px solid #fff",
};
const checklistBadge: CSSProperties = { fontSize: 11, fontWeight: 700, borderRadius: 6, padding: "2px 7px" };
const belBadge: CSSProperties = {
  flexShrink: 0, fontSize: 10.5, fontWeight: 800, color: "#6b5410", background: "#f7eecd",
  border: `1px solid ${GOUD}`, borderRadius: 999, padding: "1px 7px", whiteSpace: "nowrap",
};
const labelGefactureerd: CSSProperties = {
  flexShrink: 0, fontSize: 10, fontWeight: 800, color: "#6b5410", background: "#f7f0db",
  border: `1px solid ${GOUD}`, borderRadius: 999, padding: "1px 7px",
};
const kaartToevoegKnop: CSSProperties = {
  width: "100%", textAlign: "left", background: "transparent", border: "none", color: GRIJS,
  fontSize: 13, fontWeight: 700, padding: "8px 8px", cursor: "pointer", borderRadius: 8,
};
const knopLicht: CSSProperties = {
  border: `1px solid ${RAND}`, background: "#fff", color: GRIJS, borderRadius: 999,
  padding: "7px 13px", fontSize: 12.5, fontWeight: 700, cursor: "pointer",
};
const knopGroen: CSSProperties = {
  border: "none", background: GROEN, color: "#fff", borderRadius: 8,
  fontSize: 13, fontWeight: 700, cursor: "pointer",
};
