import { supabase } from "./supabase";

// Client-helper: roept een API-route aan en stuurt automatisch het inlogbewijs
// (Bearer-token) van de ingelogde gebruiker mee, zodat de portier in de route
// weet wie er belt. Gebruik dit voor alle beveiligde routes in plaats van fetch.
export async function apiFetch(url: string, opts: RequestInit = {}): Promise<Response> {
  let token = "";
  try {
    const { data } = await supabase.auth.getSession();
    token = data?.session?.access_token || "";
  } catch {
    /* geen sessie: dan zonder token, de route geeft netjes 401 */
  }
  const headers = new Headers(opts.headers || {});
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(url, { ...opts, headers });
}
