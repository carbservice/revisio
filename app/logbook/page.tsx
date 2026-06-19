import { redirect } from "next/navigation";

// Was een losse kopie van het cijfer-dashboard ZONDER login (lek: omzet/marges
// publiek opvraagbaar). Vervangen door een redirect naar het echte dashboard,
// dat achter de admin-login zit.
export default function Logbook() {
  redirect("/cijfers");
}
