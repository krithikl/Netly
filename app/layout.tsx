import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MoneyFit MVP",
  description: "NZ open banking spend insights and card fit"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
