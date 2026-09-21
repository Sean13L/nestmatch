import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { Providers } from "./providers";
import { AccountNav } from "@/components/AccountNav";

export const metadata: Metadata = {
  title: "NestMatch — Find your next place, automatically",
  description:
    "Search housing across sources, save a match profile, and get notified the moment something fits.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <Providers>
          <header className="border-b border-slate-200 bg-white">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
              <Link href="/" className="text-lg font-semibold text-slate-900">
                NestMatch
              </Link>
              <nav className="flex items-center gap-6 text-sm text-slate-600">
                <Link href="/" className="hover:text-slate-900">
                  Search
                </Link>
                <Link href="/profiles" className="hover:text-slate-900">
                  My Profiles
                </Link>
                <Link href="/dashboard" className="hover:text-slate-900">
                  Matches
                </Link>
                <AccountNav />
              </nav>
            </div>
          </header>
          <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
