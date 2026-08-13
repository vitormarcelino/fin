import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { OfflineBanner } from "@/components/pwa/offline-banner";
import { SwRegister } from "@/components/pwa/sw-register";
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
  title: "Fin — Gestão Financeira Pessoal",
  description: "Controle mensal de receitas e despesas, fixo x variável, com tags.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Fin",
  },
};

export const viewport: Viewport = {
  // Deliberately no maximumScale/userScalable lock: iOS input-focus zoom is
  // prevented via 16px input font-size in globals.css instead, so pinch-zoom
  // stays available for accessibility.
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#059669",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <OfflineBanner />
        <SwRegister />
        {children}
      </body>
    </html>
  );
}
