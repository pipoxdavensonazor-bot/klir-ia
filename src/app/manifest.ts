import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Klir IA",
    short_name: "Klir IA",
    description:
      "Assistant marketing Klirline — chat, studio, analyses. Installez sur Chrome, Android et iPhone.",
    start_url: "/?source=pwa",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F0F7FA",
    theme_color: "#004F6E",
    id: "/",
    lang: "fr-CA",
    categories: ["business", "productivity", "utilities"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Chat Klir IA",
        short_name: "Chat",
        url: "/#chat",
      },
      {
        name: "Studio site",
        short_name: "Site",
        url: "/studio/site",
      },
      {
        name: "SVG Visual Studio",
        short_name: "SVG",
        url: "/studio/svg",
      },
    ],
  };
}
