import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "kawna",
    short_name: "kawna",
    description: "Tout ce que tu suis, choisi pour toi, et rien d'autre.",
    start_url: "/",
    display: "standalone",
    background_color: "#0e1312",
    theme_color: "#0e1312",
    lang: "fr",
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
