import type { Metadata } from "next";
import "./globals.css";
import { getSession, getStudentSession } from "@/lib/auth";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ToastProvider } from "@/components/ui/Toast";

export const metadata: Metadata = {
  title: "GradeView — Your grades, clearly presented.",
  description:
    "A privacy-first grade publishing portal for professors and students. Spreadsheets in, clean private grades out.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [user, studentSession] = await Promise.all([getSession(), getStudentSession()]);

  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col bg-slate-50/50 text-slate-900 antialiased selection:bg-teal-100 selection:text-teal-900">
        <ToastProvider>
          <Navbar user={user} studentSession={studentSession} />
          <main className="flex-1">{children}</main>
          <Footer />
        </ToastProvider>
      </body>
    </html>
  );
}
