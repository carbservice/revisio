export default function Logbook() {
  return (
    <div style={{ padding: '40px', fontFamily: 'system-ui', maxWidth: '800px', margin: '0 auto', lineHeight: '1.7' }}>
      <h1>Revisio Logboek</h1>
      <h2>Dag 1 — 1 juni 2026</h2>
      <p>Sessie: 13:20 – 17:30 (~4 uur)</p>

      <h3>Tools geïnstalleerd</h3>
      <ul>
        <li>Python, Node.js, VS Code, Git</li>
      </ul>

      <h3>Accounts aangemaakt</h3>
      <ul>
        <li>GitHub (carbservice), Supabase (Revisio), Vercel</li>
      </ul>

      <h3>Eerste Next.js app</h3>
      <ul>
        <li>Lokaal: localhost:3000</li>
        <li>Live: <a href="https://revisio-umber.vercel.app" style={{color:'#0070f3'}}>revisio-umber.vercel.app</a></li>
      </ul>

      <h3>Supabase verbinding</h3>
      <ul>
        <li>Testtabel <code>test</code> met kolom <code>bericht</code></li>
        <li>Homepage haalt data uit Supabase</li>
      </ul>

      <h3>Volgende stap</h3>
      <ul>
        <li>Echte tabellen ontwerpen: klanten, voertuigen, revisies</li>
        <li>Moneybird API koppeling</li>
      </ul>
    </div>
  )
}