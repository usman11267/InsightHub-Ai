import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { Providers } from "@/components/providers";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "InsightHub AI — AI-powered data analytics",
    template: "%s · InsightHub AI",
  },
  description:
    "Upload any dataset and get instant KPIs, charts, forecasts, and AI-written reports. Built for teams that need answers, not spreadsheets.",
  keywords: ["data analytics", "AI reports", "business intelligence", "data visualization"],
  openGraph: {
    title: "InsightHub AI",
    description: "AI-powered data analytics for modern teams.",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1015" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    // URLs are set here rather than via env vars so protected-route redirects
    // land on our own styled auth pages instead of Clerk's hosted portal.
    <ClerkProvider
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      signInFallbackRedirectUrl="/dashboard"
      signUpFallbackRedirectUrl="/dashboard"
    >
      {/* suppressHydrationWarning: next-themes sets `class` on <html> before
          React hydrates, which would otherwise log a mismatch. */}
      <html
        lang="en"
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} h-full`}
      >
        <body className="min-h-full">
          <Providers>{children}</Providers>
        </body>
      </html>
    </ClerkProvider>
  );
}
