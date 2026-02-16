import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import PromoListener from "./components/PromoListener";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// --- SETTING URL WEBSITE (PENTING UNTUK SEO) ---
// Gantikan domain ini jika Tuan beli domain sendiri (.com.my) nanti
const baseURL = "https://studioabg.vercel.app"; 

export const metadata: Metadata = {
  metadataBase: new URL(baseURL), // Wajib ada untuk fix isu gambar tak keluar di WhatsApp
  title: {
    default: "Studio ABG | Galeri Eksklusif & Tempahan Raya",
    template: "%s | Studio ABG", // Contoh page lain: "Booking | Studio ABG"
  },
  description: "Tempah Slot Photoshoot Raya 2026 di Bandar Baru Enstek. Gambar keluarga kualiti HD, studio selesa & harga berpatutan. Pakej bermula RM50.",
  
  // --- KATA KUNCI CARIAN GOOGLE ---
  keywords: [
    "Studio Gambar Raya Nilai", 
    "Studio Photoshoot Enstek", 
    "Gambar Raya Negeri Sembilan 2026", 
    "Pakej Fotografi Murah", 
    "Studio ABG", 
    "Al Bayan Global",
    "Family Portrait Malaysia"
  ],
  
  authors: [{ name: "Al Bayan Global Sdn Bhd" }],
  creator: "Al Bayan Global",
  publisher: "Al Bayan Global",
  
  // --- ROBOT GOOGLE (IZIN BACA) ---
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },

  icons: {
    icon: "/abg.ico", 
  },

  // --- SOCIAL MEDIA SHARING (WHATSAPP/FB) ---
  openGraph: {
    title: "Studio ABG Raya 2026 - Jom Booking Slot!",
    description: "Abadikan kenangan Syawal anda. Klik untuk lihat pakej dan tempah slot sekarang.",
    url: baseURL,
    siteName: "Studio ABG",
    locale: "ms_MY",
    type: "website",
    images: [
      {
        url: '/bd3.jpeg', // Pastikan Tuan upload gambar cantik nama 'og-image.jpg' dalam folder 'public'
        width: 1200,
        height: 630,
        alt: 'Suasana Studio ABG Raya',
      },
    ],
  },
  
  // --- TWITTER CARD ---
  twitter: {
    card: 'summary_large_image',
    title: "Studio ABG Raya 2026",
    description: "Tempah slot gambar raya anda di Bandar Baru Enstek sekarang.",
    images: ['/og-image.jpg'], // Guna gambar yang sama
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ms">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* 2. PASANG CCTV DI SINI (Promo Listener) */}
        <PromoListener />
        {children}
      </body>
    </html>
  );
}