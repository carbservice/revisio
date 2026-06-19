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
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url || !key) {
    throw new Error("Server niet geconfigureerd: SUPABASE_SERVICE_ROLE_KEY ontbreekt.");
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
