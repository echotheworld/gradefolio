import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import React, { Suspense } from "react";
import { ToastProvider } from "@/components/ui/Toast";
import { NavigationProgress } from "@/components/ui/NavigationProgress";
import { HydrationMarker } from "@/components/ui/HydrationMarker";

const fontSans = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Gradefolio",
  description:
    "A private space to review your published grades and score breakdowns without requesting spreadsheets or relying on screenshots from your professor.",
  icons: {
    icon: [
      { url: "/favicon_io/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon_io/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon_io/favicon.ico" },
    ],
    apple: [
      { url: "/favicon_io/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  manifest: "/favicon_io/site.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`h-full ${fontSans.variable}`}>
      <body className={`${fontSans.className} min-h-full flex flex-col bg-[#F8FAFC] text-slate-900 antialiased selection:bg-[#2563EB] selection:text-white`}>
        <Suspense fallback={null}>
          <NavigationProgress />
        </Suspense>
        <HydrationMarker />
        <ToastProvider>
          <main className="flex-1">{children}</main>
        </ToastProvider>
      </body>
    </html>
  );
}
