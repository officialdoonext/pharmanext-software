import type { Metadata } from "next";
import { Sora } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "PharmaNext - Smart Pharmacy. Healthy Tomorrow.",
  description: "Comprehensive Pharmacy Management Software",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${sora.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-[#f8fafc] text-slate-800 antialiased font-sans">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
