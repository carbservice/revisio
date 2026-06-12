"use client";

import { CSSProperties } from "react";
import type { Check } from "@/lib/types";
import { GROEN, ROOD, GRIJS, RAND } from "@/lib/theme";

type Props = {
  checklist: Check[];
  updCheck: (k: string, veld: "naam" | "status" | "notitie", val: string) => void;
  onVerwijder: (k: string) => void;
  onToevoegen: () => void;
  kaart: CSSProperties;
  kopstijl: CSSProperties;
  inpG: CSSProperties;
  plus: CSSProperties;
  toggle: (a: boolean, kleur: string) => CSSProperties;
};

export default function BlokEindcontrole({ checklist, updCheck, onVerwijder, onToevoegen, kaart, kopstijl, inpG, plus, toggle }: Props) {
  return (
    <div style={kaart}>
      <div style={kopstijl}>Eindcontrole</div>
      {checklist.map((c) => (
        <div key={c.key} style={{ padding: "9px 0", borderTop: `1px solid ${RAND}` }}>
          {c.vast
            ? <div style={{ fontSize: 13.5, fontWeight: 600 }}>{c.naam}</div>
            : <div style={{ display: "flex", gap: 6 }}><input value={c.naam} onChange={(e) => updCheck(c.key, "naam", e.target.value)} placeholder="eigen controlepunt" style={inpG} /><button onClick={() => onVerwijder(c.key)} style={{ border: "none", background: "transparent", color: GRIJS, fontSize: 18, cursor: "pointer" }}>×</button></div>}
          <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
            <button onClick={() => updCheck(c.key, "status", c.status === "goed" ? "" : "goed")} style={toggle(c.status === "goed", GROEN)}>Goed</button>
            <button onClick={() => updCheck(c.key, "status", c.status === "afgekeurd" ? "" : "afgekeurd")} style={toggle(c.status === "afgekeurd", ROOD)}>Afgekeurd</button>
          </div>
          {c.status === "afgekeurd" && <input value={c.notitie} onChange={(e) => updCheck(c.key, "notitie", e.target.value)} placeholder="wat is er mis?" style={{ ...inpG, marginTop: 6 }} />}
        </div>
      ))}
      <button style={{ ...plus, marginTop: 10 }} onClick={onToevoegen}>+ Eigen controlepunt</button>
    </div>
  );
}
