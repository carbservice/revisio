"use client";

// Deep-link naar een specifieke kaart: /planning/<kaart_id>. Toont hetzelfde
// bord met de kaart meteen geopend, zodat je een kaart direct kunt delen.
import { useParams } from "next/navigation";
import AuthGate from "@/app/components/AuthGate";
import Bord from "../Bord";

export default function KaartPagina() {
  const params = useParams();
  const ruw = params?.kaart_id;
  const id = Array.isArray(ruw) ? ruw[0] : ruw;
  return (
    <AuthGate>
      <Bord startKaartId={id} />
    </AuthGate>
  );
}
