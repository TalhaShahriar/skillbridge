import { Suspense } from "react";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { Navbar } from "@/components/layout/navbar";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SkillBridge",
  description:
    "See which tech and data skills employers want and how your skills compare.",
};

function NavbarFallback() {
  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <span className="text-lg font-semibold tracking-tight text-foreground">
          SkillBridge
        </span>
      </div>
    </header>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <Suspense fallback={<NavbarFallback />}>
          <Navbar />
        </Suspense>

        <main className="flex-1">{children}</main>

        <footer className="border-t bg-background">
          <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <span>SkillBridge — Tech &amp; Data Skill Gap Explorer</span>
            <span>Data source: Placeholder (dataset not yet imported)</span>
          </div>
        </footer>

        <Toaster />
      </body>
    </html>
  );
}
