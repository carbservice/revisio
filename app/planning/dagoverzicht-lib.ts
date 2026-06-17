// Gedeelde digest-bouwer voor de einde-dag opsomming. Wordt zowel in-app
// (DagOverzicht.tsx) als server-side (de e-mail-route) gebruikt, zodat de
// inhoud overal gelijk is. De klus is de bron: we lezen de logregels van de
// kaarten waar je lid van bent.

import { supabase } from "@/lib/supabase";
import type { Bericht } from "./planning-config";

export type DigestKaart = {
  kaart_id: string;
  titel: string;
  klus_id: string | null;
  regels: { soort: "chat" | "log"; auteur: string; tekst: string; tijdstip: string }[];
};

// Bouwt het overzicht voor één kaartlid sinds een tijdstip (ISO).
export async function bouwDigest(code: string, sindsISO: string): Promise<DigestKaart[]> {
  // 1) Mijn kaarten.
  const { data: lid } = await supabase.from("kaart_lid").select("kaart_id").eq("gebruiker", code);
  const ids = (lid || []).map((r: { kaart_id: string }) => r.kaart_id);
  if (ids.length === 0) return [];

  // 2) Kaart-info + activiteit sinds de grens.
  const [kaartRes, berichtRes] = await Promise.all([
    supabase.from("kaart").select("id, titel, klus_id").in("id", ids),
    supabase.from("kaart_bericht").select("*").in("kaart_id", ids).gte("tijdstip", sindsISO).order("tijdstip"),
  ]);
  const info = new Map<string, { titel: string; klus_id: string | null }>();
  (kaartRes.data || []).forEach((k: { id: string; titel: string; klus_id: string | null }) => info.set(k.id, { titel: k.titel, klus_id: k.klus_id }));

  // 3) Groeperen per kaart.
  const perKaart = new Map<string, DigestKaart>();
  ((berichtRes.data || []) as Bericht[]).forEach((b) => {
    const meta = info.get(b.kaart_id);
    if (!meta) return;
    let d = perKaart.get(b.kaart_id);
    if (!d) { d = { kaart_id: b.kaart_id, titel: meta.titel || "Naamloze kaart", klus_id: meta.klus_id, regels: [] }; perKaart.set(b.kaart_id, d); }
    d.regels.push({ soort: b.soort, auteur: b.auteur, tekst: b.tekst, tijdstip: b.tijdstip });
  });

  return [...perKaart.values()].filter((d) => d.regels.length > 0);
}

// Het begin van gisteren (lokaal benaderd), als ISO. Een ochtendlezing dekt zo
// gisteren plus alles van vandaag.
export function sindsGisteren(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - 1);
  return d.toISOString();
}
