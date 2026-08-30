import type { Metadata, Viewport } from "next";
import { Syne, DM_Sans } from "next/font/google";
import AuthProvider from "@/components/AuthProvider";
import OnboardingGate from "@/components/OnboardingGate";
import PwaInstall from "@/components/PwaInstall";
import "./globals.css";

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Klir IA — Assistant marketing Klirline",
  description:
    "Klir IA : assistant marketing intelligent avec ~92 skills — copy, social, SEO, emails, lancement. Par Klirline Inc.",
  metadataBase: new URL("https://klirline.io"),
  applicationName: "Klir IA",
  appleWebApp: {
    capable: true,
    title: "Klir IA",
    statusBarStyle: "default",
  },
  openGraph: {
    title: "Klir IA",
    description: "Assistant marketing Klirline — ~92 skills marketing",
    url: "https://klirline.io",
    siteName: "Klir IA",
    images: [{ url: "/icons/icon-512.png", width: 512, height: 512, alt: "Klir IA" }],
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#004F6E",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr-CA">
      <body
        className={`${syne.variable} ${dmSans.variable} font-sans antialiased text-klir-ink bg-klir-canvas`}
      >
        <AuthProvider>
          <OnboardingGate>
            {children}
            <PwaInstall />
          </OnboardingGate>
        </AuthProvider>
      </body>
    </html>
  );
}
