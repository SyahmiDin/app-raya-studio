// app/gallery/page.js
"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";

function GalleryContent() {
  const searchParams = useSearchParams();
  const clientFolder = searchParams.get("client"); // Ambil nama folder dari URL
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clientFolder) return;

    // Panggil API yang kita baru buat tadi
    fetch(`/api/photos?folder=${clientFolder}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.photos) {
          setPhotos(data.photos);
        }
        setLoading(false);
      });
  }, [clientFolder]);

  if (!clientFolder) return <div className="text-center p-10">Sila masukkan parameter ?client=namafolder di URL</div>;
  if (loading) return <div className="text-center p-10 text-xl">Sedang memuatkan gambar Raya... ⏳</div>;
  if (photos.length === 0) return <div className="text-center p-10">Tiada gambar dijumpai dalam folder ini.</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-5">
      {/* Header */}
      <div className="text-center mb-10 mt-5">
        <h1 className="text-3xl font-bold text-gray-800 capitalize">
          Galeri: {clientFolder.replace("-", " ")}
        </h1>
        <p className="text-gray-500">Selamat Hari Raya! Sila pilih gambar untuk download.</p>
      </div>

      {/* Grid Gambar */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-w-6xl mx-auto">
        {photos.map((photo) => (
          <div key={photo.key} className="relative group overflow-hidden rounded-lg shadow-md bg-white">
            
            {/* Gambar */}
            <img 
              src={photo.url} 
              alt="Gambar Raya" 
              className="w-full h-64 object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />

            {/* Overlay Button Download */}
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
              <a 
                href={photo.url} 
                download 
                target="_blank"
                className="bg-white text-black px-4 py-2 rounded-full font-bold hover:bg-gray-200 transform translate-y-4 group-hover:translate-y-0 transition-all"
              >
                Download ↓
              </a>
            </div>

          </div>
        ))}
      </div>
    </div>
  );
}

// Next.js perlu Suspense kalau guna useSearchParams
export default function GalleryPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <GalleryContent />
    </Suspense>
  );
}