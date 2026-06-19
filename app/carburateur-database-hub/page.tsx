"use client";

// Carburateur Database Hub. app/carburateur-database-hub/page.tsx
// Interne kruisverwijzing-database van Pierburg-kennbladen. Achter admin-login.
// Data komt uit Supabase (hub_* tabellen). De vaste vertaal-labels blijven in data.ts.

import { useEffect, useMemo, useState, CSSProperties } from "react";
import { GROEN, GOUD, TEKST, GRIJS, RAND, BG } from "@/lib/theme";
import AuthGate, { useGebruiker } from "@/app/components/AuthGate";
import DashboardNav from "@/app/components/DashboardNav";
import Systeemstatus from "@/app/components/Systeemstatus";
import RevisioLogo from "@/app/components/RevisioLogo";
import MeldingBel from "@/app/werkplaats-planning/MeldingBel";
import { supabase } from "@/lib/supabase";
import { LABELS, ORDER, Kennblad } from "./data";

// Zet de losse Supabase-tabellen om naar het Kennblad-model dat de pagina gebruikt.
// Nette motorregel die "null kW / null pk" weglaat als een waarde niet gedrukt stond.
function motorTekst(c: any): string {
  const verm = [c.motor_kw != null ? `${c.motor_kw} kW` : "", c.motor_ps != null ? `(${c.motor_ps} pk)` : ""].filter(Boolean).join(" ");
  const rpm = c.motor_rpm != null ? `@ ${c.motor_rpm}/min` : "";
  const cc = c.motor_cc != null ? `${c.motor_cc} cc` : "";
  return [verm, rpm, cc].filter(Boolean).join(" · ");
}

function bouwKennbladen(carbs: any[], tags: any[], toep: any[], uitv: any[], ond: any[]): Kennblad[] {
  const groep = (rows: any[], key: string) => { const m: Record<string, any[]> = {}; (rows || []).forEach((r) => { (m[r[key]] = m[r[key]] || []).push(r); }); return m; };
  const tg = groep(tags, "carb_id"), tp = groep(toep, "carb_id"), uv = groep(uitv, "carb_id"), od = groep(ond, "carb_id");
  return (carbs || []).map((c) => ({
    id: c.id, fabrikant: c.fabrikant, type: c.type, gasklep: c.gasklep, cilinders: c.cilinders,
    vehicle: c.vehicle, registrier: c.registrier,
    engine: motorTekst(c),
    yearFrom: c.bouwjaar_tot_tekst ? `${c.bouwjaar_van_tekst} - ${c.bouwjaar_tot_tekst}` : `vanaf ${c.bouwjaar_van_tekst}`,
    bron_sheets: [],
    tag_norm: (tg[c.id] || []).map((t) => t.tag_norm),
    motor: { kw: String(c.motor_kw ?? ""), ps: String(c.motor_ps ?? ""), cc: String(c.motor_cc ?? ""), rpm: String(c.motor_rpm ?? "") },
    bouwjaar: { von: c.bouwjaar_van_tekst || "", bis: c.bouwjaar_tot_tekst || "" },
    toepassingen: (tp[c.id] || []).map((t) => ({ merk_model: t.merk_model, chassis: t.chassis || "", motorcode: t.motorcode || "" })),
    variants: (uv[c.id] || []).map((v) => ({ name: v.naam, bestel: v.bestel_nr_oud || "", tag: v.tag, kleur: v.kleur, ab_datum: v.ab_datum || "" })),
    werte: c.werte || {},
    drawing: c.tekening_url || "", kaft_url: c.kaft_url || "",
    onderdelen: (od[c.id] || []).map((o) => ({ nr: o.nr, naam: [o.naam_en, o.naam_de, o.naam_nl] as [string, string, string], aantal: o.aantal, bestell: o.bestell_oud || "" })),
    onderdelen_bron: c.onderdelen_bron || undefined, controle: c.controle || undefined,
  }));
}

const TALEN = ["NL", "DE", "EN"] as const;
// LABELS-volgorde in data.ts is [en, de, nl, symbool]; UI-volgorde is NL, DE, EN.
const LANG_INDEX = { NL: 2, DE: 1, EN: 0 } as const;
const SERIF = "'Karma', Georgia, serif";

function norm(s: string) { return (s || "").toUpperCase().replace(/\s+/g, ""); }
function jaarUit(s: string): number | null { const m = (s || "").match(/(19|20)\d\d/); return m ? parseInt(m[0], 10) : null; }

// Bouwt de doorzoekbare tekst van een kaart, inclusief synoniemen (Solex/Pierburg,
// Mercedes-Benz/MB/Daimler-Benz/DB, VW/Volkswagen) en cilinderaantal.
function zoekTekst(c: Kennblad): string {
  const tekst = (c.vehicle + " " + (c.toepassingen || []).map((t) => t.merk_model).join(" ")).toLowerCase();
  const isMerc = tekst.includes("mercedes") || tekst.includes("daimler") || / db /.test(" " + tekst + " ");
  const isVW = tekst.includes("vw") || tekst.includes("volkswagen") || tekst.includes("golf") || tekst.includes("passat") || tekst.includes("polo") || tekst.includes("derby") || tekst.includes("jetta") || tekst.includes("scirocco") || tekst.includes("iltis");
  const syn = [
    "solex pierburg",
    isMerc ? "mercedes mercedes-benz mercedesbenz mb daimler daimler-benz db" : "",
    isVW ? "vw volkswagen" : "",
    c.cilinders ? `${c.cilinders} ${c.cilinders}cilinder ${c.cilinders}-cilinder cilinders` : "",
  ].join(" ");
  const toep = (c.toepassingen || []).map((t) => `${t.merk_model} ${t.chassis} ${t.motorcode}`).join(" ");
  return [
    c.type, c.vehicle, c.registrier, c.engine, c.fabrikant,
    c.motor ? `${c.motor.cc} ${c.motor.kw} ${c.motor.ps}` : "",
    toep, c.variants.map((v) => `${v.tag} ${v.kleur}`).join(" "), c.tag_norm.join(" "), syn,
  ].join(" ");
}

export default function HubPagina() {
  // Toegankelijk voor alle ingelogde monteurs (geen admin-eis); zij mogen de Hub inzien.
  return (
    <AuthGate>
      <Hub />
    </AuthGate>
  );
}

function Hub() {
  const { naam, uitloggen, isAdmin } = useGebruiker();
  const [zoek, setZoek] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [taal, setTaal] = useState<(typeof TALEN)[number]>("NL");
  const [gekopieerd, setGekopieerd] = useState(false);
  const [kennbladen, setKennbladen] = useState<Kennblad[]>([]);
  const [laden, setLaden] = useState(true);

  // Carburateurs uit Supabase laden en samenstellen; daarna eventuele deep-link openen.
  useEffect(() => {
    (async () => {
      const [carbs, tags, toep, uitv, ond] = await Promise.all([
        supabase.from("hub_carburateurs").select("*").order("id"),
        supabase.from("hub_tags").select("*"),
        supabase.from("hub_toepassingen").select("*"),
        supabase.from("hub_uitvoeringen").select("*").order("volgorde"),
        supabase.from("hub_onderdelen").select("*").order("volgorde"),
      ]);
      const lijst = bouwKennbladen(carbs.data || [], tags.data || [], toep.data || [], uitv.data || [], ond.data || []);
      setKennbladen(lijst);
      setLaden(false);
      const id = new URLSearchParams(window.location.search).get("id");
      if (id && lijst.some((c) => c.id === id)) setOpenId(id);
    })();
  }, []);

  function openen(c: Kennblad) {
    setOpenId(c.id);
    const url = `${window.location.pathname}?id=${encodeURIComponent(c.id)}`;
    window.history.replaceState(null, "", url);
    window.scrollTo(0, 0);
  }
  function sluiten() {
    setOpenId(null);
    window.history.replaceState(null, "", window.location.pathname);
  }
  function kopieerLink() {
    navigator.clipboard?.writeText(window.location.href).then(() => {
      setGekopieerd(true);
      setTimeout(() => setGekopieerd(false), 1800);
    });
  }

  const lijst = useMemo(() => {
    // Per-woord zoeken (AND): elk woord moet ergens raak zijn. Een jaartal (19xx/20xx)
    // wordt als bereik getoetst tegen het bouwjaar ("juli 1980 →" = vanaf 1980 en nieuwer).
    const woorden = zoek.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (woorden.length === 0) return kennbladen;
    return kennbladen.filter((c) => {
      const ruw = zoekTekst(c);
      const spaced = " " + ruw.toLowerCase().replace(/\s+/g, " ") + " ";   // woorden, spaties bewaard
      const compact = norm(ruw);                                            // tags, spatie-ongevoelig
      const vonY = c.bouwjaar ? jaarUit(c.bouwjaar.von) : null;
      const bisY = c.bouwjaar ? jaarUit(c.bouwjaar.bis) : null;
      return woorden.every((w) => {
        if (/^(19|20)\d\d$/.test(w)) {            // jaartal: toets tegen het bouwjaar-bereik
          if (vonY === null) return false;
          const jaar = parseInt(w, 10);
          if (jaar < vonY) return false;          // ouder dan begin bouwjaar
          if (bisY !== null && jaar > bisY) return false; // na het einde (gesloten bereik)
          return true;                            // binnen bereik (of open einde →)
        }
        if (/^\d{1,4}$/.test(w)) {                // kort getal (cc, gasklep): als heel getal, geen plakwerk
          return new RegExp(`(?<!\\d)${w}(?!\\d)`).test(spaced);
        }
        return spaced.includes(w.toLowerCase()) || compact.includes(norm(w)); // woord of tag
      });
    });
  }, [zoek, kennbladen]);

  const open = openId ? kennbladen.find((c) => c.id === openId) || null : null;
  const li = LANG_INDEX[taal];

  return (
    <main style={{ minHeight: "100vh", background: BG, color: TEKST, fontFamily: "'Karma', Georgia, serif" }}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Karma:wght@400;500;600;700&display=swap" />

      <div style={{ maxWidth: 920, margin: "0 auto", padding: "14px 16px 0" }}>
        <Systeemstatus />
        <div style={{ background: "#fff", border: `1px solid ${RAND}`, borderRadius: 14, padding: "10px 16px", marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <RevisioLogo />
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <MeldingBel />
            <div style={{ fontSize: 13.5, color: TEKST }}>Ingelogd als <span style={{ fontWeight: 700, color: GROEN }}>{naam || "gebruiker"}</span></div>
            <button onClick={uitloggen} style={{ border: `1px solid ${RAND}`, background: "#fff", color: GRIJS, borderRadius: 999, padding: "7px 14px", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>Uitloggen</button>
          </div>
        </div>
        <DashboardNav isAdmin={isAdmin} />
      </div>

      <header style={{ background: GROEN, color: "#fff", padding: "22px 0 26px" }}>
        <div style={wrap}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
            <div>
              <div style={{ fontFamily: SERIF, fontSize: 27, fontWeight: 700, letterSpacing: 0.2 }}>Carburateur Database Hub</div>
              <div style={{ fontSize: 12.5, color: "#bcd6c8", marginTop: 2 }}>Solex · Pierburg · Zenith kennbladen · interne kruisverwijzing</div>
            </div>
          </div>
          <div style={{ marginTop: 18, display: "flex", alignItems: "center", gap: 10, background: "#fff", borderRadius: 12, padding: "11px 14px", boxShadow: "0 8px 24px rgba(10,40,25,.18)" }}>
            <span style={{ color: GROEN, fontSize: 16 }}>🔍</span>
            <input
              value={zoek}
              onChange={(e) => setZoek(e.target.value)}
              placeholder="Zoek op auto, bouwjaar, cc, type, kleur of tag (bv. Mercedes 1982, Solex 4A1, 2746, 280 S)…"
              style={{ border: 0, outline: 0, fontSize: 16, width: "100%", color: TEKST, background: "transparent" }}
            />
          </div>
          <div style={{ fontSize: 12.5, color: "#bcd6c8", marginTop: 9 }}>{laden ? "Laden…" : `${lijst.length} van ${kennbladen.length} kennbladen`}</div>
        </div>
      </header>

      <div style={wrap}>
        {laden ? (
          <p style={{ color: GRIJS, textAlign: "center", padding: 40 }}>Carburateurs laden…</p>
        ) : open ? (
          <Detail c={open} li={li} taal={taal} setTaal={setTaal} terug={sluiten} kopieer={kopieerLink} gekopieerd={gekopieerd} />
        ) : (
          <div style={grid}>
            {lijst.map((c) => (
              <button key={c.id} onClick={() => openen(c)} title={`${[c.fabrikant, c.type].filter(Boolean).join(" ")} · ${c.vehicle}`} style={kaart}>
                <div style={{ position: "absolute", inset: 0, background: c.drawing ? `#f3f6f4 url('${c.drawing}') center/cover no-repeat` : "#eef2f0" }} />
                {!c.drawing && (
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: 6, textAlign: "center", fontFamily: SERIF, fontSize: 12, fontWeight: 700, color: GROEN, lineHeight: 1.2 }}>{c.type || c.fabrikant}</div>
                )}
                <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "18px 7px 6px", background: "linear-gradient(transparent, rgba(8,30,18,0.82))", textAlign: "left" }}>
                  <div style={{ fontSize: 10.5, fontWeight: 800, color: "#fff", lineHeight: 1.15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.type || c.fabrikant}</div>
                </div>
              </button>
            ))}
            {lijst.length === 0 && (
              <p style={{ color: GRIJS, gridColumn: "1 / -1", textAlign: "center", padding: 30 }}>Geen kennblad gevonden voor &ldquo;{zoek}&rdquo;.</p>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

function Detail({ c, li, taal, setTaal, terug, kopieer, gekopieerd }: { c: Kennblad; li: number; taal: string; setTaal: (t: any) => void; terug: () => void; kopieer: () => void; gekopieerd: boolean }) {
  const [grootSrc, setGrootSrc] = useState<string | null>(null);
  return (
    <div style={{ paddingBottom: 60 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <button onClick={terug} style={{ background: "none", border: 0, color: GROEN, fontSize: 15, fontWeight: 700, cursor: "pointer", padding: "14px 0" }}>← terug naar overzicht</button>
        <button onClick={kopieer} style={{ background: gekopieerd ? GOUD : "#fff", color: gekopieerd ? "#fff" : GROEN, border: `1px solid ${gekopieerd ? GOUD : RAND}`, borderRadius: 10, padding: "8px 12px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>{gekopieerd ? "Gekopieerd!" : "🔗 Kopieer link"}</button>
      </div>
      <div style={{ fontFamily: SERIF, fontSize: 28, fontWeight: 700, color: GROEN }}>{[c.fabrikant, c.type].filter(Boolean).join(" ")}</div>
      <div style={{ fontSize: 17, fontWeight: 700 }}>{c.vehicle}</div>
      <div style={{ color: GRIJS, marginTop: 3 }}>{c.engine} · {c.yearFrom}</div>
      <div style={{ color: GRIJS, fontSize: 12.5, marginTop: 6 }}>Registrier-Nr {c.registrier} · {c.fabrikant}{c.bron_sheets.length ? ` · bronbladen ${c.bron_sheets.join(" & ")}` : ""}</div>

      {c.toepassingen && c.toepassingen.length > 0 && (
        <section style={paneel}>
          <h3 style={kop}>Toepassingen (voertuigen)</h3>
          <table style={tabel}>
            <thead><tr>{["Merk / model", "Chassis", "Motorcode", "Bouwjaar"].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
            <tbody>
              {c.toepassingen.map((t, i) => (
                <tr key={i}>
                  <td style={{ ...td, fontWeight: 700 }}>{t.merk_model}</td>
                  <td style={td}>{t.chassis || "–"}</td>
                  <td style={td}>{t.motorcode || "–"}</td>
                  <td style={td}>{c.bouwjaar ? `${c.bouwjaar.von}${c.bouwjaar.bis ? ` – ${c.bouwjaar.bis}` : " →"}` : "–"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {c.motor && (
            <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 8 }}>
              <span style={badge}>{c.motor.kw} kW</span>
              <span style={badge}>{c.motor.ps} pk</span>
              <span style={badge}>{c.motor.cc} cc</span>
              <span style={badge}>{c.motor.rpm}/min</span>
              <span style={badgeGoud}>{c.gasklep} mm gasklep</span>
            </div>
          )}
        </section>
      )}

      <section style={paneel}>
        <h3 style={kop}>Uitvoeringen &amp; tags</h3>
        <table style={tabel}>
          <thead><tr>
            {["Uitvoering", "Tag (Typenschild)", "Kleur"].map((h) => <th key={h} style={th}>{h}</th>)}
            <th style={{ ...th, color: GRIJS, fontWeight: 500 }}>Oud bestelnr</th>
          </tr></thead>
          <tbody>
            {c.variants.map((v, i) => (
              <tr key={i}>
                <td style={td}>{v.name}</td>
                <td style={{ ...td, fontWeight: 700, color: GOUD, fontVariantNumeric: "tabular-nums" }}>{v.tag}</td>
                <td style={td}>{v.kleur}</td>
                <td style={{ ...td, color: GRIJS, fontSize: 12.5, fontVariantNumeric: "tabular-nums" }}>{v.bestel || "–"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* 1. Specsheet (instelwaarden) */}
      <section style={paneel}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <h3 style={{ ...kop, margin: 0 }}>Specsheet — normaalinstelling</h3>
          <div style={{ display: "inline-flex", border: `1px solid ${RAND}`, borderRadius: 8, overflow: "hidden" }}>
            {TALEN.map((t) => (
              <button key={t} onClick={() => setTaal(t)} style={{ border: 0, borderLeft: `1px solid ${RAND}`, background: taal === t ? GROEN : "#fff", color: taal === t ? "#fff" : GRIJS, fontSize: 12.5, fontWeight: 700, padding: "6px 12px", cursor: "pointer" }}>{t}</button>
            ))}
          </div>
        </div>
        <table style={{ ...tabel, marginTop: 12 }}>
          <tbody>
            {ORDER.map((k) => {
              const L = LABELS[k]; const v = c.werte[k];
              if (!v) return null;
              return (
                <tr key={k}>
                  <td style={{ ...td, color: GOUD, fontWeight: 800, width: 34 }}>{L[3]}</td>
                  <td style={td}>{L[li]}</td>
                  <td style={{ ...td, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{v}</td>
                </tr>
              );
            })}
            {/* Nieuwe Solex/DVG-bladen hebben de originele Duitse insteltabel-labels
                (niet de canonieke sleutels); die tonen we generiek, label zoals gedrukt. */}
            {Object.entries(c.werte)
              .filter(([k]) => !ORDER.includes(k))
              .map(([k, v]) =>
                v ? (
                  <tr key={k}>
                    <td style={{ ...td, color: GOUD, fontWeight: 800, width: 34 }} />
                    <td style={td}>{k}</td>
                    <td style={{ ...td, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{String(v)}</td>
                  </tr>
                ) : null
              )}
          </tbody>
        </table>
        {c.controle && (
          <div style={{ background: "#f7eecd", border: "1px solid #e6d49a", color: "#7a5e12", borderRadius: 10, padding: "10px 12px", marginTop: 14, fontSize: 13.5 }}>
            ⚠ Controle: {c.controle}
          </div>
        )}
      </section>

      {/* Blueprint (explosietekening) */}
      {c.drawing && (
        <section style={paneel}>
          <h3 style={kop}>Blueprint — explosietekening</h3>
          <button onClick={() => setGrootSrc(c.drawing!)} style={{ display: "block", width: "100%", border: 0, background: "#fff", padding: 0, cursor: "zoom-in" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={c.drawing} alt={`Explosietekening ${c.type} ${c.vehicle}`} style={{ width: "100%", height: "auto", borderRadius: 8, border: `1px solid ${RAND}` }} />
          </button>
          <div style={{ color: GRIJS, fontSize: 12, marginTop: 8, display: "flex", gap: 14, flexWrap: "wrap" }}>
            <span>Klik om groot te bekijken.</span>
            <a href={c.drawing} target="_blank" rel="noreferrer" style={{ color: GROEN, fontWeight: 700, textDecoration: "none" }}>Tekening openen in nieuw tabblad ↗</a>
          </div>
        </section>
      )}

      {/* Specsheet — originele kennblad-scan, onder de blueprint */}
      {c.kaft_url && (
        <section style={paneel}>
          <h3 style={kop}>Specsheet — origineel kennblad (scan)</h3>
          <button onClick={() => setGrootSrc(c.kaft_url!)} style={{ display: "block", width: "100%", border: 0, background: "#fff", padding: 0, cursor: "zoom-in" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={c.kaft_url} alt={`Origineel kennblad ${c.type} ${c.vehicle}`} style={{ width: "100%", height: "auto", borderRadius: 8, border: `1px solid ${RAND}` }} />
          </button>
          <div style={{ color: GRIJS, fontSize: 12, marginTop: 8, display: "flex", gap: 14, flexWrap: "wrap" }}>
            <span>Het originele kennblad. Klik om groot te bekijken.</span>
            <a href={c.kaft_url} target="_blank" rel="noreferrer" style={{ color: GROEN, fontWeight: 700, textDecoration: "none" }}>Scan openen in nieuw tabblad ↗</a>
          </div>
        </section>
      )}

      {/* 3. Originele vertaalde onderdelenlijst (nummers met uitleg) — onder de blueprint */}
      <section style={paneel}>
        <h3 style={kop}>Onderdelenlijst — nummers bij de tekening</h3>
        {c.onderdelen && c.onderdelen.length > 0 ? (
          <>
            <table style={tabel}>
              <thead><tr>
                <th style={{ ...th, width: 52 }}>Nr.</th>
                <th style={th}>Onderdeel</th>
                <th style={{ ...th, width: 56, textAlign: "center" }}>Aantal</th>
                <th style={{ ...th, width: 110, color: GRIJS, fontWeight: 500 }}>Oud bestelnr</th>
              </tr></thead>
              <tbody>
                {c.onderdelen.map((o, i) => (
                  <tr key={i}>
                    <td style={{ ...td, color: GOUD, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{o.nr}</td>
                    <td style={td}>{o.naam[li]}</td>
                    <td style={{ ...td, textAlign: "center" }}>{o.aantal}</td>
                    <td style={{ ...td, color: GRIJS, fontSize: 12.5, fontVariantNumeric: "tabular-nums" }}>{o.bestell || "–"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {c.onderdelen_bron && <div style={{ color: GRIJS, fontSize: 11.5, marginTop: 10, lineHeight: 1.4 }}>{c.onderdelen_bron}</div>}
          </>
        ) : (
          <div style={{ color: GRIJS, fontSize: 13.5, lineHeight: 1.5 }}>
            De genummerde onderdelenlijst die bij deze explosietekening hoort (nummer voor nummer, vertaald)
            wordt nog toegevoegd.
          </div>
        )}
      </section>

      {grootSrc && (
        <div onClick={() => setGrootSrc(null)} style={{ position: "fixed", inset: 0, background: "rgba(20,30,25,.88)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 50, cursor: "zoom-out", overflow: "auto" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={grootSrc} alt={`${c.type} ${c.vehicle}`} style={{ maxWidth: "100%", maxHeight: "100%", borderRadius: 8, background: "#fff" }} />
        </div>
      )}
    </div>
  );
}

const wrap: CSSProperties = { maxWidth: 920, margin: "0 auto", padding: "0 16px" };
const grid: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))", gap: 10, marginTop: 22 };
const kaart: CSSProperties = { position: "relative", aspectRatio: "1 / 1", background: "#fff", border: `1px solid ${RAND}`, borderRadius: 10, padding: 0, overflow: "hidden", cursor: "pointer", font: "inherit", color: TEKST };
const badge: CSSProperties = { fontSize: 11.5, background: "#eef0ea", border: `1px solid ${RAND}`, color: GROEN, borderRadius: 20, padding: "3px 9px" };
const badgeGoud: CSSProperties = { ...badge, color: "#8a6320", borderColor: "#e6d49a", background: "#f7eecd", fontVariantNumeric: "tabular-nums" };
const paneel: CSSProperties = { background: "#fff", border: `1px solid ${RAND}`, borderRadius: 14, padding: 18, marginTop: 16 };
const kop: CSSProperties = { fontFamily: SERIF, color: GROEN, margin: "0 0 12px", fontSize: 18, fontWeight: 700 };
const tabel: CSSProperties = { width: "100%", borderCollapse: "collapse", fontSize: 14 };
const th: CSSProperties = { textAlign: "left", padding: "8px 10px", borderBottom: `1px solid #eef0ea`, color: GROEN, fontWeight: 700 };
const td: CSSProperties = { textAlign: "left", padding: "8px 10px", borderBottom: `1px solid #eef0ea`, verticalAlign: "top" };
