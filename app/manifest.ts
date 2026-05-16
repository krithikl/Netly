import type { MetadataRoute } from "next";

// Describes Netly as an installable web app for browsers that support PWAs.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Netly",
    short_name: "Netly",
    description: "NZ open banking spend insights and card fit.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f7f7f9",
    theme_color: "#6d5ef5",
    categories: ["finance", "productivity"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any"
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any"
      },
      {
        src: "/icons/maskable-icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable"
      },
      {
        src: "/icons/maskable-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable"
      }
    ]
  };
}
