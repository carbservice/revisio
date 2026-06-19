import { createClient } from "@supabase/supabase-js";

// Server-only Supabase-client met de service-role-sleutel. Deze omzeilt RLS en
// mag daarom NOOIT in een client-component geimporteerd worden, alleen in
// API-routes (server). De sleutel staat in SUPABASE_SERVICE_ROLE_KEY (env),
// nooit in de browser.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export const supabaseAdmin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Handig om in routes te kunnen zeggen "de sleutel is nog niet ingesteld".
export const adminGereed = Boolean(url && serviceKey);
