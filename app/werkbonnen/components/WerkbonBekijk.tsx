"use client";

import { useState, CSSProperties } from "react";
import Lightbox from "@/app/components/Lightbox";
import type { Klus, Veld, Check, Artikel, Regel } from "@/lib/types";
import { GROEN, GROEN_BG, ROOD, ROOD_BG, GRIJS, RAND, BG } from "@/lib/theme";
import { euro, duur, datumKort, datumTijd, datumStempel } from "@/lib/format";

type Stadium = { id: string; kort: string; pct: number };
type Sectie = { titel: string; cat: string };

type Props = {
  bekijk: Klus;
  onTerug: () => void;
  bekijkLaden: boolean;
  bekijkVelden: Veld[];
  bekijkChecklist: Check[];
  bekijkArtikelen: Artikel[];
  bekijkOpmerking: string;
  bekijkRetour: { is: boolean; reden: string } | null;
  bekijkVoortgang: any[];
  bekijkFotos: any[];
  bekijkRegels: Regel[];
  bekijkLog: any[];
  STADIA: Stadium[];
  SECTIES: Sectie[];
  catVan: (t: string) => string;
  bedragNum: (s: string) => number;
  wrap: CSSProperties;
  kaart: CSSProperties;
  kopstijl: CSSProperties;
};

export default function WerkbonBekijk({ bekijk, onTerug, bekijkLaden, bekijkVelden, bekijkChecklist, bekijkArtikelen, bekijkOpmerking, bekijkRetour, bekijkVoortgang, bekijkFotos, bekijkRegels, bekijkLog, STADIA, SECTIES, catVan, bedragNum, wrap, kaart, kopstijl }: Props) {
  const bTotaal = bekijkRegels.reduce((s, r) => s + (r.minuten || 0), 0);
  const ingevuld = bekijkVelden.filter((v) => v.binnenkomst.trim() || v.afleveren.trim());
  const checksIngevuld = bekijkChecklist.filter((c) => c.status);
  const artIngevuld = bekijkArtikelen.filter((a) => a.naam.trim() && bedragNum(a.bedrag) > 0);
  const artTotaal = artIngevuld.reduce((s, a) => s + bedragNum(a.bedrag), 0);
  const bPct = STADIA.filter((s) => bekijkVoortgang.some((x) => x.stap === s.id)).reduce((m, s) => Math.max(m, s.pct), 0);
  const [lightbox, setLightbox] = useState<{ fotos: { url: string; rotatie: number }[]; start: number } | null>(null);
  return (
    <main style={wrap}>
      <button onClick={onTerug} style={{ border: "none", background: "transparent", color: GROEN, fontWeight: 700, fontSize: 14, cursor: "pointer", padding: "4px 0", marginBottom: 6 }}>← Terug naar klussen</button>

      <div style={kaart}>
        <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
          <span style={{ display: "inline-block", fontSize: 11, fontWeight: 700, color: GRIJS, background: BG, border: `1px solid ${RAND}`, borderRadius: 999, padding: "3px 10px" }}>Alleen lezen</span>
          {bekijkRetour && bekijkRetour.is && <span style={{ display: "inline-block", fontSize: 11, fontWeight: 800, color: "#fff", background: ROOD, borderRadius: 999, padding: "3px 10px" }}>RETOUR</span>}
        </div>
        <div style={{ fontSize: 28, fontWeight: 800, color: GROEN, letterSpacing: 0.5, lineHeight: 1.1 }}>{bekijk.nummer}</div>
        <div style={{ fontSize: 21, fontWeight: 700, marginTop: 4 }}>{bekijk.klant}</div>
        {bekijk.voertuig && <div style={{ fontSize: 13.5, color: GRIJS, marginTop: 8 }}>{bekijk.voertuig}</div>}
        {bekijk.klacht && <div style={{ fontSize: 14, lineHeight: 1.45, background: GROEN_BG, color: GROEN, borderRadius: 10, padding: "12px 14px", marginTop: 10 }}><span style={{ fontWeight: 800 }}>Klacht: </span>{bekijk.klacht}</div>}
        {bekijkRetour && bekijkRetour.is && bekijkRetour.reden && <div style={{ fontSize: 13.5, lineHeight: 1.45, background: ROOD_BG, color: ROOD, borderRadius: 10, padding: "12px 14px", marginTop: 10 }}><span style={{ fontWeight: 800 }}>Reden retour: </span>{bekijkRetour.reden}</div>}
      </div>

      {bekijkLaden && <div style={{ ...kaart, color: GRIJS }}>Werkbon laden...</div>}

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
            const v = bekijkVoortgang.find((x) => x.stap === s.id);
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
        {bekijkRegels.length === 0 && <div style={{ fontSize: 13, color: GRIJS }}>Nog geen tijd geschreven.</div>}
        {bekijkRegels.map((r) => (
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

      {bekijkOpmerking.trim() && (
        <div style={kaart}>
          <div style={kopstijl}>Opmerkingen</div>
          <div style={{ fontSize: 13.5, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{bekijkOpmerking}</div>
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

      {bekijkFotos.length > 0 && (
        <div style={kaart}>
          <div style={kopstijl}>Foto's</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {bekijkFotos.map((f, idx) => (
              <img key={f.id} src={f.url} alt="" onClick={() => setLightbox({ fotos: bekijkFotos.map((x: any) => ({ url: x.url, rotatie: x.rotatie || 0 })), start: idx })} style={{ width: 84, height: 84, objectFit: "cover", borderRadius: 8, border: `1px solid ${RAND}`, display: "block", cursor: "pointer", transform: `rotate(${f.rotatie || 0}deg)` }} />
            ))}
          </div>
        </div>
      )}

      {bekijkLog.length > 0 && (
        <div style={kaart}>
          <div style={kopstijl}>Logboek (wie deed wat)</div>
          {bekijkLog.map((l, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "6px 0", borderTop: `1px solid ${RAND}` }}>
              <span style={{ fontSize: 12.5 }}>{l.monteur_naam || "Onbekend"} · {l.actie}{l.detail ? ` (${l.detail})` : ""}</span>
              <span style={{ fontSize: 12, color: GRIJS, whiteSpace: "nowrap" }}>{datumTijd(l.gedaan_op)}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ height: 20 }} />
      {lightbox && <Lightbox fotos={lightbox.fotos} start={lightbox.start} onClose={() => setLightbox(null)} />}
    </main>
  );
}
