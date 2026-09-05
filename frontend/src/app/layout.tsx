import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: "WhereIsMyPhoto - Public Web & Social Media Reverse Image Search",
  description:
    "Search the public internet for photo appearances, modified copies, and visual duplicates on social media, blogs, and public news sources with cryptographic blockchain verification.",
  keywords: [
    "reverse image search",
    "photo footprint",
    "image verification",
    "blockchain attestation",
    "social media search",
  ],
  authors: [{ name: "WhereIsMyPhoto Team" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body
        className={`${cormorant.variable} ${inter.variable} antialiased bg-white text-zinc-900 font-sans min-h-screen overflow-x-hidden`}
      >
        {children}
      </body>
    </html>
  );
}
