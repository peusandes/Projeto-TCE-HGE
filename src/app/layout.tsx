import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
  display: "swap",
});

const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
  display: "swap",
});

export const metadata: Metadata = {
  title: "LANC — Coleta TCE | HGE",
  description:
    "Coleta de campo do protocolo TCE da Liga Acadêmica de Neurocirurgia da Bahia (LANC) no Hospital Geral do Estado.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    // black-translucent permite que o conteúdo (com viewportFit: cover) fique
    // por baixo da status bar — combinado com safe-top no AppHeader fica
    // edge-to-edge no iPhone com notch/dynamic island.
    statusBarStyle: "black-translucent",
    title: "LANC TCE",
  },
};

export const viewport: Viewport = {
  themeColor: "#0B0D11",
  width: "device-width",
  initialScale: 1,
  // Acessibilidade: permitimos zoom (até 5x) pra leitura mas mantemos
  // initialScale=1. Antes era maximumScale=1 que falha WCAG 1.4.4.
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
  // Layout viewport não muda quando o teclado virtual aparece — evita o
  // conteúdo "saltar" no Chrome Android.
  interactiveWidget: "resizes-content",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      <body className="font-sans antialiased bg-paper text-ink min-h-svh">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
