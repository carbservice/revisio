-- Klant-akkoord voor extra kosten (verhoging indicatieve offerte).
-- Eenmalig plakken in de Supabase SQL-editor.
-- De admin/manager maakt het verzoek in de werkbon; de klant tekent op /volg.

create table if not exists klant_akkoord (
  id               uuid primary key default gen_random_uuid(),
  klus_id          text not null,
  omschrijving     text not null default '',
  bedrag           numeric,                         -- extra kosten ex/incl, vrij in te vullen
  status           text not null default 'open',    -- open | akkoord | afgewezen
  voornaam         text,
  achternaam       text,
  handtekening     text,                            -- data-URL van de getekende handtekening
  aangevraagd_door text,                            -- admin/manager die het verzoek maakte
  aangemaakt_op    timestamptz not null default now(),
  beantwoord_op    timestamptz
);
create index if not exists klant_akkoord_klus_idx on klant_akkoord (klus_id, aangemaakt_op);

-- RLS voorlopig uit (zoals de rest van Revisio); vrijdag 19 juni dicht.
alter table klant_akkoord disable row level security;

-- Realtime (zodat de werkbon/het bord live het akkoord zien binnenkomen).
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='klant_akkoord') then
    execute 'alter publication supabase_realtime add table public.klant_akkoord';
  end if;
end $$;
