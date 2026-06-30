// Leest de portfolio-foto's voor de Rin-landingspagina uit Supabase Storage.
// Bucket `rin-portfolio` (publiek). Een bestand met naam die begint met "hero"
// wordt de hero; de rest komt op alfabetische volgorde in de dag-reeks (8 foto's).
// Faalt zacht: zonder bucket/bestanden geeft 'ie lege lijsten terug en valt de
// pagina netjes terug op placeholders. app/api/rin-fotos/route.js

import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

const BUCKET = "rin-portfolio";
const IS_IMG = /\.(jpe?g|png|webp|avif)$/i;

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin.storage.from(BUCKET).list("", {
      limit: 100,
      sortBy: { column: "name", order: "asc" },
    });
    if (error || !Array.isArray(data)) return Response.json({ hero: null, dag: [] });

    const base = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}`;
    const url = (n) => `${base}/${encodeURIComponent(n)}`;
    const files = data.filter((f) => f?.name && !f.name.startsWith(".") && IS_IMG.test(f.name));

    const heroFile = files.find((f) => /^hero/i.test(f.name));
    const dag = files.filter((f) => !/^hero/i.test(f.name)).map((f) => url(f.name));

    return Response.json({ hero: heroFile ? url(heroFile.name) : null, dag });
  } catch {
    return Response.json({ hero: null, dag: [] });
  }
}
