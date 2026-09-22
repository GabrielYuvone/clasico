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
  title: "La Tribuna del Clásico — La Lepra vs. El Canalla",
  description:
    "Un estadio virtual de 100.000 ubicaciones dividido en dos mitades: La Lepra (Newell's) a la izquierda, El Canalla (Rosario Central) a la derecha. Sumá hinchas y pintá tu lado.",
  keywords: ["clásico rosarino", "Newell's", "Rosario Central", "La Lepra", "El Canalla", "fútbol", "estadio virtual"],
  authors: [{ name: "La Tribuna del Clásico" }],
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
