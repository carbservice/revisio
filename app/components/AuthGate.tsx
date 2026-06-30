"use client";

// Beschermt een pagina: vereist een ingelogde gebruiker die in app_gebruikers
// staat en actief is. Met requireAdmin alleen toegankelijk voor rol = admin.
// De kinderen worden pas gerenderd (en hun data dus pas opgehaald) zodra de
// toegang is goedgekeurd.

import { useEffect, useState, ReactNode, CSSProperties, createContext, useContext } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { GROEN, GRIJS, RAND, BG, TEKST, ROOD, KAART_SCHADUW } from "@/lib/theme";
import { useInactiviteitsUitlog, wisInactiviteit } from "@/app/components/useInactiviteit";

type Status = "laden" | "uit" | "geen-toegang" | "fout" | "ok" | "onbekend";

// Stelt de ingelogde gebruiker beschikbaar aan de beschermde pagina-inhoud.
// requireAdmin = alleen admin; requireBeheer = admin of manager.
const GebruikerContext = createContext<{ naam: string; isAdmin: boolean; isManager: boolean; uitloggen: () => void }>({ naam: "", isAdmin: false, isManager: false, uitloggen: () => {} });
export function useGebruiker() { return useContext(GebruikerContext); }

// Voor pagina's met een eigen login (zoals /werkbonnen): zo werkt useGebruiker()
// daar ook, en kloppen de rol-knoppen in de navigatiebalk.
export function GebruikerProvider({ naam, isAdmin, isManager, uitloggen, children }: { naam: string; isAdmin: boolean; isManager: boolean; uitloggen: () => void; children: ReactNode }) {
  return <GebruikerContext.Provider value={{ naam, isAdmin, isManager, uitloggen }}>{children}</GebruikerContext.Provider>;
}

export default function AuthGate({ requireAdmin = false, requireBeheer = false, children }: { requireAdmin?: boolean; requireBeheer?: boolean; children: ReactNode }) {
  const [status, setStatus] = useState<Status>("laden");
  const [naam, setNaam] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [isManager, setIsManager] = useState(false);
  const [email, setEmail] = useState("");
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState("");
  const [verstuurd, setVerstuurd] = useState(false);
  const [code, setCode] = useState("");
  const [foutAdres, setFoutAdres] = useState("");
  const router = useRouter();

  // Zoekt het personeelslid op. Een TIJDELIJKE leesfout (netwerk/lock) mag NOOIT
  // tot uitloggen leiden: dat was precies de glitch waarbij je na het intypen van
  // de code terugkaatste naar het loginscherm. Daarom een paar keer proberen, en
  // bij een blijvende fout de sessie laten staan (retry-scherm i.p.v. login).
  async function check(authEmail: string | undefined | null) {
    if (!authEmail) { setStatus("uit"); return; }
    const adres = authEmail.trim().toLowerCase();
    let g: { naam: string; rol: string; actief: boolean; email: string } | null = null;
    let leesFout = true;
    for (let poging = 0; poging < 3; poging++) {
      const { data, error } = await supabase.from("app_gebruikers").select("naam, rol, actief, email").ilike("email", adres).limit(1);
      if (!error) { g = (data && data[0]) || null; leesFout = false; break; }
      await new Promise((r) => setTimeout(r, 400 * (poging + 1)));
    }
    if (leesFout) { setStatus("fout"); return; }
    const match = g && typeof g.email === "string" && g.email.trim().toLowerCase() === adres;
    // Ingelogd, maar dit adres staat niet in app_gebruikers. Vroeger kaatsten we
    // dan stil terug naar het loginscherm ("code werkt niet"-gevoel); nu tonen we
    // duidelijk WELK adres geen toegang heeft, zodat je het juiste adres pakt.
    if (!match) { setFoutAdres(adres); await supabase.auth.signOut(); setStatus("onbekend"); return; }
    if (!g!.actief) { setStatus("geen-toegang"); return; }
    const adm = g!.rol === "admin";
    const man = g!.rol === "manager";
    setNaam(g!.naam);
    setIsAdmin(adm);
    setIsManager(man);
    if (requireAdmin && !adm) { setStatus("geen-toegang"); return; }
    if (requireBeheer && !adm && !man) { setStatus("geen-toegang"); return; }
    setStatus("ok");
  }

  // Handmatig opnieuw proberen na een leesfout (de sessie is nog geldig).
  async function herproberen() {
    setStatus("laden");
    const { data } = await supabase.auth.getSession();
    check(data.session?.user?.email);
  }

  useEffect(() => {
    let levend = true;
    // Bij het laden de bestaande sessie ophalen. BELANGRIJK voor de magic link:
    // die landt op /start met de sessie in de URL (#access_token / ?code), wat
    // supabase-js async verwerkt. Tonen we dan meteen "uitgelogd", dan kaats je
    // terug naar login terwijl je net inlogt. Daarom: alleen het loginscherm
    // tonen als er GEEN sessie is EN er GEEN auth-token in de URL staat; anders
    // wachten tot onAuthStateChange (SIGNED_IN) binnenkomt.
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!levend) return;
      if (data.session?.user?.email) { check(data.session.user.email); return; }
      const urlHeeftAuth = /[#&?](access_token|code|error|token_hash)=/.test(window.location.href);
      if (!urlHeeftAuth) check(null);
    })();
    // Geen supabase-call awaiten BINNEN deze callback (auth-lock-deadlock);
    // daarom check() in een setTimeout, buiten de callback om.
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      const email = session?.user?.email;
      setTimeout(() => { if (levend) check(email); }, 0);
    });
    return () => { levend = false; sub.subscription.unsubscribe(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Automatisch uitloggen na 2 uur inactiviteit zodra je bent ingelogd.
  useInactiviteitsUitlog(status === "ok", uitloggen);

  async function inloggen() {
    const adres = email.trim();
    if (!adres) return;
    setBezig(true); setFout("");
    // Magic link landt op de startpagina, net als de code-login.
    const { error } = await supabase.auth.signInWithOtp({ email: adres, options: { emailRedirectTo: `${window.location.origin}/start` } });
    if (error) setFout("Inloglink versturen mislukt: " + error.message);
    else setVerstuurd(true);
    setBezig(false);
  }

  async function bevestigCode() {
    const c = code.replace(/\D/g, "");
    if (c.length < 6) return;
    setBezig(true); setFout("");
    const { error } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token: c, type: "email" });
    if (error) { setFout("Code klopt niet of is verlopen. Vraag eventueel een nieuwe aan."); setBezig(false); return; }
    setBezig(false);
    router.push("/start"); // elke login komt op de startpagina uit
  }

  async function uitloggen() {
    wisInactiviteit();
    await supabase.auth.signOut();
    setEmail(""); setCode(""); setVerstuurd(false); setStatus("uit");
  }

  if (status === "ok") return <GebruikerContext.Provider value={{ naam, isAdmin, isManager, uitloggen }}>{children}</GebruikerContext.Provider>;

  const wrap: CSSProperties = { minHeight: "100vh", background: BG, color: TEKST, fontFamily: "'Karma', Georgia, serif", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 };
  const kaart: CSSProperties = { background: "#fff", border: `1px solid ${RAND}`, borderRadius: 18, padding: 28, maxWidth: 380, width: "100%", boxShadow: KAART_SCHADUW };

  if (status === "laden") return <main style={wrap}><p style={{ color: GRIJS }}>Laden...</p></main>;

  if (status === "fout") return (
    <main style={wrap}>
      <div style={kaart}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", color: GROEN, marginBottom: 6 }}>Revisio · Dashboard</div>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: GROEN, margin: "0 0 10px" }}>Even geen verbinding</h1>
        <p style={{ fontSize: 14, lineHeight: 1.5, color: TEKST }}>Je bent nog ingelogd, maar we konden je gegevens even niet ophalen. Probeer het opnieuw, je hoeft niet opnieuw in te loggen.</p>
        <button onClick={herproberen} style={{ width: "100%", marginTop: 16, background: GROEN, color: "#fff", border: "none", borderRadius: 12, padding: "13px", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>Opnieuw proberen</button>
      </div>
    </main>
  );

  if (status === "onbekend") return (
    <main style={wrap}>
      <div style={kaart}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", color: GROEN, marginBottom: 6 }}>Revisio · Dashboard</div>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: GROEN, margin: "0 0 10px" }}>Dit adres heeft geen toegang</h1>
        <p style={{ fontSize: 14, lineHeight: 1.5, color: TEKST }}>Je inlogcode klopte, maar <b>{foutAdres}</b> staat niet in het systeem. Log in met het e-mailadres dat voor jou is aangemaakt, of vraag een admin om dit adres toe te voegen.</p>
        <button onClick={() => { setEmail(""); setCode(""); setVerstuurd(false); setFout(""); setFoutAdres(""); setStatus("uit"); }} style={{ width: "100%", marginTop: 16, background: GROEN, color: "#fff", border: "none", borderRadius: 12, padding: "13px", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>Ander e-mailadres proberen</button>
      </div>
    </main>
  );

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
