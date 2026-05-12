import { AppShell } from "@/components/AppShell";

// Dashboard route group renders the client-side shell used by every app view.
export default function DashboardLayout({
  children: _children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <AppShell />;
}
