import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://revisio-umber.vercel.app"),
  // Elke pagina krijgt z'n eigen naam in het tabblad via een sjabloon: "Hub · Revisio".
  title: { default: "Revisio", template: "%s · Revisio" },
  description: "Werkbonnen en revisievoortgang voor Carbservice.",
  openGraph: { siteName: "Carburateur Service Nederland", locale: "nl_NL", type: "website" },
};

// viewport-fit: cover laat de inhoud tot in de iPhone-randen lopen (notch en
// home-indicator); de safe-area-padding in globals.css houdt alles leesbaar.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/* Platform-breed lettertype Karma, zodat de naam op elke pagina werkt. */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Karma:wght@300;400;500;600;700&display=swap" />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
