-- Revisio planningsbord (intern kanban) -- Supabase schema.
-- Eenmalig plakken in de Supabase SQL-editor (project Revisio).
-- Veilig om opnieuw te draaien: alles is "if not exists".
--
-- De klus is de bron: klus_id is dezelfde sleutel als in de werkbon-app
-- (werkbon_links.klus_id) en in Moneybird (estimate id). Het bord en de
-- werkbon-app zijn twee vensters op dezelfde klus.

-- 1) Kaarten ----------------------------------------------------------------
create table if not exists kaart (
  id               uuid primary key default gen_random_uuid(),
  klus_id          text,                         -- Moneybird estimate id; leeg bij planningskaart
  type             text not null default 'klus', -- 'klus' of 'planning'
  titel            text not null default '',
  omschrijving     text not null default '',
  fase             text not null default 'binnenkomst',
  positie          double precision not null default 0,
  entered_stage_at timestamptz not null default now(),  -- verouderingsklok, reset bij kolomwissel
  gefactureerd     boolean not null default false,      -- uit Moneybird-factuurstatus
  archief          boolean not null default false,
  aangemaakt_op    timestamptz not null default now()
);

alter table kaart add column if not exists klus_id text;
alter table kaart add column if not exists type text not null default 'klus';
alter table kaart add column if not exists titel text not null default '';
alter table kaart add column if not exists omschrijving text not null default '';
alter table kaart add column if not exists fase text not null default 'binnenkomst';
alter table kaart add column if not exists positie double precision not null default 0;
alter table kaart add column if not exists entered_stage_at timestamptz not null default now();
alter table kaart add column if not exists gefactureerd boolean not null default false;
alter table kaart add column if not exists archief boolean not null default false;
alter table kaart add column if not exists aangemaakt_op timestamptz not null default now();
-- Zet op true zodra iemand de kaart handmatig versleept; dan laat de
-- automatische verschuiving (monteur-status) die kaart met rust.
alter table kaart add column if not exists hand_verplaatst boolean not null default false;

create index if not exists kaart_fase_idx on kaart (fase, positie);
-- Eén klus-kaart per klus_id (voorkomt dubbele kaarten bij elke sync).
create unique index if not exists kaart_klus_uniek
  on kaart (klus_id) where type = 'klus' and klus_id is not null;

-- 2) Leden op een kaart -----------------------------------------------------
create table if not exists kaart_lid (
  id        uuid primary key default gen_random_uuid(),
  kaart_id  uuid not null references kaart (id) on delete cascade,
  gebruiker text not null,                        -- initialen: CG / JM / LE
  unique (kaart_id, gebruiker)
);
create index if not exists kaart_lid_kaart_idx on kaart_lid (kaart_id);

-- 3) Checklist-items --------------------------------------------------------
create table if not exists kaart_checklist_item (
  id            uuid primary key default gen_random_uuid(),
  kaart_id      uuid not null references kaart (id) on delete cascade,
  tekst         text not null default '',
  gedaan        boolean not null default false,
  volgorde      double precision not null default 0,
  aangemaakt_op timestamptz not null default now()
);
create index if not exists kaart_checklist_kaart_idx on kaart_checklist_item (kaart_id, volgorde);

-- 4) Berichten: chat + automatisch activiteitenlog ---------------------------
create table if not exists kaart_bericht (
  id       uuid primary key default gen_random_uuid(),
  kaart_id uuid not null references kaart (id) on delete cascade,
  auteur   text not null default '',
  tekst    text not null default '',
  soort    text not null default 'chat',          -- 'chat' of 'log'
  tijdstip timestamptz not null default now()
);
create index if not exists kaart_bericht_kaart_idx on kaart_bericht (kaart_id, tijdstip);

-- 5) Realtime aanzetten (zodat we elkaar live zien schrijven en slepen) ------
-- Veilig herhaalbaar: voegt alleen toe wat nog niet in de publicatie zit.
do $$
declare t text;
begin
  foreach t in array array['kaart','kaart_lid','kaart_checklist_item','kaart_bericht'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- 6) RLS: voorlopig UIT, net als de rest van Revisio (de app werkt met de
-- anon-key). Supabase zet RLS standaard AAN op nieuwe tabellen, wat de anon-key
-- blokkeert; daarom hier expliciet uit. Vrijdag 19 juni weer aan met policies.
alter table kaart                disable row level security;
alter table kaart_lid            disable row level security;
alter table kaart_checklist_item disable row level security;
alter table kaart_bericht        disable row level security;
