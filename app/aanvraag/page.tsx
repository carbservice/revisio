"use client";

// Publieke aanvraagpagina (vervangt het Zapier/Strikingly-formulier). Post naar
// /api/aanvraag. Live kenteken-check bij de RDW, segmentatie (zelf vs partner,
// particulier vs zakelijk), en een honeypot tegen bots.

import { useState, useEffect, CSSProperties } from "react";
import { GROEN, TEKST, GRIJS, RAND, BG, KAART_BG, GROEN_BG } from "@/lib/theme";
import { normaliseerKenteken } from "@/lib/rdw";

type Velden = {
  voornaam: string; achternaam: string; telefoon: string; email: string;
  bedrijfsnaam: string; kvk: string; btw: string;
  carburateur: string; merk_model_jaar: string;
};

export default function AanvraagPagina() {
  const [route, setRoute] = useState("zelf");
  const [zakelijk, setZakelijk] = useState(false);
  const [kenteken, setKenteken] = useState("");
  const [voertuig, setVoertuig] = useState<string | null>(null);
  const [geenMatch, setGeenMatch] = useState(false);
  const [klachten, setKlachten] = useState("");
  const [bezig, setBezig] = useState(false);
  const [klaar, setKlaar] = useState(false);
  const [v, setV] = useState<Velden>({ voornaam: "", achternaam: "", telefoon: "", email: "", bedrijfsnaam: "", kvk: "", btw: "", carburateur: "", merk_model_jaar: "" });

  const set = (k: keyof Velden, val: string) => setV((s) => ({ ...s, [k]: val }));

  // Eigen hoogte naar de parent-pagina posten, zodat de iframe-embed (o.a. de
  // shop-contactpagina) automatisch meeschaalt en niets afkapt.
  useEffect(() => {
    const post = () => window.parent?.postMessage({ revisioFormHeight: document.documentElement.scrollHeight }, "*");
    post();
    const ro = new ResizeObserver(post);
    ro.observe(document.documentElement);
    return () => ro.disconnect();
  }, []);

  async function checkKenteken() {
    const k = normaliseerKenteken(kenteken);
    setVoertuig(null); setGeenMatch(false);
    if (k.length < 4) return;
    try {
      const res = await fetch(`https://opendata.rdw.nl/resource/m9d7-ebf2.json?kenteken=${k}`);
      const r = await res.json();
      const x = r && r[0];
      if (x) {
        const bj = (x.datum_eerste_toelating || "").slice(0, 4);
        setVoertuig([[x.merk, x.handelsbenaming].filter(Boolean).join(" "), bj, x.cilinderinhoud ? `${x.cilinderinhoud} cc` : ""].filter(Boolean).join(" · "));
      } else setGeenMatch(true);
    } catch { setGeenMatch(true); }
  }

  async function verstuur(e: React.FormEvent) {
    e.preventDefault();
    setBezig(true);
    const sp = new URLSearchParams(window.location.search);
    const tracking = { gclid: sp.get("gclid"), gad_source: sp.get("gad_source"), fbclid: sp.get("fbclid"), utm_source: sp.get("utm_source") };
    const hp = (document.getElementById("website") as HTMLInputElement | null)?.value || "";
    try {
      await fetch("/api/aanvraag", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...v, route, zakelijk, kenteken, klachten, tracking, website: hp }),
      });
      setKlaar(true);
    } catch { /* nooit blokkeren */ } finally { setBezig(false); }
  }

  if (klaar) return (
    <main style={wrap}><div style={kaart}>
      <div style={{ fontSize: 46, textAlign: "center" }}>✅</div>
      <h1 style={{ ...h1, textAlign: "center" }}>Bedankt, we hebben je aanvraag!</h1>
      <p style={{ color: GRIJS, textAlign: "center" }}>Je hoort meestal binnen één werkdag van ons met een vrijblijvende offerte.</p>
    </div></main>
  );

  return (
    <main style={wrap}><div style={kaart}>
      <h1 style={h1}>Vraag je offerte aan</h1>
      <p style={{ color: GRIJS, margin: "6px 0 20px" }}>Vrijblijvend. Je hoort meestal binnen één werkdag van ons.</p>
      <form onSubmit={verstuur}>
        <input id="website" name="website" tabIndex={-1} autoComplete="off" style={{ position: "absolute", left: "-9999px", width: 1, height: 1 }} />

        <div style={vraag}>1. Hoe wil je het aanpakken?</div>
        <div style={keuzeRij}>
          <Keuze aan={route === "zelf"} onClick={() => setRoute("zelf")} titel="🔧 Ik regel het zelf" sub="Opsturen of langsbrengen." />
          <Keuze aan={route === "partner"} onClick={() => setRoute("partner")} titel="📍 Installatiepartner" sub="Ik rijd naar een partner die 'm inbouwt." />
        </div>
        {route === "partner" && <div style={notitie}>📍 Top! We koppelen je na je aanvraag aan de dichtstbijzijnde installatiepartner.</div>}

        <div style={vraag}>2. Voor wie is het?</div>
        <div style={keuzeRij}>
          <Keuze aan={!zakelijk} onClick={() => setZakelijk(false)} titel="👤 Particulier" sub="Privé." />
          <Keuze aan={zakelijk} onClick={() => setZakelijk(true)} titel="🏢 Zakelijk" sub="Op naam van een bedrijf." />
        </div>
        {zakelijk && (
          <>
            <Veld label="Bedrijfsnaam" val={v.bedrijfsnaam} on={(x) => set("bedrijfsnaam", x)} />
            <div style={rij2}>
              <Veld label="KVK-nummer" val={v.kvk} on={(x) => set("kvk", x)} />
              <Veld label="BTW-nummer" val={v.btw} on={(x) => set("btw", x)} />
            </div>
          </>
        )}

        <div style={vraag}>3. Je gegevens</div>
        <div style={rij2}>
          <Veld label="Voornaam *" val={v.voornaam} on={(x) => set("voornaam", x)} req />
          <Veld label="Achternaam" val={v.achternaam} on={(x) => set("achternaam", x)} />
        </div>
        <div style={rij2}>
          <Veld label="Telefoon" val={v.telefoon} on={(x) => set("telefoon", x)} />
          <Veld label="E-mail *" val={v.email} on={(x) => set("email", x)} type="email" req />
        </div>

        <div style={vraag}>4. Je voertuig</div>
        <label style={lbl}>Kenteken
          <input value={kenteken} onChange={(e) => setKenteken(e.target.value)} onBlur={checkKenteken} placeholder="bijv. PL-TT-32" style={inp} />
        </label>
        {voertuig && <div style={{ ...notitie, background: GROEN_BG, color: GROEN }}>✓ {voertuig} — klopt dit?</div>}
        {geenMatch && <div style={notitie}>Geen kenteken gevonden. Vul hieronder zelf merk, model en jaar in.</div>}
        {(geenMatch || !kenteken) && <Veld label="Of: merk, model en bouwjaar" val={v.merk_model_jaar} on={(x) => set("merk_model_jaar", x)} placeholder="bijv. Volkswagen Kever 1972" />}

        <Veld label="Carburateur (merk / type / tagnummer, als je 't weet)" val={v.carburateur} on={(x) => set("carburateur", x)} />
        <label style={lbl}>Welke klachten heb je?
          <textarea value={klachten} onChange={(e) => setKlachten(e.target.value)} rows={3} placeholder="Beschrijf kort wat het voertuig doet..." style={{ ...inp, resize: "vertical" }} />
        </label>

        <button type="submit" disabled={bezig} style={knop}>{bezig ? "Versturen…" : "Verstuur mijn aanvraag →"}</button>
        <div style={{ textAlign: "center", fontSize: 12.5, color: GRIJS, marginTop: 10 }}>Geen verplichtingen. We nemen snel contact op.</div>
      </form>
    </div></main>
  );
}

function Keuze({ aan, onClick, titel, sub }: { aan: boolean; onClick: () => void; titel: string; sub: string }) {
  return (
    <button type="button" onClick={onClick} style={{ flex: "1 1 180px", textAlign: "left", border: `1.5px solid ${aan ? GROEN : RAND}`, background: aan ? GROEN_BG : "#fff", borderRadius: 14, padding: 14, cursor: "pointer", fontFamily: "inherit" }}>
      <div style={{ fontWeight: 800, fontSize: 15, color: TEKST }}>{titel}</div>
      <div style={{ fontSize: 12.5, color: GRIJS, marginTop: 2 }}>{sub}</div>
    </button>
  );
}
function Veld({ label, val, on, type = "text", req, placeholder }: { label: string; val: string; on: (x: string) => void; type?: string; req?: boolean; placeholder?: string }) {
  return (
    <label style={lbl}>{label}
      <input type={type} required={req} value={val} onChange={(e) => on(e.target.value)} placeholder={placeholder} style={inp} />
    </label>
  );
}

const wrap: CSSProperties = { minHeight: "100vh", background: BG, padding: "30px 16px", fontFamily: "'Karma', Georgia, serif", color: TEKST };
const kaart: CSSProperties = { maxWidth: 620, margin: "0 auto", background: KAART_BG, border: `1px solid ${RAND}`, borderRadius: 20, padding: 28, boxShadow: "0 10px 30px rgba(26,60,46,.10)" };
const h1: CSSProperties = { fontSize: 28, fontWeight: 800, color: GROEN, margin: 0 };
const vraag: CSSProperties = { fontWeight: 800, color: GROEN, fontSize: 16, margin: "22px 0 10px" };
const keuzeRij: CSSProperties = { display: "flex", gap: 10, flexWrap: "wrap" };
const rij2: CSSProperties = { display: "flex", flexWrap: "wrap", columnGap: 14 };
const lbl: CSSProperties = { display: "block", flex: "1 1 200px", fontSize: 13.5, fontWeight: 600, marginTop: 14, color: TEKST };
const inp: CSSProperties = { width: "100%", boxSizing: "border-box", marginTop: 6, border: `1.5px solid ${RAND}`, borderRadius: 11, padding: "11px 13px", fontSize: 15, fontFamily: "inherit", background: "#fff", color: TEKST };
const notitie: CSSProperties = { background: "#f7eecd", borderRadius: 11, padding: "10px 13px", fontSize: 13.5, color: "#6a5212", marginTop: 10, fontWeight: 600 };
const knop: CSSProperties = { width: "100%", marginTop: 22, border: "none", background: GROEN, color: "#fff", borderRadius: 999, padding: "14px", fontSize: 16, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" };
