"use client";

// Revisio CEO dashboard. app/dashboard/page.tsx

import { useEffect, useState, CSSProperties, SVGProps } from "react";
import { GROEN, GROEN_BG, GOUD, ROOD, ROOD_BG, TEKST, GRIJS, RAND, BG } from "@/lib/theme";
import { euro } from "@/lib/format";
import AuthGate from "@/app/components/AuthGate";
import DashboardNav from "@/app/components/DashboardNav";
import LaadScherm from "@/app/components/LaadScherm";

const GROEN_LICHT = "#a9c0b4";

const LOON = [
  { naam: "Lukas (de Esch)", perMaand: 1087.81 },
  { naam: "Jarno (Morrien)", perMaand: 799.12 },
  { naam: "Rens (de Wilt)", perMaand: 338.14 },
  { naam: "Luuk (Veenendaal)", perMaand: 136.12 },
];
const LOON_TOTAAL = LOON.reduce((s, p) => s + p.perMaand, 0);
const LOON_START = { jaar: 2026, maand: 5 };

const IB_PCT = 30;

const PERIODES: [string, string][] = [["maand", "Maand"], ["kwartaal", "Kwartaal"], ["jaar", "Jaar"]];
const UITLEG: Record<string, string> = {
  maand: "Eén losse maand. Kies de maand hieronder. De lopende maand loopt nog.",
  kwartaal: "Dit kwartaal tot en met de laatste hele maand, vergeleken met 2025.",
  jaar: "Dit jaar tot en met de laatste hele maand, vergeleken met 2025.",
};

const DEFAULT_VOLGORDE = [
  "omzet", "brutomarge", "nettowinst", "kosten",
  "productgroep",
  "margeChart",
  "closing",
  "btw", "ib", "loon", "nettowinstNaLoon",
  "topKosten", "vooruitblik",
];

function procent(n: number) { return `${Math.round(n)}%`; }
function uur(min: number | null) {
  if (min == null) return "—";
  const u = Math.floor(min / 60), m = min % 60;
  if (u && m) return `${u}u ${m}m`;
  if (u) return `${u}u`;
  return `${m}m`;
}
function groet() {
  const u = new Date().getHours();
  if (u < 12) return "Goedemorgen";
  if (u < 18) return "Goedemiddag";
  return "Goedenavond";
}
function loonVoor(key: string) {
  const jr = Number(key.slice(0, 4));
  const mn = Number(key.slice(4, 6));
  const na = jr > LOON_START.jaar || (jr === LOON_START.jaar && mn >= LOON_START.maand);
  return na ? LOON_TOTAAL : 0;
}

const kaart: CSSProperties = { background: "#fff", border: `1px solid ${RAND}`, borderRadius: 16, padding: 16, boxShadow: "0 1px 2px rgba(0,0,0,.04)", display: "flex", flexDirection: "column", minHeight: 150 };
const waardeGroot: CSSProperties = { fontSize: 24, fontWeight: 700, fontVariantNumeric: "tabular-nums", letterSpacing: -0.3 };
const sub: CSSProperties = { fontSize: 12.5, color: GRIJS, marginTop: 2 };
const rij: CSSProperties = { display: "flex", justifyContent: "space-between", gap: 10, padding: "2px 0", fontSize: 12.5, color: GRIJS };
const chip = (kleur: string): CSSProperties => ({ width: 32, height: 32, borderRadius: 9, background: kleur, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 });

function Icoon({ naam }: { naam: string }) {
  const c: SVGProps<SVGSVGElement> = { width: 17, height: 17, viewBox: "0 0 20 20", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" };
  switch (naam) {
    case "euro": return <svg {...c}><path d="M14 5.5a5 5 0 1 0 0 9" /><line x1="4" y1="8.5" x2="11" y2="8.5" /><line x1="4" y1="11.5" x2="10" y2="11.5" /></svg>;
    case "percent": return <svg {...c}><line x1="5" y1="15" x2="15" y2="5" /><circle cx="6.5" cy="6.5" r="1.6" /><circle cx="13.5" cy="13.5" r="1.6" /></svg>;
    case "up": return <svg {...c}><polyline points="3 14 8 9 11 12 17 6" /><polyline points="13 6 17 6 17 10" /></svg>;
    case "down": return <svg {...c}><polyline points="3 6 8 11 11 8 17 14" /><polyline points="13 14 17 14 17 10" /></svg>;
    case "inkomend": return <svg {...c}><line x1="10" y1="3" x2="10" y2="14" /><polyline points="5 9 10 14 15 9" /></svg>;
    case "uitgaand": return <svg {...c}><line x1="10" y1="17" x2="10" y2="6" /><polyline points="5 11 10 6 15 11" /></svg>;
    case "bon": return <svg {...c}><path d="M5 3h10v14l-2-1.3L11 17l-1-1.3L9 17l-2-1.3L5 17z" /><line x1="7.5" y1="7.5" x2="12.5" y2="7.5" /><line x1="7.5" y1="10.5" x2="12.5" y2="10.5" /></svg>;
    case "spaarpot": return <svg {...c}><path d="M3 11a5 4 0 0 1 5-4h4a5 4 0 0 1 5 4 5 4 0 0 1-2 3.2V16h-2v-1h-3v1H8v-1.8A5 4 0 0 1 3 11z" /><circle cx="13" cy="10.5" r="0.7" /><line x1="7" y1="7" x2="8.5" y2="5.5" /></svg>;
    case "mensen": return <svg {...c}><circle cx="7" cy="7" r="2.5" /><path d="M2.5 16c0-2.5 2-4.5 4.5-4.5s4.5 2 4.5 4.5" /><path d="M13 5a2.5 2.5 0 0 1 0 5" /><path d="M14 11.7c1.9.3 3.5 2.1 3.5 4.3" /></svg>;
    case "portemonnee": return <svg {...c}><rect x="3" y="6" width="14" height="10" rx="2.5" /><path d="M3 9h14" /><circle cx="13.5" cy="11.5" r="1" /></svg>;
    case "bank": return <svg {...c}><polyline points="3 8 10 4 17 8" /><line x1="4.5" y1="8" x2="4.5" y2="14" /><line x1="8.2" y1="8" x2="8.2" y2="14" /><line x1="11.8" y1="8" x2="11.8" y2="14" /><line x1="15.5" y1="8" x2="15.5" y2="14" /><line x1="3" y1="16.5" x2="17" y2="16.5" /></svg>;
    case "staaf": return <svg {...c}><line x1="4" y1="16" x2="4" y2="11" /><line x1="9" y1="16" x2="9" y2="5" /><line x1="14" y1="16" x2="14" y2="8" /><line x1="2.5" y1="16.5" x2="16.5" y2="16.5" /></svg>;
    case "doel": return <svg {...c}><circle cx="10" cy="10" r="7" /><circle cx="10" cy="10" r="3.5" /><circle cx="10" cy="10" r="0.6" /></svg>;
    case "kompas": return <svg {...c}><circle cx="10" cy="10" r="7" /><polygon points="13 7 9 9 7 13 11 11" /></svg>;
    case "retour": return <svg {...c}><polyline points="4 7 4 12 9 12" /><path d="M4 12a7 7 0 1 0 2-5" /></svg>;
    default: return null;
  }
}

function kaartKop(kleur: string, iconNaam: string, titel: string) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
      <div style={chip(kleur)}><Icoon naam={iconNaam} /></div>
      <div style={{ fontSize: 12.5, color: GRIJS, fontWeight: 600 }}>{titel}</div>
    </div>
  );
}

function yoyRegel(y: any, vorigLabel: string, omhoogGoed: boolean) {
  if (!y) return null;
  const op = y.absoluut >= 0;
  const goed = op === omhoogGoed;
  const pct = y.procent !== null ? procent(Math.abs(y.procent)) : euro(Math.abs(y.absoluut));
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: goed ? GROEN_BG : ROOD_BG, color: goed ? GROEN : ROOD, fontWeight: 700, fontSize: 12, padding: "2px 8px", borderRadius: 999 }}>
        {op ? "▲" : "▼"} {pct}
      </span>
      <span style={{ fontSize: 11.5, color: GRIJS }}>vs {vorigLabel}: {op ? "+" : "-"}{euro(Math.abs(y.absoluut))}</span>
    </div>
  );
}

function StatusTegel({ kleur, icon, titel, waarde, onder }: { kleur: string; icon: string; titel: string; waarde: string; onder?: string }) {
  return (
    <div style={kaart}>
      {kaartKop(kleur, icon, titel)}
      <div style={waardeGroot}>{waarde}</div>
      {onder && <div style={sub}>{onder}</div>}
    </div>
  );
}

export default function DashboardPagina() {
  return (
    <AuthGate requireAdmin>
      <Dashboard />
    </AuthGate>
  );
}

function Dashboard() {
  const [data, setData] = useState<any>(null);
  const [fout, setFout] = useState("");
  const [wp, setWp] = useState<any>(null);
  const [volgorde, setVolgorde] = useState<string[]>(DEFAULT_VOLGORDE);
  const [sleep, setSleep] = useState<string | null>(null);
  const [periode, setPeriode] = useState<string>("maand");
  const [maandKeuze, setMaandKeuze] = useState<number>(999);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((d) => (d.fout ? setFout(d.fout) : setData(d)))
      .catch((e) => setFout(String(e)));
  }, []);

  useEffect(() => {
    fetch("/api/werkplaats-stats", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setWp(d))
      .catch(() => setWp({ fout: "kon niet laden" }));
  }, []);

  useEffect(() => {
    try {
      const opg = JSON.parse(localStorage.getItem("revisio-volgorde") || "null");
      if (Array.isArray(opg)) {
        setVolgorde([
          ...opg.filter((k: string) => DEFAULT_VOLGORDE.includes(k)),
          ...DEFAULT_VOLGORDE.filter((k) => !opg.includes(k)),
        ]);
      }
      const p = localStorage.getItem("revisio-periode");
      if (p === "maand" || p === "kwartaal" || p === "jaar") setPeriode(p);
    } catch {}
  }, []);

  function verplaats(doelKey: string) {
    if (!sleep || sleep === doelKey) return;
    setVolgorde((vlg) => {
      const zonder = vlg.filter((k) => k !== sleep);
      const idx = zonder.indexOf(doelKey);
      zonder.splice(idx, 0, sleep);
      try { localStorage.setItem("revisio-volgorde", JSON.stringify(zonder)); } catch {}
      return zonder;
    });
    setSleep(null);
  }

  function naarBoven(key: string) {
    setVolgorde((vlg) => {
      const z = [key, ...vlg.filter((k) => k !== key)];
      try { localStorage.setItem("revisio-volgorde", JSON.stringify(z)); } catch {}
      return z;
    });
  }

  function kiesPeriode(k: string) {
    setPeriode(k);
    try { localStorage.setItem("revisio-periode", k); } catch {}
  }

  const buiten: CSSProperties = { minHeight: "100vh", background: BG, padding: "28px 16px", fontFamily: "system-ui, -apple-system, sans-serif", color: TEKST };
  const apis = [
    { naam: "Moneybird-cijfers", klaar: (data != null && !!data.status) || !!fout },
    { naam: "Werkplaats-stats", klaar: wp != null },
  ];

  if (fout) return (
    <main style={buiten}>
      <div style={{ maxWidth: 1120, margin: "0 auto" }}>
        <DashboardNav />
        <div style={{ padding: 24, color: ROOD }}>Fout bij ophalen: {fout}</div>
      </div>
    </main>
  );
  if (!apis.every((a) => a.klaar)) return (
    <main style={buiten}>
      <div style={{ maxWidth: 1120, margin: "0 auto" }}>
        <DashboardNav />
        <LaadScherm apis={apis} />
      </div>
    </main>
  );

  const s = data.status;
  const maandIdx = Math.min(maandKeuze, data.maanden.length - 1);
  const maandActief = data.maanden[maandIdx];
  const maandHeel = data.maanden[Math.max(0, data.maanden.length - 2)];
  const actief = periode === "maand" ? maandActief : data.views[periode];

  function kpiKaart(k: string, titel: string, kleur: string, iconNaam: string, pctKey?: string, omhoogGoed = true) {
    const pct = pctKey ? actief.cijfers[pctKey] : null;
    return (
      <>
        {kaartKop(kleur, iconNaam, titel)}
        <div style={waardeGroot}>{euro(actief.cijfers[k])}</div>
        {pct != null && <div style={sub}>{procent(pct)} marge</div>}
        {actief.loopt
          ? <div style={{ fontSize: 12, color: GRIJS, marginTop: 10, fontStyle: "italic" }}>deze maand loopt nog</div>
          : yoyRegel(actief.yoy[k], actief.vorigLabel, omhoogGoed)}
      </>
    );
  }

  function closingRate(c: any) {
    if (!c || !c.verstuurd) return null;
    return (c.gewonnen / c.verstuurd) * 100;
  }

  function barChart(waardeVan: (m: any) => number, labelVan: (m: any) => string) {
    const ms = data.maanden;
    const max = Math.max(...ms.map(waardeVan), 1);
    return (
      <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 150, marginTop: 10 }}>
        {ms.map((m: any, i: number) => {
          const w = waardeVan(m);
          const h = Math.max(4, (w / max) * 120);
          const gekozen = periode === "maand" && i === maandIdx;
          const fill = gekozen ? GOUD : (m.loopt ? GROEN_LICHT : GROEN);
          return (
            <div key={m.key} onClick={() => setMaandKeuze(i)} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 5, cursor: "pointer" }}>
              <div style={{ fontSize: 10.5, color: GRIJS, fontVariantNumeric: "tabular-nums" }}>{labelVan(m)}</div>
              <div style={{ width: "60%", maxWidth: 44, height: h, background: fill, borderRadius: "5px 5px 0 0" }} />
              <div style={{ fontSize: 11.5, color: gekozen ? TEKST : GRIJS, fontWeight: gekozen ? 700 : 400 }}>{m.kort}</div>
            </div>
          );
        })}
      </div>
    );
  }

  function renderKaart(key: string) {
    switch (key) {
      case "omzet": return kpiKaart("omzet", "Omzet", GROEN, "euro");
      case "brutomarge": return kpiKaart("brutomarge", "Brutomarge", GROEN, "percent", "brutomarge_pct");
      case "nettowinst": return kpiKaart("nettowinst", "Nettowinst", GROEN, "up", "netto_pct");
      case "kosten": return kpiKaart("kosten", "Kosten", GOUD, "down", undefined, false);
      case "productgroep": {
        const pg = data.omzetPerProductgroep;
        if (!pg || !pg.groepen || pg.groepen.length === 0) return null;
        const max = Math.max(...pg.groepen.map((g: any) => g.omzet), 1);
        return (<>
          {kaartKop(GROEN, "staaf", "Omzet per productgroep (dit jaar)")}
          <div style={{ marginTop: 4 }}>
            {pg.groepen.map((g: any) => (
              <div key={g.naam} style={{ marginBottom: 9 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 3 }}>
                  <span style={{ fontWeight: 600 }}>{g.naam}</span>
                  <span style={{ fontVariantNumeric: "tabular-nums", color: GRIJS }}>{euro(g.omzet)} ({procent(g.aandeel * 100)})</span>
                </div>
                <div style={{ height: 7, background: GROEN_BG, borderRadius: 999, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${Math.max(0, (g.omzet / max) * 100)}%`, background: GROEN, borderRadius: 999 }} />
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", borderTop: `1px solid ${RAND}`, marginTop: 6, paddingTop: 8, fontSize: 12.5 }}>
            <span style={{ fontWeight: 700 }}>Totaal</span>
            <span style={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{euro(pg.totaal)}</span>
          </div>
        </>);
      }
      case "margeChart":
        return (<>{kaartKop(GROEN, "up", "Nettowinst per maand (evolutie)")}{barChart((m) => m.cijfers.nettowinst, (m) => euro(m.cijfers.nettowinst))}<div style={{ fontSize: 11, color: GRIJS, marginTop: 8 }}>Lichtere staaf is de lopende maand, die loopt nog.</div></>);
      case "closing": {
        const c = actief.closing;
        const rate = closingRate(c);
        return (<>{kaartKop(GROEN, "doel", "Closing rate")}<div style={waardeGroot}>{rate == null ? "—" : procent(rate)}</div><div style={sub}>{c ? `${c.gewonnen} van ${c.verstuurd} offertes gewonnen` : "geen offertes"}</div>{actief.loopt && <div style={{ fontSize: 11.5, color: GRIJS, marginTop: 6, fontStyle: "italic" }}>loopt nog op</div>}</>);
      }
      case "btw":
        return data.btw ? (<>{kaartKop(GROEN, "bon", "Btw dit kwartaal")}<div style={waardeGroot}>{euro(data.btw.afTeDragen)}</div><div style={sub}>af te dragen, richtbedrag</div><div style={{ fontSize: 11.5, color: GRIJS, marginTop: 3 }}>exact in Moneybird btw-overzicht</div></>) : null;
      case "ib": {
        const reserve = Math.max(0, actief.cijfers.nettowinst) * (IB_PCT / 100);
        return (<>{kaartKop(GROEN, "spaarpot", "Opzij voor IB (richtbedrag)")}<div style={waardeGroot}>{euro(reserve)}</div><div style={sub}>{IB_PCT}% van de winst van {actief.huidigLabel}</div><div style={{ fontSize: 11.5, color: GRIJS, marginTop: 3 }}>percentage afstemmen met je boekhouder</div></>);
      }
      case "loon":
        return (<>{kaartKop(GOUD, "mensen", "Loon per maand (netto)")}<div style={waardeGroot}>{euro(LOON_TOTAAL)}</div>
          <div style={{ marginTop: 8 }}>{LOON.map((p) => (<div key={p.naam} style={rij}><span>{p.naam}</span><span>{euro(p.perMaand)}</span></div>))}</div>
          <div style={{ fontSize: 11, color: GRIJS, marginTop: 6 }}>telt mee vanaf mei 2026</div></>);
      case "nettowinstNaLoon": {
        const loon = loonVoor(maandHeel.key);
        return (<>{kaartKop(GROEN, "portemonnee", `Nettowinst na loon (${maandHeel.huidigLabel})`)}<div style={waardeGroot}>{euro(maandHeel.cijfers.nettowinst - loon)}</div><div style={sub}>Moneybird toont {euro(maandHeel.cijfers.nettowinst)}{loon ? `, loon ${euro(loon)} eraf` : ", loon telt hier nog niet"}</div></>);
      }
      case "topKosten": {
        const tk = actief.topKosten || [];
        return (<>{kaartKop(GOUD, "staaf", `Grootste kosten (${actief.huidigLabel})`)}<div style={{ marginTop: 4 }}>{tk.map((k: any, i: number) => (<div key={i} style={rij}><span style={{ paddingRight: 8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{k.naam}</span><span style={{ whiteSpace: "nowrap" }}>{euro(k.bedrag)}</span></div>))}</div></>);
      }
      case "vooruitblik": {
        const vb = data.vooruitblik;
        if (!vb) return (<>{kaartKop(GROEN, "kompas", "Vooruitblik volgende maand")}<div style={sub}>nog geen schatting</div></>);
        const verwachteWinst = vb.omzet - vb.kosten;
        return (<>
          {kaartKop(GROEN, "kompas", `Vooruitblik ${vb.maandLabel}`)}
          <div style={{ marginTop: 4 }}>
            <div style={rij}><span>Verwachte omzet</span><span style={{ color: TEKST, fontWeight: 600 }}>{euro(vb.omzet)}</span></div>
            <div style={rij}><span>Verwachte kosten</span><span style={{ color: TEKST, fontWeight: 600 }}>{euro(vb.kosten)}</span></div>
            <div style={{ ...rij, borderTop: `1px solid ${RAND}`, marginTop: 4, paddingTop: 6 }}><span style={{ fontWeight: 700, color: TEKST }}>Verwachte winst</span><span style={{ fontWeight: 700, color: TEKST }}>{euro(verwachteWinst)}</span></div>
          </div>
          <div style={{ fontSize: 11, color: GRIJS, marginTop: 8 }}>Schatting op basis van {vb.basisLabel}{vb.groeiPct != null ? `, bijgesteld met de trend van dit jaar (${vb.groeiPct >= 0 ? "+" : ""}${procent(vb.groeiPct)})` : ""}.</div>
        </>);
      }
      default: return null;
    }
  }

  const breed = (key: string) => key === "margeChart";

  return (
    <main style={{ minHeight: "100vh", background: BG, padding: "28px 16px", fontFamily: "system-ui, -apple-system, sans-serif", color: TEKST }}>
      <style jsx>{`
        .rk { transition: box-shadow .15s ease, transform .15s ease, opacity .15s ease; cursor: grab; }
        .rk:hover { box-shadow: 0 8px 20px rgba(26,60,46,.09); transform: translateY(-2px); }
        .rk:active { cursor: grabbing; }
        .sleep { opacity: .4; outline: 2px dashed ${GROEN}; outline-offset: 2px; }
        .pkts button:hover { color: ${GROEN}; }
        .naar-boven { position: absolute; top: 12px; right: 12px; opacity: 0; transition: opacity .15s ease; border: none; background: ${GROEN_BG}; color: ${GROEN}; border-radius: 8px; font-size: 11px; font-weight: 700; padding: 3px 8px; cursor: pointer; }
        .rk:hover .naar-boven { opacity: 1; }
      `}</style>
      <div style={{ maxWidth: 1120, margin: "0 auto" }}>

        <DashboardNav />

        <div style={{ marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 11, height: 11, borderRadius: "50%", background: GROEN }} />
            <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", color: GROEN }}>Revisio</span>
          </div>
          <h1 style={{ margin: "8px 0 0", fontSize: 26, fontWeight: 700 }}>{groet()} Cyriel</h1>
        </div>

        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Hoe staan we er nu voor</h2>
          <span style={{ fontSize: 11.5, color: GRIJS }}>live uit Moneybird, {s.ytdLabel}</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14 }}>
          <StatusTegel kleur={GROEN} icon="bank" titel="Saldo (zonder btw-pot)" waarde={euro(s.saldoExclBtw)} onder="alle rekeningen, btw-spaarpot eraf" />
          <StatusTegel kleur={GOUD} icon="spaarpot" titel="Btw-spaarpot" waarde={euro(s.btwPot)} onder="gereserveerd voor de Belastingdienst" />
          <StatusTegel kleur={GROEN} icon="inkomend" titel="Te ontvangen" waarde={euro(s.teOntvangen)} onder="openstaande facturen" />
          <StatusTegel kleur={GOUD} icon="uitgaand" titel="Te betalen" waarde={euro(s.teBetalen)} onder="openstaande inkoop" />
          <StatusTegel kleur={GROEN} icon="euro" titel="Omzet dit jaar" waarde={euro(s.omzet)} onder={s.ytdLabel} />
          <StatusTegel kleur={GROEN} icon="up" titel="Nettowinst dit jaar" waarde={euro(s.nettowinst)} onder={`${procent(s.netto_pct)} marge, ${s.ytdLabel}`} />
        </div>

        {/* Werkplaats */}
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 8, margin: "26px 0 12px" }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Werkplaats</h2>
          <a href="/dashboard/werkplaats" style={{ fontSize: 12.5, color: GROEN, fontWeight: 700, textDecoration: "none" }}>Bekijk werkplaats →</a>
        </div>
        {wp && !wp.fout ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14 }}>
            <StatusTegel kleur={wp.plank.alert ? ROOD : GROEN} icon="staaf" titel="Op de plank nu" waarde={String(wp.plank.totaal)} onder={`${wp.plank.week} 7+ dagen, ${wp.plank.alert} 14+ alert`} />
            <StatusTegel kleur={GROEN} icon="doel" titel="Klaar deze maand" waarde={String(wp.klaar.deze_maand)} onder={`vorige maand ${wp.klaar.vorige_maand}`} />
            <StatusTegel kleur={GROEN} icon="kompas" titel="Gem. doorlooptijd" waarde={wp.doorlooptijd.deze_maand == null ? "—" : `${wp.doorlooptijd.deze_maand} dgn`} onder={wp.doorlooptijd.vorige_maand == null ? "vorige maand —" : `vorige maand ${wp.doorlooptijd.vorige_maand} dgn`} />
            <StatusTegel kleur={(wp.retour && wp.retour.deze_maand) ? ROOD : GROEN} icon="retour" titel="Retouren deze maand" waarde={String(wp.retour ? wp.retour.deze_maand : 0)} onder={`vorige maand ${wp.retour ? wp.retour.vorige_maand : 0}`} />
            <StatusTegel kleur={GOUD} icon="mensen" titel="Uren deze maand" waarde={uur(wp.uren.deze_maand.totaal_min)} onder={`gem ${uur(wp.gem_uren_per_klus_min)} per klus`} />
          </div>
        ) : (
          <div style={{ fontSize: 12.5, color: GRIJS }}>{wp && wp.fout ? `Werkplaatscijfers niet beschikbaar: ${wp.fout}` : "Werkplaatscijfers laden..."}</div>
        )}

        <div style={{ ...kaart, marginTop: 24 }}>
          {kaartKop(GROEN, "doel", "Closing rate per maand")}
          {barChart((m) => closingRate(m.closing) || 0, (m) => (m.closing && m.closing.verstuurd ? procent(closingRate(m.closing) as number) : "—"))}
          <div style={{ fontSize: 11, color: GRIJS, marginTop: 8 }}>Gewonnen offertes gedeeld door alle verstuurde offertes van die maand. Recente maanden lopen nog op naarmate offertes worden beslist.</div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14, margin: "30px 0 18px" }}>
          <div style={{ height: 2, background: GROEN, flex: 1, borderRadius: 2 }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: GROEN, letterSpacing: 1, textTransform: "uppercase" }}>Verdieping per periode</span>
          <div style={{ height: 2, background: GROEN, flex: 1, borderRadius: 2 }} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, marginBottom: 16, marginLeft: "auto", maxWidth: 440 }}>
          <div className="pkts" style={{ display: "flex", gap: 4, background: "#fff", border: `1px solid ${RAND}`, borderRadius: 999, padding: 4 }}>
            {PERIODES.map(([k, label]) => (
              <button key={k} title={UITLEG[k]} onClick={() => kiesPeriode(k)} style={{ border: "none", cursor: "pointer", borderRadius: 999, padding: "7px 18px", fontSize: 13, fontWeight: 600, background: periode === k ? GROEN : "transparent", color: periode === k ? "#fff" : GRIJS }}>{label}</button>
            ))}
          </div>
          {periode === "maand" && (
            <div className="pkts" style={{ display: "flex", flexWrap: "wrap", gap: 4, justifyContent: "flex-end" }}>
              {data.maanden.map((m: any, i: number) => (
                <button key={m.key} onClick={() => setMaandKeuze(i)} style={{ border: "none", cursor: "pointer", borderRadius: 8, padding: "4px 11px", fontSize: 12, fontWeight: 600, background: i === maandIdx ? GROEN_BG : "transparent", color: i === maandIdx ? GROEN : GRIJS, fontStyle: m.loopt ? "italic" : "normal" }}>{m.kort}</button>
              ))}
            </div>
          )}
          <span style={{ fontSize: 13, fontWeight: 600, color: TEKST }}>{actief.loopt ? `${actief.huidigLabel} (loopt nog)` : `${actief.huidigLabel} vs ${actief.vorigLabel}`}</span>
          <span style={{ fontSize: 11.5, color: GRIJS, textAlign: "right" }}>{UITLEG[periode]}</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 14 }}>
          {volgorde.map((key) => (
            <div
              key={key}
              draggable
              onDragStart={() => setSleep(key)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => verplaats(key)}
              onDragEnd={() => setSleep(null)}
              className={"rk" + (sleep === key ? " sleep" : "")}
              style={{ ...kaart, ...(breed(key) ? { gridColumn: "1 / -1" } : {}), position: "relative" }}
            >
              <button className="naar-boven" title="Zet bovenaan" onClick={(e) => { e.stopPropagation(); naarBoven(key); }}>naar boven</button>
              {renderKaart(key)}
            </div>
          ))}
        </div>

        <div style={{ fontSize: 11.5, color: GRIJS, marginTop: 18, textAlign: "center" }}>
          De bovenste balk komt rechtstreeks uit Moneybird. De kaarten onder de streep kun je slepen of met "naar boven" indelen.
        </div>

      </div>
    </main>
  );
}