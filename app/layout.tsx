import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Studio ABG | Galeri Eksklusif",
  description: "Muat turun gambar raya anda dengan kualiti HD di sini.",
  icons: {
    icon: "/favicon.ico", 
  },
  openGraph: {
    title: "Studio ABG 2026",
    description: "Koleksi gambar raya anda dah siap! Masukkan PIN untuk akses.",
    url: "https://app-raya-studio.vercel.app",
    siteName: "Studio ABG",
    locale: "ms_MY",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
