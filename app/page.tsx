import { supabase } from '@/lib/supabase'

export default async function Home() {
  await supabase.from('test').select('*')

  return (
    <div className="min-h-screen" style={{ 
      background: 'linear-gradient(135deg, #f5f1e8 0%, #e8ede4 50%, #d8e3d4 100%)',
      fontFamily: "'Karma', 'Times New Roman', serif"
    }}>
      
      <link href="https://fonts.googleapis.com/css2?family=Karma:wght@300;400;500;600;700&display=swap" rel="stylesheet" />

      <nav className="absolute top-0 right-0 left-0 px-8 py-5 flex items-center justify-between">
        <div className="text-xs uppercase tracking-widest" style={{ color: '#1a3c2e', opacity: 0.7 }}>
          Carburateur
        </div>
        <div className="flex items-center gap-8 text-sm" style={{ color: '#1a3c2e' }}>
          <a href="#order" className="hover:opacity-70 transition-opacity">Volg Uw Order</a>
          <a href="https://www.carbservice.nl" className="hover:opacity-70 transition-opacity">Contact</a>
          <a href="/logbook" className="hover:opacity-70 transition-opacity flex items-center gap-1.5">
            <span style={{ color: '#1a3c2e' }}>⚙</span> Admin
          </a>
        </div>
      </nav>

      <section className="px-6 pt-32 pb-20">
        <div className="max-w-3xl mx-auto text-center">
          
          <div className="mb-12 flex justify-center">
            <div className="text-center">
              <h1 
                className="text-5xl md:text-6xl tracking-wide"
                style={{ 
                  color: '#1a3c2e', 
                  fontFamily: "'Karma', serif",
                  fontWeight: 400,
                  letterSpacing: '0.02em'
                }}
              >
                Carburateur
              </h1>
              <p 
                className="text-xs uppercase tracking-[0.4em] mt-1"
                style={{ color: '#1a3c2e', opacity: 0.8 }}
              >
                Service
              </p>
            </div>
          </div>

          <p 
            className="text-xs uppercase tracking-[0.3em] mb-8"
            style={{ color: '#1a3c2e' }}
          >
            Specialisten in klassiekers
          </p>

          <h2 
            className="text-6xl md:text-7xl mb-2"
            style={{ 
              color: '#1a1a1a',
              fontFamily: "'Karma', serif",
              fontWeight: 400,
              lineHeight: 1.1
            }}
          >
            Volg Uw
          </h2>
          <h2 
            className="text-6xl md:text-7xl italic mb-8"
            style={{ 
              color: '#2d6b4c',
              fontFamily: "'Karma', serif",
              fontWeight: 400,
              fontStyle: 'italic',
              lineHeight: 1.1
            }}
          >
            Carburateur Revisie
          </h2>

          <p 
            className="text-lg mb-12 max-w-xl mx-auto"
            style={{ color: '#4a4a4a', lineHeight: 1.6 }}
          >
            Bekijk realtime de voortgang van uw revisie met foto's van elke fase.
          </p>

          <form action="/volg" method="get" className="flex flex-col sm:flex-row gap-3 max-w-2xl mx-auto" id="order">
            <input
              name="nr"
              type="text"
              required
              placeholder="Ordernummer (bijv. 2026-0587)"
              className="flex-1 px-5 py-4 rounded-lg bg-white/80 backdrop-blur border border-zinc-200 text-zinc-800 placeholder-zinc-400 focus:outline-none focus:border-green-700 transition-colors"
              style={{ fontFamily: "'Karma', serif" }}
            />
            <input
              name="code"
              type="text"
              required
              placeholder="Code"
              className="w-full sm:w-40 px-5 py-4 rounded-lg bg-white/80 backdrop-blur border border-zinc-200 text-zinc-800 placeholder-zinc-400 focus:outline-none focus:border-green-700 transition-colors uppercase tracking-widest"
              style={{ fontFamily: "'Karma', serif" }}
            />
            <button
              type="submit"
              className="px-8 py-4 rounded-lg text-white font-medium flex items-center justify-center gap-2 transition-all hover:shadow-lg"
              style={{ backgroundColor: '#2d6b4c', fontFamily: "'Karma', serif" }}
            >
              Bekijk Status →
            </button>
          </form>

          <div className="flex items-center justify-center gap-2 mt-8 text-sm" style={{ color: '#2d6b4c' }}>
            <span>◔</span>
            <span>Live updates met foto's van elke fase</span>
          </div>

        </div>
      </section>

      <section className="px-6 py-20">
        <div className="max-w-5xl mx-auto">
          <p 
            className="text-xs uppercase tracking-[0.3em] text-center mb-12"
            style={{ color: '#1a3c2e' }}
          >
            De stadia van uw revisie
          </p>
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Stage name="Ontvangen" desc="Intake en eerste check" />
            <Stage name="Diagnose" desc="Inspectie en analyse" />
            <Stage name="In revisie" desc="Monteur aan de slag" />
            <Stage name="Afgesteld" desc="Getest op de bank" />
            <Stage name="Klaar" desc="Klaar om af te halen" />
          </div>
        </div>
      </section>

      <footer className="px-6 py-12 text-center" style={{ color: '#1a3c2e' }}>
        <p className="text-sm">
          Carburateur Service Nederland · Huizerweg 49, 1401 GH Bussum
        </p>
        <p className="text-xs mt-2 opacity-70">
          <a href="https://www.carbservice.nl" className="hover:opacity-100">www.carbservice.nl</a>
          {' · '}
          <a href="tel:+31653864208">+31 6 53864208</a>
        </p>
      </footer>

    </div>
  )
}

function Stage({ name, desc }: { name: string; desc: string }) {
  return (
    <div 
      className="bg-white/60 backdrop-blur rounded-lg p-5 text-center border border-white/40"
    >
      <p 
        className="font-medium text-base mb-1"
        style={{ color: '#1a3c2e', fontFamily: "'Karma', serif" }}
      >
        {name}
      </p>
      <p className="text-xs" style={{ color: '#4a4a4a' }}>
        {desc}
      </p>
    </div>
  )
}