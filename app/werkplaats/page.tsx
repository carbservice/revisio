import { redirect } from "next/navigation";

// De monteur-app is verhuisd naar /werkbonnen. Oude links en bookmarks
// (en eventuele al verstuurde inloglinks) naar /werkplaats sturen we
// automatisch door, zodat er niets breekt.
export default function WerkplaatsRedirect() {
  redirect("/werkbonnen");
}
