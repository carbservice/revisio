import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Volg je revisie",
  description: "Volg realtime de voortgang en foto's van jouw carburateur-revisie.",
  openGraph: {
    title: "Volg je carburateur-revisie live",
    description: "Realtime de voortgang en foto's van jouw carburateur op onze werkbank. Je ziet precies wie eraan werkt en waar we in het proces zijn.",
    images: [{ url: "/og-demo.jpg", width: 1200, height: 630, alt: "Gereviseerde carburateur op de werkbank" }],
  },
  twitter: { card: "summary_large_image", title: "Volg je carburateur-revisie live", description: "Realtime de voortgang en foto's van jouw carburateur op onze werkbank.", images: ["/og-demo.jpg"] },
};

export default function Layout({ children }: { children: React.ReactNode }) { return children; }
