// app/page.js
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LandingPage() {
  const [albumName, setAlbumName] = useState("");
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  function handleSearch(e) {
    e.preventDefault();
    if (albumName.trim()) {
      setLoading(true);
      // Redirect user ke page gallery
      router.push(`/gallery?client=${albumName.trim()}`);
    }
  }

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center p-4 overflow-hidden">
      
      {/* 1. BACKGROUND IMAGE (Ganti URL ni dengan gambar studio kau nanti) */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ 
            backgroundImage: "source/bg.jpeg",
        }}
      >
        {/* Layer Hitam Nipis supaya tulisan jelas */}
        <div className="absolute inset-0 bg-black/40"></div>
      </div>

      {/* 2. KONTEN UTAMA (Atas Background) */}
      <div className="relative z-10 w-full max-w-md animate-fade-in-up">
        
        {/* Logo / Tajuk */}
        <div className="text-center mb-8 text-white">
          <h1 className="text-5xl font-bold tracking-widest mb-2 font-serif">
            STUDIO ABG
          </h1>
          <p className="text-sm uppercase tracking-[0.3em] opacity-90">
            Abadikan Kenangan Terindah
          </p>
        </div>

        {/* Kotak Carian (Glassmorphism) */}
        <div className="bg-white/10 backdrop-blur-md border border-white/20 p-8 rounded-2xl shadow-2xl">
          <h2 className="text-white text-center text-lg font-medium mb-6">
            Akses Album Anda
          </h2>
          
          <form onSubmit={handleSearch} className="flex flex-col gap-4">
            <input
              type="text"
              placeholder="Masukkan Kod Album (cth: keluarga-siti)"
              className="w-full p-4 bg-white/80 border-0 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-yellow-400 text-gray-900 placeholder-gray-500 transition text-center font-bold"
              value={albumName}
              onChange={(e) => setAlbumName(e.target.value)}
              required
            />
            
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-4 rounded-xl transition transform hover:scale-[1.02] shadow-lg disabled:opacity-70"
            >
              {loading ? "Sedang Mencari..." : "Lihat Gambar ➔"}
            </button>
          </form>

          <p className="text-center text-white/60 text-xs mt-6">
            *Perlukan bantuan? Hubungi kami.
          </p>
        </div>

        {/* Footer */}
        <footer className="mt-12 text-center text-white/40 text-xs">
          &copy; 2026 Studio ABG. Hak Cipta Terpelihara.
        </footer>
      </div>
    </div>
  );
}