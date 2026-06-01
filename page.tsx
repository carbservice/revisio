# Revisio Logboek
export default function Logboek() {
  return (
    <div style={{ padding: '40px', fontFamily: 'system-ui', maxWidth: '800px', margin: '0 auto', lineHeight: '1.7' }}>
      <h1>Revisio Logboek</h1>

      <h2>Dag 1 — 1 juni 2026</h2>
      <p><strong>Sessie:</strong> 13:20 – 17:30 · ~4 uur</p>

      <h3>Tools geïnstalleerd</h3>
      <ul>
        <li><strong>Python</strong> — programmeertaal voor de API koppelingen</li>
        <li><strong>Node.js</strong> — motor waarop Next.js draait</li>
        <li><strong>VS Code</strong> — editor voor mijn code</li>
        <li><strong>Git</strong> — versie beheer systeem</li>
      </ul>

      <h3>Accounts aangemaakt</h3>
      <ul>
        <li><strong>GitHub</strong> (carbservice) — cloud opslag voor code</li>
        <li><strong>Supabase</strong> (Revisio) — cloud database</li>
        <li><strong>Vercel</strong> — hosting voor de live URL</li>
      </ul>

      <h3>Eerste Next.js app gebouwd</h3>
      <ul>
        <li>Live op <a href="https://revisio-umber.vercel.app" style={{color:'#0070f3'}}>revisio-umber.vercel.app</a></li>
        <li>Framework: Next.js 16.2.6 met TypeScript en Tailwind</li>
      </ul>

      <h3>Supabase verbinding gemaakt</h3>
      <ul>
        <li>Testtabel <code>test</code> aangemaakt met kolom <code>bericht</code></li>
        <li>Homepage haalt nu data uit Supabase</li>
        <li>Row Level Security uitgeschakeld voor de test</li>
      </ul>

      <h3>Wat ik geleerd heb</h3>
      <ul>
        <li>Verschil tussen localhost (lokaal) en Vercel (live op internet)</li>
        <li>API keys horen in <code>.env.local</code>, nooit in de code</li>
        <li>Server herstarten na elke wijziging in <code>.env.local</code></li>
        <li>Row Level Security blokkeert standaard alle data</li>
      </ul>

      <h3>Volgende stap (Dag 2)</h3>
      <ul>
        <li>Echte Revisio tabellen ontwerpen: klanten, voertuigen, revisies, foto&apos;s</li>
        <li>Eerste Moneybird API koppeling om offertes binnen te halen</li>
      </ul>
    </div>
  )
}