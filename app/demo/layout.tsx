import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Demo",
  description: "Bekijk de demo: foto's en updates van elke fase van je carburateur-revisie.",
  openGraph: {
    title: "Volg je revisie live op onze werkbank",
    description: "Vanaf nu zie je online precies in welke fase jouw carburateur zit. Van ontvangst tot klaar voor ophalen, inclusief foto's rechtstreeks vanaf onze werkbank.",
    images: [{ url: "/og-demo.jpg", width: 1200, height: 630, alt: "Volg je revisie live op onze werkbank" }],
  },
  twitter: { card: "summary_large_image", title: "Volg je revisie live op onze werkbank", description: "Vanaf nu zie je online precies in welke fase jouw carburateur zit, inclusief foto's rechtstreeks vanaf onze werkbank.", images: ["/og-demo.jpg"] },
};

export default function Layout({ children }: { children: React.ReactNode }) { return children; }
