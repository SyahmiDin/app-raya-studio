// app/admin/page.js
"use client";
import { useState, useEffect } from "react";

export default function AdminPage() {
  const [uploading, setUploading] = useState(false);
  const [clientName, setClientName] = useState("");
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [logs, setLogs] = useState([]); 
  
  // STATE BARU: Untuk simpan fail yang belum di-upload
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);

  // Fungsi bila user pilih gambar (Drag & Drop atau Klik)
  function handleFileSelect(e) {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    // 1. Simpan fail sebenar dalam state
    setSelectedFiles((prev) => [...prev, ...files]);

    // 2. Generate URL sementara untuk preview
    const newPreviews = files.map((file) => URL.createObjectURL(file));
    setPreviewUrls((prev) => [...prev, ...newPreviews]);
  }

  // Fungsi buang gambar dari list preview (kalau tersalah pilih)
  function removeFile(index) {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    const newPreviews = previewUrls.filter((_, i) => i !== index);
    
    setSelectedFiles(newFiles);
    setPreviewUrls(newPreviews);
  }

  async function handleBulkUpload(e) {
    e.preventDefault();

    // KITA GUNA 'selectedFiles' DARI STATE, BUKAN DARI FORM INPUT LAGI
    if (selectedFiles.length === 0) {
      alert("Tiada gambar dipilih!");
      return;
    }

    if (!clientName) {
      alert("Sila masukkan nama album!");
      return;
    }

    setUploading(true);
    setLogs([]); 
    setProgress({ current: 0, total: selectedFiles.length });

    let successCount = 0;

    // Loop guna selectedFiles
    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      const formData = new FormData();
      formData.append("file", file);
      formData.append("clientName", clientName);

      try {
        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();

        if (data.success) {
          successCount++;
          setLogs((prev) => [...prev, data.url]);
        } else {
          console.error("Gagal upload:", file.name);
        }
      } catch (err) {
        console.error("Error network:", file.name);
      }

      setProgress({ current: i + 1, total: selectedFiles.length });
    }

    setUploading(false);
    
    // Clear preview lepas dah siap upload
    if (successCount === selectedFiles.length) {
        alert("Semua gambar berjaya diupload! 🎉");
        setSelectedFiles([]);
        setPreviewUrls([]);
    } else {
        alert(`Siap! ${successCount} daripada ${selectedFiles.length} berjaya.`);
    }
  }

  const galleryLink = typeof window !== "undefined" 
    ? `${window.location.origin}/gallery?client=${clientName}`
    : "";

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center p-6">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-3xl border border-gray-100">
        <h1 className="text-2xl font-bold mb-6 text-center text-gray-800">
          Bulk Upload Studio Raya 📸
        </h1>

        <div className="space-y-6">
          {/* Input Nama Album */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nama Album / Folder
            </label>
            <input
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Contoh: keluarga-siti"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black outline-none transition"
            />
          </div>

          {/* KOTAK UPLOAD & PREVIEW AREA */}
          <div className="space-y-4">
            
            {/* 1. Kotak Dropzone */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:bg-gray-50 transition relative group bg-gray-50">
              <div className="space-y-2">
                <span className="text-4xl">📂</span>
                <p className="text-gray-500 text-sm font-medium">
                  Drag & Drop gambar di sini
                </p>
                <p className="text-xs text-gray-400">Atau klik untuk pilih fail</p>
              </div>
              
              <input
                type="file"
                multiple 
                accept="image/*"
                onChange={handleFileSelect} // Kita guna function baru ni
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>

            {/* 2. PREVIEW SEBELUM UPLOAD (Yang kau minta) */}
            {selectedFiles.length > 0 && (
              <div className="bg-gray-100 p-4 rounded-lg animate-fade-in-down">
                <div className="flex justify-between items-center mb-2">
                    <p className="text-sm font-bold text-gray-700">
                        Gambar Dipilih ({selectedFiles.length}):
                    </p>
                    <button 
                        onClick={() => { setSelectedFiles([]); setPreviewUrls([]); }}
                        className="text-xs text-red-500 hover:underline"
                    >
                        Buang Semua
                    </button>
                </div>
                
                {/* Grid Preview */}
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-3 max-h-60 overflow-y-auto pr-2">
                  {previewUrls.map((url, index) => (
                    <div key={index} className="relative group aspect-square">
                      <img 
                        src={url} 
                        className="w-full h-full object-cover rounded-md border border-gray-300" 
                        alt="preview"
                      />
                      {/* Butang X (Remove) */}
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs shadow-md opacity-0 group-hover:opacity-100 transition"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 3. Butang Upload & Progress */}
            {uploading && (
              <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                <div 
                  className="bg-blue-600 h-4 rounded-full transition-all duration-300"
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                ></div>
                <p className="text-xs text-center mt-1 text-gray-600">
                  Sedang proses: {progress.current} / {progress.total}
                </p>
              </div>
            )}

            <button
              onClick={handleBulkUpload} // Button ni duduk luar form, kita trigger function manual
              disabled={uploading || selectedFiles.length === 0}
              className="w-full bg-black text-white font-bold py-3 rounded-lg hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? "Sedang Upload..." : `Upload ${selectedFiles.length > 0 ? selectedFiles.length + " Gambar" : ""} Sekarang 🚀`}
            </button>
          </div>
        </div>

        {/* Bahagian Result (Log Gambar Berjaya) */}
        {logs.length > 0 && (
          <div className="mt-8 pt-6 border-t animate-fade-in-up">
            <div className="bg-green-50 p-4 rounded-xl border border-green-200 mb-6">
              <p className="text-xs font-bold text-gray-500 uppercase mb-2">Link Untuk Client:</p>
              <div className="flex gap-2 mb-3">
                <input readOnly value={galleryLink} className="w-full text-sm p-2 rounded border" />
                <button 
                  onClick={() => navigator.clipboard.writeText(galleryLink)}
                  className="bg-white p-2 border rounded hover:bg-gray-100"
                >
                  📋
                </button>
              </div>
              <a 
                href={`https://wa.me/?text=Salam, ini link gambar raya anda: ${galleryLink}`}
                target="_blank"
                className="block w-full text-center bg-green-500 text-white font-bold py-2 rounded-lg hover:bg-green-600 shadow-md"
              >
                Hantar WhatsApp 📲
              </a>
            </div>

            <h3 className="font-bold text-gray-700 mb-2">Gambar Yang Dah Masuk Cloud ({logs.length}):</h3>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {logs.map((url, index) => (
                <a key={index} href={url} target="_blank" className="block aspect-square">
                  <img src={url} className="w-full h-full object-cover rounded border opacity-80 hover:opacity-100" />
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}