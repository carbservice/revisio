-- RLS stap 2: alle data-tabellen op slot met de is_staff()-policy.
-- app_gebruikers zit hier BEWUST NIET bij (login-kritisch, doen we apart).
-- Idempotent: drop eerst alle bestaande policies, dan RLS aan + strikte policy.
-- Plak in de Supabase SQL-editor en Run.

do $$
declare
  t text;
  p record;
  tabellen text[] := array[
    -- werkbon/klus-data
    'klus_fotos','klus_voortgang','tijdregels',
    'werkbon_artikelen','werkbon_checklist','werkbon_links','werkbon_log',
    'werkbon_meting','werkbon_opmerking','werkbon_retour',
    -- planningsbord
    'kaart','kaart_bericht','kaart_checklist_item','kaart_lid',
    'klant_akkoord','melding',
    -- hub (achter login)
    'hub_carburateurs','hub_instel_labels','hub_onderdelen',
    'hub_tags','hub_toepassingen','hub_uitvoeringen',
    -- overig
    'monteurs','test'
  ];
begin
  foreach t in array tabellen loop
    -- alle bestaande policies van de tabel weghalen
    for p in select policyname from pg_policies
             where schemaname = 'public' and tablename = t loop
      execute format('drop policy if exists %I on public.%I', p.policyname, t);
    end loop;
    -- RLS aan + alleen personeel
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy staff_alles on public.%I for all using (public.is_staff()) with check (public.is_staff())', t);
  end loop;
end $$;


-- ====== ROLLBACK (alles weer open) ======
-- do $$
-- declare t text;
-- begin
--   foreach t in array array[
--     'klus_fotos','klus_voortgang','tijdregels','werkbon_artikelen','werkbon_checklist',
--     'werkbon_links','werkbon_log','werkbon_meting','werkbon_opmerking','werkbon_retour',
--     'kaart','kaart_bericht','kaart_checklist_item','kaart_lid','klant_akkoord','melding',
--     'hub_carburateurs','hub_instel_labels','hub_onderdelen','hub_tags','hub_toepassingen',
--     'hub_uitvoeringen','monteurs','test'] loop
--     execute format('alter table public.%I disable row level security', t);
--   end loop;
-- end $$;
