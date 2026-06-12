"use client";

// Werkplaats-managementoverzicht. app/dashboard/werkplaats/page.tsx

import { useEffect, useState, CSSProperties } from "react";
import { GROEN, GOUD, ROOD, ROOD_BG, TEKST, GRIJS, RAND, BG } from "@/lib/theme";
import { datumKort } from "@/lib/format";
import AuthGate from "@/app/components/AuthGate";
import DashboardNav from "@/app/components/DashboardNav";
import LaadScherm from "@/app/components/LaadScherm";
import { uitCache, haalEnCache } from "@/lib/cache";
import ScrollNaarBoven from "@/app/components/ScrollNaarBoven";
import Systeemstatus from "@/app/components/Systeemstatus";

const MAAND = ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"];
function maandLabel(ym: string) {
  if (!ym) return "";
  const [y, m] = ym.split("-");
  return `${MAAND[parseInt(m, 10) - 1]} ${y}`;
}
function uur(min: number | null) {
  if (min == null) return "–";
  const u = Math.floor(min / 60), m = min % 60;
  if (u && m) return `${u}u ${m}m`;
  if (u) return `${u}u`;
  return `${m}m`;
}
function datumVan(ms: number | null) {
  if (!ms) return "";
  const dt = new Date(ms);
  if (isNaN(dt.getTime())) return "";
  return dt.toLocaleDateString("nl-NL", { day: "numeric", month: "short" });
}
function bonHref(klusId: string) {
  return `/werkbon-bekijk?klus=${encodeURIComponent(klusId)}`;
}

export default function WerkplaatsDashboardPagina() {
  return (
    <AuthGate requireAdmin>
      <WerkplaatsDashboard />
    </AuthGate>
  );
}

function WerkplaatsDashboard() {
  const [data, setData] = useState<any>(null);
  const [laden, setLaden] = useState(true);
  const [fout, setFout] = useState("");
  const [zoek, setZoek] = useState("");

  useEffect(() => {
    const c = uitCache("/api/werkplaats-stats");
    if (c) { if (c.fout) setFout(c.fout); else setData(c); setLaden(false); }
    haalEnCache("/api/werkplaats-stats", { cache: "no-store" })
      .then((d) => { if (d.fout) setFout(d.fout); else setData(d); setLaden(false); })
      .catch((e) => { if (!c) { setFout(String(e)); setLaden(false); } });
  }, []);

  const wrap: CSSProperties = { minHeight: "100vh", background: BG, color: TEKST, fontFamily: "system-ui, -apple-system, sans-serif", padding: "28px 18px", maxWidth: 1000, margin: "0 auto" };
  const kaart: CSSProperties = { background: "#fff", border: `1px solid ${RAND}`, borderRadius: 16, padding: 18, marginBottom: 14 };
  const kopstijl: CSSProperties = { fontSize: 12.5, color: GRIJS, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12 };
  const klikRij: CSSProperties = { display: "flex", justifyContent: "space-between", gap: 12, padding: "8px 0", borderTop: `1px solid ${RAND}`, textDecoration: "none", color: TEKST, cursor: "pointer" };

  if (laden) return (
    <main style={wrap}>
      <DashboardNav />
      <LaadScherm apis={[{ naam: "Werkplaats-stats", klaar: false }]} />
    </main>
  );
  if (fout) return <main style={wrap}><div style={kaart}><p style={{ color: ROOD }}>Let op: {fout}</p></div></main>;

  const retour = data.retour || { deze_maand: 0, vorige_maand: 0, totaal: 0, lijst: [] };
  const bonnen = data.bonnen || [];
  const zoekL = zoek.trim().toLowerCase();
  const bonnenGefilterd = zoekL
    ? bonnen.filter((b: any) => `${b.nummer} ${b.klant} ${b.voertuig}`.toLowerCase().includes(zoekL))
    : bonnen;

  const tegel = (titel: string, groot: string, grootKleur: string, sub: any) => (
    <div style={{ ...kaart, marginBottom: 0, flex: 1, minWidth: 150 }}>
      <div style={{ fontSize: 12, color: GRIJS, fontWeight: 600 }}>{titel}</div>
      <div style={{ fontSize: 32, fontWeight: 800, color: grootKleur, lineHeight: 1.1, marginTop: 4 }}>{groot}</div>
      <div style={{ fontSize: 12.5, color: GRIJS, marginTop: 4 }}>{sub}</div>
    </div>
  );

  return (
    <main style={wrap}>
      <DashboardNav />
      <ScrollNaarBoven />
      <h1 style={{ fontSize: 26, fontWeight: 800, color: GROEN, margin: "10px 0 2px" }}>Werkplaats</h1>
      <div style={{ fontSize: 13.5, color: GRIJS, marginBottom: 18 }}>Live uit de werkplaats-app · {maandLabel(data.maand)} vergeleken met {maandLabel(data.vorige_maand)}</div>

      <Systeemstatus />

      <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginBottom: 14 }}>
        {tegel("Op de plank nu", String(data.plank.totaal), data.plank.alert ? ROOD : GROEN,
          <span><span style={{ color: data.plank.week ? GOUD : GRIJS, fontWeight: 700 }}>{data.plank.week}</span> 7+ dagen · <span style={{ color: data.plank.alert ? ROOD : GRIJS, fontWeight: 700 }}>{data.plank.alert}</span> 14+ alert</span>)}
        {tegel("Klaar deze maand", String(data.klaar.deze_maand), GROEN, `vorige maand ${data.klaar.vorige_maand}`)}
        {tegel("Gem. doorlooptijd", data.doorlooptijd.deze_maand == null ? "–" : `${data.doorlooptijd.deze_maand} dgn`, GROEN, data.doorlooptijd.vorige_maand == null ? "vorige maand –" : `vorige maand ${data.doorlooptijd.vorige_maand} dgn`)}
        {tegel("Retouren deze maand", String(retour.deze_maand), retour.deze_maand ? ROOD : GROEN, `vorige maand ${retour.vorige_maand}`)}
        {tegel("Gem. uren per klus", uur(data.gem_uren_per_klus_min), GROEN, `over ${data.klussen_met_uren} klussen`)}
      </div>

      {/* Werkbonnen dashboard */}
      <div style={kaart}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
          <span style={kopstijl}>Werkbonnen</span>
          <span style={{ fontSize: 12.5, color: GRIJS }}>{bonnenGefilterd.length} van {bonnen.length}</span>
        </div>
        <input
          value={zoek}
          onChange={(e) => setZoek(e.target.value)}
          placeholder="Zoek op nummer, klant of voertuig..."
          style={{ width: "100%", boxSizing: "border-box", border: `1.5px solid ${RAND}`, borderRadius: 10, padding: "11px 13px", fontSize: 14, marginBottom: 6 }}
        />
        {bonnen.length === 0 && <div style={{ fontSize: 13, color: GRIJS, paddingTop: 8 }}>Nog geen werkbonnen met ingevulde gegevens.</div>}
        {bonnen.length > 0 && bonnenGefilterd.length === 0 && <div style={{ fontSize: 13, color: GRIJS, paddingTop: 8 }}>Niets gevonden voor "{zoek}".</div>}
        {bonnenGefilterd.map((b: any) => (
          <a key={b.klus_id} href={bonHref(b.klus_id)} style={klikRij}>
            <span style={{ minWidth: 0 }}>
              <span style={{ fontSize: 14, fontWeight: 700 }}>{b.nummer}</span>
              {b.klant && <span style={{ fontSize: 14 }}> · {b.klant}</span>}
              {b.is_retour && <span style={{ fontSize: 10.5, fontWeight: 800, color: "#fff", background: ROOD, borderRadius: 999, padding: "2px 7px", marginLeft: 8 }}>RETOUR</span>}
              {b.voertuig && <span style={{ display: "block", fontSize: 12, color: GRIJS, marginTop: 2 }}>{b.voertuig}</span>}
            </span>
            <span style={{ textAlign: "right", whiteSpace: "nowrap", flexShrink: 0 }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: GROEN }}>{b.pct}%</span>
              <span style={{ display: "block", fontSize: 11.5, color: GRIJS, marginTop: 2 }}>{b.fotos} foto{b.fotos === 1 ? "" : "'s"}{b.laatste ? ` · ${datumVan(b.laatste)}` : ""}</span>
            </span>
          </a>
        ))}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
        {([["Deze maand", data.maand, data.uren.deze_maand], ["Vorige maand", data.vorige_maand, data.uren.vorige_maand]] as const).map(([titel, ym, u]) => (
          <div key={titel} style={{ ...kaart, flex: 1, minWidth: 280 }}>
            <div style={kopstijl}>Uren {titel.toLowerCase()} · {maandLabel(ym)}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: GROEN }}>{uur(u.totaal_min)}</div>
            <div style={{ marginTop: 10 }}>
              {u.per_monteur.length === 0 && <div style={{ fontSize: 13, color: GRIJS }}>Nog geen uren geschreven.</div>}
              {u.per_monteur.map((m: any) => (
                <div key={m.naam} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderTop: `1px solid ${RAND}` }}>
                  <span style={{ fontSize: 13.5, fontWeight: 600 }}>{m.naam}</span>
                  <span style={{ fontSize: 13.5, color: GROEN, fontWeight: 600 }}>{uur(m.min)}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div style={kaart}>
        <div style={kopstijl}>Uren per klus</div>
        {data.uren_per_klus.length === 0 && <div style={{ fontSize: 13, color: GRIJS }}>Nog geen uren geschreven.</div>}
        {data.uren_per_klus.map((k: any) => (
          <a key={k.klus_id} href={bonHref(k.klus_id)} style={klikRij}>
            <span style={{ fontSize: 13.5 }}>{k.label}</span>
            <span style={{ fontSize: 13.5, color: GROEN, fontWeight: 600, whiteSpace: "nowrap" }}>{uur(k.min)}</span>
          </a>
        ))}
      </div>

      <div style={{ ...kaart, borderColor: retour.totaal ? ROOD : RAND }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={kopstijl}>Retouren (comebacks)</span>
          <span style={{ fontSize: 12.5, color: GRIJS }}>{retour.totaal} in totaal</span>
        </div>
        {(!retour.lijst || retour.lijst.length === 0) && <div style={{ fontSize: 13, color: GRIJS }}>Geen retouren. Mooi zo.</div>}
        {(retour.lijst || []).map((r: any, i: number) => (
          <a key={i} href={bonHref(r.klus_id)} style={{ display: "block", padding: "9px 0", borderTop: `1px solid ${RAND}`, textDecoration: "none", color: TEKST }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <span style={{ fontSize: 13.5, fontWeight: 700 }}>{r.label}</span>
              <span style={{ fontSize: 12.5, color: GRIJS, whiteSpace: "nowrap" }}>{datumKort(r.datum)}</span>
            </div>
            {r.reden && <div style={{ fontSize: 13, color: ROOD, marginTop: 3, background: ROOD_BG, borderRadius: 8, padding: "8px 10px" }}>{r.reden}</div>}
          </a>
        ))}
      </div>

      <div style={kaart}>
        <div style={kopstijl}>Op de plank, langst eerst</div>
        {data.plank.lijst.length === 0 && <div style={{ fontSize: 13, color: GRIJS }}>Niets op de plank.</div>}
        {data.plank.lijst.map((p: any) => {
          const kleur = p.dagen >= 14 ? ROOD : p.dagen >= 7 ? GOUD : GRIJS;
          return (
            <a key={p.klus_id} href={bonHref(p.klus_id)} style={klikRij}>
              <span style={{ fontSize: 13.5 }}>{p.label}</span>
              <span style={{ fontSize: 13.5, color: kleur, fontWeight: 700, whiteSpace: "nowrap" }}>{p.dagen} {p.dagen === 1 ? "dag" : "dagen"}{p.dagen >= 14 ? " · ALERT" : ""}</span>
            </a>
          );
        })}
      </div>
    </main>
  );
}