import { supabase } from '@/lib/supabase'

export default async function Home() {
  const { data, error } = await supabase.from('test').select('*')

  return (
    <div style={{ padding: '40px', fontFamily: 'system-ui' }}>
      <h1>Revisio</h1>
      <p>Bericht uit Supabase:</p>
      {error && <p style={{ color: 'red' }}>Error: {error.message}</p>}
      {data && data.map((row: any) => (
        <p key={row.id} style={{ fontSize: '20px' }}>{row.bericht}</p>
      ))}
    </div>
  )
}