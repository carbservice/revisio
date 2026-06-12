"use client";

// Beschermt een pagina: vereist een ingelogde gebruiker die in app_gebruikers
// staat en actief is. Met requireAdmin alleen toegankelijk voor rol = admin.
// De kinderen worden pas gerenderd (en hun data dus pas opgehaald) zodra de
// toegang is goedgekeurd.

import { useEffect, useState, ReactNode, CSSProperties } from "react";
import { supabase } from "@/lib/supabase";
import { GROEN, GRIJS, RAND, BG, TEKST, ROOD, KAART_SCHADUW } from "@/lib/theme";

type Status = "laden" | "uit" | "geen-toegang" | "ok";

export default function AuthGate({ requireAdmin = false, children }: { requireAdmin?: boolean; children: ReactNode }) {
  const [status, setStatus] = useState<Status>("laden");
  const [naam, setNaam] = useState("");
  const [email, setEmail] = useState("");
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState("");
  const [verstuurd, setVerstuurd] = useState(false);
  const [code, setCode] = useState("");

  async function check(authEmail: string | undefined | null) {
    if (!authEmail) { setStatus("uit"); return; }
    const adres = authEmail.toLowerCase();
    const { data, error } = await supabase.from("app_gebruikers").select("naam, rol, actief, email").ilike("email", adres).limit(1);
    const g = data && data[0];
    const match = g && typeof g.email === "string" && g.email.toLowerCase() === adres;
    if (error || !match || !g!.actief) { await supabase.auth.signOut(); setStatus("uit"); return; }
    setNaam(g!.naam as string);
    if (requireAdmin && g!.rol !== "admin") { setStatus("geen-toegang"); return; }
    setStatus("ok");
  }

  useEffect(() => {
    let levend = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!levend) return;
      await check(data.session?.user?.email);
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => { check(session?.user?.email); });
    return () => { levend = false; sub.subscription.unsubscribe(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function inloggen() {
    const adres = email.trim();
    if (!adres) return;
    setBezig(true); setFout("");
    const { error } = await supabase.auth.signInWithOtp({ email: adres, options: { emailRedirectTo: window.location.href } });
    if (error) setFout("Inloglink versturen mislukt: " + error.message);
    else setVerstuurd(true);
    setBezig(false);
  }

  async function bevestigCode() {
    const c = code.replace(/\D/g, "");
    if (c.length < 6) return;
    setBezig(true); setFout("");
    const { error } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token: c, type: "email" });
    if (error) setFout("Code klopt niet of is verlopen. Vraag eventueel een nieuwe aan.");
    setBezig(false);
  }

  async function uitloggen() {
    await supabase.auth.signOut();
    setEmail(""); setCode(""); setVerstuurd(false); setStatus("uit");
  }

  if (status === "ok") return <>{children}</>;

  const wrap: CSSProperties = { minHeight: "100vh", background: BG, color: TEKST, fontFamily: "system-ui, -apple-system, sans-serif", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 };
  const kaart: CSSProperties = { background: "#fff", border: `1px solid ${RAND}`, borderRadius: 18, padding: 28, maxWidth: 380, width: "100%", boxShadow: KAART_SCHADUW };

  if (status === "laden") return <main style={wrap}><p style={{ color: GRIJS }}>Laden...</p></main>;

  if (status === "geen-toegang") return (
    <main style={wrap}>
      <div style={kaart}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", color: GROEN, marginBottom: 6 }}>Revisio · Dashboard</div>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: GROEN, margin: "0 0 10px" }}>Geen toegang</h1>
        <p style={{ fontSize: 14, lineHeight: 1.5, color: TEKST }}>Hoi {naam || "daar"}, dit onderdeel is alleen voor beheerders. Vraag een admin als je hier toegang voor nodig hebt.</p>
        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <a href="/werkbonnen" style={{ flex: 1, textAlign: "center", textDecoration: "none", background: GROEN, color: "#fff", borderRadius: 12, padding: "12px", fontSize: 14, fontWeight: 700 }}>Naar de werkbonnen</a>
          <button onClick={uitloggen} style={{ background: "#fff", color: GRIJS, border: `1px solid ${RAND}`, borderRadius: 12, padding: "12px 16px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Uitloggen</button>
        </div>
      </div>
    </main>
  );

  // status === "uit": niet ingelogd
  return (
    <main style={wrap}>
      <div style={kaart}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", color: GROEN, marginBottom: 4 }}>Revisio · Dashboard</div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: GROEN, margin: "6px 0 4px" }}>Inloggen</h1>
        {verstuurd ? (
          <>
            <p style={{ fontSize: 13.5, color: TEKST, lineHeight: 1.5, margin: "12px 0 14px" }}>We hebben een <span style={{ fontWeight: 700 }}>inlogcode</span> gestuurd naar <span style={{ fontWeight: 700 }}>{email.trim()}</span>. Typ de code hieronder in (of open op de computer de link in de mail).</p>
            <input inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 8))} onKeyDown={(e) => { if (e.key === "Enter") bevestigCode(); }} placeholder="00000000" style={{ width: "100%", boxSizing: "border-box", border: `1.5px solid ${RAND}`, borderRadius: 10, padding: "14px", fontSize: 22, letterSpacing: 8, textAlign: "center", marginBottom: 12 }} />
            {fout && <div style={{ fontSize: 13, color: ROOD, marginBottom: 12 }}>{fout}</div>}
            <button disabled={bezig || code.length < 6} onClick={bevestigCode} style={{ width: "100%", background: code.length >= 6 ? GROEN : "#b9c2bc", color: "#fff", border: "none", borderRadius: 12, padding: "15px", fontSize: 16, fontWeight: 700, cursor: code.length >= 6 ? "pointer" : "default", marginBottom: 10 }}>{bezig ? "Bezig..." : "Inloggen"}</button>
            <button onClick={() => { setVerstuurd(false); setCode(""); setFout(""); }} style={{ width: "100%", background: "#fff", color: GROEN, border: `1px solid ${RAND}`, borderRadius: 12, padding: "13px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Ander e-mailadres</button>
          </>
        ) : (
          <>
            <p style={{ fontSize: 13.5, color: GRIJS, margin: "8px 0 16px" }}>Alleen voor beheerders. Vul je e-mailadres in voor een inlogcode.</p>
            <input type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") inloggen(); }} placeholder="naam@bedrijf.nl" style={{ width: "100%", boxSizing: "border-box", border: `1.5px solid ${RAND}`, borderRadius: 10, padding: "14px", fontSize: 16, marginBottom: 12 }} />
            {fout && <div style={{ fontSize: 13, color: ROOD, marginBottom: 12 }}>{fout}</div>}
            <button disabled={bezig || !email.trim()} onClick={inloggen} style={{ width: "100%", background: email.trim() ? GROEN : "#b9c2bc", color: "#fff", border: "none", borderRadius: 12, padding: "15px", fontSize: 16, fontWeight: 700, cursor: email.trim() ? "pointer" : "default" }}>{bezig ? "Versturen..." : "Stuur inlogcode"}</button>
          </>
        )}
      </div>
    </main>
  );
}
