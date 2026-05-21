import type { Metadata, Viewport } from "next";
import { PwaServiceWorker } from "@/components/PwaServiceWorker";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

export const metadata: Metadata = {
  applicationName: "Netly",
  title: "Netly",
  description: "NZ open banking spend insights and card fit",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Netly"
  },
  icons: {
    icon: [{ url: "/icons/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icons/icon.svg", type: "image/svg+xml" }]
  }
};

export const viewport: Viewport = {
  themeColor: "#050505"
};

// Root Next.js layout that wraps every route and mounts global toast UI.
export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
        <PwaServiceWorker />
        <Toaster />
      </body>
    </html>
  );
}
