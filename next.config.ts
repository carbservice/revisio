import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return {
      // beforeFiles draait VOOR de bestand-/pagina-check, zodat we de kale root van
      // het automotive-subdomein naar de statische landingspagina kunnen sturen
      // zonder de Revisio-app-homepage (op revisio-umber.vercel.app) te raken.
      beforeFiles: [
        {
          source: "/",
          has: [{ type: "host", value: "automotive.carbservice.nl" }],
          destination: "/automotive.html",
        },
      ],
    };
  },
};

export default nextConfig;
