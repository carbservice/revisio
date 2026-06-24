// Persoonlijke welkomstpagina voor Rin Hortulanus. app/rin/page.tsx

export const metadata = { title: "Hey Rin" };

export default function RinPagina() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: 24,
        background: "linear-gradient(140deg,#27593f 0%,#1a3c2e 55%,#102a1f 100%)",
        color: "#fff",
        fontFamily: "'Karma', Georgia, serif",
      }}
    >
      <div style={{ position: "relative" }}>
        <div style={{ fontSize: "clamp(46px,12vw,120px)", fontWeight: 800, letterSpacing: -2, lineHeight: 1 }}>
          HEY BITCH 👋
        </div>
        <div style={{ fontSize: "clamp(20px,4vw,34px)", marginTop: 18, color: "#e9cd8a", fontWeight: 700 }}>
          Welkom, Rin Hortulanus
        </div>
        <p style={{ marginTop: 16, fontSize: 16, color: "rgba(255,255,255,.8)", maxWidth: 480, marginInline: "auto" }}>
          Speciaal voor jou een eigen plekje op de site. Gebouwd met liefde (en een knipoog) door het Carbservice team.
        </p>
      </div>
    </main>
  );
}
