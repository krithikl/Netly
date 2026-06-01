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
    background_color: "#050505",
    theme_color: "#050505",
    categories: ["finance", "productivity"],
    icons: [
      {
        src: "/icons/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any"
      },
      {
        src: "/icons/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable"
      }
    ]
  };
}
