// app/admin/page.js
"use client";
import { useState, useEffect } from "react";

export default function AdminPage() {
  // --- 1. UTILS (Jana PIN & Date) ---
  const generateRandomPin = () => Math.floor(1000 + Math.random() * 9000).toString();

  // --- 2. STATE ---
  const [pinCode, setPinCode] = useState("");
  const [clientName, setClientName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  
  // State untuk Popup & History
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [lastUpload, setLastUpload] = useState(null); // Simpan rekod upload terakhir

  // Initialize PIN masa mula-mula buka
  useEffect(() => {
    setPinCode(generateRandomPin());
  }, []);

  // --- 3. HANDLERS ---
  function handleFileSelect(e) {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    setSelectedFiles((prev) => [...prev, ...files]);
    const newPreviews = files.map((file) => URL.createObjectURL(file));
    setPreviewUrls((prev) => [...prev, ...newPreviews]);
  }

  function resetForm() {
    // Kita simpan info upload tadi dalam 'lastUpload' sebelum reset form
    // Jadi link tu tak hilang walaupun popup ditutup
    setLastUpload({
      name: clientName,
      pin: pinCode,
      link: getGalleryLink(clientName)
    });

    // Reset borang untuk job seterusnya
    setClientName("");
    setPinCode(generateRandomPin()); 
    setSelectedFiles([]);
    setPreviewUrls([]);
    setShowSuccessModal(false);
    setIsCopied(false);
  }

  // Helper untuk dapatkan link
  const getGalleryLink = (name) => {
    if (typeof window !== "undefined" && name) {
      return `${window.location.origin}/gallery?client=${name}`;
    }
    return "";
  };

  // Function Copy Link
  const handleCopyLink = (text) => {
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  async function handleBulkUpload(e) {
    e.preventDefault();

    if (selectedFiles.length === 0) return alert("Tiada gambar dipilih!");
    if (!clientName) return alert("Sila masukkan nama album!");
    if (!pinCode || pinCode.length !== 4) return alert("Sila masukkan 4 digit PIN!"); 

    setUploading(true);
    // +1 sebab kita upload fail kunci sekali
    setProgress({ current: 0, total: selectedFiles.length + 1 });

    try {
        // A. Upload Fail Kunci (PIN)
        // Nama fail MESTI 'lock-XXXX.sys' supaya backend kenal
        const pinFileName = `lock-${pinCode}.sys`;
        const pinFile = new File(["secret"], pinFileName, { type: "text/plain" });
        const formDataPin = new FormData();
        formDataPin.append("file", pinFile);
        formDataPin.append("clientName", clientName);
        
        await fetch("/api/upload", { method: "POST", body: formDataPin });

        // B. Upload Gambar-gambar
        let successCount = 0;
        for (let i = 0; i < selectedFiles.length; i++) {
            const file = selectedFiles[i];
            const formData = new FormData();
            formData.append("file", file);
            formData.append("clientName", clientName);

            try {
                const res = await fetch("/api/upload", { method: "POST", body: formData });
                const data = await res.json();
                if (data.success) successCount++;
            } catch (err) { console.error(err); }
            
            // Update progress bar (+1 sebab pin file dah lepas)
            setProgress({ current: i + 1 + 1, total: selectedFiles.length + 1 });
        }

        if (successCount === selectedFiles.length) {
            // C. Upload Siap! Set rekod dan buka popup
            const link = getGalleryLink(clientName);
            setLastUpload({ name: clientName, pin: pinCode, link: link });
            setShowSuccessModal(true);
        }

    } catch (err) {
        console.error("Error bulk upload", err);
        alert("Ada masalah teknikal masa upload.");
    }
    setUploading(false);
  }

  // Template Mesej WhatsApp (guna info dari lastUpload atau form semasa)
  const currentLink = lastUpload ? lastUpload.link : getGalleryLink(clientName);
  const currentPin = lastUpload ? lastUpload.pin : pinCode;
  const whatsappMessage = `Salam, ini gambar raya anda!%0A%0ALink: ${currentLink}%0APIN: *${currentPin}*`;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center p-6">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-3xl border border-gray-100 relative">
        <h1 className="text-2xl font-bold mb-6 text-center text-gray-800">
          Admin Studio Raya 📸
        </h1>

        {/* --- FORM UPLOAD --- */}
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Input Nama Folder */}
            <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Folder (Client)</label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="cth: keluarga-ahmad"
                  className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-black"
                />
            </div>

            {/* Input PIN Auto */}
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
                    <button 
                        type="button"
                        onClick={() => setPinCode(generateRandomPin())}
                        className="bg-gray-200 hover:bg-gray-300 px-3 rounded-lg text-xl"
                        title="Tukar PIN Random"
                    >
                        🎲
                    </button>
                </div>
            </div>
          </div>

          {/* Upload Area */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center bg-gray-50 relative hover:bg-gray-100 transition">
              <span className="text-4xl block mb-2">📂</span>
              <p className="text-sm text-gray-500">Klik untuk pilih gambar (Banyak)</p>
              <input type="file" multiple accept="image/*" onChange={handleFileSelect} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
          </div>

          {/* Preview Grid */}
          {selectedFiles.length > 0 && (
            <div className="bg-gray-100 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                    <p className="text-sm font-bold">Preview ({selectedFiles.length} item)</p>
                    <button onClick={() => {setSelectedFiles([]); setPreviewUrls([])}} className="text-xs text-red-500 hover:underline">Clear Semua</button>
                </div>
                <div className="grid grid-cols-6 gap-2 max-h-32 overflow-y-auto">
                    {previewUrls.map((url, i) => (
                        <img key={i} src={url} className="aspect-square object-cover rounded border bg-white" />
                    ))}
                </div>
            </div>
          )}

          {/* Progress Bar */}
          {uploading && (
             <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden animate-pulse">
               <div className="bg-blue-600 h-4 rounded-full transition-all duration-300" style={{ width: `${(progress.current / progress.total) * 100}%` }}></div>
               <p className="text-xs text-center mt-1 text-gray-500">Mengupload fail {progress.current} dari {progress.total}...</p>
             </div>
          )}

          {/* Submit Button */}
          <button
            onClick={handleBulkUpload}
            disabled={uploading || selectedFiles.length === 0}
            className="w-full bg-black text-white font-bold py-3 rounded-lg hover:bg-gray-800 disabled:opacity-50 transition transform active:scale-95 shadow-lg"
          >
            {uploading ? `Sedang Upload...` : `Upload Sekarang 🚀`}
          </button>
        </div>

        {/* --- 4. HISTORY (VIEW REKOD TERAKHIR) --- */}
        {/* Bahagian ini kekal walaupun popup ditutup */}
        {lastUpload && !uploading && (
          <div className="mt-8 border-t pt-6 animate-fade-in-up">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3">Upload Terakhir (Rekod Team)</h3>
            <div className="bg-green-50 border border-green-200 p-4 rounded-xl flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="text-left">
                <p className="font-bold text-gray-800">{lastUpload.name}</p>
                <div className="flex items-center gap-2 mt-1">
                   <span className="text-xs bg-black text-white px-2 py-0.5 rounded">PIN: {lastUpload.pin}</span>
                   <a href={lastUpload.link} target="_blank" className="text-xs text-blue-600 underline hover:text-blue-800">Buka Link</a>
                </div>
              </div>
              <button 
                onClick={() => handleCopyLink(lastUpload.link)}
                className="text-sm bg-white border border-green-300 px-3 py-1.5 rounded-lg font-bold text-green-700 hover:bg-green-100 transition"
              >
                 {isCopied ? "Link Disalin!" : "Copy Link"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* --- 5. POPUP MODAL (SUCCESS) --- */}
      {showSuccessModal && lastUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 text-center transform transition-all scale-100">
            
            {/* Icon Success */}
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
              🎉
            </div>

            <h2 className="text-2xl font-bold text-gray-800 mb-1">Upload Berjaya!</h2>
            <p className="text-gray-500 text-sm mb-6">Fail dah masuk Cloud. Boleh share sekarang.</p>

            {/* Info Box */}
            <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left border border-gray-100 shadow-inner">
              <div className="flex justify-between border-b pb-2 mb-2 border-gray-200">
                <span className="text-xs text-gray-400 uppercase font-bold">Client</span>
                <span className="text-sm font-bold text-gray-800">{lastUpload.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-400 uppercase font-bold">PIN Akses</span>
                <span className="text-3xl font-mono font-black text-blue-600 tracking-widest">{lastUpload.pin}</span>
              </div>
            </div>

            {/* Link Copy Section */}
            <div className="mb-4">
               <label className="text-xs text-gray-400 font-bold block text-left mb-1 ml-1">LINK GALERI</label>
               <div className="flex gap-2">
                 <input 
                    readOnly 
                    value={lastUpload.link} 
                    className="w-full bg-gray-100 text-sm p-3 rounded-lg border border-gray-200 text-gray-600 outline-none"
                 />
                 <button 
                    onClick={() => handleCopyLink(lastUpload.link)}
                    className={`px-4 font-bold rounded-lg transition text-white whitespace-nowrap ${isCopied ? 'bg-green-500' : 'bg-gray-800 hover:bg-black'}`}
                 >
                    {isCopied ? "Disalin! ✓" : "Copy"}
                 </button>
               </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <a 
                href={`https://wa.me/?text=${whatsappMessage}`}
                target="_blank"
                className="flex items-center justify-center w-full bg-[#25D366] text-white font-bold py-3 rounded-xl hover:bg-[#128C7E] transition shadow-lg shadow-green-500/20"
              >
                 Hantar WhatsApp 📲
              </a>

              <button 
                onClick={resetForm}
                className="w-full py-3 text-gray-500 font-bold hover:bg-gray-100 rounded-xl transition"
              >
                Tutup & Reset (New Upload)
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}