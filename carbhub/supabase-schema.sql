-- Carburateur Hub — tabellen. Draai dit in Supabase → SQL Editor.
-- Veilig opnieuw te draaien (create if not exists).

create table if not exists hub_carburateurs (
  id                 text primary key,
  fabrikant          text,
  type               text,
  gasklep            text,
  cilinders          int,
  vehicle            text,
  registrier         text,
  motor_kw           int,
  motor_ps           int,
  motor_cc           int,
  motor_rpm          int,
  bouwjaar_van       int,
  bouwjaar_van_tekst text,
  bouwjaar_tot       int,
  bouwjaar_tot_tekst text,
  tekening_url       text,
  kaft_url           text,
  werte              jsonb,
  onderdelen_bron    text,
  controle           text,
  created_at         timestamptz default now(),
  updated_at         timestamptz default now()
);

create table if not exists hub_tags (
  id        bigserial primary key,
  carb_id   text references hub_carburateurs(id) on delete cascade,
  tag       text,
  tag_norm  text
);
-- Bewust GEEN unieke constraint op tag_norm: een tag mag naar meerdere
-- carburateurs wijzen (kruisverwijzing). Wel een index voor snel zoeken.
create index if not exists hub_tags_norm_idx on hub_tags (tag_norm);

create table if not exists hub_toepassingen (
  id            bigserial primary key,
  carb_id       text references hub_carburateurs(id) on delete cascade,
  merk          text,
  model         text,
  merk_model    text,
  chassis       text,
  motorcode     text,
  bouwjaar_van  int,
  bouwjaar_tot  int,
  cc            int,
  cilinders     int
);
create index if not exists hub_toep_merk_idx on hub_toepassingen (merk);
create index if not exists hub_toep_jaar_idx on hub_toepassingen (bouwjaar_van, bouwjaar_tot);

create table if not exists hub_uitvoeringen (
  id            bigserial primary key,
  carb_id       text references hub_carburateurs(id) on delete cascade,
  volgorde      int,
  naam          text,
  tag           text,
  kleur         text,
  ab_datum      text,
  bestel_nr_oud text          -- archief, niet voor gebruik
);

create table if not exists hub_onderdelen (
  id           bigserial primary key,
  carb_id      text references hub_carburateurs(id) on delete cascade,
  volgorde     int,
  nr           text,
  naam_nl      text,
  naam_de      text,
  naam_en      text,
  aantal       text,
  bestell_oud  text           -- archief, niet voor gebruik
);

create table if not exists hub_instel_labels (
  sleutel   text primary key,
  symbool   text,
  naam_nl   text,
  naam_de   text,
  naam_en   text,
  volgorde  int
);
