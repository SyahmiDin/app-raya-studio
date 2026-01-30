"use client";
import { useState, useEffect } from "react";
import Link from "next/link"; // <--- Tambah ini

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

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center p-6">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-4xl border border-gray-100 relative">
        
        {/* --- HEADER BARU (Ada Button Booking & Logout) --- */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-4 border-b pb-6">
            <h1 className="text-3xl font-bold text-gray-800">
              Admin Dashboard 📸
            </h1>

            <div className="flex gap-3">
                 {/* BUTANG KE BOOKING LIST */}
                 <Link 
                   href="/admin/bookings" 
                   className="bg-blue-600 text-white px-5 py-2 rounded-lg font-bold shadow hover:bg-blue-700 transition flex items-center gap-2"
                 >
                   📅 List Booking
                 </Link>
                 
                 <Link 
       href="/admin/promo" 
       className="bg-green-600 text-white px-5 py-2 rounded-lg font-bold shadow hover:bg-green-700 transition flex items-center gap-2"
     >
       💰 Urus Promo
     </Link>

                 {/* BUTANG LOGOUT */}
                 <button
                   onClick={() => {
                     document.cookie = "admin_session=; path=/; max-age=0";
                     window.location.href = "/";
                   }}
                   className="bg-white border border-gray-300 text-gray-700 px-5 py-2 rounded-lg font-bold hover:bg-gray-100 transition"
                 >
                   Logout 🚪
                 </button>
            </div>
        </div>

        {/* --- FORM UPLOAD (Kekal Sama) --- */}
        <div className="space-y-6 mb-12 border-b pb-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Folder Baru</label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="cth: perkahwinan-ali"
                  className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-black"
                />
            </div>
            <div className="md:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">PIN (Auto)</label>
                <div className="flex gap-2">
                    <input
                        type="text"
                        maxLength="4"
                        value={pinCode}
                        onChange={(e) => setPinCode(e.target.value.replace(/\D/g,''))}
                        className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 font-mono text-center tracking-widest font-bold text-lg bg-gray-50"
                    />
                    <button type="button" onClick={() => setPinCode(generateRandomPin())} className="bg-gray-200 hover:bg-gray-300 px-3 rounded-lg text-xl">🎲</button>
                </div>
            </div>
          </div>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center bg-gray-50 relative hover:bg-gray-100 transition">
              <span className="text-4xl block mb-2">📂</span>
              <p className="text-sm text-gray-500">Klik untuk pilih gambar</p>
              <input type="file" multiple accept="image/*" onChange={handleFileSelect} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
          </div>
          {selectedFiles.length > 0 && (
            <div className="bg-gray-100 p-4 rounded-lg flex justify-between items-center">
                <p className="text-sm font-bold">Ready: {selectedFiles.length} gambar</p>
                <button onClick={() => {setSelectedFiles([]); setPreviewUrls([])}} className="text-xs text-red-500 hover:underline">Clear</button>
            </div>
          )}
          {uploading && (
             <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden animate-pulse">
               <div className="bg-blue-600 h-4 rounded-full transition-all duration-300" style={{ width: `${(progress.current / progress.total) * 100}%` }}></div>
             </div>
          )}
          <button onClick={handleBulkUpload} disabled={uploading || selectedFiles.length === 0} className="w-full bg-black text-white font-bold py-3 rounded-lg hover:bg-gray-800 disabled:opacity-50 transition transform active:scale-95 shadow-lg">
            {uploading ? `Sedang Upload...` : `Muat Naik`}
          </button>
        </div>

        {/* --- DASHBOARD LIST (Kekal Sama) --- */}
        <div>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800">Senarai Album ({albums.length})</h2>
                <button onClick={fetchAlbums} className="text-sm text-blue-600 hover:underline">Refresh List ↻</button>
            </div>

            {loadingAlbums ? (
                <div className="text-center py-10 text-gray-500">Loading data dari Cloud... ☁️</div>
            ) : albums.length === 0 ? (
                <div className="text-center py-10 bg-gray-50 rounded-lg text-gray-500">Belum ada album. Sila upload dulu.</div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-100 text-gray-600 uppercase text-xs">
                                <th className="p-4 rounded-tl-lg">Nama Folder</th>
                                <th className="p-4">PIN</th>
                                <th className="p-4">Gambar</th>
                                <th className="p-4 text-center rounded-tr-lg">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {albums.map((album, idx) => (
                                <tr key={idx} className="hover:bg-gray-50 transition">
                                    <td className="p-4 font-bold text-gray-800">{album.name}</td>
                                    <td className="p-4">
                                        <span className="bg-blue-100 text-blue-800 text-xs font-mono px-2 py-1 rounded border border-blue-200">
                                            {album.pin}
                                        </span>
                                    </td>
                                    <td className="p-4 text-gray-500">{album.count} keping</td>
                                    <td className="p-4 flex justify-center gap-2">
                                        <a href={`/gallery?client=${album.name}`} target="_blank" className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded" title="Tengok Galeri">View</a>
                                        <a href={`https://wa.me/?text=Salam, ini gambar raya anda! Link: ${window.location.origin}/gallery?client=${album.name} PIN: *${album.pin}*`} target="_blank" className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded" title="Share WhatsApp">Kongsi</a>
                                        <button onClick={() => handleDeleteAlbum(album.name)} className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded" title="Padam Album">Delete</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
      </div>

      {/* --- POPUP SUCCESS (Kekal Sama) --- */}
      {showSuccessModal && lastUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 text-center">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">🎉</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-1">Upload Berjaya!</h2>
            <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left border border-gray-100 mt-4">
              <div className="flex justify-between border-b pb-2 mb-2 border-gray-200">
                <span className="text-xs text-gray-400 uppercase font-bold">Client</span>
                <span className="text-sm font-bold text-gray-800">{lastUpload.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-400 uppercase font-bold">PIN Akses</span>
                <span className="text-3xl font-mono font-black text-blue-600 tracking-widest">{lastUpload.pin}</span>
              </div>
            </div>
            <div className="space-y-3">
              <a href={`https://wa.me/?text=${whatsappMessage}`} target="_blank" className="flex items-center justify-center w-full bg-[#25D366] text-white font-bold py-3 rounded-xl hover:bg-[#128C7E] transition shadow-lg shadow-green-500/20">Hantar WhatsApp 📲</a>
              <button onClick={resetForm} className="w-full py-3 text-gray-500 font-bold hover:bg-gray-100 rounded-xl transition">Tutup</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}