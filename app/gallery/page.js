import { Suspense } from "react";
import GalleryClient from "./GalleryClient";

// FUNGSI INI AKAN MENJADI OTAK KEPADA PREVIEW WHATSAPP (DYNAMIC SEO)
export async function generateMetadata({ searchParams }) {
  // 1. Ambil nama client dari URL (cth: Anis-Ibrahim)
  const clientName = searchParams?.client || "Pelanggan";
  const formattedName = clientName.replace(/-/g, " ").toUpperCase();

  // 2. Setting base URL
  const baseUrl = "https://studioabg.vercel.app";
  let coverUrl = `${baseUrl}/backdrop/backdrop3.jpeg`; // Gambar Default jika error

  try {
    if (clientName !== "Pelanggan") {
      // 3. Server akan senyap-senyap curi tengok gambar pertama client
      const res = await fetch(`${baseUrl}/api/photos?folder=${clientName}`, { 
          cache: "no-store" 
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data?.photos?.length > 0) {
          // 4. Tukar cover WhatsApp kepada gambar PERTAMA keluarga tersebut
          coverUrl = data.photos[0].url; 
        }
      }
    }
  } catch (error) {
    console.error("Gagal fetch cover preview untuk WhatsApp:", error);
  }

  // 5. Pulangkan Tag Rahsia WhatsApp/FB
  return {
    title: `Galeri: ${formattedName} | Studio ABG`,
    description: `Klik untuk muat turun gambar kenangan raya keluarga ${formattedName}. Sila simpan menggunakan PIN yang diberikan.`,
    openGraph: {
      title: `Galeri Raya: ${formattedName}`,
      description: `Gambar photoshoot keluarga anda sudah sedia untuk dimuat turun. Klik pautan ini sekarang.`,
      images: [
        {
          url: coverUrl, // <--- Ini yang WhatsApp akan tunjuk!
          width: 1200,
          height: 630,
          alt: `Galeri Raya ${formattedName}`,
        },
      ],
    },
  };
}

export default function GalleryPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-[#412986] animate-pulse font-bold">Menyediakan Galeri...</div>}>
      {/* Panggil fail GalleryClient yang kita buat di Langkah 1 tadi */}
      <GalleryClient />
    </Suspense>
  );
}