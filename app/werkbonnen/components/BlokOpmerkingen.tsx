"use client";

import { CSSProperties } from "react";

type Props = {
  opmerking: string;
  setOpmerking: (val: string) => void;
  kaart: CSSProperties;
  kopstijl: CSSProperties;
  inp: CSSProperties;
};

export default function BlokOpmerkingen({ opmerking, setOpmerking, kaart, kopstijl, inp }: Props) {
  return (
    <div style={kaart}>
      <div style={kopstijl}>Opmerkingen</div>
      <textarea value={opmerking} onChange={(e) => setOpmerking(e.target.value)} placeholder="Bijzonderheden over deze klus..." style={{ ...inp, minHeight: 80, resize: "vertical" }} />
    </div>
  );
}
