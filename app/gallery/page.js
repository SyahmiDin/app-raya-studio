// app/gallery/page.js
"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import JSZip from "jszip";
import { saveAs } from "file-saver";

function GalleryContent() {
  const searchParams = useSearchParams();
  const clientFolder = searchParams.get("client");
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);

  // STATE UNTUK MODAL (VIEW GAMBAR)
  const [selectedPhoto, setSelectedPhoto] = useState(null); // Simpan gambar yg tengah dibuka

  // STATE UNTUK DOWNLOAD
  const [downloadingId, setDownloadingId] = useState(null); // Single download loading
  const [isZipping, setIsZipping] = useState(false); // Bulk download loading
  const [zipProgress, setZipProgress] = useState(0); // Progress bar %

  useEffect(() => {
    if (!clientFolder) return;

    fetch(`/api/photos?folder=${clientFolder}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.photos) {
          setPhotos(data.photos);
        }
        setLoading(false);
      });
  }, [clientFolder]);

  // --- FUNCTION 1: SINGLE DOWNLOAD (DALAM MODAL) ---
  async function handleSingleDownload(url, filename) {
    setDownloadingId(url);
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      
      const link = document.createElement("a");
      link.href = blobUrl;
      link.setAttribute("download", filename.split("/").pop()); // Ambil nama hujung je
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error(error);
      alert("Gagal download gambar ini.");
    }
    setDownloadingId(null);
  }

  // --- FUNCTION 2: BULK DOWNLOAD (ZIP) ---
  async function handleBulkDownload() {
    if (photos.length === 0) return;
    if (!confirm(`Anda nak download semua ${photos.length} gambar? Ini mungkin ambil masa sikit.`)) return;

    setIsZipping(true);
    setZipProgress(0);

    const zip = new JSZip();
    const folderName = clientFolder || "Album-Raya";

    try {
      // Loop semua gambar dan fetch satu-satu
      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        const filename = photo.key.split("/").pop();

        // Download data gambar (binary)
        const response = await fetch(photo.url);
        const blob = await response.blob();

        // Masukkan dalam zip
        zip.file(filename, blob);

        // Update progress bar
        setZipProgress(Math.round(((i + 1) / photos.length) * 100));
      }

      // Generate fail zip
      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, `${folderName}-StudioRaya.zip`);

    } catch (error) {
      console.error("Error zipping:", error);
      alert("Ada masalah masa nak zip fail. Cuba refresh.");
    }

    setIsZipping(false);
  }

  if (!clientFolder) return <div className="text-center p-10 mt-10">Sila masukkan parameter ?client=namafolder di URL</div>;
  if (loading) return <div className="text-center p-10 text-xl mt-10 animate-pulse">Sedang memuatkan gambar Raya... ⏳</div>;
  if (photos.length === 0) return <div className="text-center p-10 mt-10 text-gray-500">Tiada gambar dijumpai dalam folder ini.</div>;

  return (
    <div className="min-h-screen bg-white p-4 md:p-8">
      {/* HEADER & BUTANG DOWNLOAD ALL */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-10 max-w-7xl mx-auto">
        <div className="text-center md:text-left mb-4 md:mb-0">
          <h1 className="text-3xl font-bold text-gray-900 capitalize tracking-tight">
            {clientFolder.replace(/-/g, " ")}
          </h1>
          <p className="text-gray-500 text-sm uppercase tracking-widest mt-1">Koleksi Raya 2026</p>
        </div>

        {/* Butang Download All (ZIP) */}
        <button
          onClick={handleBulkDownload}
          disabled={isZipping}
          className={`px-6 py-3 rounded-lg font-bold shadow-md text-white transition-all flex items-center gap-2 ${
            isZipping ? "bg-gray-400 cursor-not-allowed" : "bg-black hover:bg-gray-800"
          }`}
        >
          {isZipping ? (
            <span>Processing {zipProgress}% ...</span>
          ) : (
            <>
              <span>Download All (.zip)</span>
              <span>📦</span>
            </>
          )}
        </button>
      </div>

      {/* GRID GAMBAR (Bila klik, buka Modal) */}
      <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4 max-w-7xl mx-auto">
        {photos.map((photo) => (
          <div 
            key={photo.key} 
            className="relative group break-inside-avoid mb-4 cursor-pointer overflow-hidden rounded-lg"
            onClick={() => setSelectedPhoto(photo)} // <--- KLIK SINI BUKA MODAL
          >
            <img 
              src={photo.url} 
              alt="Gambar Raya" 
              className="w-full h-auto transform transition duration-500 group-hover:scale-105"
              loading="lazy"
            />
            {/* Overlay nipis */}
            <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
            {/* Icon Mata (View) */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition duration-300">
                <span className="bg-white/30 backdrop-blur-md p-3 rounded-full text-white">👁️ View</span>
            </div>
          </div>
        ))}
      </div>

      {/* --- MODAL / LIGHTBOX (FULL SCREEN VIEW) --- */}
      {selectedPhoto && (
        <div 
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setSelectedPhoto(null)} // Klik background tutup modal
        >
          {/* Container Gambar */}
          <div 
            className="relative max-w-5xl w-full max-h-screen flex flex-col items-center"
            onClick={(e) => e.stopPropagation()} // Klik gambar TAK tutup modal
          >
            
            {/* Gambar Besar */}
            <img 
              src={selectedPhoto.url} 
              className="max-h-[80vh] w-auto rounded shadow-2xl object-contain" 
              alt="Full view"
            />

            {/* Butang Action (Bawah Gambar) */}
            <div className="mt-6 flex gap-4">
               {/* Butang Download */}
               <button
                  onClick={() => handleSingleDownload(selectedPhoto.url, selectedPhoto.key)}
                  className="bg-white text-black px-8 py-3 rounded-full font-bold hover:bg-gray-200 transition shadow-lg flex items-center gap-2"
               >
                 {downloadingId === selectedPhoto.url ? "Downloading..." : "Download HD ⬇️"}
               </button>
               
               {/* Butang Tutup (X) */}
               <button 
                 onClick={() => setSelectedPhoto(null)}
                 className="bg-gray-800 text-white px-6 py-3 rounded-full font-bold hover:bg-gray-700 transition"
               >
                 Tutup ✕
               </button>
            </div>

          </div>
        </div>
      )}
      
      <footer className="mt-20 text-center text-gray-400 text-xs py-10">
        &copy; 2025 Studio Raya.
      </footer>
    </div>
  );
}

export default function GalleryPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <GalleryContent />
    </Suspense>
  );
}