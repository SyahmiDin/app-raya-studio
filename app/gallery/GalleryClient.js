// app/gallery/GalleryClient.js
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
  // TUKAR: Guna selectedIndex (nombor) untuk buat fungsi next/prev berfungsi
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);
  const [isZipping, setIsZipping] = useState(false);
  const [zipProgress, setZipProgress] = useState(0);

  // REF UNTUK SCROLL KE BAWAH
  const gallerySectionRef = useRef(null);

  // --- LOGIC KEYBOARD (KIRI/KANAN/ESC) UNTUK SLIDESHOW ---
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (selectedIndex === null) return;

      if (e.key === "ArrowRight") {
        setSelectedIndex((prev) => (prev + 1) % photos.length);
      } else if (e.key === "ArrowLeft") {
        setSelectedIndex((prev) => (prev - 1 + photos.length) % photos.length);
      } else if (e.key === "Escape") {
        setSelectedIndex(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedIndex, photos.length]);

  // Fungsi Next & Prev (Butang UI)
  const handleNext = (e) => {
    e.stopPropagation();
    setSelectedIndex((prev) => (prev + 1) % photos.length);
  };

  const handlePrev = (e) => {
    e.stopPropagation();
    setSelectedIndex((prev) => (prev - 1 + photos.length) % photos.length);
  };

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

  // --- (DIRECT DOWNLOAD) ---
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

  // --- (DIRECT BULK DOWNLOAD + AUTO-SPLIT JIKA TERLALU BANYAK) ---
  async function handleBulkDownload(bypassCheck = false) {
    if (!bypassCheck && !isPinVerified) return requestBulkDownload();
    if (photos.length === 0) return;

    setIsZipping(true);
    setZipProgress(0);

    // Tetapkan had maksimum gambar untuk 1 fail ZIP
    const MAX_PER_ZIP = 70;
    const totalChunks = Math.ceil(photos.length / MAX_PER_ZIP);

    try {
      // Loop untuk setiap pecahan (Part 1, Part 2...)
      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        
        const zip = new JSZip(); // Buat ZIP baru untuk setiap Part
        const start = chunkIndex * MAX_PER_ZIP;
        const end = Math.min(start + MAX_PER_ZIP, photos.length);
        const chunkPhotos = photos.slice(start, end);

        // Beritahu pengguna Part mana yang sedang diproses jika gambar banyak
        if (totalChunks > 1) {
            console.log(`Processing Part ${chunkIndex + 1} of ${totalChunks}`);
        }

        // Masukkan gambar ke dalam ZIP untuk pecahan ini
        for (let i = 0; i < chunkPhotos.length; i++) {
          const photo = chunkPhotos[i];
          const filename = photo.key.split("/").pop();

          // Fetch direct dari Cloudflare tanpa simpan dalam cache
          const response = await fetch(photo.url, {
            mode: 'cors',
            cache: 'no-store'
          });

          if (!response.ok) throw new Error("Network error");

          const blob = await response.blob();
          zip.file(filename, blob);

          // Update peratusan mengikut total keseluruhan gambar
          const totalProcessedSoFar = start + i + 1;
          setZipProgress(Math.round((totalProcessedSoFar / photos.length) * 100));
        }

        // Generate dan download ZIP untuk pecahan ini
        const content = await zip.generateAsync({ type: "blob" });
        
        // Namakan fail ZIP. Jika lebih dari 1 part, tambah "Part-1", "Part-2"
        const zipName = totalChunks > 1 
            ? `${clientFolder}-ABGStudioRaya-Part${chunkIndex + 1}.zip` 
            : `${clientFolder}-ABGStudioRaya.zip`;
            
        saveAs(content, zipName);

        zip = null; 

        // 3. MASA REHAT: Beri masa Safari cuci RAM (Garbage Collection) sebelum sambung
        if (chunkIndex < totalChunks - 1) {
            await new Promise(resolve => setTimeout(resolve, 4000)); // Rehat 4 saat
        } 

      }

    } catch (error) {
      console.error(error);
      alert("Proses terhenti. Sila pastikan capaian internet stabil atau cuba download satu-persatu.");
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
      <div ref={gallerySectionRef} className="py-20 px-1 md:px-2 bg-white min-h-screen">

        {/* Header Kecil & Butang Download All */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-10 max-w-7xl mx-auto border-b pb-6">
          <div className="text-center md:text-left mb-4 md:mb-0">
            <h2 className="text-xl font-bold text-gray-900">{albumTitle}</h2>
            <p className="text-gray-500 text-xs mt-1">{photos.length} Gambar</p>
          </div>

          <button
            onClick={requestBulkDownload}
            disabled={isZipping}
            className={`px-6 py-3 rounded-full text-sm font-bold shadow-md transition-all flex items-center gap-2 ${isZipping ? "bg-gray-100 text-gray-400" : "bg-black text-white hover:bg-gray-800"
              }`}
          >
            {isZipping ? `Processing ${zipProgress}%...` : "Download All (.zip)"}
          </button>
        </div>

        {/* Grid Gambar */}
        <div className="columns-2 md:columns-3 lg:columns-5 gap-1 w-full mx-auto">
            {photos.map((photo, index) => (
            <div 
                key={photo.key} 
                // 1. Tambah bg-gray-200 dan animate-pulse sebagai kotak 'Loading' sementara
                className="relative group break-inside-avoid mb-1 cursor-pointer rounded-lg overflow-hidden bg-gray-200 animate-pulse"
                onClick={() => setSelectedIndex(index)}
            >
                <img 
                    src={photo.url} 
                    loading="lazy" 
                    // 2. Gambar mula-mula disorokkan (opacity-0) dengan efek transisi (duration-700)
                    className="w-full h-auto opacity-0 transition-opacity duration-700 ease-in-out" 
                    
                    // 3. Bila gambar siap download, kita buang class invisible tu supaya ia fade-in
                    onLoad={(e) => {
                        e.target.classList.remove('opacity-0');
                        e.target.parentElement.classList.remove('animate-pulse'); // Hentikan degupan kelabu
                    }}
                />
                <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-20 transition-opacity"></div>
            </div>
            ))}
        </div>
      </div>

      {/* LIGHTBOX MODAL DENGAN SLIDESHOW */}
      {/* Guna selectedIndex !== null */}
      {selectedIndex !== null && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setSelectedIndex(null)}>
          
          {/* BUTANG PREVIOUS (KIRI) */}
          <button 
            onClick={handlePrev} 
            className="absolute left-2 md:left-10 text-white/50 hover:text-white hover:cursor-pointer p-4 z-50 transition hover:scale-110"
            aria-label="Gambar Sebelumnya"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-10 h-10 md:w-14 md:h-14">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>

          <div className="relative max-w-5xl flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <img src={photos[selectedIndex].url} className="max-h-[80vh] w-auto rounded shadow-2xl" alt="Gallery Photo" />
            
            <div className="mt-6 flex flex-wrap justify-center gap-4">
               <button
                  onClick={() => requestSingleDownload(photos[selectedIndex].url, photos[selectedIndex].key)} 
                  className="bg-white text-black px-8 py-3 rounded-full font-bold hover:bg-gray-200 hover:cursor-pointer transition"
               >
                 {downloadingId === photos[selectedIndex].url ? "Downloading..." : "Download"}
               </button>
               <button onClick={() => setSelectedIndex(null)} className="bg-gray-800 text-white px-6 py-3 rounded-full hover:bg-gray-700 hover:cursor-pointer transition">
                 Tutup
               </button>
            </div>
            
            {/* Indikator Kedudukan Gambar (Contoh: 3 / 20) */}
            <div className="absolute -top-10 text-white/50 text-sm font-mono tracking-widest">
                {selectedIndex + 1} / {photos.length}
            </div>
          </div>

          {/* BUTANG NEXT (KANAN) */}
          <button 
            onClick={handleNext} 
            className="absolute right-2 md:right-10 text-white/50 hover:text-white hover:cursor-pointer p-4 z-50 transition hover:scale-110"
            aria-label="Gambar Seterusnya"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-10 h-10 md:w-14 md:h-14">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>

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
              <button onClick={() => setShowPinModal(false)} className="flex-1 py-3 text-gray-500 font-bold hover:bg-gray-100 hover:cursor-pointer rounded-lg">Batal</button>
              <button onClick={verifyPin} disabled={pinInput.length !== 4} className="flex-1 py-3 bg-black text-white font-bold rounded-lg hover:bg-gray-800 hover:cursor-pointer disabled:opacity-50">Unlock 🔓</button>
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
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-5 w-5 group-hover:animate-bounce"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2}
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                                />
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                                />
                            </svg>

                            {/* Teks Alamat */}
                            <p className="text-sm md:text-base leading-relaxed max-w-xs md:max-w-none">
                                60-2, Jalan Timur 6/2D, Bandar Baru Enstek,
                                <br className="md:hidden" /> 71760 Nilai, Negeri
                                Sembilan
                            </p>
                        </a>
                    </div>

                    {/* MEDIA SOSIAL (INSTAGRAM & TIKTOK) */}
                    <div className="flex justify-center items-center gap-16 mb-6 text-gray-400">
                        {/* Instagram */}
                        <a
                            href="https://www.instagram.com/abgstudio25?igsh=MTJxZGRoejI1eHMxcA=="
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-[#E1306C] transition-colors duration-300"
                            aria-label="Instagram"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="24"
                                height="24"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <rect
                                    x="2"
                                    y="2"
                                    width="20"
                                    height="20"
                                    rx="5"
                                    ry="5"
                                ></rect>
                                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                                <line
                                    x1="17.5"
                                    y1="6.5"
                                    x2="17.51"
                                    y2="6.5"
                                ></line>
                            </svg>
                        </a>

                        {/* TikTok */}
                        <a
                            href="https://www.tiktok.com/@abgstudio25?_r=1&_t=ZS-94BKJ97hMbC"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-white transition-colors duration-300"
                            aria-label="TikTok"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="22"
                                height="22"
                                viewBox="0 0 448 512"
                                fill="currentColor"
                            >
                                <path d="M448,209.91a210.06,210.06,0,0,1-122.77-39.25V349.38A162.55,162.55,0,1,1,185,188.31V278.2a74.62,74.62,0,1,0,52.23,71.18V0l88,0a121.18,121.18,0,0,0,1.86,22.17h0A122.18,122.18,0,0,0,381,102.39a121.43,121.43,0,0,0,67,20.14Z" />
                            </svg>
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