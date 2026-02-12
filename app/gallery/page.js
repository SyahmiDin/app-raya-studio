// app/gallery/page.js
"use client";
import { useState, useEffect, Suspense, useRef } from "react";
import { useSearchParams } from "next/navigation";
import JSZip from "jszip";
import { saveAs } from "file-saver";

function GalleryContent() {
  const searchParams = useSearchParams();
  const clientFolder = searchParams.get("client");
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);

  // AUTH & DOWNLOAD STATE
  const [isPinVerified, setIsPinVerified] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [pendingAction, setPendingAction] = useState(null); 

  // MODAL & DOWNLOAD STATE
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);
  const [isZipping, setIsZipping] = useState(false);
  const [zipProgress, setZipProgress] = useState(0);

  // REF UNTUK SCROLL KE BAWAH
  const gallerySectionRef = useRef(null);

  useEffect(() => {
    if (!clientFolder) return;
    fetch(`/api/photos?folder=${clientFolder}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.photos) setPhotos(data.photos);
        setLoading(false);
      });
  }, [clientFolder]);

  // --- LOGIC PIN & DOWNLOAD (Sama Macam Dulu) ---
  async function verifyPin() {
    if (pinInput.length !== 4) return;
    setPinError(""); 
    try {
        const res = await fetch("/api/check-pin", {
            method: "POST",
            body: JSON.stringify({ folder: clientFolder, pin: pinInput })
        });
        const data = await res.json();

        if (data.success) {
            setIsPinVerified(true);
            setShowPinModal(false);
            if (pendingAction?.type === 'bulk') handleBulkDownload(true);
            if (pendingAction?.type === 'single') handleSingleDownload(pendingAction.url, pendingAction.key, true);
        } else {
            setPinError("PIN Salah! Sila cuba lagi.");
        }
    } catch (err) {
        setPinError("Error sistem. Cuba refresh.");
    }
  }

  function requestSingleDownload(url, key) {
    if (isPinVerified) {
        handleSingleDownload(url, key, true);
    } else {
        setPendingAction({ type: 'single', url, key });
        setShowPinModal(true);
    }
  }

  // --- GANTI FUNCTION INI (DIRECT DOWNLOAD) ---
  async function handleSingleDownload(url, filename, bypassCheck = false) {
    if (!bypassCheck && !isPinVerified) return requestSingleDownload(url, filename);
    
    setDownloadingId(url);
    try {
      // 1. Fetch Direct dari Cloudflare (Jimat Bandwidth Server)
      const response = await fetch(url, {
          mode: 'cors', // Wajib ada CORS setting di Cloudflare
          cache: 'no-cache'
      });

      if (!response.ok) throw new Error("Gagal download imej");

      // 2. Tukar jadi Blob (File Object dalam browser)
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);

      // 3. Trigger Download
      const link = document.createElement("a");
      link.href = blobUrl;
      // Pastikan nama fail ada .jpg di belakang
      const cleanFilename = filename.split("/").pop(); 
      link.download = cleanFilename; 
      
      document.body.appendChild(link);
      link.click();
      
      // 4. Cuci memory
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);

    } catch (error) { 
        console.error(error);
        // Fallback: Kalau fetch gagal (CORS isu), buka di tab baru je
        window.open(url, '_blank');
        // alert("Gagal download. Sila cuba 'Open in New Tab'."); 
    }
    setDownloadingId(null);
  }

  function requestBulkDownload() {
    if (isPinVerified) {
        handleBulkDownload(true);
    } else {
        setPendingAction({ type: 'bulk' });
        setShowPinModal(true);
    }
  }

  // --- GANTI FUNCTION INI (DIRECT BULK DOWNLOAD + ANTI-CACHE) ---
  async function handleBulkDownload(bypassCheck = false) {
    if (!bypassCheck && !isPinVerified) return requestBulkDownload();
    if (photos.length === 0) return;
    
    setIsZipping(true);
    setZipProgress(0);
    const zip = new JSZip();

    try {
      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        const filename = photo.key.split("/").pop();
        
        // 1. Fetch Direct dari Cloudflare
        // PENTING: Tambah cache: 'no-store' supaya browser tak guna cache lama yang error CORS
        const response = await fetch(photo.url, {
            mode: 'cors',
            cache: 'no-store' 
        });
        
        if (!response.ok) throw new Error("Network error");
        
        const blob = await response.blob();
        zip.file(filename, blob);

        setZipProgress(Math.round(((i + 1) / photos.length) * 100));
      }

      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, `${clientFolder}-StudioRaya.zip`);

    } catch (error) { 
        console.error(error);
        alert("Gagal memproses Zip. Sila semak setting CORS Cloudflare."); 
    }
    setIsZipping(false);
  }

  // --- FUNGSI SCROLL ---
  const scrollToGallery = () => {
    gallerySectionRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  if (!clientFolder) return <div className="text-center p-10 mt-10">Sila masukkan URL yang betul</div>;
  if (loading) return <div className="text-center p-10 text-xl mt-10 animate-pulse">Loading Galeri... ⏳</div>;

  // --- AMBIL GAMBAR PERTAMA SEBAGAI COVER ---
  // Kalau tak ada gambar, guna placeholder kelabu
  const coverImage = photos.length > 0 ? photos[0].url : null;
  const albumTitle = clientFolder.replace(/-/g, " ").toUpperCase();

  return (
    <div className="min-h-screen bg-white">
      
      {/* --- HERO SECTION (ALA PIXIESET) --- */}
      <div className="relative h-screen w-full overflow-hidden">
         {/* Background Image */}
         {coverImage ? (
             <div 
               className="absolute inset-0 bg-cover bg-center bg-no-repeat transform scale-105 animate-fade-in"
               style={{ backgroundImage: `url('${coverImage}')` }}
             >
                {/* Overlay Gelap supaya tulisan nampak */}
                <div className="absolute inset-0 bg-black/40"></div>
             </div>
         ) : (
             <div className="absolute inset-0 bg-gray-900"></div>
         )}

         {/* Text Tengah */}
         <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-4 animate-fade-in-up">
            <p className="text-white/80 text-sm tracking-[0.3em] uppercase mb-4">Koleksi Raya 2026</p>
            <h1 className="text-5xl md:text-7xl font-serif text-white font-bold mb-6 drop-shadow-lg leading-tight">
               {albumTitle}
            </h1>
            <p className="text-white/90 text-lg mb-12 font-light italic">Studio Raya Exclusive</p>
            
            <button 
                onClick={scrollToGallery}
                className="group border border-white rounded-xl border-radius:200px text-white px-8 py-3 uppercase text-xs tracking-[0.2em] hover:bg-white hover:text-black transition-all duration-300"
            >
                View Gallery
            </button>
         </div>

         {/* Arrow Down Kecil kat bawah */}
         <div className="absolute bottom-10 w-full flex justify-center animate-bounce text-white/50">
            ↓
         </div>
      </div>

      {/* --- BAHAGIAN GALERI (GRID) --- */}
      {/* Kita letak 'ref' kat sini supaya butang atas tadi boleh scroll ke sini */}
      <div ref={gallerySectionRef} className="py-20 px-4 md:px-8 bg-white min-h-screen">
        
        {/* Header Kecil & Butang Download All */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-10 max-w-7xl mx-auto border-b pb-6">
            <div className="text-center md:text-left mb-4 md:mb-0">
               <h2 className="text-xl font-bold text-gray-900">{albumTitle}</h2>
               <p className="text-gray-500 text-xs mt-1">{photos.length} Gambar</p>
            </div>
            
            <button
            onClick={requestBulkDownload} 
            disabled={isZipping}
            className={`px-6 py-3 rounded-full text-sm font-bold shadow-md transition-all flex items-center gap-2 ${
                isZipping ? "bg-gray-100 text-gray-400" : "bg-black text-white hover:bg-gray-800"
            }`}
            >
            {isZipping ? `Processing ${zipProgress}%...` : "Download All (.zip)"}
            </button>
        </div>

        {/* Grid Gambar */}
        <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4 w-full mx-auto">
            {photos.map((photo) => (
            <div key={photo.key} className="relative group break-inside-avoid mb-4 cursor-pointer rounded-lg overflow-hidden"
                onClick={() => setSelectedPhoto(photo)}>
                <img src={photo.url} className="w-full h-auto" loading="lazy" />
                <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-20 transition-opacity"></div>
            </div>
            ))}
        </div>
      </div>

      {/* LIGHTBOX MODAL */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setSelectedPhoto(null)}>
          <div className="relative max-w-5xl flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <img src={selectedPhoto.url} className="max-h-[80vh] w-auto rounded shadow-2xl" />
            <div className="mt-6 flex gap-4">
               <button
                  onClick={() => requestSingleDownload(selectedPhoto.url, selectedPhoto.key)} 
                  className="bg-white text-black px-8 py-3 rounded-full font-bold hover:bg-gray-200 transition"
               >
                 {downloadingId === selectedPhoto.url ? "Downloading..." : "Download HD ⬇️"}
               </button>
               <button onClick={() => setSelectedPhoto(null)} className="bg-gray-800 text-white px-6 py-3 rounded-full">Tutup ✕</button>
            </div>
          </div>
        </div>
      )}

      {/* PIN CODE MODAL */}
      {showPinModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-sm w-full text-center animate-fade-in-up">
                <span className="text-4xl mb-4 block">🔒</span>
                <h3 className="text-xl font-bold text-gray-800 mb-2">Masukkan PIN Download</h3>
                <p className="text-sm text-gray-500 mb-6">Sila masukkan 4-digit PIN untuk download gambar.</p>
                
                <input 
                    type="text" 
                    maxLength="4"
                    autoFocus
                    value={pinInput}
                    onChange={(e) => setPinInput(e.target.value)}
                    className="w-full text-center text-3xl font-bold tracking-[1em] p-3 border-b-2 border-gray-300 focus:border-black outline-none mb-4"
                />
                
                {pinError && <p className="text-red-500 text-sm font-bold mb-4">{pinError}</p>}

                <div className="flex gap-2">
                    <button onClick={() => setShowPinModal(false)} className="flex-1 py-3 text-gray-500 font-bold hover:bg-gray-100 rounded-lg">Batal</button>
                    <button onClick={verifyPin} disabled={pinInput.length !== 4} className="flex-1 py-3 bg-black text-white font-bold rounded-lg hover:bg-gray-800 disabled:opacity-50">Unlock 🔓</button>
                </div>
            </div>
        </div>
      )}
      
      {/* --- FOOTER --- */}
      <footer className="bg-gray-900 z-40 text-white py-10 text-center border-t border-gray-800">
  <div className="container mx-auto px-4">
    
    {/* TAJUK */}
    <h3 className="font-black text-xl md:text-2xl mb-4 tracking-widest text-white">
      STUDIO ABG 2026
    </h3>

    {/* ALAMAT (BOLEH KLIK) */}
    <div className="flex justify-center mb-6">
        <a 
            href="https://www.google.com/maps/search/?api=1&query=60-2,+Jalan+Timur+6/2D,+Bandar+Baru+Enstek,+71760+Nilai,+Negeri+Sembilan"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex flex-col md:flex-row items-center gap-2 text-gray-400 hover:text-[#a78bfa] transition-colors duration-300"
        >
            {/* Icon Location */}
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 group-hover:animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            
            {/* Teks Alamat */}
            <p className="text-sm md:text-base leading-relaxed max-w-xs md:max-w-none">
                60-2, Jalan Timur 6/2D, Bandar Baru Enstek,<br className="md:hidden" /> 71760 Nilai, Negeri Sembilan
            </p>
        </a>
    </div>

    {/* COPYRIGHT */}
    <p className="text-gray-600 text-xs tracking-wider">
      Hak Cipta Terpelihara © 2026 Al Bayan Global.
    </p>

  </div>
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