import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "La Tribuna — 100.000 lugares para tu club",
  description:
    "Un estadio virtual de 100.000 ubicaciones. Elegí tu club, sumá hinchas y pintá la tribuna con tus colores. Modo prueba: gratuito y sin registro.",
  keywords: ["fútbol", "estadio", "hinchas", "tribuna", "clubes", "Argentina"],
  authors: [{ name: "La Tribuna" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <SonnerToaster position="top-center" richColors closeButton />
      </body>
    </html>
  );
}
