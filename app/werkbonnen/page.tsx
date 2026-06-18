"use client";

// Revisio werkbonnen (monteur-app). app/werkbonnen/page.tsx

import { useEffect, useState, useRef, CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { GROEN, GROEN_BG, GOUD, GOUD_BG, ROOD, ROOD_BG, TEKST, GRIJS, RAND, BG, KAART_BG, VELD_BG, VELD_TEKST, VELD_RAND, KAART_SCHADUW } from "@/lib/theme";
import { duur, mmss, dagenGeleden } from "@/lib/format";
import type { Klus, Monteur, Regel, Veld, Check, Artikel } from "@/lib/types";
import ScrollNaarBoven from "@/app/components/ScrollNaarBoven";
import PaginaKop from "@/app/components/PaginaKop";
import LaadScherm from "@/app/components/LaadScherm";
import Lightbox from "@/app/components/Lightbox";
import { useInactiviteitsUitlog, wisInactiviteit } from "@/app/components/useInactiviteit";
import BlokOpmerkingen from "./components/BlokOpmerkingen";
import BlokArtikelen from "./components/BlokArtikelen";
import BlokEindcontrole from "./components/BlokEindcontrole";
import BlokTijd from "./components/BlokTijd";
import BlokAfstelling from "./components/BlokAfstelling";
import WerkbonBekijk from "./components/WerkbonBekijk";

const VELD_TYPES: { type: string; label: string; eenheid: string; categorie: string; opties?: string[] }[] = [
  { type: "vlotterhoogte",        label: "Vlotterhoogte",               eenheid: "mm",           categorie: "afstelling" },
  { type: "gasnaald_positie",     label: "Gasnaald positie",            eenheid: "",             categorie: "afstelling" },
  { type: "luchtschroef",         label: "Luchtschroef (enkel lucht)",  eenheid: "halve slagen", categorie: "afstelling" },
  { type: "co_schroef",           label: "CO schroef (mengselschroef)", eenheid: "",             categorie: "afstelling" },
  { type: "stationairschroef",    label: "Stationairschroef",           eenheid: "",             categorie: "afstelling" },
  { type: "vlotter",              label: "Vlotter",                     eenheid: "",             categorie: "afstelling", opties: ["Goed", "Slecht", "Lek"] },
  { type: "hoofdsproeier",        label: "Hoofdsproeier",               eenheid: "",             categorie: "sproeier" },
  { type: "stationairsproeier",   label: "Stationairsproeier",          eenheid: "",             categorie: "sproeier" },
  { type: "luchtremsproeier",     label: "Luchtremsproeier",            eenheid: "",             categorie: "sproeier" },
  { type: "choke_sproeier",       label: "Choke sproeier",              eenheid: "",             categorie: "sproeier" },
  { type: "gasnaald_codering",    label: "Gasnaald codering",           eenheid: "",             categorie: "sproeier" },
  { type: "emulsiebuis_codering", label: "Emulsiebuis codering",        eenheid: "",             categorie: "sproeier" },
  { type: "sproeierbuis_codering",label: "Sproeierbuis codering",       eenheid: "",             categorie: "sproeier" },
  { type: "vlotterzitting_maat",  label: "Vlotterzitting maat",         eenheid: "",             categorie: "sproeier" },
];
const SECTIES = [
  { titel: "Afstelling", cat: "afstelling" },
  { titel: "Sproeierbezetting", cat: "sproeier" },
];
const EIGEN: Record<string, string> = { afstelling: "eigen_afstelling", sproeier: "eigen_sproeier" };
const STANDAARD_ARTIKELEN = ["Vacuumleiding", "Benzineleiding", "Membraandoek", "Klemmen"];
const CHECKLIST_DEFAULT = [
  "CO schroef open?",
  "Stationair schroef correct?",
  "Pakking, vlotterbak schroefjes vast?",
  "Werkt de gasschuif of membraan correct?",
  "Armpjes, gaskleppen, chokehendels gangbaar?",
  "Zittingen pakkingen goed?",
  "Blaastest, vlotternaald oke?",
  "Bank synchronisatie, gaskleppen op nulpunt?",
];
const STADIA = [
  { id: "ontvangen", kort: "Ontvangst", pct: 20, label: "Ontvangen op de werkbank",
    klant: "We hebben je carburateur goed ontvangen en op de werkbank gelegd.",
    coaching: "Leg de carburateur of de doos op een schone, egale ondergrond met goed licht. Maak een foto zoals je hem binnen hebt gekregen. Zodra je dit op gedaan zet, geldt de klus als binnen en begint de plank-teller te lopen.",
    foto: true, notitie: false, eindcontrole: false },
  { id: "gestart", kort: "Demontage", pct: 40, label: "Revisie gestart",
    klant: "We zijn begonnen aan je revisie.",
    coaching: "Leg de gedemonteerde onderdelen overzichtelijk op de werkbank, schone achtergrond. Maak een of twee foto's.",
    foto: true, notitie: false, eindcontrole: false },
  { id: "voor_ultrasoon", kort: "Ultrasoonreiniging", pct: 60, label: "Voor ultrasoon reiniging",
    klant: "De onderdelen gaan de ultrasoon reiniging in.",
    coaching: "Maak een foto van de vuile onderdelen vlak voordat ze de ultrasoon in gaan. Mooi vergelijkmateriaal voor straks.",
    foto: true, notitie: false, eindcontrole: false },
  { id: "na_ultrasoon", kort: "Heropbouwen", pct: 80, label: "Gereinigd en opnieuw opbouwen",
    klant: "Alles is gereinigd en we bouwen je carburateur weer netjes op.",
    coaching: "Maak een foto van de schone onderdelen en de opbouw. Laat het verschil met de vorige foto goed zien.",
    foto: true, notitie: false, eindcontrole: false },
  { id: "schoon", kort: "Eindcontrole", pct: 100, label: "Schoon, eindfoto met afstrepen",
    klant: "Je revisie is klaar, afgesteld en gecontroleerd.",
    coaching: "Strijk de schroeven en stelpunten af met de gele stift. Maak de eindfoto van de schone, afgestreepte carburateur op een nette achtergrond. Hiermee is de klus klaar.",
    foto: true, notitie: false, eindcontrole: true },
];

let _k = 0;
const key = () => `v${_k++}`;
const cfgVan = (t: string) => VELD_TYPES.find((x) => x.type === t);
const catVan = (t: string) => cfgVan(t)?.categorie || (t === "eigen_sproeier" ? "sproeier" : "afstelling");
function statusKleur(o: string) { return o === "Goed" ? GROEN : o === "Slecht" ? GOUD : ROOD; }
// Korte klantcode, zonder verwarrende tekens (geen 0/O/1/I/L/S/5/B/8/2/Z).
const CODE_ALFA = "ACDEFGHJKMNPQRTUVWXY3467";
function maakCode() { let s = ""; for (let i = 0; i < 5; i++) s += CODE_ALFA[Math.floor(Math.random() * CODE_ALFA.length)]; return s; }
function standaardVelden(): Veld[] {
  return VELD_TYPES.map((d) => ({ key: key(), veld_type: d.type, label: d.label, eenheid: d.eenheid, positie: 1, binnenkomst: "", afleveren: "" }));
}
function standaardChecklist(): Check[] {
  return CHECKLIST_DEFAULT.map((n) => ({ key: key(), naam: n, status: "", notitie: "", vast: true }));
}
function standaardArtikelen(): Artikel[] {
  return STANDAARD_ARTIKELEN.map((n) => ({ key: key(), naam: n, bedrag: "", vast: true }));
}
function uitMetingen(rows: any[]): Veld[] {
  const velden = standaardVelden();
  rows.forEach((r) => {
    const label = r.label || cfgVan(r.veld_type)?.label || r.veld_type;
    let i = velden.findIndex((v) => v.veld_type === r.veld_type && v.positie === r.positie && v.label === label);
    if (i === -1) {
      velden.push({ key: key(), veld_type: r.veld_type, label, eenheid: r.eenheid || "", positie: r.positie, binnenkomst: "", afleveren: "" });
      i = velden.length - 1;
    }
    if (r.moment === "afleveren") velden[i].afleveren = r.waarde || "";
    else velden[i].binnenkomst = r.waarde || "";
  });
  return velden;
}
function uitChecklist(rows: any[]): Check[] {
  const lijst = standaardChecklist();
  rows.forEach((r) => {
    let i = lijst.findIndex((c) => c.naam === r.check_naam);
    if (i === -1) lijst.push({ key: key(), naam: r.check_naam, status: r.status || "", notitie: r.notitie || "", vast: false });
    else { lijst[i].status = r.status || ""; lijst[i].notitie = r.notitie || ""; }
  });
  return lijst;
}
function uitArtikelen(rows: any[]): Artikel[] {
  const lijst = standaardArtikelen();
  rows.forEach((r) => {
    const bedrag = r.bedrag != null ? String(r.bedrag).replace(".", ",") : "";
    let i = lijst.findIndex((a) => a.vast && a.naam === r.naam);
    if (i === -1) lijst.push({ key: key(), naam: r.naam, bedrag, vast: false });
    else lijst[i].bedrag = bedrag;
  });
  return lijst;
}
function bedragNum(s: string) {
  const n = parseFloat((s || "").replace(",", ".").replace(/[^0-9.]/g, ""));
  return isNaN(n) ? 0 : n;
}

function WerkplaatsApp({ ingelogd, isAdmin, onUitloggen }: { ingelogd: Monteur; isAdmin: boolean; onUitloggen: () => void }) {
  const [monteur, setMonteur] = useState<Monteur | null>(ingelogd);
  const [klussen, setKlussen] = useState<Klus[]>([]);
  const [totalen, setTotalen] = useState<Record<string, number>>({});
  const [lopendeKlussen, setLopendeKlussen] = useState<Set<string>>(new Set());
  const [lopendStart, setLopendStart] = useState<Record<string, number>>({});
  const [ontvangst, setOntvangst] = useState<Record<string, string>>({});
  const [zoek, setZoek] = useState("");
  const [open, setOpen] = useState<Klus | null>(null);
  const [popup, setPopup] = useState(false);
  const [timerPopup, setTimerPopup] = useState(false);
  const [regels, setRegels] = useState<Regel[]>([]);
  const [lopendId, setLopendId] = useState<string | null>(null);
  const [start, setStart] = useState<number | null>(null);
  const [nu, setNu] = useState<number>(Date.now());
  const [limiet, setLimiet] = useState("");
  const [handMin, setHandMin] = useState("");
  const [notitie, setNotitie] = useState("");
  const [velden, setVelden] = useState<Veld[]>(standaardVelden());
  const [checklist, setChecklist] = useState<Check[]>(standaardChecklist());
  const [artikelen, setArtikelen] = useState<Artikel[]>(standaardArtikelen());
  const [opmerking, setOpmerking] = useState("");
  const [retour, setRetour] = useState(false);
  const [retourReden, setRetourReden] = useState("");
  const [bezig, setBezig] = useState(false);
  const [opgeslagen, setOpgeslagen] = useState(false);
  const [autoMelding, setAutoMelding] = useState("");
  const [laden, setLaden] = useState(true);
  const [fout, setFout] = useState("");
  const [diagBezig, setDiagBezig] = useState(false);
  const [diagnoseLijst, setDiagnoseLijst] = useState<{ oorzaak: string; controleren: string }[]>([]);
  const [diagTekst, setDiagTekst] = useState("");
  const [diagFout, setDiagFout] = useState("");
  const [voortgang, setVoortgang] = useState<any[]>([]);
  const [fotos, setFotos] = useState<any[]>([]);
  const [stapPopup, setStapPopup] = useState<string | null>(null);
  const [stapNotitie, setStapNotitie] = useState("");
  const [fotoMelding, setFotoMelding] = useState("");
  const [bulkBezig, setBulkBezig] = useState(false);
  const [bulkProg, setBulkProg] = useState<{ done: number; totaal: number } | null>(null);
  const [bulkResultaat, setBulkResultaat] = useState<{ gelukt: number; mislukt: number } | null>(null);
  const [linkGekopieerd, setLinkGekopieerd] = useState(false);
  const internInputRef = useRef<HTMLInputElement | null>(null);
  const [deelLink, setDeelLink] = useState("");
  const [gekopieerd, setGekopieerd] = useState(false);
  const [carburateur, setCarburateur] = useState(1); // welke carburateur van de offerte (technische werkbon)
  const [klusLinkKop, setKlusLinkKop] = useState(false); // "Kopieer link"-bevestiging
  const deepLinkGedaan = useRef(false); // deep-link uit de URL maar één keer openen
  const [deelCode, setDeelCode] = useState("");
  const [gedeeld, setGedeeld] = useState(false);
  const [lightbox, setLightbox] = useState<{ fotos: { url: string; rotatie: number }[]; start: number } | null>(null);
  const [vulPct, setVulPct] = useState(0);
  const [rijdt, setRijdt] = useState(false);
  const huidigPctRef = useRef(0);
  const rijdtRef = useRef(false);
  const rafRef = useRef(0);
  const voortgangRef = useRef<HTMLDivElement | null>(null);
  const [klusStart, setKlusStart] = useState<{ naam: string; tijd: string } | null>(null);

  // Alleen-lezen weergave
  const [bekijk, setBekijk] = useState<Klus | null>(null);
  const [bekijkVelden, setBekijkVelden] = useState<Veld[]>([]);
  const [bekijkChecklist, setBekijkChecklist] = useState<Check[]>([]);
  const [bekijkArtikelen, setBekijkArtikelen] = useState<Artikel[]>([]);
  const [bekijkOpmerking, setBekijkOpmerking] = useState("");
  const [bekijkRetour, setBekijkRetour] = useState<{ is: boolean; reden: string } | null>(null);
  const [bekijkVoortgang, setBekijkVoortgang] = useState<any[]>([]);
  const [bekijkFotos, setBekijkFotos] = useState<any[]>([]);
  const [bekijkRegels, setBekijkRegels] = useState<Regel[]>([]);
  const [bekijkLog, setBekijkLog] = useState<any[]>([]);
  const [bekijkLaden, setBekijkLaden] = useState(false);

  const autoTimer = useRef<any>(null);
  const eersteLaad = useRef(true);

  // log helper, faalt stil zodat het nooit een actie blokkeert
  async function log(klusId: string, actie: string, detail?: string) {
    try {
      await supabase.from("werkbon_log").insert({ klus_id: klusId, monteur_naam: monteur?.naam || null, actie, detail: detail || null });
    } catch {}
  }

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/klussen").then((x) => x.json());
        if (r.fout) setFout(r.fout);
        setKlussen(r.klussen || []);
        await laadTotalen();
        await laadOntvangst();
      } catch (e) { setFout(String(e)); }
      finally { setLaden(false); }
    })();
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNu(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Deep-link: open automatisch de klus uit ?klus=<id> in de URL (zodra de
  // klussen geladen zijn). Zo kun je een klus doorsturen naar een collega.
  useEffect(() => {
    if (deepLinkGedaan.current || !klussen.length || typeof window === "undefined") return;
    const id = new URLSearchParams(window.location.search).get("klus");
    deepLinkGedaan.current = true;
    if (id) {
      const k = klussen.find((x) => x.id === id);
      if (k) openKlus(k);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [klussen]);

  useEffect(() => {
    if (start == null) return;
    let klaar = false;
    const t = setInterval(() => {
      const n = Date.now();
      if (klaar) return;
      const grens = new Date(start); grens.setHours(17, 30, 0, 0);
      const g = grens.getTime();
      if (start < g && n >= g) { klaar = true; autoStop(g); }
    }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start, lopendId]);

  // Autosave: een paar seconden na de laatste wijziging stil opslaan
  useEffect(() => {
    if (!open) return;
    if (eersteLaad.current) { eersteLaad.current = false; return; }
    if (autoTimer.current) clearTimeout(autoTimer.current);
    autoTimer.current = setTimeout(() => { bewaarWerkbon(true); }, 2500);
    return () => { if (autoTimer.current) clearTimeout(autoTimer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [velden, checklist, artikelen, opmerking, retour, retourReden]);

  async function laadTotalen() {
    const { data } = await supabase.from("tijdregels").select("klus_id, minuten, start_tijd");
    const map: Record<string, number> = {};
    const lopend = new Set<string>();
    const starts: Record<string, number> = {};
    (data || []).forEach((r: any) => {
      if (r.minuten == null) {
        lopend.add(r.klus_id);
        if (r.start_tijd) starts[r.klus_id] = new Date(r.start_tijd).getTime();
      } else {
        map[r.klus_id] = (map[r.klus_id] || 0) + (r.minuten || 0);
      }
    });
    setTotalen(map); setLopendeKlussen(lopend); setLopendStart(starts);
  }

  async function laadOntvangst() {
    const { data } = await supabase.from("klus_voortgang").select("klus_id, gedaan_op").eq("stap", "ontvangen");
    const map: Record<string, string> = {};
    (data || []).forEach((r: any) => { map[r.klus_id] = r.gedaan_op; });
    setOntvangst(map);
  }

  async function laadKlusTijd(klusId: string) {
    const { data } = await supabase.from("tijdregels").select("id, monteur_naam, minuten, notitie, start_tijd, eind_tijd, aangemaakt_op").eq("klus_id", klusId).order("aangemaakt_op");
    const all = (data || []) as any[];
    const lopend = all.find((r) => r.minuten == null);
    if (lopend) { setLopendId(lopend.id); setStart(new Date(lopend.start_tijd).getTime()); setNu(Date.now()); }
    else { setLopendId(null); setStart(null); }
    setRegels(all.filter((r) => r.minuten != null) as Regel[]);
    // eerste start van deze klus: vroegste regel met een start_tijd of anders de eerste aangemaakt
    const metTijd = all.filter((r) => r.start_tijd).sort((a, b) => new Date(a.start_tijd).getTime() - new Date(b.start_tijd).getTime());
    const eerste = metTijd[0] || all[0];
    if (eerste) setKlusStart({ naam: eerste.monteur_naam || "Onbekend", tijd: eerste.start_tijd || eerste.aangemaakt_op });
    else setKlusStart(null);
  }

  // De technische werkbon (afstelling, sproeiers, checklist, artikelen) staat
  // per carburateur apart, zodat twee monteurs op dezelfde offerte elkaar niet
  // overschrijven. Carburateur 1 gebruikt de gewone klus-id, carburateur 2 een
  // afgeleide sleutel (#2). Stadia en foto's blijven gedeeld (gecombineerde
  // voortgang voor de klant).
  const werkbonSleutel = (klusId: string, carbNr: number) => (carbNr === 2 ? `${klusId}#2` : klusId);

  async function laadWerkbon(klusId: string, carbNr = 1) {
    const sleutel = werkbonSleutel(klusId, carbNr);
    const { data: m } = await supabase.from("werkbon_meting").select("moment, veld_type, label, positie, waarde, eenheid").eq("klus_id", sleutel);
    setVelden(uitMetingen(m || []));
    const { data: c } = await supabase.from("werkbon_checklist").select("check_naam, status, notitie").eq("klus_id", sleutel);
    setChecklist(uitChecklist(c || []));
    const { data: a } = await supabase.from("werkbon_artikelen").select("naam, bedrag").eq("klus_id", sleutel);
    setArtikelen(uitArtikelen(a || []));
    const { data: o } = await supabase.from("werkbon_opmerking").select("tekst").eq("klus_id", sleutel).limit(1);
    setOpmerking(o && o[0] ? (o[0].tekst || "") : "");
    const { data: ret } = await supabase.from("werkbon_retour").select("is_retour, reden").eq("klus_id", sleutel).limit(1);
    if (ret && ret[0]) { setRetour(!!ret[0].is_retour); setRetourReden(ret[0].reden || ""); }
    else { setRetour(false); setRetourReden(""); }
  }

  async function laadVoortgang(klusId: string) {
    const { data: v } = await supabase.from("klus_voortgang").select("stap, bericht, gedaan_op").eq("klus_id", klusId);
    setVoortgang(v || []);
    const { data: f } = await supabase.from("klus_fotos").select("*").eq("klus_id", klusId).order("geupload_op");
    setFotos(f || []);
  }

  function openKlus(k: Klus) {
    eersteLaad.current = true;
    setOpen(k); setPopup(true); setTimerPopup(false); setHandMin(""); setNotitie(""); setOpgeslagen(false); setLimiet(""); setAutoMelding("");
    setDiagnoseLijst([]); setDiagTekst(""); setDiagFout("");
    setStapPopup(null); setStapNotitie(""); setFotoMelding(""); setDeelLink("");
    setCarburateur(1);
    setKlusLinkKop(false);
    if (typeof window !== "undefined") window.history.replaceState(null, "", `?klus=${encodeURIComponent(k.id)}`);
    laadKlusTijd(k.id); laadWerkbon(k.id, 1); laadVoortgang(k.id);
  }

  function sluitKlus() {
    setOpen(null);
    if (typeof window !== "undefined") window.history.replaceState(null, "", window.location.pathname);
  }

  // Wisselen tussen carburateur 1 en 2: laad de technische werkbon van die
  // carburateur en voorkom dat de pending auto-opslag de net geladen data wegschrijft.
  function wisselCarburateur(n: number) {
    if (!open || n === carburateur) return;
    if (autoTimer.current) clearTimeout(autoTimer.current);
    eersteLaad.current = true;
    setCarburateur(n);
    laadWerkbon(open.id, n);
  }

  async function openBekijk(k: Klus) {
    setBekijk(k); setBekijkLaden(true);
    setBekijkVelden([]); setBekijkChecklist([]); setBekijkArtikelen([]); setBekijkOpmerking(""); setBekijkRetour(null);
    setBekijkVoortgang([]); setBekijkFotos([]); setBekijkRegels([]); setBekijkLog([]);
    try {
      const { data: m } = await supabase.from("werkbon_meting").select("moment, veld_type, label, positie, waarde, eenheid").eq("klus_id", k.id);
      setBekijkVelden(uitMetingen(m || []));
      const { data: c } = await supabase.from("werkbon_checklist").select("check_naam, status, notitie").eq("klus_id", k.id);
      setBekijkChecklist(uitChecklist(c || []));
      const { data: a } = await supabase.from("werkbon_artikelen").select("naam, bedrag").eq("klus_id", k.id);
      setBekijkArtikelen(uitArtikelen(a || []));
      const { data: o } = await supabase.from("werkbon_opmerking").select("tekst").eq("klus_id", k.id).limit(1);
      setBekijkOpmerking(o && o[0] ? (o[0].tekst || "") : "");
      const { data: ret } = await supabase.from("werkbon_retour").select("is_retour, reden").eq("klus_id", k.id).limit(1);
      setBekijkRetour(ret && ret[0] ? { is: !!ret[0].is_retour, reden: ret[0].reden || "" } : null);
      const { data: v } = await supabase.from("klus_voortgang").select("stap, bericht, gedaan_op").eq("klus_id", k.id);
      setBekijkVoortgang(v || []);
      const { data: f } = await supabase.from("klus_fotos").select("*").eq("klus_id", k.id).order("geupload_op");
      setBekijkFotos(f || []);
      const { data: t } = await supabase.from("tijdregels").select("id, monteur_naam, minuten, notitie, aangemaakt_op").eq("klus_id", k.id).order("aangemaakt_op");
      setBekijkRegels(((t || []) as any[]).filter((r) => r.minuten != null) as Regel[]);
      const { data: lg } = await supabase.from("werkbon_log").select("monteur_naam, actie, detail, gedaan_op").eq("klus_id", k.id).order("gedaan_op", { ascending: false }).limit(50);
      setBekijkLog(lg || []);
    } catch (e) { setFout(String(e)); }
    finally { setBekijkLaden(false); }
  }

  async function startTimer() {
    if (!open || !monteur) return;
    const nuMs = Date.now();
    const { data, error } = await supabase.from("tijdregels").insert({
      klus_id: open.id, klus_label: `${open.nummer} ${open.klant}`,
      monteur_id: monteur.id, monteur_naam: monteur.naam,
      start_tijd: new Date(nuMs).toISOString(), eind_tijd: null, minuten: null,
    }).select("id").single();
    if (error || !data) { setFout(error?.message || "Kon de timer niet starten"); return; }
    setLopendId(data.id); setStart(nuMs); setNu(nuMs);
    log(open.id, "timer gestart");
    await laadTotalen();
  }

  async function stop() {
    if (start == null || !lopendId) return;
    const eind = Date.now();
    const min = Math.max(1, Math.round((eind - start) / 60000));
    await supabase.from("tijdregels").update({ eind_tijd: new Date(eind).toISOString(), minuten: min }).eq("id", lopendId);
    setLopendId(null); setStart(null);
    if (open) { log(open.id, "timer gestopt", `${min} min`); await laadKlusTijd(open.id); await laadTotalen(); }
  }

  async function autoStop(g: number) {
    if (start == null || !lopendId) return;
    const min = Math.max(1, Math.round((g - start) / 60000));
    await supabase.from("tijdregels").update({ eind_tijd: new Date(g).toISOString(), minuten: min, notitie: "automatisch gestopt om 17:30" }).eq("id", lopendId);
    setLopendId(null); setStart(null);
    setLimiet("De timer liep nog en is automatisch gestopt op 17:30. Controleer of dit klopt en vul zo nodig handmatig aan.");
    if (open) { log(open.id, "timer automatisch gestopt om 17:30", `${min} min`); await laadKlusTijd(open.id); await laadTotalen(); }
  }

  async function handmatig() {
    if (!open || !monteur) return;
    const min = parseInt(handMin, 10);
    if (!min || min <= 0) return;
    const { error } = await supabase.from("tijdregels").insert({
      klus_id: open.id, klus_label: `${open.nummer} ${open.klant}`,
      monteur_id: monteur.id, monteur_naam: monteur.naam,
      start_tijd: null, eind_tijd: null, minuten: min, notitie: notitie || null,
    });
    if (error) { setFout(error.message); return; }
    log(open.id, "handmatige tijd toegevoegd", `${min} min${notitie ? ", " + notitie : ""}`);
    setHandMin(""); setNotitie("");
    await laadKlusTijd(open.id); await laadTotalen();
  }

  async function verwijder(id: string) {
    await supabase.from("tijdregels").delete().eq("id", id);
    if (open) { log(open.id, "tijdregel verwijderd"); await laadKlusTijd(open.id); await laadTotalen(); }
  }

  async function diagnose() {
    if (!open) return;
    setDiagBezig(true); setDiagFout(""); setDiagnoseLijst([]); setDiagTekst("");
    try {
      const r = await fetch("/api/diagnose", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ klacht: open.klacht, voertuig: open.voertuig }),
      }).then((x) => x.json());
      if (r.fout) setDiagFout(r.fout);
      else if (r.punten) setDiagnoseLijst(r.punten);
      else if (r.tekst) setDiagTekst(r.tekst);
    } catch (e) { setDiagFout(String(e)); }
    finally { setDiagBezig(false); }
  }

  const isGedaan = (id: string) => voortgang.some((v) => v.stap === id);
  const eindcontroleCompleet = checklist.filter((c) => c.vast).every((c) => c.status);
  // Zelfde model als het klantportaal: het hoogst afgevinkte stadium is 'bezig'
  // en telt nog niet mee, behalve ontvangst (voltooid feit, 20%) en het laatste
  // stadium (klaar, 100%). Zo loopt de balk gelijk met wat de klant ziet.
  const gedaanStadia = STADIA.filter((s) => isGedaan(s.id));
  let huidigPct = 0;
  if (gedaanStadia.length) {
    const hoogste = gedaanStadia[gedaanStadia.length - 1];
    if (hoogste.pct >= 100) huidigPct = 100;
    else if (hoogste.id === "ontvangen") huidigPct = hoogste.pct;
    else huidigPct = gedaanStadia.slice(0, -1).reduce((m, s) => Math.max(m, s.pct), 0);
  }
  huidigPctRef.current = huidigPct;

  function rijdNaar(vanaf: number, naar: number, duur: number) {
    cancelAnimationFrame(rafRef.current);
    setRijdt(true); rijdtRef.current = true;
    let start: number | null = null;
    const tick = (ts: number) => {
      if (start == null) start = ts;
      const p = Math.min(1, (ts - start) / duur);
      setVulPct(vanaf + (naar - vanaf) * p);
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
      else { setVulPct(naar); setRijdt(false); rijdtRef.current = false; }
    };
    rafRef.current = requestAnimationFrame(tick);
  }

  // Bij het openen/sluiten van een klus: zet de balk terug op 0. De rit zelf
  // start zodra de balk in beeld komt (zie de observer hieronder).
  useEffect(() => {
    cancelAnimationFrame(rafRef.current);
    setVulPct(0); setRijdt(false); rijdtRef.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open?.id]);

  // Laat de carburateur (opnieuw) van 0 naar het huidige % rijden zodra de
  // voortgangsbalk in beeld komt, ook bij terugscrollen.
  useEffect(() => {
    const el = voortgangRef.current;
    if (!el || !open) return;
    let inBeeld = false;
    const obs = new IntersectionObserver((entries) => {
      const e = entries[0];
      if (e.isIntersecting && !inBeeld) { inBeeld = true; rijdNaar(0, huidigPctRef.current, 8500); }
      else if (!e.isIntersecting && inBeeld) { inBeeld = false; }
    }, { threshold: 0.4 });
    obs.observe(el);
    return () => obs.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open?.id]);

  // Bij elke nieuwe bevestiging (stadium afgevinkt): opnieuw laten lopen.
  useEffect(() => {
    if (open && !rijdtRef.current) rijdNaar(vulPct, huidigPct, 2600);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [huidigPct]);

  async function markeerStap(stapId: string) {
    if (!open) return;
    const st = STADIA.find((s) => s.id === stapId);
    if (!st) return;
    if (isGedaan(stapId)) {
      const { error } = await supabase.from("klus_voortgang").delete().eq("klus_id", open.id).eq("stap", stapId);
      if (error) { setFout("Stadium ongedaan maken mislukt: " + error.message); return; }
      log(open.id, "stadium ongedaan gemaakt", st.label);
    } else {
      const bericht = st.notitie && stapNotitie.trim() ? `${st.klant} Toelichting: ${stapNotitie.trim()}` : st.klant;
      const { error } = await supabase.from("klus_voortgang").upsert({ klus_id: open.id, stap: stapId, bericht, gedaan_op: new Date().toISOString() });
      if (error) { setFout("Stadium opslaan mislukt: " + error.message); return; }
      log(open.id, "stadium gezet", st.label);
    }
    setStapPopup(null); setStapNotitie(""); setFotoMelding("");
    await laadVoortgang(open.id);
    await laadOntvangst();
  }

  // Verkleint en comprimeert een foto in de browser voor het uploaden.
  // Lukt het niet, dan wordt het origineel teruggegeven zodat uploaden altijd doorgaat.
  async function verkleinFoto(file: File, maxBreed = 1600, kwaliteit = 0.7): Promise<{ blob: Blob; ext: string }> {
    try {
      if (!file.type.startsWith("image/")) return { blob: file, ext: (file.name.split(".").pop() || "jpg").toLowerCase() };
      const bitmap = await createImageBitmap(file);
      const schaal = Math.min(1, maxBreed / bitmap.width);
      const breed = Math.round(bitmap.width * schaal);
      const hoog = Math.round(bitmap.height * schaal);
      const canvas = document.createElement("canvas");
      canvas.width = breed; canvas.height = hoog;
      const ctx = canvas.getContext("2d");
      if (!ctx) return { blob: file, ext: (file.name.split(".").pop() || "jpg").toLowerCase() };
      ctx.drawImage(bitmap, 0, 0, breed, hoog);
      const blob: Blob | null = await new Promise((res) => canvas.toBlob((b) => res(b), "image/jpeg", kwaliteit));
      if (!blob || blob.size >= file.size) return { blob: file, ext: (file.name.split(".").pop() || "jpg").toLowerCase() };
      return { blob, ext: "jpg" };
    } catch {
      return { blob: file, ext: (file.name.split(".").pop() || "jpg").toLowerCase() };
    }
  }

  async function uploadFoto(file: File, stap: string) {
    if (!open) return;
    if (fotos.filter((f) => f.stap === stap).length >= 3) { setFotoMelding("Maximaal 3 foto's per stadium bereikt."); return; }
    try {
      const { blob, ext: rawExt } = await verkleinFoto(file);
      const ext = (rawExt || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
      const map = (open.nummer || open.id).replace(/[^a-zA-Z0-9_-]/g, "_");
      const pad = `${map}/${stap}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("werkbon-fotos").upload(pad, blob, { contentType: blob.type || "image/jpeg" });
      if (error) { setFout(error.message); return; }
      const { data } = supabase.storage.from("werkbon-fotos").getPublicUrl(pad);
      const { error: insErr } = await supabase.from("klus_fotos").insert({ klus_id: open.id, stap, url: data.publicUrl });
      if (insErr) { setFout("Foto opslaan in database mislukt: " + insErr.message); return; }
      log(open.id, "foto geupload", stap);
      setFotoMelding(`Foto geupload: ${file.name}`);
      await laadVoortgang(open.id);
    } catch (e) { setFout(String(e)); }
  }

  async function verwijderFoto(id: string) {
    await supabase.from("klus_fotos").delete().eq("id", id);
    if (open) { log(open.id, "foto verwijderd"); await laadVoortgang(open.id); }
  }

  // Draait een foto 90 graden (alleen de getoonde stand; de afbeelding zelf
  // blijft onaangeraakt). Slaat de hoek op zodat ook de klant 'm recht ziet.
  async function draaiFoto(f: any) {
    const nieuw = (((f.rotatie || 0) + 90) % 360);
    setFotos((lijst) => lijst.map((x) => (x.id === f.id ? { ...x, rotatie: nieuw } : x)));
    const { error } = await supabase.from("klus_fotos").update({ rotatie: nieuw }).eq("id", f.id);
    if (error) setFotoMelding("Draaien opslaan mislukt (is de kolom 'rotatie' al toegevoegd?).");
  }

  // Interne foto's: onbeperkte werkplaats-dump per carburateur. Ze krijgen
  // stadium "intern-<carburateur>" en worden NOOIT gepubliceerd, dus de klant
  // ziet ze nooit. Bedoeld voor 50-100+ foto's per monteur per carburateur.
  async function uploadMeerdereFotos(files: File[]) {
    if (!open || files.length === 0) return;
    const teUploaden = files;
    const internStap = `intern-${carburateur}`;
    setBulkBezig(true); setBulkResultaat(null); setBulkProg({ done: 0, totaal: teUploaden.length });
    let gelukt = 0, mislukt = 0;
    for (let i = 0; i < teUploaden.length; i++) {
      const file = teUploaden[i];
      try {
        const { blob, ext: rawExt } = await verkleinFoto(file);
        const ext = (rawExt || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
        const map = (open.nummer || open.id).replace(/[^a-zA-Z0-9_-]/g, "_");
        const pad = `${map}/intern/carb${carburateur}/${Date.now()}-${i}.${ext}`;
        const { error } = await supabase.storage.from("werkbon-fotos").upload(pad, blob, { contentType: blob.type || "image/jpeg" });
        if (error) { mislukt++; }
        else {
          const { data } = supabase.storage.from("werkbon-fotos").getPublicUrl(pad);
          const { error: insErr } = await supabase.from("klus_fotos").insert({ klus_id: open.id, stap: internStap, url: data.publicUrl });
          if (insErr) mislukt++; else gelukt++;
        }
      } catch { mislukt++; }
      setBulkProg({ done: i + 1, totaal: teUploaden.length });
    }
    log(open.id, "meerdere foto's geupload", `${gelukt} gelukt${mislukt ? `, ${mislukt} mislukt` : ""}`);
    setBulkProg(null);
    setBulkResultaat({ gelukt, mislukt });
    setBulkBezig(false);
    await laadVoortgang(open.id);
  }

  // Publiceert de huidige stand naar de klant en geeft de link + code terug.
  // De klant ziet pas iets nadat hier op gedrukt is (geen auto-updates).
  async function deelMetKlant() {
    if (!open) return;
    const { data: bestaand } = await supabase.from("werkbon_links").select("token, toegangscode").eq("klus_id", open.id).limit(1);
    let token = bestaand && bestaand[0] ? bestaand[0].token : null;
    let code = bestaand && bestaand[0] ? bestaand[0].toegangscode : null;
    if (!token) {
      token = (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)).replace(/-/g, "");
      code = maakCode();
      const { error } = await supabase.from("werkbon_links").insert({ token, toegangscode: code, klus_id: open.id, nummer: open.nummer, klant: open.klant, voertuig: open.voertuig, klacht: open.klacht });
      if (error) { setFout(error.message); return; }
      log(open.id, "klantlink aangemaakt");
    } else if (!code) {
      code = maakCode();
      await supabase.from("werkbon_links").update({ toegangscode: code, klacht: open.klacht }).eq("klus_id", open.id);
    }
    // Publiceer de huidige stand: stempel de nog niet-gepubliceerde stadia + foto's.
    const nu = new Date().toISOString();
    const { error: pubErr } = await supabase.from("klus_voortgang").update({ gepubliceerd_op: nu }).eq("klus_id", open.id).is("gepubliceerd_op", null);
    if (pubErr) { setFout("Publiceren mislukt: " + pubErr.message); return; }
    // Alleen de stage-foto's naar de klant; interne foto's blijven intern.
    await supabase.from("klus_fotos").update({ gepubliceerd_op: nu }).eq("klus_id", open.id).is("gepubliceerd_op", null).in("stap", ["ontvangen", "gestart", "voor_ultrasoon", "na_ultrasoon", "schoon"]);
    log(open.id, "update naar klant gepubliceerd");
    setDeelCode(code || "");
    setDeelLink(`${window.location.origin}/volg?t=${token}`);
    setGedeeld(true);
    setTimeout(() => setGedeeld(false), 3000);
  }

  function updVeld(k: string, veld: "label" | "binnenkomst" | "afleveren", val: string) {
    setVelden((vs) => vs.map((v) => (v.key === k ? { ...v, [veld]: val } : v)));
  }
  function voegVeldToe(veld_type: string, label: string, eenheid: string) {
    setVelden((vs) => {
      const zelfde = vs.filter((v) => v.veld_type === veld_type);
      const pos = zelfde.length ? Math.max(...zelfde.map((v) => v.positie)) + 1 : 1;
      return [...vs, { key: key(), veld_type, label: veld_type.startsWith("eigen") ? "" : label, eenheid, positie: pos, binnenkomst: "", afleveren: "" }];
    });
  }
  function verwijderVeld(k: string) { setVelden((vs) => vs.filter((v) => v.key !== k)); }
  function updCheck(k: string, veld: "naam" | "status" | "notitie", val: string) {
    setChecklist((cs) => cs.map((c) => (c.key === k ? { ...c, [veld]: val } : c)));
  }
  function updArtikel(k: string, veld: "naam" | "bedrag", val: string) {
    setArtikelen((as) => as.map((a) => (a.key === k ? { ...a, [veld]: val } : a)));
  }

  async function bewaarWerkbon(auto = false) {
    if (!open) return;
    if (!auto) setBezig(true);
    const sleutel = werkbonSleutel(open.id, carburateur); // technische werkbon per carburateur
    try {
      await supabase.from("werkbon_meting").delete().eq("klus_id", sleutel);
      const rows: any[] = [];
      velden.forEach((v) => {
        const naam = v.label || v.veld_type;
        if (v.binnenkomst.trim()) rows.push({ klus_id: sleutel, moment: "binnenkomst", veld_type: v.veld_type, label: naam, positie: v.positie, waarde: v.binnenkomst.trim(), eenheid: v.eenheid || null });
        if (v.afleveren.trim()) rows.push({ klus_id: sleutel, moment: "afleveren", veld_type: v.veld_type, label: naam, positie: v.positie, waarde: v.afleveren.trim(), eenheid: v.eenheid || null });
      });
      if (rows.length) await supabase.from("werkbon_meting").insert(rows);

      await supabase.from("werkbon_checklist").delete().eq("klus_id", sleutel);
      const crows = checklist.filter((c) => c.naam.trim() && (c.status || c.notitie.trim())).map((c) => ({ klus_id: sleutel, check_naam: c.naam.trim(), status: c.status || null, notitie: c.notitie.trim() || null }));
      if (crows.length) await supabase.from("werkbon_checklist").insert(crows);

      await supabase.from("werkbon_artikelen").delete().eq("klus_id", sleutel);
      const arows = artikelen.filter((a) => a.naam.trim() && bedragNum(a.bedrag) > 0).map((a) => ({ klus_id: sleutel, naam: a.naam.trim(), bedrag: bedragNum(a.bedrag), monteur_naam: monteur?.naam || null }));
      if (arows.length) await supabase.from("werkbon_artikelen").insert(arows);

      await supabase.from("werkbon_opmerking").upsert({ klus_id: sleutel, tekst: opmerking.trim() || null, monteur_naam: monteur?.naam || null, bijgewerkt_op: new Date().toISOString() });

      if (retour) {
        await supabase.from("werkbon_retour").upsert({ klus_id: sleutel, is_retour: true, reden: retourReden.trim() || null, monteur_naam: monteur?.naam || null, gemarkeerd_op: new Date().toISOString() });
      } else {
        await supabase.from("werkbon_retour").delete().eq("klus_id", sleutel);
      }

      log(open.id, auto ? "werkbon automatisch opgeslagen" : "werkbon opgeslagen");

      if (auto) { setAutoMelding("Automatisch opgeslagen " + new Date().toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })); }
      else { setOpgeslagen(true); setTimeout(() => setOpgeslagen(false), 2500); }
    } catch (e) { setFout(String(e)); }
    finally { if (!auto) setBezig(false); }
  }

  const totaal = regels.reduce((s, r) => s + (r.minuten || 0), 0);
  const eersteNietGedaan = STADIA.filter((s) => s.id !== "akkoord").find((s) => !isGedaan(s.id))?.id || "";
  const lopMin = (id: string) => lopendStart[id] ? Math.max(0, Math.round((nu - lopendStart[id]) / 60000)) : 0;
  const artikelenTotaal = artikelen.reduce((s, a) => s + bedragNum(a.bedrag), 0);
  const internFotos = (fotos as any[]).filter((f) => f.stap === `intern-${carburateur}`);

  const wrap: CSSProperties = { minHeight: "100vh", background: BG, color: TEKST, fontFamily: "'Karma', Georgia, serif", padding: "20px 14px", maxWidth: 520, margin: "0 auto" };
  const kaart: CSSProperties = { background: KAART_BG, border: `1px solid ${RAND}`, borderRadius: 16, padding: 18, marginBottom: 16, boxShadow: KAART_SCHADUW };
  const knop = (bg: string): CSSProperties => ({ background: bg, color: "#fff", border: "none", borderRadius: 12, padding: "16px 20px", fontSize: 17, fontWeight: 700, cursor: "pointer", width: "100%" });
  const inp: CSSProperties = { flex: 1, minWidth: 0, width: "100%", border: `1px solid ${VELD_RAND}`, borderRadius: 8, padding: "9px 10px", fontSize: 14, boxSizing: "border-box", background: VELD_BG, color: VELD_TEKST };
  const inpG: CSSProperties = { ...inp, border: `1.5px solid ${GROEN}` };
  const plus: CSSProperties = { border: `1px dashed ${GROEN}`, background: GROEN_BG, color: GROEN, borderRadius: 999, padding: "5px 12px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", marginTop: 2 };
  const toggle = (a: boolean, kleur: string): CSSProperties => ({ border: `1px solid ${a ? kleur : RAND}`, background: a ? kleur : "#fff", color: a ? "#fff" : TEKST, borderRadius: 8, padding: "8px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer" });
  const kopstijl: CSSProperties = { fontSize: 13, color: GRIJS, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, margin: "2px 0 12px" };

  if (laden) return <main style={{ ...wrap, maxWidth: 600 }}><LaadScherm titel="Werkbonnen laden…" apis={[{ naam: "Werkbonnen", klaar: false }]} /></main>;

  const stapInfo = stapPopup ? STADIA.find((s) => s.id === stapPopup) : null;
  const binnenDagenLijst = klussen.map((k) => ontvangst[k.id] ? dagenGeleden(ontvangst[k.id]) : null).filter((d): d is number => d != null);
  const monLopen = klussen.filter((k) => lopendeKlussen.has(k.id)).length;
  const monWeek = binnenDagenLijst.filter((d) => d >= 7 && d < 14).length;
  const monAlert = binnenDagenLijst.filter((d) => d >= 14).length;

  const q = zoek.trim().toLowerCase();
  const zichtbaar = q ? klussen.filter((k) => `${k.nummer} ${k.klant} ${k.voertuig}`.toLowerCase().includes(q)) : klussen;

  // Alleen-lezen werkbon
  if (bekijk) {
    return (
      <WerkbonBekijk
        bekijk={bekijk}
        onTerug={() => setBekijk(null)}
        bekijkLaden={bekijkLaden}
        bekijkVelden={bekijkVelden}
        bekijkChecklist={bekijkChecklist}
        bekijkArtikelen={bekijkArtikelen}
        bekijkOpmerking={bekijkOpmerking}
        bekijkRetour={bekijkRetour}
        bekijkVoortgang={bekijkVoortgang}
        bekijkFotos={bekijkFotos}
        bekijkRegels={bekijkRegels}
        bekijkLog={bekijkLog}
        STADIA={STADIA}
        SECTIES={SECTIES}
        catVan={catVan}
        bedragNum={bedragNum}
        wrap={wrap}
        kaart={kaart}
        kopstijl={kopstijl}
      />
    );
  }

  return (
    <main style={wrap}>
      <ScrollNaarBoven bottom={open ? 96 : 24} />
      {open && popup && (
        <div onClick={() => { setPopup(false); if (start == null) setTimerPopup(true); }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 18, padding: 24, maxWidth: 460, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.35)" }}>
            <div style={{ fontSize: 13, color: GRIJS, fontWeight: 600, marginBottom: 8 }}>Je werkt vandaag aan</div>
            <div style={{ fontSize: 30, fontWeight: 800, color: GROEN, lineHeight: 1.05 }}>{open.nummer}</div>
            <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>{open.klant}</div>
            {open.voertuig && <div style={{ fontSize: 14, color: GRIJS, marginTop: 10, lineHeight: 1.4 }}>{open.voertuig}</div>}
            <button onClick={() => { setPopup(false); if (start == null) setTimerPopup(true); }} style={{ ...knop(GROEN), marginTop: 20 }}>Aan de slag</button>
          </div>
        </div>
      )}

      {open && timerPopup && start == null && (
        <div onClick={() => setTimerPopup(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 18, padding: 24, maxWidth: 420, width: "100%", textAlign: "center", boxShadow: "0 20px 60px rgba(0,0,0,0.35)" }}>
            <div style={{ fontSize: 19, fontWeight: 800, color: GROEN, marginBottom: 8 }}>Klaar om te beginnen?</div>
            <div style={{ fontSize: 14, color: TEKST, lineHeight: 1.5, marginBottom: 18 }}>Start de timer zodra je aan deze klus begint. Je kunt hem onderaan altijd weer stoppen.</div>
            {!monteur && <div style={{ fontSize: 13, color: ROOD, marginBottom: 12 }}>Kies eerst bovenaan je naam.</div>}
            <button disabled={!monteur} onClick={() => { startTimer(); setTimerPopup(false); }} style={knop(monteur ? GROEN : "#b9c2bc")}>START</button>
            <button onClick={() => setTimerPopup(false)} style={{ width: "100%", marginTop: 10, border: "none", background: "transparent", color: GRIJS, fontWeight: 700, fontSize: 14, cursor: "pointer", padding: "6px" }}>Later, eerst iets anders</button>
          </div>
        </div>
      )}

      {open && stapInfo && (
        <div onClick={() => setStapPopup(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 18, padding: 22, maxWidth: 460, width: "100%", maxHeight: "85vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.35)" }}>
            <div style={{ fontSize: 12.5, color: GRIJS, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>Stadium · {stapInfo.pct}%</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: GROEN, marginBottom: 8 }}>{stapInfo.label}</div>
            <div style={{ fontSize: 14, lineHeight: 1.5, marginBottom: 12 }}>{stapInfo.coaching}</div>
            {stapInfo.notitie && <textarea value={stapNotitie} onChange={(e) => setStapNotitie(e.target.value)} placeholder="Korte toelichting voor de klant" style={{ ...inp, minHeight: 60, marginBottom: 12 }} />}
            {stapInfo.foto && (
              <>
                {fotos.filter((f) => f.stap === stapInfo.id).length >= 3 ? (
                  <div style={{ textAlign: "center", background: "#efece4", color: GRIJS, borderRadius: 12, padding: "13px", fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Maximaal 3 foto's voor dit stadium</div>
                ) : (
                  <label style={{ display: "block", textAlign: "center", background: GOUD, color: "#fff", borderRadius: 12, padding: "13px", fontSize: 15, fontWeight: 700, cursor: "pointer", marginBottom: 10 }}>
                    Maak foto ({fotos.filter((f) => f.stap === stapInfo.id).length}/3)
                    <input type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFoto(f, stapInfo.id); e.currentTarget.value = ""; }} />
                  </label>
                )}
                {fotoMelding && <div style={{ fontSize: 13, color: GROEN, fontWeight: 600, marginBottom: 10 }}>{fotoMelding}</div>}
                {fotos.filter((f) => f.stap === stapInfo.id).length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                    {fotos.filter((f) => f.stap === stapInfo.id).map((f, idx, arr) => (
                      <div key={f.id} style={{ position: "relative" }}>
                        <img src={f.url} alt="" onClick={() => setLightbox({ fotos: arr.map((x) => ({ url: x.url, rotatie: x.rotatie || 0 })), start: idx })} style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 8, border: `1px solid ${RAND}`, cursor: "pointer", display: "block", transform: `rotate(${f.rotatie || 0}deg)` }} />
                        <button onClick={() => draaiFoto(f)} title="Draai 90°" style={{ position: "absolute", bottom: -6, right: -6, width: 22, height: 22, borderRadius: 999, border: "none", background: GROEN, color: "#fff", fontSize: 12, cursor: "pointer" }}>↻</button>
                        <button onClick={() => verwijderFoto(f.id)} style={{ position: "absolute", top: -6, right: -6, width: 22, height: 22, borderRadius: 999, border: "none", background: ROOD, color: "#fff", fontSize: 13, cursor: "pointer" }}>×</button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
            {stapInfo.eindcontrole && !eindcontroleCompleet && <div style={{ fontSize: 13, color: ROOD, marginBottom: 10 }}>Vink eerst de eindcontrole helemaal af voordat je dit stadium afrondt.</div>}
            <button disabled={stapInfo.eindcontrole && !eindcontroleCompleet} onClick={() => markeerStap(stapInfo.id)} style={knop(isGedaan(stapInfo.id) ? GRIJS : (stapInfo.eindcontrole && !eindcontroleCompleet ? "#b9c2bc" : GROEN))}>
              {isGedaan(stapInfo.id) ? "Ongedaan maken" : "Markeer als gedaan"}
            </button>
            <button onClick={() => setStapPopup(null)} style={{ width: "100%", marginTop: 8, border: "none", background: "transparent", color: GRIJS, fontWeight: 700, fontSize: 14, cursor: "pointer", padding: "6px" }}>Sluiten</button>
          </div>
        </div>
      )}

      <PaginaKop naam={ingelogd.naam} onUitloggen={onUitloggen} titel="Werkplaats Werkbonnen">
        {!open && (
          <div style={kaart}>
            <input value={zoek} onChange={(e) => setZoek(e.target.value)} placeholder="Zoek op offertenummer, klant of voertuig" style={{ ...inp, fontSize: 15 }} />
            {q && <div style={{ fontSize: 12, color: GRIJS, marginTop: 8 }}>{zichtbaar.length} {zichtbaar.length === 1 ? "klus" : "klussen"} gevonden{zichtbaar.length ? ", tik op Bekijk werkbon om alleen te lezen" : ""}.</div>}
          </div>
        )}
      </PaginaKop>
      {fout && <div style={{ ...kaart, color: ROOD, borderColor: ROOD }}>Let op: {fout}</div>}

      {!open && (
        <>

          {!q && (
            <div style={{ ...kaart, display: "flex", gap: 8 }}>
              <div style={{ textAlign: "center", flex: 1 }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: monLopen ? GROEN : GRIJS }}>{monLopen}</div>
                <div style={{ fontSize: 11.5, color: GRIJS }}>timer loopt</div>
              </div>
              <div style={{ textAlign: "center", flex: 1, borderLeft: `1px solid ${RAND}` }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: monWeek ? GOUD : GRIJS }}>{monWeek}</div>
                <div style={{ fontSize: 11.5, color: GRIJS }}>7+ dagen binnen</div>
              </div>
              <div style={{ textAlign: "center", flex: 1, borderLeft: `1px solid ${RAND}` }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: monAlert ? ROOD : GRIJS }}>{monAlert}</div>
                <div style={{ fontSize: 11.5, color: GRIJS }}>14+ dagen alert</div>
              </div>
            </div>
          )}

          <div style={{ fontSize: 13, color: GRIJS, fontWeight: 600, margin: "4px 2px 8px" }}>{q ? "Zoekresultaten" : "Geaccepteerde klussen"} ({zichtbaar.length})</div>
          {zichtbaar.map((k) => {
            const tekenD = dagenGeleden(k.getekend);
            const binnenIso = ontvangst[k.id];
            const binnenD = binnenIso ? dagenGeleden(binnenIso) : null;
            const alert = binnenD != null && binnenD >= 14;
            const waarschuwing = binnenD != null && binnenD >= 7 && binnenD < 14;
            const binnenKleur = alert ? ROOD : waarschuwing ? GOUD : TEKST;
            return (
              <div key={k.id} style={{ ...kaart, borderColor: alert ? ROOD : RAND, borderWidth: alert ? 1.5 : 1 }}>
                <div onClick={() => openKlus(k)} style={{ cursor: "pointer" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                      <div style={{ fontSize: 15, fontWeight: 800, color: GROEN }}>{k.nummer}</div>
                      {k.status === "gefactureerd" && <span style={{ fontSize: 10.5, fontWeight: 800, color: "#6b5410", background: GOUD_BG, border: `1px solid ${GOUD}`, borderRadius: 999, padding: "1px 8px", letterSpacing: 0.3 }}>GEFACTUREERD</span>}
                    </div>
                    {alert && <span style={{ fontSize: 11.5, fontWeight: 800, color: ROOD, letterSpacing: 0.5 }}>ALERT</span>}
                  </div>
                  <div style={{ fontWeight: 700, marginTop: 1 }}>{k.klant}</div>
                  {k.voertuig && <div style={{ fontSize: 13, color: GRIJS, marginTop: 3 }}>{k.voertuig}</div>}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 6, alignItems: "center" }}>
                    {tekenD != null && <span style={{ fontSize: 12.5, color: GRIJS }}>{tekenD} {tekenD === 1 ? "dag" : "dagen"} sinds tekenen</span>}
                    {binnenD != null
                      ? <span style={{ fontSize: 12.5, color: binnenKleur, fontWeight: (waarschuwing || alert) ? 700 : 600 }}>{binnenD} {binnenD === 1 ? "dag" : "dagen"} binnen</span>
                      : <span style={{ fontSize: 12.5, color: GRIJS, fontStyle: "italic" }}>nog niet binnen</span>}
                    {totalen[k.id] ? <span style={{ fontSize: 12.5, color: GROEN, fontWeight: 600 }}>{duur(totalen[k.id])} geschreven</span> : null}
                    {lopendeKlussen.has(k.id) && <span style={{ fontSize: 12.5, color: ROOD, fontWeight: 700 }}>● timer loopt, {lopMin(k.id)} min</span>}
                  </div>
                </div>
                <div style={{ borderTop: `1px solid ${RAND}`, marginTop: 10, paddingTop: 8 }}>
                  <button onClick={(e) => { e.stopPropagation(); openBekijk(k); }} style={{ border: "none", background: "transparent", color: GROEN, fontWeight: 700, fontSize: 12.5, cursor: "pointer", padding: 0 }}>Bekijk werkbon (alleen lezen) →</button>
                </div>
              </div>
            );
          })}
          {zichtbaar.length === 0 && <div style={{ color: GRIJS }}>{q ? "Niets gevonden voor deze zoekterm." : "Geen klussen gevonden."}</div>}
        </>
      )}

      {open && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <button onClick={sluitKlus} style={{ border: "none", background: "transparent", color: GROEN, fontWeight: 700, fontSize: 14, cursor: "pointer", padding: "4px 0" }}>← Klussen</button>
            <button onClick={async () => { try { await navigator.clipboard?.writeText(window.location.href); } catch {} setKlusLinkKop(true); setTimeout(() => setKlusLinkKop(false), 1800); }} style={{ border: `1px solid ${RAND}`, background: klusLinkKop ? GOUD_BG : "#fff", color: klusLinkKop ? "#6b5410" : GROEN, fontWeight: 700, fontSize: 12.5, cursor: "pointer", borderRadius: 999, padding: "5px 12px" }}>{klusLinkKop ? "Gekopieerd!" : "🔗 Kopieer link"}</button>
          </div>

          <div style={kaart}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: GROEN, letterSpacing: 0.5, lineHeight: 1.1 }}>{open.nummer}</div>
              {open.status === "gefactureerd" && <span style={{ fontSize: 11, fontWeight: 800, color: "#6b5410", background: GOUD_BG, border: `1px solid ${GOUD}`, borderRadius: 999, padding: "2px 10px", letterSpacing: 0.4 }}>GEFACTUREERD</span>}
            </div>
            <div style={{ fontSize: 21, fontWeight: 700, marginTop: 4 }}>{open.klant}</div>
            {open.voertuig && <div style={{ fontSize: 13.5, color: GRIJS, marginTop: 8 }}>{open.voertuig}</div>}

            <div style={{ marginTop: 12, padding: 12, border: `1px solid ${RAND}`, borderRadius: 10, background: GROEN_BG }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: GROEN }}>Carburateur van deze offerte</div>
              <div style={{ fontSize: 12, color: GRIJS, margin: "3px 0 9px" }}>Alleen nodig als er meerdere carburateurs op één offerte staan. Afstelling, sproeiers, checklist en artikelen worden per carburateur apart bewaard. Voortgang en foto&apos;s deel je samen.</div>
              <div style={{ display: "flex", gap: 8 }}>
                {[1, 2].map((n) => (
                  <button key={n} onClick={() => wisselCarburateur(n)} style={{ flex: 1, border: `1.5px solid ${carburateur === n ? GROEN : RAND}`, background: carburateur === n ? GROEN : "#fff", color: carburateur === n ? "#fff" : TEKST, borderRadius: 8, padding: "9px 0", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Carburateur {n}</button>
                ))}
              </div>
            </div>

            <div style={{ marginTop: 12, padding: 12, border: `1.5px solid ${retour ? ROOD : RAND}`, borderRadius: 10, background: retour ? ROOD_BG : "#fff" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                <input type="checkbox" checked={retour} onChange={(e) => setRetour(e.target.checked)} style={{ width: 20, height: 20, accentColor: ROOD }} />
                <span style={{ fontSize: 14.5, fontWeight: 700, color: retour ? ROOD : TEKST }}>Dit is een retour</span>
              </label>
              {retour && (
                <textarea value={retourReden} onChange={(e) => setRetourReden(e.target.value)} placeholder="Reden van terugkomst (verplicht)" style={{ ...inp, border: `1.5px solid ${ROOD}`, minHeight: 60, marginTop: 10, resize: "vertical" }} />
              )}
            </div>

            {open.klacht && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 16, lineHeight: 1.45, background: GROEN_BG, color: GROEN, borderRadius: 10, padding: "14px 16px" }}>
                  <span style={{ fontWeight: 800 }}>Klacht: </span>{open.klacht}
                </div>
                <button onClick={diagnose} disabled={diagBezig} style={{ marginTop: 10, border: `1px solid ${GOUD}`, background: "#fff", color: "#6b5410", borderRadius: 999, padding: "8px 16px", fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}>
                  {diagBezig ? "Bezig met meedenken..." : "Denk mee over de klacht"}
                </button>
                {diagFout && <div style={{ marginTop: 8, fontSize: 13, color: ROOD }}>{diagFout}</div>}
                {(diagnoseLijst.length > 0 || diagTekst) && (
                  <div style={{ marginTop: 8, background: GOUD_BG, border: `1px solid ${GOUD}`, borderRadius: 10, padding: 12 }}>
                    <div style={{ fontSize: 11.5, color: "#6b5410", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>Aandachtspunten voor deze revisie</div>
                    {diagnoseLijst.map((p, i) => (
                      <div key={i} style={{ marginBottom: 8 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 700 }}>{p.oorzaak}</div>
                        <div style={{ fontSize: 13, color: TEKST }}>{p.controleren}</div>
                      </div>
                    ))}
                    {diagTekst && <div style={{ fontSize: 13, whiteSpace: "pre-wrap" }}>{diagTekst}</div>}
                    <div style={{ fontSize: 11.5, color: "#6b5410", marginTop: 6, opacity: 0.8 }}>AI denkt mee, controleer altijd zelf.</div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div ref={voortgangRef} style={kaart}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span style={kopstijl}>Voortgang</span>
            </div>
            <div style={{ position: "relative", height: 60, margin: "2px 0 8px" }}>
              <div style={{ position: "absolute", left: 0, right: 0, bottom: 8, height: 8, background: GROEN_BG, borderRadius: 999 }} />
              <div style={{ position: "absolute", left: 0, bottom: 8, height: 8, width: `${vulPct}%`, background: GROEN, borderRadius: 999, transition: rijdt ? "none" : "width .5s ease" }} />
              <div style={{ position: "absolute", left: `${vulPct}%`, top: 0, transform: "translateX(-50%)", transition: rijdt ? "none" : "left .5s ease", zIndex: 3 }}>
                <span style={{ display: "inline-block", background: GROEN, color: "#fff", fontSize: 12.5, fontWeight: 800, borderRadius: 999, padding: "2px 8px", boxShadow: "0 2px 5px rgba(0,0,0,0.25)", whiteSpace: "nowrap" }}>{Math.round(vulPct)}%</span>
              </div>
              <img src="/icon.png" alt="" style={{ position: "absolute", left: `${vulPct}%`, bottom: 0, transform: "translateX(-50%)", width: 38, height: 38, borderRadius: "50%", boxShadow: "0 0 0 2px #fff, 0 3px 9px rgba(0,0,0,0.3)", zIndex: 2, transition: rijdt ? "none" : "left .5s ease" }} />
            </div>
            <div style={{ display: "flex", gap: 6, padding: "0 1px" }}>
              {STADIA.map((s) => {
                const done = isGedaan(s.id);
                const next = !done && s.id === eersteNietGedaan;
                const bg = done ? GROEN : next ? GOUD : "#fff";
                const bd = done ? GROEN : next ? GOUD : RAND;
                const tc = (done || next) ? "#fff" : GRIJS;
                return (
                  <button key={s.id} onClick={() => { setStapNotitie(""); setFotoMelding(""); setStapPopup(s.id); }} style={{ flex: 1, minWidth: 0, border: `1.5px solid ${bd}`, background: bg, color: tc, borderRadius: 8, padding: "10px 2px", fontSize: 10, fontWeight: 700, cursor: "pointer", lineHeight: 1.2, textAlign: "center", overflowWrap: "anywhere", hyphens: "auto" }}>
                    {done ? "✓ " : ""}{s.kort}
                  </button>
                );
              })}
            </div>
            <button onClick={deelMetKlant} style={{ ...knop(gedeeld ? GROEN : GOUD), marginTop: 12 }}>{gedeeld ? "✓ Verstuurd naar klant!" : "📣 Stuur update naar klant"}</button>
            {deelLink && (
              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 13, color: GROEN, fontWeight: 700, marginBottom: 6 }}>Update gepubliceerd. De klant kan nu deze stand zien.</div>
                <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                  <div style={{ flex: 1, background: GROEN_BG, borderRadius: 8, padding: "8px 10px" }}>
                    <div style={{ fontSize: 10.5, color: GRIJS, textTransform: "uppercase", letterSpacing: 0.5 }}>Ordernummer</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: GROEN }}>{open.nummer}</div>
                  </div>
                  <div style={{ flex: 1, background: GOUD_BG, borderRadius: 8, padding: "8px 10px" }}>
                    <div style={{ fontSize: 10.5, color: GRIJS, textTransform: "uppercase", letterSpacing: 0.5 }}>Code</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: "#6b5410", letterSpacing: 2 }}>{deelCode}</div>
                  </div>
                </div>
                <div style={{ fontSize: 12, color: GRIJS, marginBottom: 4 }}>Of stuur de directe link:</div>
                <div style={{ display: "flex", gap: 6 }}>
                  <input readOnly value={deelLink} onFocus={(e) => e.target.select()} style={inp} />
                  <button onClick={async () => { try { await navigator.clipboard?.writeText(deelLink); } catch {} setGekopieerd(true); setTimeout(() => setGekopieerd(false), 1800); }} style={{ border: "none", background: gekopieerd ? GOUD : GROEN, color: "#fff", borderRadius: 8, padding: "0 12px", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", minWidth: 92 }}>{gekopieerd ? "Gekopieerd!" : "Kopieer"}</button>
                </div>
              </div>
            )}
          </div>

          {limiet && <div style={{ ...kaart, background: GOUD_BG, borderColor: GOUD, color: "#6b5410", fontSize: 13.5 }}>{limiet}</div>}

          <BlokTijd handMin={handMin} setHandMin={setHandMin} notitie={notitie} setNotitie={setNotitie} monteur={monteur} handmatig={handmatig} totaal={totaal} regels={regels} verwijder={verwijder} klusStart={klusStart} kaart={kaart} kopstijl={kopstijl} inp={inp} />
          <BlokAfstelling velden={velden} updVeld={updVeld} verwijderVeld={verwijderVeld} voegVeldToe={voegVeldToe} SECTIES={SECTIES} VELD_TYPES={VELD_TYPES} EIGEN={EIGEN} cfgVan={cfgVan} statusKleur={statusKleur} kaart={kaart} kopstijl={kopstijl} inpG={inpG} plus={plus} toggle={toggle} />
          <BlokArtikelen artikelen={artikelen} artikelenTotaal={artikelenTotaal} updArtikel={updArtikel} onVerwijder={(k) => setArtikelen((as) => as.filter((x) => x.key !== k))} onToevoegen={() => setArtikelen((as) => [...as, { key: key(), naam: "", bedrag: "", vast: false }])} kaart={kaart} kopstijl={kopstijl} inpG={inpG} plus={plus} />
          <BlokOpmerkingen opmerking={opmerking} setOpmerking={setOpmerking} kaart={kaart} kopstijl={kopstijl} inp={inp} />
          <BlokEindcontrole checklist={checklist} updCheck={updCheck} onVerwijder={(k) => setChecklist((cs) => cs.filter((x) => x.key !== k))} onToevoegen={() => setChecklist((cs) => [...cs, { key: key(), naam: "", status: "", notitie: "", vast: false }])} kaart={kaart} kopstijl={kopstijl} inpG={inpG} plus={plus} toggle={toggle} />

          <div style={kaart}>
            <div style={kopstijl}>Interne foto&apos;s · Carburateur {carburateur}</div>
            <div style={{ fontSize: 12.5, color: GRIJS, marginBottom: 10, lineHeight: 1.5 }}>Werkplaats-documentatie, onbeperkt aantal. Deze foto&apos;s zijn <b style={{ color: ROOD }}>niet</b> zichtbaar voor de klant. Wissel bovenaan van carburateur voor de andere set. (De foto&apos;s die je per stadium maakt, zijn wél voor de klant.)</div>
            <button
              type="button"
              onClick={() => { if (!bulkBezig) internInputRef.current?.click(); }}
              disabled={bulkBezig}
              style={{ display: "block", width: "100%", textAlign: "center", background: bulkBezig ? "#cdbe8a" : GOUD, color: "#fff", border: "none", borderRadius: 12, padding: "14px", fontSize: 15, fontWeight: 700, cursor: bulkBezig ? "default" : "pointer" }}
            >
              {bulkBezig ? "Bezig met uploaden..." : `Interne foto's uploaden${internFotos.length ? ` (${internFotos.length})` : ""}`}
            </button>
            <input ref={internInputRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={(e) => { const arr = e.target.files ? Array.from(e.target.files) : []; e.currentTarget.value = ""; if (arr.length) uploadMeerdereFotos(arr); }} />

            {/* Laadbalk tijdens het uploaden */}
            {bulkProg && (
              <div style={{ marginTop: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, color: GRIJS, marginBottom: 5 }}>
                  <span>Foto {Math.min(bulkProg.done + 1, bulkProg.totaal)} van {bulkProg.totaal}</span>
                  <span style={{ fontWeight: 700 }}>{Math.round((bulkProg.done / bulkProg.totaal) * 100)}%</span>
                </div>
                <div style={{ height: 9, background: "#e7e3d9", borderRadius: 999, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${(bulkProg.done / bulkProg.totaal) * 100}%`, background: GROEN, borderRadius: 999, transition: "width .2s" }} />
                </div>
              </div>
            )}

            {/* Resultaat: goed / afgekeurd */}
            {bulkResultaat && (
              <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, fontSize: 14.5, fontWeight: 700 }}>
                {bulkResultaat.gelukt > 0 && <span style={{ color: GROEN }}>✓ {bulkResultaat.gelukt} foto{bulkResultaat.gelukt === 1 ? "" : "'s"} geüpload</span>}
                {bulkResultaat.mislukt > 0 && <span style={{ color: ROOD }}>✕ {bulkResultaat.mislukt} mislukt, probeer die opnieuw</span>}
                {bulkResultaat.mislukt === 0 && bulkResultaat.gelukt === 0 && <span style={{ color: GRIJS }}>Geen foto's gekozen.</span>}
              </div>
            )}

            {/* Escape-hatch: in-app browsers (WhatsApp/Instagram) blokkeren uploaden vaak */}
            <div style={{ fontSize: 12, color: GRIJS, lineHeight: 1.5, marginTop: 12, borderTop: `1px solid ${RAND}`, paddingTop: 10 }}>
              Lukt uploaden niet (bijvoorbeeld geopend vanuit WhatsApp)? Open Revisio in <b>Chrome</b> of <b>Safari</b>.{" "}
              <button type="button" onClick={async () => { try { await navigator.clipboard?.writeText(window.location.href); setLinkGekopieerd(true); setTimeout(() => setLinkGekopieerd(false), 1800); } catch {} }} style={{ border: "none", background: "transparent", color: GROEN, fontWeight: 700, cursor: "pointer", padding: 0, textDecoration: "underline" }}>{linkGekopieerd ? "Link gekopieerd!" : "Kopieer link"}</button>
            </div>

            {internFotos.length > 0 && (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 14, paddingTop: 10, borderTop: `1px solid ${RAND}` }}>
                  <span style={{ fontSize: 13, color: GRIJS, fontWeight: 600 }}>Interne foto&apos;s carburateur {carburateur}</span>
                  <span style={{ fontSize: 18, fontWeight: 800, color: GROEN }}>{internFotos.length}</span>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
                  {internFotos.map((f, idx) => (
                    <div key={f.id} style={{ position: "relative", width: 80 }}>
                      <img src={f.url} alt="" loading="lazy" onClick={() => setLightbox({ fotos: internFotos.map((x: any) => ({ url: x.url, rotatie: x.rotatie || 0 })), start: idx })} style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 8, border: `1px solid ${RAND}`, display: "block", cursor: "pointer", transform: `rotate(${f.rotatie || 0}deg)` }} />
                      <button onClick={() => draaiFoto(f)} title="Draai 90°" style={{ position: "absolute", bottom: -6, right: -6, width: 22, height: 22, borderRadius: 999, border: "none", background: GROEN, color: "#fff", fontSize: 12, cursor: "pointer" }}>↻</button>
                      <button onClick={() => verwijderFoto(f.id)} style={{ position: "absolute", top: -6, right: -6, width: 22, height: 22, borderRadius: 999, border: "none", background: ROOD, color: "#fff", fontSize: 13, cursor: "pointer" }}>×</button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          <button onClick={() => bewaarWerkbon(false)} disabled={bezig} style={knop(opgeslagen ? GOUD : GROEN)}>
            {bezig ? "Opslaan..." : opgeslagen ? "Werkbon opgeslagen" : "Werkbon opslaan"}
          </button>
          <div style={{ fontSize: 12, color: GRIJS, textAlign: "center", marginTop: 8 }}>{autoMelding || "De werkbon slaat zichzelf automatisch op terwijl je werkt."}</div>

          <div style={{ height: "calc(100px + env(safe-area-inset-bottom))" }} />
        </>
      )}

      {open && (
        <div style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 30, background: "#fff", borderTop: `1px solid ${RAND}`, padding: "10px 14px", paddingBottom: "calc(10px + env(safe-area-inset-bottom))", boxShadow: "0 -4px 16px rgba(0,0,0,0.08)" }}>
          <div style={{ maxWidth: 520, margin: "0 auto" }}>
            {!monteur && <div style={{ fontSize: 12, color: ROOD, textAlign: "center", marginBottom: 6 }}>Kies bovenaan je naam om de timer te gebruiken.</div>}
            {start == null
              ? <button disabled={!monteur} onClick={startTimer} style={knop(monteur ? GROEN : "#b9c2bc")}>Start tijd</button>
              : <button onClick={stop} style={knop(ROOD)}>Stop, {mmss(nu - start)} bezig</button>}
          </div>
        </div>
      )}
      {lightbox && <Lightbox fotos={lightbox.fotos} start={lightbox.start} onClose={() => setLightbox(null)} />}
    </main>
  );
}

// Inlogscherm met e-mail magic link. Dit is de zichtbare pagina.
export default function WerkplaatsPagina() {
  const router = useRouter();
  const [ingelogd, setIngelogd] = useState<Monteur | null>(null);
  const [email, setEmail] = useState("");
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState("");
  const [verstuurd, setVerstuurd] = useState(false);
  const [code, setCode] = useState("");
  const [klaar, setKlaar] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Automatisch uitloggen na 2 uur inactiviteit (gedeelde werkplaats-computers).
  useInactiviteitsUitlog(!!ingelogd, uitloggen);

  // Koppel een ingelogd e-mailadres aan een monteur in app_gebruikers.
  // Geen match of niet actief: meteen weer uitloggen en toegang weigeren.
  async function koppelGebruiker(authEmail: string | undefined | null) {
    if (!authEmail) { setIngelogd(null); setIsAdmin(false); return; }
    const adres = authEmail.toLowerCase();
    const { data, error } = await supabase.from("app_gebruikers").select("id, naam, rol, actief, email").ilike("email", adres).limit(1);
    const g = data && data[0];
    const match = g && typeof g.email === "string" && g.email.toLowerCase() === adres;
    if (error || !match || !g!.actief) {
      setFout(error ? "Er ging iets mis, probeer het nog eens." : "Dit e-mailadres heeft geen toegang. Vraag de beheerder om je toe te voegen.");
      await supabase.auth.signOut();
      setIngelogd(null); setIsAdmin(false);
      return;
    }
    setFout("");
    setIngelogd({ id: g!.id as string, naam: g!.naam as string });
    setIsAdmin(g!.rol === "admin");
  }

  // Bij laden de bestaande sessie ophalen en luisteren naar in-/uitloggen.
  // De magic-link-redirect komt ook via onAuthStateChange binnen.
  useEffect(() => {
    let levend = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!levend) return;
      await koppelGebruiker(data.session?.user?.email);
      setKlaar(true);
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      koppelGebruiker(session?.user?.email);
    });
    return () => { levend = false; sub.subscription.unsubscribe(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function inloggen() {
    const adres = email.trim();
    if (!adres) return;
    setBezig(true); setFout("");
    // Magic link landt op de startpagina, net als alle andere logins.
    const { error } = await supabase.auth.signInWithOtp({ email: adres, options: { emailRedirectTo: `${window.location.origin}/start` } });
    if (error) setFout("Versturen mislukt: " + error.message);
    else setVerstuurd(true);
    setBezig(false);
  }

  // Inloggen met de 6-cijferige code uit de mail (geen link klikken nodig).
  async function bevestigCode() {
    const c = code.replace(/\D/g, "");
    if (c.length < 6) return;
    setBezig(true); setFout("");
    const { error } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token: c, type: "email" });
    if (error) { setFout("Code klopt niet of is verlopen. Vraag eventueel een nieuwe aan."); setBezig(false); return; }
    setBezig(false);
    router.push("/start"); // na inloggen naar de startpagina
  }

  async function uitloggen() {
    wisInactiviteit();
    await supabase.auth.signOut();
    setIngelogd(null); setEmail(""); setVerstuurd(false); setCode(""); setFout("");
  }

  const wrapL: CSSProperties = { minHeight: "100vh", background: BG, color: TEKST, fontFamily: "'Karma', Georgia, serif", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 };

  if (!klaar) return <main style={{ ...wrapL, display: "block", padding: "20px 14px", maxWidth: 600 }}><LaadScherm titel="Werkbonnen laden…" apis={[{ naam: "Inloggen controleren", klaar: false }]} /></main>;

  if (ingelogd) return <WerkplaatsApp ingelogd={ingelogd} isAdmin={isAdmin} onUitloggen={uitloggen} />;

  return (
    <main style={wrapL}>
      <div style={{ background: "#fff", border: `1px solid ${RAND}`, borderRadius: 18, padding: 28, maxWidth: 360, width: "100%", boxShadow: KAART_SCHADUW }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: GROEN }} />
          <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", color: GROEN }}>Revisio</span>
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: GROEN, margin: "6px 0 4px" }}>Werkplaats</h1>

        {verstuurd ? (
          <>
            <div style={{ fontSize: 13.5, color: TEKST, lineHeight: 1.5, margin: "12px 0 14px" }}>
              We hebben een <span style={{ fontWeight: 700 }}>inlogcode</span> gestuurd naar <span style={{ fontWeight: 700 }}>{email.trim()}</span>. Typ de code hieronder in. (Op de computer kun je ook gewoon de link in de mail openen.)
            </div>
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 8))}
              onKeyDown={(e) => { if (e.key === "Enter") bevestigCode(); }}
              placeholder="00000000"
              style={{ width: "100%", boxSizing: "border-box", border: `1.5px solid ${RAND}`, borderRadius: 10, padding: "14px", fontSize: 22, letterSpacing: 8, textAlign: "center", marginBottom: 12 }}
            />
            {fout && <div style={{ fontSize: 13, color: ROOD, marginBottom: 12 }}>{fout}</div>}
            <button disabled={bezig || code.length < 6} onClick={bevestigCode} style={{ width: "100%", background: code.length >= 6 ? GROEN : "#b9c2bc", color: "#fff", border: "none", borderRadius: 12, padding: "15px", fontSize: 16, fontWeight: 700, cursor: code.length >= 6 ? "pointer" : "default", marginBottom: 10 }}>
              {bezig ? "Bezig..." : "Inloggen"}
            </button>
            <button onClick={() => { setVerstuurd(false); setCode(""); setFout(""); }} style={{ width: "100%", background: "#fff", color: GROEN, border: `1px solid ${RAND}`, borderRadius: 12, padding: "13px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
              Ander e-mailadres gebruiken
            </button>
          </>
        ) : (
          <>
            <div style={{ fontSize: 13.5, color: GRIJS, marginBottom: 18 }}>Vul je e-mailadres in, dan sturen we je een inlogcode.</div>
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") inloggen(); }}
              placeholder="naam@bedrijf.nl"
              style={{ width: "100%", boxSizing: "border-box", border: `1.5px solid ${RAND}`, borderRadius: 10, padding: "14px 14px", fontSize: 16, marginBottom: 12 }}
            />
            {fout && <div style={{ fontSize: 13, color: ROOD, marginBottom: 12 }}>{fout}</div>}
            <button disabled={bezig || !email.trim()} onClick={inloggen} style={{ width: "100%", background: email.trim() ? GROEN : "#b9c2bc", color: "#fff", border: "none", borderRadius: 12, padding: "15px", fontSize: 16, fontWeight: 700, cursor: email.trim() ? "pointer" : "default" }}>
          {bezig ? "Versturen..." : "Stuur inlogcode"}
        </button>
          </>
        )}
      </div>
    </main>
  );
}
