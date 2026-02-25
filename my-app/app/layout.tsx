/**
 * @file app/layout.tsx
 * @description Root layout with Gotham theme
 * @author SplitKar Team
 * @created 2026-02-24
 */

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "SPLITकर | Smart Expense Splitting",
  description: "Settle smart. Split sharp. A premium expense splitting and settlement engine.",
  keywords: ["expense splitting", "settlement", "bill splitting", "group expenses"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#0f0f0f] text-white min-h-screen flex flex-col`}
      >
        <main className="flex-1">
          {children}
        </main>
        
        {/* Footer */}
        <footer className="border-t border-[#2a2a2a] bg-[#0a0a0a] py-4 px-6">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-sm text-gray-500">
              Made in 🇮🇳 with ❤️ by{' '}
              <a
                href="https://github.com/Mohit-Bagri"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#F5C518] hover:underline"
              >
                MOHIT BAGRI
              </a>
            </p>
            <p className="text-xs text-gray-600">
              © {new Date().getFullYear()} SplitKar. All rights reserved.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
