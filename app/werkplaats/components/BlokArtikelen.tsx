"use client";

import { CSSProperties } from "react";
import type { Artikel } from "@/lib/types";
import { euro } from "@/lib/format";
import { GRIJS, RAND } from "@/lib/theme";

type Props = {
  artikelen: Artikel[];
  artikelenTotaal: number;
  updArtikel: (k: string, veld: "naam" | "bedrag", val: string) => void;
  onVerwijder: (k: string) => void;
  onToevoegen: () => void;
  kaart: CSSProperties;
  kopstijl: CSSProperties;
  inpG: CSSProperties;
  plus: CSSProperties;
};

export default function BlokArtikelen({ artikelen, artikelenTotaal, updArtikel, onVerwijder, onToevoegen, kaart, kopstijl, inpG, plus }: Props) {
  return (
    <div style={kaart}>
      <div style={kopstijl}>Extra artikelen</div>
      <div style={{ fontSize: 12, color: GRIJS, marginBottom: 10 }}>Onderdelen uit het schap, met bedrag. Vul alleen in wat je erbij pakt.</div>
      {artikelen.map((a) => (
        <div key={a.key} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
          {a.vast
            ? <div style={{ flex: 1, fontSize: 13.5, fontWeight: 600 }}>{a.naam}</div>
            : <input value={a.naam} onChange={(e) => updArtikel(a.key, "naam", e.target.value)} placeholder="artikel (bijv. slangklem, boutjes)" style={inpG} />}
          <div style={{ display: "flex", alignItems: "center", gap: 4, width: 110 }}>
            <span style={{ color: GRIJS, fontSize: 14 }}>€</span>
            <input inputMode="decimal" value={a.bedrag} onChange={(e) => updArtikel(a.key, "bedrag", e.target.value.replace(/[^0-9,.]/g, ""))} placeholder="0,00" style={{ ...inpG, textAlign: "right" }} />
          </div>
          {!a.vast && <button onClick={() => onVerwijder(a.key)} style={{ border: "none", background: "transparent", color: GRIJS, fontSize: 18, cursor: "pointer" }}>×</button>}
        </div>
      ))}
      <button style={plus} onClick={onToevoegen}>+ Extra artikel</button>
      {artikelenTotaal > 0 && (
        <div style={{ display: "flex", justifyContent: "space-between", borderTop: `1px solid ${RAND}`, marginTop: 10, paddingTop: 8, fontSize: 13.5 }}>
          <span style={{ fontWeight: 700 }}>Totaal extra</span>
          <span style={{ fontWeight: 700 }}>{euro(artikelenTotaal)}</span>
        </div>
      )}
    </div>
  );
}
