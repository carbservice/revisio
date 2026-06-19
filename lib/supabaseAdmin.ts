import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Server-only Supabase-client met de service-role-sleutel. Deze omzeilt RLS en
// mag daarom NOOIT in een client-component geimporteerd worden, alleen in
// API-routes (server). De sleutel staat in SUPABASE_SERVICE_ROLE_KEY (env),
// nooit in de browser.
//
// BELANGRIJK: de client wordt LUI (bij eerste gebruik) aangemaakt, niet bij het
// laden van de module. Anders valt de Vercel-build om als de sleutel tijdens de
// build nog niet beschikbaar is ("supabaseKey is required").

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
let _client: SupabaseClient | null = null;

function maakClient(): SupabaseClient {
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  // Val terug op de anon-sleutel als de service-sleutel (nog) niet beschikbaar
  // is. Zolang RLS uit staat geeft anon dezelfde toegang, dus de app blijft
  // werken en de inlog-portier blijft functioneren. VOOR we RLS aanzetten moet
  // de service-sleutel echt actief zijn (anders blokkeert RLS deze routes).
  const key = service || anon;
  if (!url || !key) {
    throw new Error("Supabase niet geconfigureerd: geen URL of sleutel.");
  }
  if (!service) {
    console.warn("[supabaseAdmin] SUPABASE_SERVICE_ROLE_KEY ontbreekt; val terug op anon. Zet de service-sleutel vóór RLS aangaat.");
  }
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

// Proxy: bestaande aanroepen zoals supabaseAdmin.from(...) blijven werken, maar
// de echte client wordt pas bij de eerste property-toegang (runtime) gemaakt.
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    if (!_client) _client = maakClient();
    const value = (_client as unknown as Record<string | symbol, unknown>)[prop];
    return typeof value === "function" ? (value as (...a: unknown[]) => unknown).bind(_client) : value;
  },
});

// Of de server-sleutel beschikbaar is (zonder de client te maken).
export const adminGereed = Boolean(url && process.env.SUPABASE_SERVICE_ROLE_KEY);
