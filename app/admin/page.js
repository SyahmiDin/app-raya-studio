"use client"; // Wajib letak sebab kita guna useState
import { useState } from "react";

export default function Home() {
  const [uploading, setUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState("");
  const [clientName, setClientName] = useState("ahmad-albureng"); // Contoh nama client

  async function handleUpload(e) {
    e.preventDefault(); // Elak page reload
    setUploading(true);

    try {
      // CARA BETUL: Guna FormData dari form tu sendiri
      const formData = new FormData(e.target);
      
      // Masukkan 'clientName' manual sebab input dia duduk luar form (berdasarkan kod sebelum ni)
      formData.append("clientName", clientName); 

      // Hantar ke API
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (data.success) {
        setUploadedUrl(data.url);
        alert("Upload Berjaya!");
      } else {
        alert("Gagal: " + (data.error || "Unknown error"));
      }
    } catch (err) {
      console.error(err);
      alert("Ada masalah sistem.");
    }

    setUploading(false);
  }

  return (
    <main className="p-10 flex flex-col items-center gap-5">
      <h1 className="text-3xl font-bold text-black">Admin Studio Raya Upload</h1>
      
      <div className="border p-5 rounded-lg bg-gray-100 w-full max-w-md">
        <label className="block mb-2 text-black">Nama Folder Client:</label>
        <input 
          type="text" 
          value={clientName} 
          onChange={(e) => setClientName(e.target.value)}
          className="border p-2 w-full mb-4 rounded text-black"
        />

        <label className="block mb-2 text-black">Pilih Gambar:</label>
        <input 
          type="file" 
          onChange={(e) => {
             // Kita trigger upload terus bila user select file
             // Atau boleh buat button "Submit" asing
             // Utk demo ni, kita buat form submit manual:
          }}
          name="fileInput"
          className="mb-4 text-black"
        />
        
        <form onSubmit={handleUpload}>
            <input type="file" name="file" className="mb-4 block text-black" required />
            <button 
              type="submit"
              disabled={uploading}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
            >
              {uploading ? "Sedang Upload..." : "Upload Sekarang"}
            </button>
        </form>
      </div>

      {/* Preview Hasil */}
      {uploadedUrl && (
        <div className="mt-10 text-center">
          <p className="mb-2 text-black font-bold">Gambar dah masuk Cloudflare!</p>
          <img src={uploadedUrl} alt="Uploaded" className="w-64 h-auto rounded shadow-lg mx-auto" />
          
          <div className="mt-4">
             <p className="text-sm text-white">Link untuk Client:</p>
             <code className="bg-gray-200 p-2 rounded block mt-1 break-all text-xs text-black">{uploadedUrl}</code>
             <a href={uploadedUrl} download className="text-black underline text-sm mt-2 block">Test Download</a>
          </div>
        </div>
      )}
    </main>
  );
}