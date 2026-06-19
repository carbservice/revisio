import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "./supabaseAdmin";

// De "portier" voor API-routes. Belangrijk: ingelogd zijn is NIET genoeg, want
// iedereen kan via een magic link inloggen. We checken of het e-mailadres echt
// in app_gebruikers staat en actief is (= personeel), en met welke rol.

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export type Personeel = { email: string; rol: string };

// Leest het meegestuurde inlogbewijs (Bearer-token) en geeft het personeelslid
// terug, of null als het geen geldig/actief personeel is.
export async function huidigePersoneel(req: Request): Promise<Personeel | null> {
  const header = req.headers.get("authorization") || "";
  const token = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
  if (!token) return null;

  // Token verifieren bij Supabase (controleert de handtekening + geldigheid).
  const verifier = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await verifier.auth.getUser(token);
  const email = data?.user?.email?.toLowerCase();
  if (error || !email) return null;

  // Echt personeel? (in app_gebruikers en actief)
  const { data: rij } = await supabaseAdmin
    .from("app_gebruikers")
    .select("rol, actief")
    .ilike("email", email)
    .maybeSingle();
  if (!rij || rij.actief === false) return null;

  return { email, rol: rij.rol || "monteur" };
}

type PortierOk = { ok: true; personeel: Personeel };
type PortierFout = { ok: false; response: Response };

// Vereist personeel; optioneel met een van de toegestane rollen.
// Gebruik in een route:
//   const poort = await vereisRol(req, ["admin"]);
//   if (!poort.ok) return poort.response;
//   ... poort.personeel.rol ...
export async function vereisRol(req: Request, rollen?: string[]): Promise<PortierOk | PortierFout> {
  const personeel = await huidigePersoneel(req);
  if (!personeel) {
    return { ok: false, response: Response.json({ fout: "Niet ingelogd of geen toegang." }, { status: 401 }) };
  }
  if (rollen && rollen.length && !rollen.includes(personeel.rol)) {
    return { ok: false, response: Response.json({ fout: "Je rol heeft hier geen toegang toe." }, { status: 403 }) };
  }
  return { ok: true, personeel };
}

// Kortere helpers, in lijn met AuthGate: beheer = admin of manager.
export const vereisIngelogd = (req: Request) => vereisRol(req);
export const vereisBeheer = (req: Request) => vereisRol(req, ["admin", "manager"]);
export const vereisAdmin = (req: Request) => vereisRol(req, ["admin"]);
