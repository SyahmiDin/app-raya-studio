// app/booking/success/page.js
"use client";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";

function SuccessContent() {
  const searchParams = useSearchParams();
  const session_id = searchParams.get("session_id");
  const router = useRouter();

  const [status, setStatus] = useState("loading"); // loading | success | error

  useEffect(() => {
    if (!session_id) return;

    // Panggil API untuk sahkan & simpan booking
    async function confirmBooking() {
      try {
        const res = await fetch("/api/booking/confirm", {
            method: "POST",
            body: JSON.stringify({ session_id })
        });
        const data = await res.json();

        if (data.success) {
            setStatus("success");
        } else {
            console.error(data.message);
            setStatus("error");
        }
      } catch (err) {
        setStatus("error");
      }
    }

    // Elak panggil API dua kali (React Strict Mode issue)
    // Kita check kalau status masih 'loading' baru panggil
    confirmBooking();

  }, [session_id]);

  return (
    <div className="min-h-screen bg-green-50 flex items-center justify-center p-4">
      <div className="bg-white p-10 rounded-3xl shadow-2xl max-w-md w-full text-center">
        
        {status === "loading" && (
            <div className="animate-pulse">
                <div className="text-6xl mb-4">⏳</div>
                <h2 className="text-2xl font-bold text-gray-700">Menguruskan Tempahan...</h2>
                <p className="text-gray-500">Sila tunggu sebentar, jangan tutup browser.</p>
            </div>
        )}

        {status === "success" && (
            <div className="animate-fade-in-up">
                <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl">
                    ✅
                </div>
                <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Tempahan Berjaya!</h1>
                <p className="text-gray-600 mb-8">Terima kasih! Slot anda telah dikunci. Kami dah simpan nama anda dalam sistem.</p>
                
                <button 
                    onClick={() => router.push("/")}
                    className="w-full bg-black text-white py-4 rounded-xl font-bold shadow-lg hover:scale-105 transition"
                >
                    Kembali ke Halaman Utama
                </button>
            </div>
        )}

        {status === "error" && (
            <div>
                <div className="text-6xl mb-4">⚠️</div>
                <h2 className="text-2xl font-bold text-red-600">Ada Masalah Sikit</h2>
                <p className="text-gray-500 mb-6">Pembayaran mungkin berjaya, tapi sistem gagal simpan rekod. Sila screenshot resit anda dan WhatsApp admin.</p>
                <a href="https://wa.me/60123456789" className="text-green-600 font-bold hover:underline">WhatsApp Admin →</a>
            </div>
        )}

      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SuccessContent />
    </Suspense>
  );
}