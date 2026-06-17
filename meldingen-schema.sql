-- Revisio planningsbord -- meldingen (Laag 1). Eenmalig in de Supabase
-- SQL-editor plakken en draaien. Veilig om opnieuw te draaien.

create table if not exists melding (
  id        uuid primary key default gen_random_uuid(),
  ontvanger text not null,                          -- TEAM-code: CG/JM/LE/LV/RW/OS
  kaart_id  uuid references kaart (id) on delete cascade,
  van       text not null default '',               -- wie het veroorzaakte (naam)
  tekst     text not null default '',
  soort     text not null default 'tag',            -- 'tag' | 'lid' | 'activiteit'
  gelezen   boolean not null default false,
  tijdstip  timestamptz not null default now()
);
create index if not exists melding_ontvanger_idx on melding (ontvanger, gelezen, tijdstip);

-- Realtime, zodat het belletje meteen oplicht.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'melding'
  ) then
    execute 'alter publication supabase_realtime add table public.melding';
  end if;
end $$;

-- RLS uit, net als de rest van Revisio (vrijdag 19 juni weer aan met policies).
alter table melding disable row level security;
