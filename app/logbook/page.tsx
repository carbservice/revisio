export default function Logbook() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 py-16 px-6">
      <div className="max-w-3xl mx-auto">
        
        <header className="mb-12 pb-6 border-b border-zinc-200 dark:border-zinc-700">
          <p className="text-sm uppercase tracking-widest text-zinc-500 mb-2">Revisio</p>
          <h1 className="text-4xl font-bold text-zinc-900 dark:text-zinc-100">Logboek</h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-2">Wat ik leer en bouw aan Revisio</p>
        </header>

        <article className="space-y-8">
          
          <div className="bg-white dark:bg-zinc-800 rounded-lg p-8 shadow-sm border border-zinc-200 dark:border-zinc-700">
            
            <div className="flex items-baseline justify-between mb-6 pb-4 border-b border-zinc-100 dark:border-zinc-700">
              <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">Dag 1</h2>
              <span className="text-sm text-zinc-500">1 juni 2026 · 4 uur</span>
            </div>

            <Section title="Tools geïnstalleerd">
              <Item>Python — voor API koppelingen</Item>
              <Item>Node.js — motor voor Next.js</Item>
              <Item>VS Code — code editor</Item>
              <Item>Git — versie beheer</Item>
            </Section>

            <Section title="Accounts aangemaakt">
              <Item>GitHub (carbservice) — cloud code opslag</Item>
              <Item>Supabase (Revisio) — cloud database</Item>
              <Item>Vercel — hosting voor live URL</Item>
            </Section>

            <Section title="Eerste Next.js app gebouwd">
              <Item>Lokaal: localhost:3000</Item>
              <Item>
                Live: <a href="https://revisio-umber.vercel.app" className="text-blue-600 dark:text-blue-400 underline">revisio-umber.vercel.app</a>
              </Item>
            </Section>

            <Section title="Supabase verbinding">
              <Item>Testtabel <code className="bg-zinc-100 dark:bg-zinc-700 px-1.5 py-0.5 rounded text-sm">test</code> aangemaakt</Item>
              <Item>Homepage haalt data uit Supabase</Item>
              <Item>Row Level Security uitgeschakeld voor testen</Item>
            </Section>

            <Section title="Wat ik geleerd heb">
              <Item>Verschil localhost vs live op Vercel</Item>
              <Item>API keys horen in <code className="bg-zinc-100 dark:bg-zinc-700 px-1.5 py-0.5 rounded text-sm">.env.local</code>, nooit in de code</Item>
              <Item>Server herstarten na elke wijziging in env file</Item>
              <Item>Vercel environment variables apart instellen</Item>
            </Section>

            <Section title="Volgende stap (Dag 2)">
              <Item>Echte tabellen ontwerpen: klanten, voertuigen, revisies</Item>
              <Item>Eerste Moneybird API koppeling</Item>
            </Section>

          </div>
        </article>

      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6 last:mb-0">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">{title}</h3>
      <ul className="space-y-2">{children}</ul>
    </div>
  )
}

function Item({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3 text-zinc-700 dark:text-zinc-300">
      <span className="text-zinc-400 mt-1.5">•</span>
      <span className="leading-relaxed">{children}</span>
    </li>
  )
}