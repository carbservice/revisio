import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Demo",
  description: "Bekijk de demo: foto's en updates van elke fase van je carburateur-revisie.",
  openGraph: {
    title: "Volg je carburateur-revisie live",
    description: "Een kijkje achter de werkbank: foto's en updates van elke fase van je revisie bij Carburateur Service Nederland. Je ziet wie eraan werkt en waar we in het proces zijn.",
    images: [{ url: "/og-demo.jpg", width: 1200, height: 630, alt: "Gereviseerde carburateur op de werkbank" }],
  },
  twitter: { card: "summary_large_image", title: "Volg je carburateur-revisie live", description: "Foto's en updates van elke fase, rechtstreeks vanaf onze werkbank.", images: ["/og-demo.jpg"] },
};

export default function Layout({ children }: { children: React.ReactNode }) { return children; }
