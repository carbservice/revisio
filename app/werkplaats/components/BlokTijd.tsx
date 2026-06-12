"use client";

import { CSSProperties } from "react";
import type { Monteur, Regel } from "@/lib/types";
import { GOUD, GRIJS, RAND } from "@/lib/theme";
import { duur, datumStempel, datumTijd } from "@/lib/format";

type Props = {
  handMin: string;
  setHandMin: (val: string) => void;
  notitie: string;
  setNotitie: (val: string) => void;
  monteur: Monteur | null;
  handmatig: () => void;
  totaal: number;
  regels: Regel[];
  verwijder: (id: string) => void;
  klusStart: { naam: string; tijd: string } | null;
  kaart: CSSProperties;
  kopstijl: CSSProperties;
  inp: CSSProperties;
};

export default function BlokTijd({ handMin, setHandMin, notitie, setNotitie, monteur, handmatig, totaal, regels, verwijder, klusStart, kaart, kopstijl, inp }: Props) {
  return (
    <div style={kaart}>
      <div style={kopstijl}>Tijd</div>
      <div style={{ display: "flex", gap: 8 }}>
        <input inputMode="numeric" value={handMin} onChange={(e) => setHandMin(e.target.value.replace(/\D/g, ""))} placeholder="minuten" style={{ ...inp, maxWidth: 100 }} />
        <input value={notitie} onChange={(e) => setNotitie(e.target.value)} placeholder="notitie" style={inp} />
        <button disabled={!monteur} onClick={handmatig} style={{ border: "none", background: monteur ? GOUD : "#cdbe8a", color: "#fff", borderRadius: 10, padding: "0 16px", fontWeight: 700, cursor: "pointer" }}>+</button>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", margin: "12px 0 4px" }}>
        <span style={{ fontSize: 13, color: GRIJS, fontWeight: 600 }}>Geschreven tijd</span>
        <span style={{ fontWeight: 700 }}>Totaal {duur(totaal)}</span>
      </div>
      {regels.map((r) => (
        <div key={r.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, padding: "7px 0", borderTop: `1px solid ${RAND}` }}>
          <div><div style={{ fontSize: 14, fontWeight: 600 }}>{r.monteur_naam} · {duur(r.minuten)}</div>{r.aangemaakt_op && <div style={{ fontSize: 11, color: GRIJS, marginTop: 1 }}>{datumStempel(r.aangemaakt_op)}</div>}{r.notitie && <div style={{ fontSize: 12.5, color: GRIJS, marginTop: 1 }}>{r.notitie}</div>}</div>
          <button onClick={() => verwijder(r.id)} style={{ border: "none", background: "transparent", color: GRIJS, fontSize: 18, cursor: "pointer", padding: "0 6px" }}>×</button>
        </div>
      ))}
      {klusStart && (
        <div style={{ fontSize: 12, color: GRIJS, marginTop: 10, borderTop: `1px solid ${RAND}`, paddingTop: 8 }}>
          Gestart door {klusStart.naam}, {datumTijd(klusStart.tijd)}
        </div>
      )}
    </div>
  );
}
