"use client";

// Revisio werkbon, alleen lezen. app/werkbon-bekijk/page.tsx
// Te openen als /werkbon-bekijk?klus=KLUS_ID. Leest live uit Supabase.

import { useEffect, useState, CSSProperties } from "react";
import { supabase } from "@/lib/supabase";
import AuthGate from "@/app/components/AuthGate";
import { GROEN, GROEN_BG, ROOD, ROOD_BG, TEKST, GRIJS, RAND, BG } from "@/lib/theme";
import { euro, duur, datumKort, datumTijd, datumStempel } from "@/lib/format";
import { Veld, Check, Artikel, Regel } from "@/lib/types";

const VELD_TYPES: { type: string; label: string; eenheid: string; categorie: string }[] = [
  { type: "vlotterhoogte",        label: "Vlotterhoogte",               eenheid: "mm",           categorie: "afstelling" },
  { type: "gasnaald_positie",     label: "Gasnaald positie",            eenheid: "",             categorie: "afstelling" },
  { type: "luchtschroef",         label: "Luchtschroef (enkel lucht)",  eenheid: "halve slagen", categorie: "afstelling" },
  { type: "co_schroef",           label: "CO schroef (mengselschroef)", eenheid: "",             categorie: "afstelling" },
  { type: "stationairschroef",    label: "Stationairschroef",           eenheid: "",             categorie: "afstelling" },
  { type: "vlotter",              label: "Vlotter",                     eenheid: "",             categorie: "afstelling" },
  { type: "hoofdsproeier",        label: "Hoofdsproeier",               eenheid: "",             categorie: "sproeier" },
  { type: "stationairsproeier",   label: "Stationairsproeier",          eenheid: "",             categorie: "sproeier" },
  { type: "luchtremsproeier",     label: "Luchtremsproeier",            eenheid: "",             categorie: "sproeier" },
  { type: "choke_sproeier",       label: "Choke sproeier",              eenheid: "",             categorie: "sproeier" },
  { type: "gasnaald_codering",    label: "Gasnaald codering",           eenheid: "",             categorie: "sproeier" },
  { type: "emulsiebuis_codering", label: "Emulsiebuis codering",        eenheid: "",             categorie: "sproeier" },
  { type: "sproeierbuis_codering",label: "Sproeierbuis codering",       eenheid: "",             categorie: "sproeier" },
  { type: "vlotterzitting_maat",  label: "Vlotterzitting maat",         eenheid: "",             categorie: "sproeier" },
];
const SECTIES = [
  { titel: "Afstelling", cat: "afstelling" },
  { titel: "Sproeierbezetting", cat: "sproeier" },
];
const STANDAARD_ARTIKELEN = ["Vacuumleiding"];
const CHECKLIST_DEFAULT = [
  "CO schroef open?",
  "Stationair schroef correct?",
  "Pakking, vlotterbak schroefjes vast?",
  "Werkt de gasschuif of membraan correct?",
  "Armpjes, gaskleppen, chokehendels gangbaar?",
  "Zittingen pakkingen goed?",
  "Blaastest, vlotternaald oke?",
  "Bank synchronisatie, gaskleppen op nulpunt?",
];
const STADIA = [
  { id: "ontvangen", kort: "Ontvangen", pct: 20 },
  { id: "gestart", kort: "Gestart", pct: 40 },
  { id: "voor_ultrasoon", kort: "Voor ultra", pct: 60 },
  { id: "na_ultrasoon", kort: "Opbouw", pct: 80 },
  { id: "schoon", kort: "Schoon", pct: 100 },
];

let _k = 0;
const key = () => `v${_k++}`;
const cfgVan = (t: string) => VELD_TYPES.find((x) => x.type === t);
const catVan = (t: string) => cfgVan(t)?.categorie || (t === "eigen_sproeier" ? "sproeier" : "afstelling");

function bedragNum(s: string) {
  const n = parseFloat((s || "").replace(",", ".").replace(/[^0-9.]/g, ""));
  return isNaN(n) ? 0 : n;
}
function standaardVelden(): Veld[] {
  return VELD_TYPES.map((d) => ({ key: key(), veld_type: d.type, label: d.label, eenheid: d.eenheid, positie: 1, binnenkomst: "", afleveren: "" }));
}
function standaardChecklist(): Check[] {
  return CHECKLIST_DEFAULT.map((n) => ({ key: key(), naam: n, status: "", notitie: "", vast: true }));
}
function standaardArtikelen(): Artikel[] {
  return STANDAARD_ARTIKELEN.map((n) => ({ key: key(), naam: n, bedrag: "", vast: true }));
}
function uitMetingen(rows: any[]): Veld[] {
  const velden = standaardVelden();
  rows.forEach((r) => {
    const label = r.label || cfgVan(r.veld_type)?.label || r.veld_type;
    let i = velden.findIndex((v) => v.veld_type === r.veld_type && v.positie === r.positie && v.label === label);
    if (i === -1) {
      velden.push({ key: key(), veld_type: r.veld_type, label, eenheid: r.eenheid || "", positie: r.positie, binnenkomst: "", afleveren: "" });
      i = velden.length - 1;
    }
    if (r.moment === "afleveren") velden[i].afleveren = r.waarde || "";
    else velden[i].binnenkomst = r.waarde || "";
  });
  return velden;
}
function uitChecklist(rows: any[]): Check[] {
  const lijst = standaardChecklist();
  rows.forEach((r) => {
    let i = lijst.findIndex((c) => c.naam === r.check_naam);
    if (i === -1) lijst.push({ key: key(), naam: r.check_naam, status: r.status || "", notitie: r.notitie || "", vast: false });
    else { lijst[i].status = r.status || ""; lijst[i].notitie = r.notitie || ""; }
  });
  return lijst;
}
function uitArtikelen(rows: any[]): Artikel[] {
  const lijst = standaardArtikelen();
  rows.forEach((r) => {
    const bedrag = r.bedrag != null ? String(r.bedrag).replace(".", ",") : "";
    let i = lijst.findIndex((a) => a.vast && a.naam === r.naam);
    if (i === -1) lijst.push({ key: key(), naam: r.naam, bedrag, vast: false });
    else lijst[i].bedrag = bedrag;
  });
  return lijst;
}

export default function WerkbonBekijkPagina() {
  // Interne werkbon, alleen voor ingelogde medewerkers.
  return (
    <AuthGate>
      <WerkbonBekijk />
    </AuthGate>
  );
}

function WerkbonBekijk() {
  const [klusId, setKlusId] = useState<string | null>(null);
  const [laden, setLaden] = useState(true);
  const [kop, setKop] = useState<{ nummer: string; klant: string; voertuig: string }>({ nummer: "", klant: "", voertuig: "" });
  const [velden, setVelden] = useState<Veld[]>([]);
  const [checklist, setChecklist] = useState<Check[]>([]);
  const [artikelen, setArtikelen] = useState<Artikel[]>([]);
  const [opmerking, setOpmerking] = useState("");
  const [retour, setRetour] = useState<{ is: boolean; reden: string } | null>(null);
  const [voortgang, setVoortgang] = useState<any[]>([]);
  const [fotos, setFotos] = useState<any[]>([]);
  const [regels, setRegels] = useState<Regel[]>([]);
  const [log, setLog] = useState<any[]>([]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const k = params.get("klus");
    setKlusId(k);
  }, []);

  useEffect(() => {
    if (klusId == null) return;
    if (!klusId) { setLaden(false); return; }
    (async () => {
      setLaden(true);
      try {
        const { data: link } = await supabase.from("werkbon_links").select("nummer, klant, voertuig").eq("klus_id", klusId).limit(1);
        const { data: t } = await supabase.from("tijdregels").select("id, klus_label, monteur_naam, minuten, notitie, start_tijd, aangemaakt_op").eq("klus_id", klusId);
        const { data: m } = await supabase.from("werkbon_meting").select("moment, veld_type, label, positie, waarde, eenheid").eq("klus_id", klusId);
        const { data: c } = await supabase.from("werkbon_checklist").select("check_naam, status, notitie").eq("klus_id", klusId);
        const { data: a } = await supabase.from("werkbon_artikelen").select("naam, bedrag").eq("klus_id", klusId);
        const { data: o } = await supabase.from("werkbon_opmerking").select("tekst").eq("klus_id", klusId).limit(1);
        const { data: ret } = await supabase.from("werkbon_retour").select("is_retour, reden").eq("klus_id", klusId).limit(1);
        const { data: v } = await supabase.from("klus_voortgang").select("stap, bericht, gedaan_op").eq("klus_id", klusId);
        const { data: f } = await supabase.from("klus_fotos").select("*").eq("klus_id", klusId).order("geupload_op");
        const { data: lg } = await supabase.from("werkbon_log").select("monteur_naam, actie, detail, gedaan_op").eq("klus_id", klusId).order("gedaan_op", { ascending: false }).limit(50);

        // Kop: eerst uit werkbon_links, anders uit klus_label "{nummer} {klant}"
        let nummer = "", klant = "", voertuig = "";
        if (link && link[0]) { nummer = link[0].nummer || ""; klant = link[0].klant || ""; voertuig = link[0].voertuig || ""; }
        if ((!nummer || !klant) && t && t[0] && t[0].klus_label) {
          const lbl = String(t[0].klus_label);
          const sp = lbl.indexOf(" ");
          if (!nummer) nummer = sp > 0 ? lbl.slice(0, sp) : lbl;
          if (!klant) klant = sp > 0 ? lbl.slice(sp + 1) : "";
        }
        if (!nummer) nummer = klusId;
        setKop({ nummer, klant, voertuig });

        setVelden(uitMetingen(m || []));
        setChecklist(uitChecklist(c || []));
        setArtikelen(uitArtikelen(a || []));
        setOpmerking((o && o[0] && o[0].tekst) || "");
        setRetour(ret && ret[0] ? { is: !!ret[0].is_retour, reden: ret[0].reden || "" } : null);
        setVoortgang(v || []);
        setFotos(f || []);
        setRegels((t || []).filter((r: any) => r.minuten != null).map((r: any) => ({ id: r.id, monteur_naam: r.monteur_naam, minuten: r.minuten, notitie: r.notitie, aangemaakt_op: r.aangemaakt_op })));
        setLog(lg || []);
      } catch (e) {
        // stil; toont gewoon lege werkbon
      } finally {
        setLaden(false);
      }
    })();
  }, [klusId]);

  const wrap: CSSProperties = { minHeight: "100vh", background: BG, color: TEKST, fontFamily: "'Karma', Georgia, serif", padding: "20px 14px", maxWidth: 640, margin: "0 auto" };
  const kaart: CSSProperties = { background: "#fff", border: `1px solid ${RAND}`, borderRadius: 14, padding: 16, marginBottom: 12 };
  const kopstijl: CSSProperties = { fontSize: 13, color: GRIJS, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, margin: "2px 0 12px" };

  function terug() {
    if (window.history.length > 1) window.history.back();
    else window.location.href = "/dashboard/werkplaats";
  }

  if (klusId === null) return <main style={wrap}><p style={{ color: GRIJS }}>Laden...</p></main>;
  if (!klusId) return (
    <main style={wrap}>
      <button onClick={terug} style={{ border: "none", background: "transparent", color: GROEN, fontWeight: 700, fontSize: 14, cursor: "pointer", padding: "4px 0", marginBottom: 6 }}>← Terug</button>
      <div style={kaart}><p style={{ color: ROOD }}>Geen werkbon gekozen. Open een werkbon vanaf het werkplaats-dashboard.</p></div>
    </main>
  );

  const bTotaal = regels.reduce((s, r) => s + (r.minuten || 0), 0);
  const ingevuld = velden.filter((v) => v.binnenkomst.trim() || v.afleveren.trim());
  const checksIngevuld = checklist.filter((c) => c.status);
  const artIngevuld = artikelen.filter((a) => a.naam.trim() && bedragNum(a.bedrag) > 0);
  const artTotaal = artIngevuld.reduce((s, a) => s + bedragNum(a.bedrag), 0);
  const bPct = STADIA.filter((s) => voortgang.some((x) => x.stap === s.id)).reduce((m, s) => Math.max(m, s.pct), 0);

  return (
    <main style={wrap}>
      <button onClick={terug} style={{ border: "none", background: "transparent", color: GROEN, fontWeight: 700, fontSize: 14, cursor: "pointer", padding: "4px 0", marginBottom: 6 }}>← Terug</button>

      <div style={kaart}>
        <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
          <span style={{ display: "inline-block", fontSize: 11, fontWeight: 700, color: GRIJS, background: BG, border: `1px solid ${RAND}`, borderRadius: 999, padding: "3px 10px" }}>Alleen lezen</span>
          {retour && retour.is && <span style={{ display: "inline-block", fontSize: 11, fontWeight: 800, color: "#fff", background: ROOD, borderRadius: 999, padding: "3px 10px" }}>RETOUR</span>}
        </div>
        <div style={{ fontSize: 28, fontWeight: 800, color: GROEN, letterSpacing: 0.5, lineHeight: 1.1 }}>{kop.nummer}</div>
        {kop.klant && <div style={{ fontSize: 21, fontWeight: 700, marginTop: 4 }}>{kop.klant}</div>}
        {kop.voertuig && <div style={{ fontSize: 13.5, color: GRIJS, marginTop: 8 }}>{kop.voertuig}</div>}
        {retour && retour.is && retour.reden && <div style={{ fontSize: 13.5, lineHeight: 1.45, background: ROOD_BG, color: ROOD, borderRadius: 10, padding: "12px 14px", marginTop: 10 }}><span style={{ fontWeight: 800 }}>Reden retour: </span>{retour.reden}</div>}
      </div>

      {laden && <div style={{ ...kaart, color: GRIJS }}>Werkbon laden...</div>}

      <div style={kaart}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={kopstijl}>Voortgang</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: GROEN }}>{bPct}%</span>
        </div>
        <div style={{ height: 8, background: GROEN_BG, borderRadius: 999, overflow: "hidden", margin: "0 0 10px" }}>
          <div style={{ height: "100%", width: `${bPct}%`, background: GROEN, borderRadius: 999 }} />
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {STADIA.map((s) => {
            const v = voortgang.find((x) => x.stap === s.id);
            const done = !!v;
            return (
              <div key={s.id} style={{ border: `1px solid ${done ? GROEN : RAND}`, background: done ? GROEN : "#fff", color: done ? "#fff" : GRIJS, borderRadius: 8, padding: "7px 10px", fontSize: 11.5, fontWeight: 700 }}>
                {done ? "✓ " : ""}{s.kort}{done && v.gedaan_op ? ` · ${datumKort(v.gedaan_op)}` : ""}
              </div>
            );
          })}
        </div>
      </div>

      <div style={kaart}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={kopstijl}>Geschreven tijd</span>
          <span style={{ fontWeight: 700 }}>Totaal {duur(bTotaal)}</span>
        </div>
        {regels.length === 0 && <div style={{ fontSize: 13, color: GRIJS }}>Nog geen tijd geschreven.</div>}
        {regels.map((r) => (
          <div key={r.id} style={{ padding: "7px 0", borderTop: `1px solid ${RAND}` }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{r.monteur_naam} · {duur(r.minuten)}</div>
            {r.aangemaakt_op && <div style={{ fontSize: 11, color: GRIJS, marginTop: 1 }}>{datumStempel(r.aangemaakt_op)}</div>}
            {r.notitie && <div style={{ fontSize: 12.5, color: GRIJS, marginTop: 1 }}>{r.notitie}</div>}
          </div>
        ))}
      </div>

      {SECTIES.map((sec) => {
        const lijst = ingevuld.filter((v) => catVan(v.veld_type) === sec.cat).sort((a, b) => a.positie - b.positie);
        if (lijst.length === 0) return null;
        return (
          <div key={sec.cat} style={kaart}>
            <div style={kopstijl}>{sec.titel}</div>
            {lijst.map((v) => (
              <div key={v.key} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "7px 0", borderTop: `1px solid ${RAND}` }}>
                <span style={{ fontSize: 13.5, fontWeight: 600 }}>{v.positie > 1 ? `${v.label} ${v.positie}` : v.label}{v.eenheid ? ` (${v.eenheid})` : ""}</span>
                <span style={{ fontSize: 13.5, color: GRIJS, textAlign: "right" }}>{v.binnenkomst}{v.binnenkomst && v.afleveren ? "  →  " : ""}{v.afleveren}</span>
              </div>
            ))}
          </div>
        );
      })}

      {artIngevuld.length > 0 && (
        <div style={kaart}>
          <div style={kopstijl}>Extra artikelen</div>
          {artIngevuld.map((a) => (
            <div key={a.key} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "7px 0", borderTop: `1px solid ${RAND}` }}>
              <span style={{ fontSize: 13.5 }}>{a.naam}</span>
              <span style={{ fontSize: 13.5, fontWeight: 600 }}>{euro(bedragNum(a.bedrag))}</span>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", borderTop: `1px solid ${RAND}`, marginTop: 6, paddingTop: 8, fontSize: 13.5 }}>
            <span style={{ fontWeight: 700 }}>Totaal extra</span>
            <span style={{ fontWeight: 700 }}>{euro(artTotaal)}</span>
          </div>
        </div>
      )}

      {opmerking.trim() && (
        <div style={kaart}>
          <div style={kopstijl}>Opmerkingen</div>
          <div style={{ fontSize: 13.5, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{opmerking}</div>
        </div>
      )}

      <div style={kaart}>
        <div style={kopstijl}>Eindcontrole</div>
        {checksIngevuld.length === 0 && <div style={{ fontSize: 13, color: GRIJS }}>Nog niet ingevuld.</div>}
        {checksIngevuld.map((c) => (
          <div key={c.key} style={{ padding: "8px 0", borderTop: `1px solid ${RAND}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
              <span style={{ fontSize: 13.5 }}>{c.naam}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: c.status === "goed" ? GROEN : ROOD, whiteSpace: "nowrap" }}>{c.status === "goed" ? "Goed" : "Afgekeurd"}</span>
            </div>
            {c.status === "afgekeurd" && c.notitie && <div style={{ fontSize: 12.5, color: ROOD, marginTop: 3 }}>{c.notitie}</div>}
          </div>
        ))}
      </div>

      {fotos.length > 0 && (
        <div style={kaart}>
          <div style={kopstijl}>Foto's ({fotos.length})</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {fotos.map((f) => (
              <a key={f.id} href={f.url} target="_blank" rel="noreferrer">
                <img src={f.url} alt="" style={{ width: 92, height: 92, objectFit: "cover", borderRadius: 8, border: `1px solid ${RAND}`, transform: `rotate(${f.rotatie || 0}deg)` }} />
              </a>
            ))}
          </div>
        </div>
      )}

      {log.length > 0 && (
        <div style={kaart}>
          <div style={kopstijl}>Logboek (wie deed wat)</div>
          {log.map((l, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "6px 0", borderTop: `1px solid ${RAND}` }}>
              <span style={{ fontSize: 12.5 }}>{l.monteur_naam || "Onbekend"} · {l.actie}{l.detail ? ` (${l.detail})` : ""}</span>
              <span style={{ fontSize: 12, color: GRIJS, whiteSpace: "nowrap" }}>{datumTijd(l.gedaan_op)}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ height: 20 }} />
    </main>
  );
}