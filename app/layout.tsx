// app/layout.tsx

import "./globals.css";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Toaster } from "react-hot-toast"; // Optional: for toast notifications

export const metadata = {
  title: {
    default: "MGC Golf Stat Tracker",
    template: "%s | MGC Golf",
  },
  description: "Advanced stat tracking for high school golf teams and coaches.",
  keywords: ["golf", "stats", "high school", "coach", "player", "MGC", "scorecard"],
  authors: [{ name: "MGC Golf" }],
  viewport: "width=device-width, initial-scale=1",
  themeColor: "#3C3B6E",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Preload critical fonts if using custom */}
        {/* <link rel="preload" href="/fonts/inter-var.woff2" as="font" type="font/woff2" crossOrigin="anonymous" /> */}
      </head>
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        {/* Global Nav */}
        <Nav />

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>

        {/* Optional: Toast Container */}
        <Toaster
          position="bottom-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: "white",
              color: "#1f2937",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              borderRadius: "0.75rem",
            },
            success: {
              icon: "Success",
              style: { border: "1px solid #86efac" },
            },
            error: {
              icon: "Error",
              style: { border: "1px solid #fca5a5" },
            },
          }}
        />

        {/* Optional: Footer */}
        <footer className="mt-16 border-t border-gray-200 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-600">
              <p>© {new Date().getFullYear()} MGC Golf. All rights reserved.</p>
              <div className="flex items-center gap-6">
                <Link href="/privacy" className="hover:text-gray-900 transition-colors">
                  Privacy
                </Link>
                <Link href="/terms" className="hover:text-gray-900 transition-colors">
                  Terms
                </Link>
                <Link href="/support" className="hover:text-gray-900 transition-colors">
                  Support
                </Link>
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}