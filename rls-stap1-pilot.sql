-- RLS stap 1: is_staff() + pilot op EEN tabel (werkbon_retour).
-- Plak dit in de Supabase SQL-editor en Run. Test daarna in de app (zie onder).

-- 1) De portier op databaseniveau: is de ingelogde gebruiker echt personeel?
--    SECURITY DEFINER zodat de functie app_gebruikers mag lezen, ook als daar
--    later RLS op komt.
create or replace function public.is_staff()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.app_gebruikers
    where lower(email) = lower(auth.email()) and actief = true
  );
$$;

-- 2) PILOT: zet RLS aan op een kleine tabel en laat alleen personeel erbij.
alter table public.werkbon_retour enable row level security;

drop policy if exists staff_alles on public.werkbon_retour;
create policy staff_alles on public.werkbon_retour
  for all
  using (public.is_staff())
  with check (public.is_staff());


-- ====== TESTEN IN DE APP (na het draaien) ======
-- a) Werkbonnen: open een klus, vink "Dit is een retour" aan + sla op, sluit en
--    heropen -> staat het vinkje er nog? (browser schrijft + leest)
-- b) Kaartenbord: tonen de retour-kaarten nog hun label? (browser leest)
-- c) Klantportaal /volg: laadt nog normaal (die gaat via de server-sleutel).
-- Werkt alles -> door naar de rest van de tabellen.
-- Werkt iets NIET -> rollback (1 regel), dan kijken we:


-- ====== ROLLBACK (als er iets stuk gaat) ======
-- alter table public.werkbon_retour disable row level security;
