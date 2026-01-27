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

  // AUTH STATE
  const [isPinVerified, setIsPinVerified] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [pendingAction, setPendingAction] = useState(null); // 'single' | 'bulk'

  // MODAL & DOWNLOAD STATE
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);
  const [isZipping, setIsZipping] = useState(false);
  const [zipProgress, setZipProgress] = useState(0);

  useEffect(() => {
    if (!clientFolder) return;
    fetch(`/api/photos?folder=${clientFolder}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.photos) setPhotos(data.photos);
        setLoading(false);
      });
  }, [clientFolder]);

  // --- LOGIC PIN ---
  async function verifyPin() {
    if (pinInput.length !== 4) return;
    
    setPinError(""); // Clear error lama
    
    try {
        const res = await fetch("/api/check-pin", {
            method: "POST",
            body: JSON.stringify({ folder: clientFolder, pin: pinInput })
        });
        const data = await res.json();

        if (data.success) {
            setIsPinVerified(true);
            setShowPinModal(false);
            // Teruskan action yang tertangguh tadi
            if (pendingAction?.type === 'bulk') handleBulkDownload(true);
            if (pendingAction?.type === 'single') handleSingleDownload(pendingAction.url, pendingAction.key, true);
        } else {
            setPinError("PIN Salah! Sila cuba lagi.");
        }
    } catch (err) {
        setPinError("Error sistem. Cuba refresh.");
    }
  }

  // --- DOWNLOAD HANDLERS (Intercepted) ---

  // 1. Single Download
  function requestSingleDownload(url, key) {
    if (isPinVerified) {
        handleSingleDownload(url, key, true);
    } else {
        setPendingAction({ type: 'single', url, key });
        setShowPinModal(true);
    }
  }

  async function handleSingleDownload(url, filename, bypassCheck = false) {
    if (!bypassCheck && !isPinVerified) return requestSingleDownload(url, filename);

    setDownloadingId(url);
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.setAttribute("download", filename.split("/").pop());
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      alert("Gagal download.");
    }
    setDownloadingId(null);
  }

  // 2. Bulk Download
  function requestBulkDownload() {
    if (isPinVerified) {
        handleBulkDownload(true);
    } else {
        setPendingAction({ type: 'bulk' });
        setShowPinModal(true);
    }
  }

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
        const response = await fetch(photo.url);
        const blob = await response.blob();
        zip.file(filename, blob);
        setZipProgress(Math.round(((i + 1) / photos.length) * 100));
      }
      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, `${clientFolder}-StudioRaya.zip`);
    } catch (error) {
      alert("Error zipping.");
    }
    setIsZipping(false);
  }

  if (!clientFolder) return <div className="text-center p-10 mt-10">Sila masukkan URL yang betul</div>;
  if (loading) return <div className="text-center p-10 text-xl mt-10 animate-pulse">Loading... ⏳</div>;

  return (
    <div className="min-h-screen bg-white p-4 md:p-8">
      {/* HEADER & BULK DOWNLOAD */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-10 max-w-7xl mx-auto">
        <div className="text-center md:text-left">
          <h1 className="text-3xl font-bold text-gray-900 capitalize">{clientFolder.replace(/-/g, " ")}</h1>
        </div>
        <button
          onClick={requestBulkDownload} // <--- CHECK PIN DULU
          disabled={isZipping}
          className="mt-4 md:mt-0 px-6 py-3 bg-black text-white rounded-lg font-bold shadow-md hover:bg-gray-800 disabled:bg-gray-400"
        >
          {isZipping ? `Processing ${zipProgress}%` : "Download All (.zip) 📦"}
        </button>
      </div>

      {/* GRID */}
      <div className="columns-2 md:columns-3 lg:columns-4 gap-2 space-y-4 max-w-fullwidth mx-auto">
        {photos.map((photo) => (
          <div key={photo.key} className="relative group break-inside-avoid mb-4 cursor-pointer rounded-lg overflow-hidden"
            onClick={() => setSelectedPhoto(photo)}>
            <img src={photo.url} className="w-full h-auto" loading="lazy" />
            <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-20 transition-opacity"></div>
          </div>
        ))}
      </div>

      {/* LIGHTBOX MODAL */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-40 bg-black/95 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setSelectedPhoto(null)}>
          <div className="relative max-w-5xl flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <img src={selectedPhoto.url} className="max-h-[80vh] w-auto rounded shadow-2xl" />
            <div className="mt-6 flex gap-4">
               <button
                  onClick={() => requestSingleDownload(selectedPhoto.url, selectedPhoto.key)} // <--- CHECK PIN DULU
                  className="bg-white text-black px-8 py-3 rounded-full font-bold hover:bg-gray-200 transition"
               >
                 {downloadingId === selectedPhoto.url ? "Downloading..." : "Download HD ⬇️"}
               </button>
               <button onClick={() => setSelectedPhoto(null)} className="bg-gray-800 text-white px-6 py-3 rounded-full">Tutup ✕</button>
            </div>
          </div>
        </div>
      )}

      {/* PIN CODE MODAL (Pop-up bila nak download) */}
      {showPinModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-sm w-full text-center animate-fade-in-up">
                <span className="text-4xl mb-4 block">🔒</span>
                <h3 className="text-xl font-bold text-gray-800 mb-2">Masukkan PIN Download</h3>
                <p className="text-sm text-gray-500 mb-6">Sila masukkan 4-digit PIN yang diberikan oleh Admin untuk download gambar.</p>
                
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
                    <button 
                        onClick={() => setShowPinModal(false)}
                        className="flex-1 py-3 text-gray-500 font-bold hover:bg-gray-100 rounded-lg"
                    >
                        Batal
                    </button>
                    <button 
                        onClick={verifyPin}
                        disabled={pinInput.length !== 4}
                        className="flex-1 py-3 bg-black text-white font-bold rounded-lg hover:bg-gray-800 disabled:opacity-50"
                    >
                        Unlock 🔓
                    </button>
                </div>
            </div>
        </div>
      )}
      
      <footer className="mt-20 text-center text-gray-400 text-xs py-10">&copy; 2026 Studio Raya.</footer>
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