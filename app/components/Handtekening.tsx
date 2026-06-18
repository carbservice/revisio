"use client";

// Eenvoudige handtekening-pad op een canvas (muis + vinger). Geeft via onChange
// de getekende handtekening als PNG data-URL terug (of null als 'ie leeg is).

import { useEffect, useRef, useState } from "react";
import { GROEN, GRIJS, RAND } from "@/lib/theme";

export default function Handtekening({ onChange }: { onChange: (dataUrl: string | null) => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const tekent = useRef(false);
  const [leeg, setLeeg] = useState(true);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = c.getBoundingClientRect();
    c.width = Math.max(1, Math.round(rect.width * dpr));
    c.height = Math.max(1, Math.round(rect.height * dpr));
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.lineWidth = 2.2; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.strokeStyle = "#1a1a1a";
  }, []);

  function pos(e: React.PointerEvent) {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }
  function start(e: React.PointerEvent) {
    e.preventDefault();
    const ctx = canvasRef.current!.getContext("2d")!;
    const p = pos(e);
    ctx.beginPath(); ctx.moveTo(p.x, p.y);
    tekent.current = true;
    try { canvasRef.current!.setPointerCapture(e.pointerId); } catch { /* niet kritiek */ }
  }
  function move(e: React.PointerEvent) {
    if (!tekent.current) return;
    const ctx = canvasRef.current!.getContext("2d")!;
    const p = pos(e);
    ctx.lineTo(p.x, p.y); ctx.stroke();
  }
  function eind() {
    if (!tekent.current) return;
    tekent.current = false;
    setLeeg(false);
    onChange(canvasRef.current!.toDataURL("image/png"));
  }
  function wissen() {
    const c = canvasRef.current!;
    c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
    setLeeg(true);
    onChange(null);
  }

  return (
    <div>
      <canvas
        ref={canvasRef}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={eind}
        onPointerLeave={eind}
        style={{ width: "100%", height: 150, border: `1.5px dashed ${RAND}`, borderRadius: 10, background: "#fff", touchAction: "none", display: "block" }}
      />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
        <span style={{ fontSize: 12.5, color: GRIJS }}>{leeg ? "Teken hier je handtekening" : "Mooi, je handtekening staat"}</span>
        <button type="button" onClick={wissen} style={{ border: "none", background: "transparent", color: GROEN, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Wissen</button>
      </div>
    </div>
  );
}
