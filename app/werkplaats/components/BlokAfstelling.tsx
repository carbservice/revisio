"use client";

import { CSSProperties } from "react";
import type { Veld } from "@/lib/types";
import { GRIJS, RAND } from "@/lib/theme";

type VeldTypeCfg = { type: string; label: string; eenheid: string; categorie: string; opties?: string[] };
type Sectie = { titel: string; cat: string };

type Props = {
  velden: Veld[];
  updVeld: (k: string, veld: "label" | "binnenkomst" | "afleveren", val: string) => void;
  verwijderVeld: (k: string) => void;
  voegVeldToe: (veld_type: string, label: string, eenheid: string) => void;
  SECTIES: Sectie[];
  VELD_TYPES: VeldTypeCfg[];
  EIGEN: Record<string, string>;
  cfgVan: (t: string) => VeldTypeCfg | undefined;
  statusKleur: (o: string) => string;
  kaart: CSSProperties;
  kopstijl: CSSProperties;
  inpG: CSSProperties;
  plus: CSSProperties;
  toggle: (a: boolean, kleur: string) => CSSProperties;
};

export default function BlokAfstelling({ velden, updVeld, verwijderVeld, voegVeldToe, SECTIES, VELD_TYPES, EIGEN, cfgVan, statusKleur, kaart, kopstijl, inpG, plus, toggle }: Props) {
  function veldRij(v: Veld) {
    const isEigen = v.veld_type.startsWith("eigen");
    const opties = cfgVan(v.veld_type)?.opties;
    return (
      <div key={v.key} style={{ marginBottom: 9 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          {isEigen
            ? <input value={v.label} onChange={(e) => updVeld(v.key, "label", e.target.value)} placeholder="naam veld" style={{ ...inpG, fontWeight: 600 }} />
            : <div style={{ fontSize: 13.5, fontWeight: 600 }}>{v.positie > 1 ? `${v.label} ${v.positie}` : v.label}{v.eenheid ? ` (${v.eenheid})` : ""}</div>}
          {(isEigen || v.positie > 1) && <button onClick={() => verwijderVeld(v.key)} style={{ border: "none", background: "transparent", color: GRIJS, fontSize: 18, cursor: "pointer", padding: "0 6px" }}>×</button>}
        </div>
        {opties
          ? <div style={{ display: "flex", gap: 8 }}>
              {opties.map((o) => (
                <button key={o} onClick={() => updVeld(v.key, "binnenkomst", v.binnenkomst === o ? "" : o)} style={toggle(v.binnenkomst === o, statusKleur(o))}>{o}</button>
              ))}
            </div>
          : <div style={{ display: "flex", gap: 8 }}>
              <input value={v.binnenkomst} onChange={(e) => updVeld(v.key, "binnenkomst", e.target.value)} placeholder="binnenkomst" style={inpG} />
              <input value={v.afleveren} onChange={(e) => updVeld(v.key, "afleveren", e.target.value)} placeholder="afleveren" style={inpG} />
            </div>}
      </div>
    );
  }

  return (
    <>
      {SECTIES.map((sec) => (
        <div key={sec.cat} style={kaart}>
          <div style={kopstijl}>{sec.titel}</div>
          {VELD_TYPES.filter((c) => c.categorie === sec.cat).map((c) => {
            const vs = velden.filter((v) => v.veld_type === c.type).sort((a, b) => a.positie - b.positie);
            return (
              <div key={c.type} style={{ marginBottom: 8 }}>
                {vs.map(veldRij)}
                <button style={plus} onClick={() => voegVeldToe(c.type, c.label, c.eenheid)}>+ {c.label}</button>
              </div>
            );
          })}
          {(() => {
            const et = EIGEN[sec.cat];
            const eigen = velden.filter((v) => v.veld_type === et).sort((a, b) => a.positie - b.positie);
            return (
              <div style={{ marginTop: 6, borderTop: `1px solid ${RAND}`, paddingTop: 8 }}>
                {eigen.map(veldRij)}
                <button style={plus} onClick={() => voegVeldToe(et, "", "")}>+ Extra veld</button>
              </div>
            );
          })()}
        </div>
      ))}
    </>
  );
}
