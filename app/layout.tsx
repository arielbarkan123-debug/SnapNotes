import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Rubik } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import "./globals.css";
import Providers from "@/components/Providers";
import { isRTL, type Locale } from "@/i18n/config";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

// Hebrew-supporting font
const rubik = Rubik({
  subsets: ["hebrew", "latin"],
  variable: "--font-rubik",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  ),
  title: {
    default: "NoteSnap - Turn Your Notes Into Study Courses",
    template: "%s | NoteSnap",
  },
  description:
    "Upload a photo of your notebook and let AI create a complete, organized study course in seconds. Transform handwritten notes into structured learning material.",
  keywords: [
    "study notes",
    "AI learning",
    "note taking",
    "study courses",
    "handwriting recognition",
    "education",
    "student tools",
  ],
  authors: [{ name: "NoteSnap" }],
  creator: "NoteSnap",
  publisher: "NoteSnap",
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "NoteSnap",
    title: "NoteSnap - Turn Your Notes Into Study Courses",
    description:
      "Upload a photo of your notebook and let AI create a complete, organized study course in seconds.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "NoteSnap - AI-powered note transformation",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "NoteSnap - Turn Your Notes Into Study Courses",
    description:
      "Upload a photo of your notebook and let AI create a complete, organized study course in seconds.",
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
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${rubik.variable} antialiased bg-white dark:bg-gray-900 text-gray-900 dark:text-white`}
      >
        <NextIntlClientProvider messages={messages}>
          <Providers>
            {children}
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
