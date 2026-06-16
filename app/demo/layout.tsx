import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Demo",
  description: "Bekijk de demo: foto's en updates van elke fase van je carburateur-revisie.",
  openGraph: {
    title: "Volg je carburateur-revisie live",
    description: "Een kijkje achter de werkbank: foto's en updates van elke fase van je revisie bij Carburateur Service Nederland. Je ziet wie eraan werkt en waar we in het proces zijn.",
    images: [{ url: "/demo/klaar-1.jpg", width: 800, height: 800, alt: "Gereviseerde carburateur" }],
  },
  twitter: { card: "summary_large_image", title: "Volg je carburateur-revisie live", description: "Foto's en updates van elke fase, rechtstreeks vanaf onze werkbank.", images: ["/demo/klaar-1.jpg"] },
};

export default function Layout({ children }: { children: React.ReactNode }) { return children; }
