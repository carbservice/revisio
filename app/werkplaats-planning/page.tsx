"use client";

// Het planningsbord, achter de login. /planning
import AuthGate from "@/app/components/AuthGate";
import Bord from "./Bord";

export default function PlanningPagina() {
  return (
    <AuthGate>
      <Bord />
    </AuthGate>
  );
}
