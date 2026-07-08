import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CyberShare — URL Shortener",
  description: "Fast, self-hosted URL shortener on Vercel free tier. With API access and admin dashboard.",
  keywords: ["URL shortener", "CyberShare", "link shortener", "Next.js", "Vercel"],
  authors: [{ name: "CyberShare" }],
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "CyberShare — URL Shortener",
    description: "Fast, self-hosted URL shortener on Vercel free tier.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "CyberShare — URL Shortener",
    description: "Fast, self-hosted URL shortener on Vercel free tier.",
  },
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
        <Toaster />
      </body>
    </html>
  );
}
