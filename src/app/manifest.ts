import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LANC — Coleta TCE",
    short_name: "LANC TCE",
    description: "Coleta de campo do protocolo TCE — Liga Acadêmica de Neurocirurgia da Bahia, HGE",
    start_url: "/plantoes",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0B0D11",
    theme_color: "#0B0D11",
    lang: "pt-BR",
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
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    categories: ["medical", "health", "productivity"],
  };
}
