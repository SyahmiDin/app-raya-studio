"use client";
import { useState, useEffect } from "react";
import Link from "next/link"; 

export default function AdminPage() {
  // --- UTILS ---
  const generateRandomPin = () => Math.floor(1000 + Math.random() * 9000).toString();

  // --- STATE ---
  const [pinCode, setPinCode] = useState("");
  const [clientName, setClientName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  
  // State Popup & History
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [lastUpload, setLastUpload] = useState(null);

  // State Dashboard (List Album)
  const [albums, setAlbums] = useState([]);
  const [loadingAlbums, setLoadingAlbums] = useState(true);

  // Initialize
  useEffect(() => {
    setPinCode(generateRandomPin());
    fetchAlbums(); 
  }, []);

  // --- FETCH ALBUMS (DASHBOARD) ---
  async function fetchAlbums() {
    setLoadingAlbums(true);
    try {
        const res = await fetch("/api/albums");
        const data = await res.json();
        if (data.albums) {
            setAlbums(data.albums.reverse()); 
        }
    } catch (err) {
        console.error("Gagal load album");
    }
    setLoadingAlbums(false);
  }

  // --- DELETE ALBUM ---
  async function handleDeleteAlbum(folderName) {
    if (!confirm(`AMARAN: Anda pasti nak PADAM album "${folderName}"?\nSemua gambar akan hilang dan client tak boleh access dah.`)) return;

    try {
        const res = await fetch("/api/albums", {
            method: "DELETE",
            body: JSON.stringify({ folderName }),
        });
        const data = await res.json();
        
        if (data.success) {
            alert("Album berjaya dipadam.");
            fetchAlbums(); 
        } else {
            alert("Gagal padam.");
        }
    } catch (err) {
        alert("Error sistem.");
    }
  }

  // --- HANDLERS LAIN ---
  function handleFileSelect(e) {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    setSelectedFiles((prev) => [...prev, ...files]);
    const newPreviews = files.map((file) => URL.createObjectURL(file));
    setPreviewUrls((prev) => [...prev, ...newPreviews]);
  }

  function resetForm() {
    setLastUpload({
      name: clientName,
      pin: pinCode,
      link: getGalleryLink(clientName)
    });
    setClientName("");
    setPinCode(generateRandomPin()); 
    setSelectedFiles([]);
    setPreviewUrls([]);
    setShowSuccessModal(false);
    setIsCopied(false);
    fetchAlbums(); 
  }

  const getGalleryLink = (name) => {
    if (typeof window !== "undefined" && name) {
      return `${window.location.origin}/gallery?client=${name}`;
    }
    return "";
  };

  // --- FUNCTION UPLOAD BARU (DIRECT CLOUDFLARE) 🚀 ---
  async function handleBulkUpload(e) {
    e.preventDefault();
    if (selectedFiles.length === 0) return alert("Tiada gambar dipilih!");
    if (!clientName) return alert("Sila masukkan nama album!");
    if (!pinCode || pinCode.length !== 4) return alert("Sila masukkan 4 digit PIN!"); 

    setUploading(true);
    setProgress({ current: 0, total: selectedFiles.length + 1 });

    try {
        // Helper: Function untuk minta link & upload terus
        const uploadDirectly = async (file) => {
            // 1. Minta tiket dari Vercel
            const resInit = await fetch("/api/upload-url", {
                method: "POST",
                body: JSON.stringify({ 
                    filename: file.name, 
                    filetype: file.type,
                    clientName: clientName 
                })
            });
            const { uploadUrl, finalUrl } = await resInit.json();

            // 2. Upload terus ke Cloudflare (Bypass Vercel)
            await fetch(uploadUrl, {
                method: "PUT",
                body: file,
                headers: { "Content-Type": file.type }
            });

            return finalUrl;
        };

        // A. Upload Fail Kunci (PIN)
        const pinFileName = `lock-${pinCode}.sys`;
        const pinFile = new File(["secret"], pinFileName, { type: "text/plain" });
        await uploadDirectly(pinFile);

        // B. Upload Gambar
        let successCount = 0;
        for (let i = 0; i < selectedFiles.length; i++) {
            const file = selectedFiles[i];
            try {
                await uploadDirectly(file);
                successCount++;
            } catch (err) { console.error("Gagal upload:", file.name); }
            
            setProgress({ current: i + 1 + 1, total: selectedFiles.length + 1 });
        }

        if (successCount === selectedFiles.length) {
            const link = getGalleryLink(clientName);
            setLastUpload({ name: clientName, pin: pinCode, link: link });
            setShowSuccessModal(true);
            fetchAlbums(); // Refresh list
        }

    } catch (err) {
        console.error("Error bulk upload", err);
        alert("Ada masalah teknikal masa upload.");
    }
    setUploading(false);
  }

  const currentLink = lastUpload ? lastUpload.link : getGalleryLink(clientName);
  const currentPin = lastUpload ? lastUpload.pin : pinCode;
  const whatsappMessage = `Salam, ini gambar raya anda!%0A%0ALink: ${currentLink}%0APIN: *${currentPin}*`;

  // --- DESIGN CONSTANTS ---
  const THEME_COLOR = "#412986"; // Royal Purple
  const GOLD_COLOR = "#D4AF37"; // Metallic Gold

  return (
    <div className="min-h-screen flex flex-col items-center p-3 md:p-6 relative font-sans overflow-x-hidden" style={{ backgroundColor: "#FDFBF7" }}>
      
      {/* --- BACKGROUND DECORATION --- */}
      <div className="absolute top-0 left-0 w-full h-48 md:h-64 z-0" style={{ background: `linear-gradient(to bottom, ${THEME_COLOR}, #FDFBF7)` }}></div>
      <div className="absolute top-5 right-5 opacity-10 text-6xl md:text-9xl z-0 text-white select-none">☪️</div>
      <div className="absolute top-5 left-5 opacity-10 text-6xl md:text-9xl z-0 text-white select-none">✨</div>

      <div className="bg-white p-5 md:p-8 rounded-xl shadow-2xl w-full max-w-5xl relative z-10 border-t-8" style={{ borderColor: GOLD_COLOR }}>
        
        {/* --- HEADER --- */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 md:mb-10 gap-6 border-b pb-6 border-gray-100 text-center md:text-left">
            <div>
                <h1 className="text-2xl md:text-4xl font-serif font-bold tracking-wide" style={{ color: THEME_COLOR }}>
                  Studio ABG Raya Admin
                </h1>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                 <Link 
                   href="/admin/bookings" 
                   className="bg-white px-5 py-2.5 rounded-full font-semibold shadow-sm hover:shadow-md transition flex items-center justify-center gap-2 border w-full md:w-auto text-sm md:text-base"
                   style={{ color: THEME_COLOR, borderColor: THEME_COLOR }}
                 >
                   List Booking
                 </Link>

                 <Link 
                    href="/admin/monitor" 
                    className="text-white px-5 py-2.5 rounded-full font-semibold shadow hover:opacity-90 transition flex items-center justify-center gap-2 w-full md:w-auto text-sm md:text-base"
                    style={{ backgroundColor: THEME_COLOR }}
                 >
                    Slot Monitor
                 </Link>
                 
                 <Link 
                    href="/admin/promo" 
                    className="text-white px-5 py-2.5 rounded-full font-semibold shadow hover:opacity-90 transition flex items-center justify-center gap-2 w-full md:w-auto text-sm md:text-base"
                    style={{ backgroundColor: GOLD_COLOR }}
                 >
                    Referral Kod
                 </Link>
            </div>
        </div>

        {/* --- FORM UPLOAD --- */}
        <div className="mb-12 border-b pb-12 border-gray-100">
          <div className="bg-gray-50 p-4 md:p-6 rounded-2xl border border-gray-100">
              <h3 className="text-lg font-serif font-bold mb-4 flex items-center gap-2" style={{ color: THEME_COLOR }}>
                  📂 Upload Album Baru
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-6">
                <div className="md:col-span-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Nama Folder (Keluarga)</label>
                    <input
                      type="text"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="cth: keluarga-pak-abu"
                      className="w-full p-3 md:p-4 border border-gray-200 rounded-xl outline-none focus:ring-2 transition shadow-sm bg-white"
                      style={{ focusRingColor: THEME_COLOR }}
                    />
                </div>
                <div className="md:col-span-1">
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Nombor PIN</label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            maxLength="4"
                            value={pinCode}
                            onChange={(e) => setPinCode(e.target.value.replace(/\D/g,''))}
                            className="w-full p-3 md:p-4 border border-gray-200 rounded-xl outline-none focus:ring-2 font-mono text-center tracking-[0.2em] md:tracking-[0.5em] font-bold text-lg md:text-xl bg-white text-gray-700 shadow-sm"
                        />
                        <button 
                            type="button" 
                            onClick={() => setPinCode(generateRandomPin())} 
                            className="px-3 md:px-4 rounded-xl text-xl hover:bg-gray-200 transition bg-white border border-gray-200 shadow-sm"
                        >
                            🎲
                        </button>
                    </div>
                </div>
              </div>

              <div className="relative group cursor-pointer mb-6">
                  <div className="border-2 border-dashed border-gray-300 rounded-2xl p-6 md:p-10 text-center bg-white group-hover:bg-purple-50 transition duration-300 relative overflow-hidden">
                      {/* Decorative pattern for upload area */}
                      <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: `radial-gradient(${THEME_COLOR} 1px, transparent 1px)`, backgroundSize: '20px 20px' }}></div>
                      
                      <span className="text-4xl md:text-5xl block mb-3 animate-bounce">📸</span>
                      <p className="text-gray-600 font-medium text-sm md:text-base">Klik untuk pilih gambar Raya</p>
                      <p className="text-xs text-gray-400 mt-1">Format: JPG, PNG (Max 500 gambar)</p>
                      <input type="file" multiple accept="image/*" onChange={handleFileSelect} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                  </div>
              </div>

              {selectedFiles.length > 0 && (
                <div className="bg-purple-50 border border-purple-100 p-4 rounded-xl flex flex-col sm:flex-row justify-between items-center mb-6 gap-2">
                    <p className="text-sm font-bold flex items-center gap-2" style={{ color: THEME_COLOR }}>
                        ✅ {selectedFiles.length} keping gambar dipilih
                    </p>
                    <button onClick={() => {setSelectedFiles([]); setPreviewUrls([])}} className="text-xs text-red-500 hover:text-red-700 font-bold uppercase bg-white px-3 py-1 rounded shadow-sm">Padam Semua</button>
                </div>
              )}

              {uploading && (
                 <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden mb-4">
                   <div 
                        className="h-3 rounded-full transition-all duration-300" 
                        style={{ width: `${(progress.current / progress.total) * 100}%`, backgroundColor: GOLD_COLOR }}
                   ></div>
                 </div>
              )}

              <button 
                onClick={handleBulkUpload} 
                disabled={uploading || selectedFiles.length === 0} 
                className="w-full text-white font-bold py-3 md:py-4 rounded-xl disabled:opacity-50 transition transform active:scale-[0.98] shadow-lg text-base md:text-lg flex justify-center items-center gap-2 hover:cursor-pointer"
                style={{ backgroundColor: THEME_COLOR }}
              >
                {uploading ? `Sedang Memuat Naik...` : `🚀 Muat Naik Album`}
              </button>
          </div>
        </div>

        {/* --- DASHBOARD LIST --- */}
        <div>
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-2">
                <h2 className="text-xl md:text-2xl font-serif font-bold text-gray-800 flex items-center gap-2">
                    <span style={{color: GOLD_COLOR}}>✦</span> Senarai Album ({albums.length})
                </h2>
                <button onClick={fetchAlbums} className="text-sm font-semibold hover:underline flex items-center gap-1 bg-gray-50 px-3 py-1 rounded-full hover:cursor-pointer" style={{ color: THEME_COLOR }}>
                    Refresh List ↻
                </button>
            </div>

            {loadingAlbums ? (
                <div className="text-center py-20 bg-gray-50 rounded-2xl border border-gray-100">
                     <p className="text-gray-400 animate-pulse">Sedang mengambil data awan... ☁️</p>
                </div>
            ) : albums.length === 0 ? (
                <div className="text-center py-20 bg-gray-50 rounded-2xl border border-dashed border-gray-300 text-gray-500">
                    Belum ada album raya. Sila upload dulu.
                </div>
            ) : (
                // WRAPPER: Responsive Table (Scrollable Horizontal)
                <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
                    <table className="w-full text-left border-collapse min-w-[600px] md:min-w-full">
                        <thead>
                            <tr className="text-white text-xs md:text-sm uppercase tracking-wider" style={{ backgroundColor: THEME_COLOR }}>
                                <th className="p-4 md:p-5 font-medium">Nama Album</th>
                                <th className="p-4 md:p-5 font-medium text-center">PIN</th>
                                <th className="p-4 md:p-5 font-medium text-center">Jumlah</th>
                                <th className="p-4 md:p-5 font-medium text-center">Tindakan</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white text-sm md:text-base">
                            {albums.map((album, idx) => (
                                <tr key={idx} className="hover:bg-purple-50 transition duration-150 group">
                                    <td className="p-4 md:p-5 font-bold text-gray-700 capitalize flex items-center gap-3">
                                        <span className="text-lg opacity-50 group-hover:opacity-100 transition">📁</span> {album.name}
                                    </td>
                                    <td className="p-4 md:p-5 text-center">
                                        <span className="bg-gray-100 text-gray-600 text-xs font-mono font-bold px-2 py-1 md:px-3 rounded-full border border-gray-200 group-hover:border-purple-200 group-hover:text-purple-700 group-hover:bg-white transition whitespace-nowrap">
                                            {album.pin}
                                        </span>
                                    </td>
                                    <td className="p-4 md:p-5 text-gray-500 text-center whitespace-nowrap">{album.count}</td>
                                    <td className="p-4 md:p-5 flex justify-center gap-2">
                                        <a href={`/gallery?client=${album.name}`} target="_blank" className="p-2 text-gray-400 hover:text-blue-600 transition bg-gray-50 rounded-lg" title="Lihat">View</a>
                                        <a href={`https://wa.me/?text=Salam, ini gambar raya anda! Link: ${window.location.origin}/gallery?client=${album.name} PIN: *${album.pin}*`} target="_blank" className="p-2 text-gray-400 hover:text-green-500 transition bg-gray-50 rounded-lg" title="WhatsApp">Share</a>
                                        <button onClick={() => handleDeleteAlbum(album.name)} className="p-2 text-gray-400 hover:text-red-500 transition bg-gray-50 rounded-lg" title="Padam">Padam</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
      </div>

      {/* --- POPUP SUCCESS --- */}
      {showSuccessModal && lastUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-purple-900/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm md:max-w-md p-6 md:p-8 text-center border-4 relative overflow-hidden" style={{ borderColor: GOLD_COLOR }}>
            {/* Background pattern inside modal */}
            <div className="absolute top-0 left-0 w-full h-20 md:h-24 opacity-10" style={{ backgroundColor: THEME_COLOR }}></div>
            
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl md:text-4xl relative z-10 shadow-lg" style={{ backgroundColor: '#fff', color: GOLD_COLOR, border: `2px solid ${GOLD_COLOR}` }}>
                🌙
            </div>
            
            <h2 className="text-xl md:text-2xl font-serif font-bold text-gray-800 mb-2">Siap!</h2>
            <p className="text-gray-500 text-xs md:text-sm mb-6">Album berjaya dimuat naik.</p>
            
            <div className="bg-gray-50 rounded-xl p-4 md:p-5 mb-6 md:mb-8 text-left border border-dashed border-gray-300 relative">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-white px-3 text-[10px] md:text-xs font-bold text-gray-400 tracking-widest uppercase">
                  Gallery Baharu
              </div>
              <div className="flex justify-between border-b pb-3 mb-3 border-gray-200">
                <span className="text-xs text-gray-400 uppercase font-bold">Keluarga</span>
                <span className="text-xs md:text-sm font-bold text-gray-800 capitalize truncate ml-2">{lastUpload.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-400 uppercase font-bold">PIN Akses</span>
                <span className="text-2xl md:text-3xl font-mono font-black tracking-widest" style={{ color: THEME_COLOR }}>{lastUpload.pin}</span>
              </div>
            </div>
            
            <div className="space-y-3">
              <a 
                href={`https://wa.me/?text=${whatsappMessage}`} 
                target="_blank" 
                className="flex items-center justify-center w-full text-white font-bold py-3 md:py-3.5 rounded-xl hover:opacity-90 transition shadow-md gap-2 text-sm md:text-base"
                style={{ backgroundColor: '#25D366' }} // Whatsapp Green
              >
                <span>📤</span> Hantar WhatsApp
              </a>
              <button onClick={resetForm} className="w-full py-3 md:py-3.5 text-gray-500 font-bold hover:bg-gray-100 rounded-xl transition text-sm md:text-base">
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}