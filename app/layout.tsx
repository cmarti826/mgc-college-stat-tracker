import "./globals.css";
import Link from "next/link";
import { Nav } from "@/components/Nav";

export const metadata = {
  title: "MGC Golf Stat Tracker",
  description: "Stat Tracker for Players & Coaches",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-neutral-50 text-neutral-900">
        <Nav />
        <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
