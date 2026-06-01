import { supabase } from '@/lib/supabase'

export default async function Home() {
  const { data } = await supabase.from('test').select('*')

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f7f4ef' }}>
      
      {/* Header */}
      <header className="border-b border-zinc-200 py-6 px-6" style={{ backgroundColor: '#1a3c2e' }}>
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest" style={{ color: '#b8962e' }}>Carburateur Service Nederland</p>
            <h1 className="text-2xl font-bold text-white mt-1">Revisio</h1>
          </div>
          <a href="/logbook" className="text-sm text-zinc-300 hover:text-white transition-colors">
            Logboek →
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="px-6 py-20" style={{ backgroundColor: '#1a3c2e' }}>
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-xs uppercase tracking-widest mb-4" style={{ color: '#b8962e' }}>
            Auto · Motor · Boot · Pre-war
          </p>
          <h2 className="text-4xl md:text-5xl font-bold text-white leading-tight mb-6">
            Volg jouw revisie live op onze werkbank
          </h2>
          <p className="text-lg text-zinc-300 leading-relaxed max-w-2xl mx-auto">
            Stap voor stap zie je hoe jouw carburateur door onze handen gaat. 
            Van demontage tot afstelling — met foto's en updates van onze monteurs.
          </p>
        </div>
      </section>

      {/* Stages preview */}
      <section className="px-6 py-16">
        <div className="max-w-5xl mx-auto">
          <h3 className="text-xs uppercase tracking-widest text-zinc-500 mb-8 text-center">De stadia van een revisie</h3>
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Stage number="1" name="Ontvangen" desc="Intake en eerste check" />
            <Stage number="2" name="Diagnose" desc="Inspectie en analyse" />
            <Stage number="3" name="In revisie" desc="Monteur aan de slag" />
            <Stage number="4" name="Afgesteld" desc="Getest op de bank" />
            <Stage number="5" name="Klaar" desc="Klaar om af te halen" />
          </div>
        </div>
      </section>

      {/* Status */}
      <section className="px-6 py-12 border-t border-zinc-200">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-lg p-8 border border-zinc-200">
            <p className="text-xs uppercase tracking-widest text-zinc-500 mb-3">Status platform</p>
            <p className="text-zinc-700 leading-relaxed">
              Revisio is in opbouw. De koppeling met onze offertes en facturen 
              wordt momenteel ingericht — binnenkort kun je hier jouw revisie live volgen.
            </p>
            {data && data.length > 0 && (
              <div className="mt-4 pt-4 border-t border-zinc-100">
                <p className="text-xs text-zinc-500 mb-1">Eerste databaseverbinding actief</p>
                {data.map((row: any) => (
                  <p key={row.id} className="text-sm text-zinc-700">✓ {row.bericht}</p>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-8 mt-12 border-t border-zinc-200" style={{ backgroundColor: '#1a2820' }}>
        <div className="max-w-5xl mx-auto text-center">
          <p className="text-xs text-zinc-400">
            Carburateur Service Nederland · Huizerweg 49, 1401 GH Bussum · +31 6 53864208
          </p>
          <p className="text-xs text-zinc-500 mt-2">
            <a href="https://www.carbservice.nl" className="hover:text-zinc-300">www.carbservice.nl</a>
          </p>
        </div>
      </footer>

    </div>
  )
}

function Stage({ number, name, desc }: { number: string; name: string; desc: string }) {
  return (
    <div className="bg-white rounded-lg p-5 border border-zinc-200 text-center">
      <div 
        className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm mx-auto mb-3"
        style={{ backgroundColor: '#b8962e' }}
      >
        {number}
      </div>
      <p className="font-bold text-sm" style={{ color: '#1a3c2e' }}>{name}</p>
      <p className="text-xs text-zinc-500 mt-1">{desc}</p>
    </div>
  )
}