import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Rubik } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import "./globals.css";
import Providers from "@/components/Providers";
import { isRTL, type Locale } from "@/i18n/config";
import SwCachePurgeScript from "@/components/SwCachePurgeScript";
import CookieConsent from "@/components/CookieConsent";
import JsonLd from "@/components/JsonLd";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-sans',
});

// Hebrew-supporting font
const rubik = Rubik({
  subsets: ["hebrew", "latin"],
  variable: "--font-rubik",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || 'https://xplus1.ai'
  ),
  title: {
    default: "X+1 — Learn anything. Master everything.",
    template: "%s | X+1",
  },
  description:
    "AI-powered learning platform that transforms your notes, homework, and study materials into interactive courses, practice sessions, and personalized tutoring.",
  keywords: [
    "AI learning",
    "AI tutor",
    "study courses",
    "homework help",
    "exam prep",
    "education",
    "student tools",
    "X+1",
  ],
  authors: [{ name: "X+1" }],
  creator: "X+1",
  publisher: "X+1",
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "X+1",
    title: "X+1 — Learn anything. Master everything.",
    description:
      "AI-powered learning platform that transforms your notes into interactive courses, practice sessions, and personalized tutoring.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "X+1 — AI-powered learning platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "X+1 — Learn anything. Master everything.",
    description:
      "AI-powered learning platform that transforms your notes into interactive courses, practice sessions, and personalized tutoring.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.json",
  alternates: {
    canonical: "/",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#111827" },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale() as Locale;
  const messages = await getMessages();
  const dir = isRTL(locale) ? "rtl" : "ltr";

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <head>
        <SwCachePurgeScript />
        <JsonLd />
      </head>
      <body
        className={`${plusJakarta.variable} ${rubik.variable} antialiased bg-white dark:bg-gray-900 text-gray-900 dark:text-white`}
      >
        <NextIntlClientProvider messages={messages}>
          <Providers>
            {children}
            <CookieConsent />
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
