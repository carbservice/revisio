import { redirect } from "next/navigation";

// De monteur-app is verhuisd naar /werkbonnen. Oude links, bookmarks en
// geprinte QR-labels (en eventuele al verstuurde inloglinks) naar /werkplaats
// sturen we door, MET behoud van de ?klus=...-parameter, zodat een gescande
// QR de juiste klus blijft openen.
export default async function WerkplaatsRedirect({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const klus = typeof sp.klus === "string" ? sp.klus : Array.isArray(sp.klus) ? sp.klus[0] : "";
  redirect(klus ? `/werkbonnen?klus=${encodeURIComponent(klus)}` : "/werkbonnen");
}
