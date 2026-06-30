"use client";

// Landingspagina + funnel voor Rin (YourPersonalPaparazzi). app/rin/page.tsx
// Insteek: last-minute trouwfotografie (binnen 5 dagen) + fly-on-the-wall +
// ontzorgen. Kloppend hart: "een hele dag in 8 foto's". NL hoofdtaal + EN-
// schakelaar. Positieve taal overal (vermijd negatieve woorden). Conversie:
// emotie (vliegt voorbij) -> zekerheid (zo werkt het) -> vragen weg (FAQ) ->
// aanvraag, met buttons verspreid. Foto's uit Supabase rin-portfolio.

import { useState, useEffect, useMemo, CSSProperties } from "react";

// Huisstijl YourPersonalPaparazzi (yourpersonalpaparazzi.eu): warm aards palet,
// geometrische sans (Izmir -> Jost als gratis match) + Cormorant als kop-serif.
const INKT = "#2e2b25";   // warm donkerbruin (haar hoofd-donker)
const CREME = "#f5f3f0";  // crème achtergrond
const GOUD = "#a8805a";   // warm terracotta/tan accent (haar #a07656 / #d1a585)
const ZACHT = "#807c6e";  // gedempt olijf/taupe voor rustige tekst (haar #80826b)
const RAND = "#e4ded3";   // zachte warme rand

type Occ = "bruiloft" | "portret" | "anders";
type Lang = "nl" | "en";

const COPY = {
  nl: {
    navBook: "Plan jullie dag",
    heroEyebrow: "Last-minute trouwfotograaf · binnen 5 dagen",
    heroH1a: "Jullie mooiste dag,",
    heroH1b: "precies zoals 'ie was.",
    heroSub: "Een fly on the wall die de echte momenten vangt. Jullie zijn gewoon jezelf, ik neem de rest uit handen · en jullie houden je dag voor altijd. Ook last-minute, binnen 5 dagen.",
    heroCta: "Check mijn beschikbaarheid",
    heroCta2: "Een hele dag in 8 foto's",
    heroTrust: "Binnen 5 dagen mogelijk · alles uit handen · galerij snel in je inbox",
    storyEyebrow: "Een hele dag in 8 foto's",
    storyTitle: "Dit is wat jullie krijgen",
    storyIntro: "Van de eerste vlinders tot het laatste stuk taart. Echte, ongedwongen momenten · precies zoals jullie ze zullen herinneren.",
    captions: [
      "Het opmaken, de vlinders, de stilte voor het grote moment.",
      "De jurk · de details waar maanden liefde in zaten.",
      "Even helemaal jezelf, vlak voor de grote stap.",
      "Onderweg, op weg naar het moment.",
      "Elkaar aankijken, alsof de wereld heel even stilstaat.",
      "De pure vreugde, helemaal echt.",
      "Het eerste stuk taart, de eerste lach van de avond.",
      "En dan, heel even, alleen jullie twee.",
    ],
    bandLine1: "Iedereen zegt dat je dag voorbijvliegt.",
    bandLine2: "Ik zorg dat je 'm voor altijd terugkrijgt.",
    quickMonth: "Kan het nog deze maand?",
    whyTitle: "Jullie leven de dag. Ik vang 'm.",
    why: [
      ["Fly on the wall", "Ik beweeg mee op de achtergrond en vang de echte momenten, precies zoals ze gebeuren."],
      ["Last-minute kan", "Een vrije agenda betekent dat ik er binnen 5 dagen kan zijn. Juist als het snel moet."],
      ["Alles uit handen", "Ik plan, ik kom, ik lever. Jullie genieten gewoon van jullie dag."],
      ["Snel in je inbox", "Een eerste selectie van de mooiste momenten, razendsnel terug."],
    ],
    howTitle: "Zo werkt het",
    howSteps: [
      ["Je aanvraag", "Eén minuutje, vrijblijvend."],
      ["Kort persoonlijk belletje", "We bespreken samen jullie dag."],
      ["Ik kom & vang de dag", "Jullie genieten, ik neem de rest uit handen."],
      ["Galerij snel in je inbox", "Een eerste selectie terwijl je nog nageniet."],
    ],
    faqTitle: "Goed om te weten",
    faq: [
      ["Kan het echt last-minute?", "Ja. Ik hou bewust ruimte vrij in mijn agenda, juist hiervoor · vaak binnen 5 dagen. Vraag het gerust, dan weet je het meteen."],
      ["Mogen we gewoon onszelf zijn?", "Heel graag zelfs. Jullie beleven de dag, ik beweeg mee op de achtergrond en vang het echte. Je voelt je zo op je gemak."],
      ["Wat kost het?", "Elke dag is anders, dus ik maak een eerlijk voorstel op maat. Laat je gegevens achter, dan weet je vrijblijvend precies waar je aan toe bent."],
      ["Hoe snel krijgen we de foto's?", "Een eerste selectie razendsnel, vaak terwijl je nog nageniet van de dag."],
      ["Onze dag is helemaal van onszelf.", "Daar hou ik van. Groot of klein, kasteel of stadhuis · elke liefde leg ik net zo mooi vast."],
      ["Elk weer, elk moment?", "Regen of zon, ik maak er prachtige, echte beelden van. Ik blijf rustig en denk met jullie mee."],
    ],
    faqNudge: "Nog een vraag? Stel 'm gerust, helemaal vrijblijvend.",
    funnelEyebrow: "Even kennismaken",
    funnelTitle: "Laten we jullie dag vastleggen",
    funnelSub: "Een paar korte vragen, dan neem ik snel persoonlijk contact op.",
    step: "Stap", of: "van", back: "← Terug",
    q1: "Waarvoor zoek je me?",
    occasions: [
      ["bruiloft", "Bruiloft", "Last-minute kan · binnen 5 dagen"],
      ["portret", "Portret", "Jij, zoals je echt bent"],
      ["anders", "Een ander moment", "Familie, feest of mijlpaal"],
    ],
    q2: "Wanneer dromen jullie van?",
    q2line: "Juist als het snel moet, ben ik op m'n best.",
    whenOpts: ["Binnen 5 dagen 🔥", "Deze maand", "Over een paar maanden", "Ik denk nog na"],
    q3: "Waar kan ik je bereiken?",
    q3line: "Jullie dag krijgt vorm · laat je gegevens achter en ik breng 'm tot leven.",
    recapTitle: "Jullie aanvraag tot nu toe",
    rOcc: "Gelegenheid", rWhen: "Wanneer",
    name: "Naam", email: "E-mail", phone: "Telefoon",
    noteLabel: "Vertel kort over jullie dag",
    notePh: "De datum, de locatie, de mensen, het gevoel...",
    submit: "Verstuur mijn aanvraag", sending: "Versturen…",
    noob: "Vrijblijvend. Meestal reageer ik binnen een dag.",
    thanks: "Bedankt", thanksSub: "Jullie aanvraag is binnen. Ik neem snel persoonlijk contact op om jullie dag in te plannen.",
    fillAlert: "Vul je naam, e-mail en telefoonnummer in.",
    footerTag: "Be the main character of your own story.",
    footerSub: "Trouw- · portret- · bedrijfsfotografie · Nederland",
  },
  en: {
    navBook: "Plan your day",
    heroEyebrow: "Last-minute wedding photographer · within 5 days",
    heroH1a: "Your most beautiful day,",
    heroH1b: "exactly as it was.",
    heroSub: "A fly on the wall who catches the real moments. You're simply yourselves, I take care of the rest · and you keep your day forever. Last-minute too, within 5 days.",
    heroCta: "Check my availability",
    heroCta2: "A whole day in 8 photos",
    heroTrust: "Possible within 5 days · everything taken care of · gallery fast in your inbox",
    storyEyebrow: "A whole day in 8 photos",
    storyTitle: "This is what you get",
    storyIntro: "From the first butterflies to the last slice of cake. Real, easy moments · exactly as you'll remember them.",
    captions: [
      "Getting ready, the butterflies, the calm before the big moment.",
      "The dress · the details with months of love in them.",
      "A moment fully yourself, just before the big step.",
      "On the way, toward the moment.",
      "Looking at each other, like the world stands still for a second.",
      "Pure joy, completely real.",
      "The first slice of cake, the first laugh of the night.",
      "And then, just for a moment, only the two of you.",
    ],
    bandLine1: "Everyone says your day flies by.",
    bandLine2: "I make sure you get it back, forever.",
    quickMonth: "Could it still be this month?",
    whyTitle: "You live the day. I keep it.",
    why: [
      ["Fly on the wall", "I move along in the background and catch the real moments, exactly as they happen."],
      ["Last-minute works", "An open agenda means I can be there within 5 days. Exactly when it has to be quick."],
      ["Everything taken care of", "I plan, I show up, I deliver. You simply enjoy your day."],
      ["Fast in your inbox", "A first selection of the most beautiful moments, back in no time."],
    ],
    howTitle: "How it works",
    howSteps: [
      ["Your request", "One minute, no obligations."],
      ["A short personal call", "We talk through your day together."],
      ["I come & capture the day", "You enjoy, I take care of the rest."],
      ["Gallery fast in your inbox", "A first selection while you're still glowing."],
    ],
    faqTitle: "Good to know",
    faq: [
      ["Can it really be last-minute?", "Yes. I deliberately keep room in my agenda, exactly for this · often within 5 days. Just ask, and you'll know right away."],
      ["Can we simply be ourselves?", "I'd love that. You live the day, I move along in the background and catch the real moments. You'll feel at ease in no time."],
      ["What does it cost?", "Every day is different, so I make an honest, tailored proposal. Leave your details and you'll know exactly where you stand, no obligations."],
      ["How fast do we get the photos?", "A first selection super fast, often while you're still glowing from the day."],
      ["Our day is entirely our own.", "I love that. Big or small, castle or town hall · every love, captured just as beautifully."],
      ["Any weather, any moment?", "Rain or shine, I turn it into beautiful, real images. I stay calm and think along with you."],
    ],
    faqNudge: "One more question? Just ask, completely free.",
    funnelEyebrow: "Let's meet",
    funnelTitle: "Let's capture your day",
    funnelSub: "A few quick questions, then I'll personally get back to you fast.",
    step: "Step", of: "of", back: "← Back",
    q1: "What are you looking for?",
    occasions: [
      ["bruiloft", "Wedding", "Last-minute possible · within 5 days"],
      ["portret", "Portrait", "You, as you really are"],
      ["anders", "Another moment", "Family, party or milestone"],
    ],
    q2: "When are you dreaming of?",
    q2line: "Exactly when it has to be soon, that's when I'm at my best.",
    whenOpts: ["Within 5 days 🔥", "This month", "In a few months", "Still thinking"],
    q3: "Where can I reach you?",
    q3line: "Your day is taking shape · leave your details and I'll bring it to life.",
    recapTitle: "Your request so far",
    rOcc: "Occasion", rWhen: "When",
    name: "Name", email: "Email", phone: "Phone",
    noteLabel: "Tell me a little about your day",
    notePh: "The date, the location, the people, the feeling...",
    submit: "Send my request", sending: "Sending…",
    noob: "No obligations. I usually reply within a day.",
    thanks: "Thank you", thanksSub: "Your request is in. I'll personally be in touch very soon to plan your day.",
    fillAlert: "Please fill in your name, email and phone number.",
    footerTag: "Be the main character of your own story.",
    footerSub: "Wedding · portrait · business photography · The Netherlands",
  },
} as const;

const TOTAL = 3;

export default function RinFotografie() {
  const [lang, setLang] = useState<Lang>("nl");
  const t = COPY[lang];

  const [hero, setHero] = useState<string | null>(null);
  const [dag, setDag] = useState<string[]>([]);

  const [step, setStep] = useState(1);
  const [occ, setOcc] = useState<Occ | null>(null);
  const [when, setWhen] = useState("");
  const [faqOpen, setFaqOpen] = useState<number | null>(null);
  const [verzonden, setVerzonden] = useState(false);
  const [bezig, setBezig] = useState(false);
  const [f, setF] = useState({ naam: "", email: "", telefoon: "", bericht: "" });

  useEffect(() => {
    fetch("/api/rin-fotos").then((r) => r.json()).then((d) => {
      setHero(d.hero || null);
      setDag(Array.isArray(d.dag) ? d.dag : []);
    }).catch(() => {});
  }, []);

  const veld = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setF((s) => ({ ...s, [k]: e.target.value }));

  const kies = (fn: (v: string) => void, v: string) => { fn(v); setTimeout(() => setStep((s) => Math.min(s + 1, TOTAL)), 220); };
  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  const snelDezeMaand = () => { setOcc("bruiloft"); setWhen(t.whenOpts[1]); setStep(3); setTimeout(() => scrollTo("funnel"), 30); };

  const occLabel = occ ? (t.occasions.find((o) => o[0] === occ)?.[1] ?? "") : "";
  const recap = useMemo(() => [
    occ && { l: t.rOcc, v: occLabel },
    when && { l: t.rWhen, v: when },
  ].filter(Boolean) as { l: string; v: string }[], [occ, when, lang]); // eslint-disable-line

  async function verstuur(e: React.FormEvent) {
    e.preventDefault();
    if (!f.naam.trim() || !f.email.trim() || !f.telefoon.trim()) { alert(t.fillAlert); return; }
    setBezig(true);
    const brief = recap.map((r) => `${r.l}: ${r.v}`).join("\n") + (f.bericht.trim() ? `\n\n${f.bericht.trim()}` : "");
    try {
      await fetch("/api/rin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ naam: f.naam, email: f.email, telefoon: f.telefoon, type: occ, bericht: brief }) });
    } catch { /* never block */ }
    setVerzonden(true);
  }

  const serif: CSSProperties = { fontFamily: "'Cormorant Garamond', Georgia, serif" };
  const knop: CSSProperties = { display: "inline-flex", alignItems: "center", gap: 9, background: GOUD, color: "#fff", fontWeight: 500, fontSize: 13.5, letterSpacing: ".14em", textTransform: "uppercase", border: "none", borderRadius: 2, padding: "16px 28px", cursor: "pointer", textDecoration: "none" };
  const knopLicht: CSSProperties = { ...knop, background: "transparent", color: "#fff", border: "1px solid rgba(255,255,255,.4)" };
  const knopRand: CSSProperties = { ...knop, background: "transparent", color: INKT, border: `1px solid ${GOUD}` };
  const sec: CSSProperties = { maxWidth: 1120, margin: "0 auto", padding: "0 24px" };
  const eyebrow: CSSProperties = { fontSize: 12, fontWeight: 600, letterSpacing: ".24em", textTransform: "uppercase", color: GOUD };
  const label: CSSProperties = { display: "block", fontSize: 11.5, fontWeight: 600, color: ZACHT, margin: "18px 0 7px", letterSpacing: ".1em", textTransform: "uppercase" };
  const input: CSSProperties = { width: "100%", border: `1px solid ${RAND}`, borderRadius: 2, padding: "13px 15px", fontSize: 15, background: "#fff", color: INKT, fontFamily: "inherit" };
  const chip = (on: boolean): CSSProperties => ({ cursor: "pointer", borderRadius: 40, padding: "13px 22px", fontSize: 15, fontWeight: 500, border: `1.5px solid ${on ? GOUD : RAND}`, background: on ? "#faf5ec" : "#fff", color: INKT });

  return (
    <main style={{ background: CREME, color: INKT, fontFamily: "'Jost', system-ui, sans-serif" }}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Jost:wght@300;400;500;600&display=swap" />
      <style>{`@keyframes rinUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}`}</style>

      {/* TOPBAR */}
      <div style={{ position: "sticky", top: 0, zIndex: 30, background: "rgba(13,11,9,.9)", backdropFilter: "blur(8px)", borderBottom: "1px solid rgba(255,255,255,.08)" }}>
        <div style={{ ...sec, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 24px" }}>
          <span style={{ ...serif, fontSize: 18, color: "#fff", fontWeight: 500 }}>Your<span style={{ color: GOUD }}>Personal</span>Paparazzi</span>
          <div style={{ display: "flex", gap: 2, fontSize: 12.5, fontWeight: 600, letterSpacing: ".06em" }}>
            {(["nl", "en"] as const).map((l, i) => (
              <span key={l} style={{ display: "flex", alignItems: "center" }}>
                {i > 0 && <span style={{ color: "rgba(255,255,255,.3)", margin: "0 2px" }}>/</span>}
                <button onClick={() => setLang(l)} style={{ background: "none", border: "none", cursor: "pointer", padding: "2px 4px", color: lang === l ? GOUD : "rgba(255,255,255,.55)", fontWeight: lang === l ? 700 : 500, fontFamily: "inherit", fontSize: 12.5 }}>{l.toUpperCase()}</button>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* HERO */}
      <section style={{ position: "relative", color: "#fff", minHeight: "min(86vh, 760px)", display: "flex", alignItems: "center", overflow: "hidden", background: "#16130f" }}>
        {hero && <div style={{ position: "absolute", inset: 0, backgroundImage: `url(${hero})`, backgroundSize: "cover", backgroundPosition: "center 35%" }} />}
        <div style={{ position: "absolute", inset: 0, background: hero ? "linear-gradient(180deg, rgba(13,11,9,.55) 0%, rgba(13,11,9,.35) 40%, rgba(13,11,9,.82) 100%)" : "radial-gradient(120% 120% at 70% 10%, #2b251d 0%, #16130f 60%, #0b0907 100%)" }} />
        <div style={{ ...sec, position: "relative", padding: "70px 24px", textAlign: "center" }}>
          <span style={eyebrow}>{t.heroEyebrow}</span>
          <h1 style={{ ...serif, fontSize: "clamp(40px,6.4vw,80px)", fontWeight: 500, lineHeight: 1.04, margin: "20px auto 0", maxWidth: 860, letterSpacing: "-.01em", textShadow: "0 2px 30px rgba(0,0,0,.4)" }}>
            {t.heroH1a} <span style={{ fontStyle: "italic", color: GOUD }}>{t.heroH1b}</span>
          </h1>
          <p style={{ fontSize: 18, color: "rgba(255,255,255,.88)", maxWidth: 600, margin: "24px auto 32px", lineHeight: 1.6, fontWeight: 300, textShadow: "0 1px 14px rgba(0,0,0,.5)" }}>{t.heroSub}</p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={() => scrollTo("funnel")} style={knop}>{t.heroCta}</button>
            <button onClick={() => scrollTo("verhaal")} style={knopLicht}>{t.heroCta2}</button>
          </div>
          <p style={{ fontSize: 12.5, color: "rgba(255,255,255,.72)", marginTop: 26, letterSpacing: ".03em" }}>{t.heroTrust}</p>
        </div>
      </section>

      {/* EEN HELE DAG IN 8 FOTO'S */}
      <section id="verhaal" style={{ padding: "76px 0 84px" }}>
        <div style={sec}>
          <div style={{ textAlign: "center", maxWidth: 640, margin: "0 auto 46px" }}>
            <span style={eyebrow}>{t.storyEyebrow}</span>
            <h2 style={{ ...serif, fontSize: "clamp(30px,4vw,46px)", fontWeight: 500, margin: "12px 0 12px" }}>{t.storyTitle}</h2>
            <p style={{ color: ZACHT, fontSize: 16.5, lineHeight: 1.6 }}>{t.storyIntro}</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 18 }}>
            {t.captions.map((cap, i) => {
              const url = dag[i] || null;
              return (
                <figure key={i} style={{ margin: 0 }}>
                  <div style={{ position: "relative", aspectRatio: "4 / 5", borderRadius: 5, overflow: "hidden", background: "#ece3d4", border: `1px solid ${RAND}` }}>
                    {url ? (
                      <img src={url} alt={cap} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                    ) : (
                      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: GOUD, ...serif, fontSize: 30, opacity: 0.5 }}>✦</div>
                    )}
                    <span style={{ position: "absolute", top: 10, left: 12, ...serif, fontSize: 17, fontWeight: 600, color: "#fff", textShadow: "0 1px 8px rgba(0,0,0,.6)" }}>{String(i + 1).padStart(2, "0")}</span>
                  </div>
                  <figcaption style={{ color: ZACHT, lineHeight: 1.45, marginTop: 10, ...serif, fontStyle: "italic", fontSize: 16 }}>{cap}</figcaption>
                </figure>
              );
            })}
          </div>
        </div>
      </section>

      {/* "VLIEGT VOORBIJ" BAND */}
      <section style={{ background: "linear-gradient(180deg,#1c1814 0%,#0d0b09 100%)", color: "#fff", padding: "78px 0", textAlign: "center" }}>
        <div style={{ ...sec, maxWidth: 760 }}>
          <p style={{ ...serif, fontSize: "clamp(28px,4.2vw,48px)", fontWeight: 500, lineHeight: 1.18 }}>
            {t.bandLine1}<br /><span style={{ fontStyle: "italic", color: GOUD }}>{t.bandLine2}</span>
          </p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap", marginTop: 32 }}>
            <button onClick={() => scrollTo("funnel")} style={knop}>{t.heroCta}</button>
            <button onClick={snelDezeMaand} style={knopLicht}>{t.quickMonth}</button>
          </div>
        </div>
      </section>

      {/* WAAROM / ONTZORGEN */}
      <section style={{ padding: "72px 0" }}>
        <div style={sec}>
          <div style={{ textAlign: "center", maxWidth: 600, margin: "0 auto 44px" }}>
            <h2 style={{ ...serif, fontSize: "clamp(28px,3.6vw,42px)", fontWeight: 500 }}>{t.whyTitle}</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px,1fr))", gap: 30 }}>
            {t.why.map(([tt, d]) => (
              <div key={tt}>
                <div style={{ width: 34, height: 1, background: GOUD, marginBottom: 16 }} />
                <h3 style={{ ...serif, fontSize: 21, fontWeight: 500, marginBottom: 8 }}>{tt}</h3>
                <p style={{ color: ZACHT, fontSize: 14.5, lineHeight: 1.6 }}>{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ZO WERKT HET */}
      <section style={{ background: "#fff", borderTop: `1px solid ${RAND}`, borderBottom: `1px solid ${RAND}`, padding: "72px 0" }}>
        <div style={sec}>
          <div style={{ textAlign: "center", marginBottom: 44 }}>
            <span style={eyebrow}>{t.funnelEyebrow}</span>
            <h2 style={{ ...serif, fontSize: "clamp(28px,3.6vw,42px)", fontWeight: 500, marginTop: 12 }}>{t.howTitle}</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px,1fr))", gap: 26 }}>
            {t.howSteps.map(([tt, d], i) => (
              <div key={tt} style={{ textAlign: "center" }}>
                <div style={{ width: 48, height: 48, borderRadius: "50%", margin: "0 auto 16px", background: "#faf5ec", border: `1px solid ${GOUD}`, color: GOUD, display: "flex", alignItems: "center", justifyContent: "center", ...serif, fontSize: 22, fontWeight: 600 }}>{i + 1}</div>
                <h3 style={{ ...serif, fontSize: 20, fontWeight: 600, marginBottom: 6 }}>{tt}</h3>
                <p style={{ color: ZACHT, fontSize: 14, lineHeight: 1.55, maxWidth: 220, margin: "0 auto" }}>{d}</p>
              </div>
            ))}
          </div>
          <div style={{ textAlign: "center", marginTop: 40 }}>
            <button onClick={() => scrollTo("funnel")} style={knop}>{t.navBook}</button>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section style={{ padding: "72px 0" }}>
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ textAlign: "center", marginBottom: 34 }}>
            <h2 style={{ ...serif, fontSize: "clamp(28px,3.6vw,42px)", fontWeight: 500 }}>{t.faqTitle}</h2>
          </div>
          <div style={{ display: "grid", gap: 12 }}>
            {t.faq.map(([q, a], i) => {
              const open = faqOpen === i;
              return (
                <div key={i} style={{ background: "#fff", border: `1px solid ${open ? GOUD : RAND}`, borderRadius: 6, overflow: "hidden", transition: "border-color .2s" }}>
                  <button type="button" onClick={() => setFaqOpen(open ? null : i)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, background: "none", border: "none", cursor: "pointer", padding: "18px 22px", textAlign: "left", fontFamily: "inherit" }}>
                    <span style={{ ...serif, fontSize: 19, fontWeight: 600, color: INKT }}>{q}</span>
                    <span style={{ color: GOUD, fontSize: 22, lineHeight: 1, transform: open ? "rotate(45deg)" : "none", transition: "transform .2s", flexShrink: 0 }}>+</span>
                  </button>
                  {open && <p style={{ padding: "0 22px 20px", margin: 0, color: ZACHT, fontSize: 15, lineHeight: 1.6, animation: "rinUp .25s ease" }}>{a}</p>}
                </div>
              );
            })}
          </div>
          <div style={{ textAlign: "center", marginTop: 32 }}>
            <p style={{ color: ZACHT, marginBottom: 18, ...serif, fontStyle: "italic", fontSize: 18 }}>{t.faqNudge}</p>
            <button onClick={() => scrollTo("funnel")} style={knopRand}>{t.heroCta}</button>
          </div>
        </div>
      </section>

      {/* FUNNEL */}
      <section id="funnel" style={{ background: "linear-gradient(180deg,#fbf7ef 0%,#f5f0e8 100%)", borderTop: `1px solid ${RAND}`, padding: "80px 0" }}>
        <div style={{ maxWidth: 660, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ textAlign: "center", marginBottom: 30 }}>
            <span style={eyebrow}>{t.funnelEyebrow}</span>
            <h2 style={{ ...serif, fontSize: "clamp(30px,4vw,46px)", fontWeight: 500, margin: "12px 0 10px" }}>{t.funnelTitle}</h2>
            <p style={{ color: ZACHT, fontSize: 16.5, lineHeight: 1.6 }}>{t.funnelSub}</p>
          </div>

          {!verzonden && (
            <div style={{ marginBottom: 26 }}>
              <div style={{ height: 3, background: RAND, borderRadius: 3, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${(step / TOTAL) * 100}%`, background: GOUD, transition: "width .35s ease" }} />
              </div>
              <div style={{ fontSize: 12, color: ZACHT, letterSpacing: ".1em", marginTop: 9, textTransform: "uppercase" }}>{t.step} {step} {t.of} {TOTAL}</div>
            </div>
          )}

          {recap.length > 0 && !verzonden && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
              {recap.map((r) => (
                <span key={r.l} style={{ background: "#fff", border: `1px solid ${RAND}`, borderRadius: 40, padding: "6px 14px", fontSize: 12.5, color: INKT }}>
                  <span style={{ color: GOUD, fontWeight: 600 }}>{r.l}</span> · {r.v}
                </span>
              ))}
            </div>
          )}

          <div style={{ background: "#fff", border: `1px solid ${RAND}`, borderRadius: 8, padding: "38px 30px", boxShadow: "0 18px 50px -30px rgba(40,30,15,.45)" }}>
            {verzonden ? (
              <div style={{ textAlign: "center", animation: "rinUp .4s ease" }}>
                <div style={{ fontSize: 42, color: GOUD }}>✦</div>
                <h3 style={{ ...serif, fontSize: 30, fontWeight: 500, margin: "12px 0 8px" }}>{t.thanks}, {f.naam.split(" ")[0] || ""}!</h3>
                <p style={{ color: ZACHT, fontSize: 16, maxWidth: 430, margin: "0 auto" }}>{t.thanksSub}</p>
              </div>
            ) : (
              <div key={step} style={{ animation: "rinUp .35s ease" }}>
                {step === 1 && (<>
                  <div style={{ textAlign: "center", marginBottom: 24 }}>
                    <h3 style={{ ...serif, fontSize: "clamp(24px,3.2vw,34px)", fontWeight: 500 }}>{t.q1}</h3>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px,1fr))", gap: 14 }}>
                    {t.occasions.map(([k, lbl, d]) => (
                      <button key={k} type="button" onClick={() => kies((v) => setOcc(v as Occ), k)} style={{ ...chip(occ === k), borderRadius: 6, padding: "22px 16px", textAlign: "left", display: "flex", flexDirection: "column", gap: 6 }}>
                        <span style={{ ...serif, fontSize: 22, fontWeight: 600 }}>{lbl}</span>
                        <span style={{ fontSize: 13, color: ZACHT, fontWeight: 400, lineHeight: 1.4 }}>{d}</span>
                      </button>
                    ))}
                  </div>
                </>)}

                {step === 2 && (<>
                  <div style={{ textAlign: "center", marginBottom: 22 }}>
                    <h3 style={{ ...serif, fontSize: "clamp(24px,3.2vw,34px)", fontWeight: 500, marginBottom: 8 }}>{t.q2}</h3>
                    <p style={{ color: ZACHT, fontSize: 15.5, maxWidth: 440, margin: "0 auto", lineHeight: 1.5 }}>{t.q2line}</p>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center" }}>
                    {t.whenOpts.map((o) => <button key={o} type="button" onClick={() => kies(setWhen, o)} style={chip(when === o)}>{o}</button>)}
                  </div>
                </>)}

                {step === 3 && (
                  <form onSubmit={verstuur}>
                    <div style={{ textAlign: "center", marginBottom: 22 }}>
                      <h3 style={{ ...serif, fontSize: "clamp(24px,3.2vw,34px)", fontWeight: 500, marginBottom: 8 }}>{t.q3}</h3>
                      <p style={{ color: ZACHT, fontSize: 15.5, maxWidth: 440, margin: "0 auto", lineHeight: 1.5 }}>{t.q3line}</p>
                    </div>
                    {recap.length > 0 && (
                      <div style={{ background: "#faf5ec", border: `1px solid ${RAND}`, borderRadius: 6, padding: "16px 18px", marginBottom: 18 }}>
                        <div style={{ fontSize: 11.5, letterSpacing: ".1em", textTransform: "uppercase", color: GOUD, fontWeight: 600, marginBottom: 8 }}>{t.recapTitle}</div>
                        {recap.map((r) => <div key={r.l} style={{ fontSize: 14, color: INKT, lineHeight: 1.7 }}><span style={{ color: ZACHT }}>{r.l}:</span> {r.v}</div>)}
                      </div>
                    )}
                    <label style={{ ...label, marginTop: 0 }}>{t.name} *</label>
                    <input style={input} value={f.naam} onChange={veld("naam")} required />
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                      <div><label style={label}>{t.email} *</label><input style={input} type="email" value={f.email} onChange={veld("email")} required /></div>
                      <div><label style={label}>{t.phone} *</label><input style={input} type="tel" value={f.telefoon} onChange={veld("telefoon")} required /></div>
                    </div>
                    <label style={label}>{t.noteLabel}</label>
                    <textarea style={{ ...input, minHeight: 84, resize: "vertical" }} value={f.bericht} onChange={veld("bericht")} placeholder={t.notePh} />
                    <button type="submit" disabled={bezig} style={{ ...knop, width: "100%", justifyContent: "center", marginTop: 22, opacity: bezig ? 0.7 : 1 }}>{bezig ? t.sending : t.submit}</button>
                    <p style={{ textAlign: "center", fontSize: 12.5, color: ZACHT, marginTop: 13 }}>{t.noob}</p>
                  </form>
                )}

                {step > 1 && (
                  <div style={{ textAlign: "center" }}>
                    <button type="button" onClick={() => setStep((s) => Math.max(1, s - 1))} style={{ background: "none", border: "none", color: ZACHT, cursor: "pointer", fontSize: 13, letterSpacing: ".06em", marginTop: 24, fontFamily: "inherit" }}>{t.back}</button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      <footer style={{ background: "#0d0b09", color: "rgba(255,255,255,.65)", padding: "44px 0", textAlign: "center" }}>
        <div style={sec}>
          <div style={{ ...serif, fontSize: 22, color: "#fff", fontWeight: 500 }}>Your<span style={{ color: GOUD }}>Personal</span>Paparazzi</div>
          <p style={{ ...serif, fontSize: 16, fontStyle: "italic", marginTop: 10 }}>{t.footerTag}</p>
          <p style={{ fontSize: 12.5, marginTop: 12, letterSpacing: ".04em" }}>{t.footerSub}</p>
        </div>
      </footer>
    </main>
  );
}
