// app/page.js (Yang Baru)
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LandingPage() {
  const [albumName, setAlbumName] = useState("");
  const router = useRouter();

  function handleSearch(e) {
    e.preventDefault();
    if (albumName.trim()) {
      // Redirect user ke page gallery
      router.push(`/gallery?client=${albumName.trim()}`);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white text-center px-4">
      {/* Logo Syarikat (Ganti dengan <img> logo kau nanti) */}
      <h1 className="text-4xl font-bold tracking-widest text-gray-900 mb-2">
        ABG STUDIO RAYA
      </h1>
      <p className="text-gray-500 mb-8 tracking-wide uppercase text-sm">
        Kenangan Terindah Aidilfitri 2026
      </p>

      {/* Box Cari Album */}
      <div className="w-full max-w-md bg-gray-50 p-8 rounded-xl shadow-lg border border-gray-100">
        <h2 className="text-lg font-medium text-gray-700 mb-4">
          Cari Album Anda
        </h2>
        
        <form onSubmit={handleSearch} className="flex flex-col gap-4">
          <input
            type="text"
            placeholder="Masukkan Nama/Kod Album (Contoh: keluarga-siti)"
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black transition"
            value={albumName}
            onChange={(e) => setAlbumName(e.target.value)}
            required
          />
          
          <button
            type="submit"
            className="w-full bg-black text-white font-bold py-3 rounded-lg hover:bg-gray-800 transition transform active:scale-95"
          >
            Lihat Gambar
          </button>
        </form>
      </div>

      <footer className="mt-12 text-gray-400 text-xs">
        &copy; 2026 Studio Raya. All rights reserved.
      </footer>
    </div>
  );
}