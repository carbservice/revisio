"use client";

// Foto-lightbox: opent een foto groot in een donkere laag over de pagina.
// Eén keer op de achtergrond tikken (of het kruisje / Escape) sluit het.
// Bladeren met pijlen, pijltjestoetsen of vegen blijft BINNEN de meegegeven
// set foto's (bijv. één revisiestadium) en gaat dus niet vanzelf verder.

import { useEffect, useState, CSSProperties } from "react";

// Een foto is een URL, of een object met een draaihoek (0/90/180/270).
// De afbeelding zelf wordt nooit aangepast; we draaien alleen in beeld.
type Foto = string | { url: string; rotatie?: number };
function normFoto(f: Foto): { url: string; rotatie: number } {
  return typeof f === "string" ? { url: f, rotatie: 0 } : { url: f.url, rotatie: ((f.rotatie || 0) % 360 + 360) % 360 };
}

export default function Lightbox({ fotos, start, onClose }: { fotos: Foto[]; start: number; onClose: () => void }) {
  const [i, setI] = useState(start);
  const [touchX, setTouchX] = useState<number | null>(null);

  useEffect(() => { setI(start); }, [start, fotos]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") setI((x) => Math.min(fotos.length - 1, x + 1));
      else if (e.key === "ArrowLeft") setI((x) => Math.max(0, x - 1));
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [fotos.length, onClose]);

  if (!fotos.length || i < 0 || i >= fotos.length) return null;

  const naar = (d: number) => setI((x) => Math.max(0, Math.min(fotos.length - 1, x + d)));
  const pijl = (kant: "left" | "right"): CSSProperties => ({
    position: "absolute", top: "50%", transform: "translateY(-50%)", [kant]: 12,
    width: 48, height: 48, borderRadius: "50%", border: "none", background: "rgba(255,255,255,0.16)",
    color: "#fff", fontSize: 28, lineHeight: 1, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
  });

  return (
    <div
      onClick={onClose}
      onTouchStart={(e) => setTouchX(e.touches[0].clientX)}
      onTouchEnd={(e) => { if (touchX != null) { const dx = e.changedTouches[0].clientX - touchX; if (Math.abs(dx) > 45) naar(dx < 0 ? 1 : -1); setTouchX(null); } }}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", zIndex: 400, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
    >
      <button onClick={onClose} aria-label="Sluiten" style={{ position: "absolute", top: 14, right: 16, width: 46, height: 46, borderRadius: "50%", border: "none", background: "rgba(255,255,255,0.16)", color: "#fff", fontSize: 26, cursor: "pointer" }}>×</button>

      {i > 0 && <button onClick={(e) => { e.stopPropagation(); naar(-1); }} aria-label="Vorige" style={pijl("left")}>‹</button>}
      {(() => {
        const f = normFoto(fotos[i]);
        const draai = f.rotatie === 90 || f.rotatie === 270; // afmetingen wisselen
        return <img onClick={(e) => e.stopPropagation()} src={f.url} alt="" style={{ maxWidth: draai ? "84vh" : "94vw", maxHeight: draai ? "94vw" : "84vh", objectFit: "contain", borderRadius: 8, transform: `rotate(${f.rotatie}deg)` }} />;
      })()}
      {i < fotos.length - 1 && <button onClick={(e) => { e.stopPropagation(); naar(1); }} aria-label="Volgende" style={pijl("right")}>›</button>}

      {fotos.length > 1 && (
        <div style={{ position: "absolute", bottom: 18, left: 0, right: 0, textAlign: "center", color: "rgba(255,255,255,0.85)", fontSize: 14, fontFamily: "'Karma', Georgia, serif" }}>{i + 1} / {fotos.length}</div>
      )}
    </div>
  );
}
