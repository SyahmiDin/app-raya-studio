"use client";
import { useEffect, useState, useRef, Suspense } from "react"; 
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const router = useRouter();
  
  const [status, setStatus] = useState("loading"); 
  const hasRun = useRef(false);

  useEffect(() => {
    if (!sessionId || hasRun.current) return;
    hasRun.current = true;

    async function updateBookingStatus() {
      try {
        // 1. Dapatkan data dari Stripe (API Verify kita)
        const res = await fetch(`/api/verify?session_id=${sessionId}`);
        const data = await res.json();

        if (!res.ok) throw new Error(data.error || "Gagal verify");

        const info = data.bookingData;
        const bookingId = info.booking_id; // ID yang kita simpan masa checkout

        if (!bookingId) throw new Error("Booking ID not found in session");

        // 2. UPDATE STATUS KE 'PAID' (PENTING: Guna UPDATE, bukan INSERT)
        const { error } = await supabase
            .from('bookings')
            .update({ 
                status: 'paid',
                final_price: info.final_price_paid, // Update harga sebenar
                stripe_payment_id: sessionId 
            })
            .eq('id', bookingId); // Cari guna ID yang tepat

        if (error) {
            console.error("Supabase Update Error:", error);
            throw error;
        }

        setStatus("success");

      } catch (err) {
        console.error("Success Page Error:", err);
        setStatus("error");
      }
    }

    updateBookingStatus();
  }, [sessionId]);

  // --- UI: LOADING ---
  if (status === "loading") {
    return (
        <div className="flex flex-col items-center justify-center animate-pulse">
            <div className="w-16 h-16 border-4 border-[#412986]/30 border-t-[#412986] rounded-full animate-spin mb-6"></div>
            <h1 className="text-xl md:text-2xl font-bold text-[#412986] mb-2 tracking-tight">Mengesahkan Pembayaran...</h1>
            <p className="text-slate-500 text-sm md:text-base">Sila tunggu sebentar sementara kami mengemaskini sistem.</p>
        </div>
    );
  }

  // --- UI: ERROR ---
  if (status === "error") {
    return (
        <div className="bg-white/90 backdrop-blur-sm p-8 md:p-10 rounded-3xl shadow-2xl shadow-red-900/10 max-w-md w-full border border-red-100 relative overflow-hidden">
            {/* Hiasan background */}
            <div className="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 bg-red-50 rounded-full blur-2xl opacity-50"></div>
            
            <div className="relative z-10 flex flex-col items-center text-center">
                <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6 shadow-inner ring-4 ring-red-50/50 text-4xl">
                    ❌
                </div>
                <h1 className="text-2xl md:text-3xl font-bold text-slate-800 mb-3">Ralat Kemaskini</h1>
                <p className="text-slate-600 mb-8 leading-relaxed">
                    Pembayaran diterima, tetapi status gagal dikemaskini secara automatik. Jangan risau, wang anda selamat.
                </p>
                <a 
                    href="https://wa.me/60192234342" 
                    className="flex items-center justify-center w-full bg-green-500 hover:bg-green-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-green-500/30 transition-all transform hover:-translate-y-1 active:scale-95"
                >
                    WhatsApp Admin 📞
                </a>
                <p className="text-xs text-slate-400 mt-4">Sila sertakan resit pembayaran anda.</p>
            </div>
        </div>
    );
  }

  // --- UI: SUCCESS ---
  return (
    <div className="bg-white/90 backdrop-blur-xl p-8 md:p-12 rounded-3xl shadow-[0_20px_50px_rgba(65,41,134,0.15)] max-w-md w-full border border-white/50 relative overflow-hidden animate-fade-in-up">
        {/* Hiasan background */}
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#412986] to-purple-400"></div>
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#412986]/5 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-purple-400/10 rounded-full blur-3xl"></div>

        <div className="relative z-10 flex flex-col items-center text-center">
            <div className="mb-8 relative">
                <div className="absolute inset-0 bg-green-400 rounded-full blur-xl opacity-20 animate-pulse"></div>
                <div className="relative w-24 h-24 bg-green-50 text-green-600 rounded-full flex items-center justify-center shadow-sm ring-8 ring-green-50/50 text-5xl">
                    ✅
                </div>
            </div>
            
            <h1 className="text-3xl md:text-4xl font-extrabold text-[#412986] mb-3 tracking-tight">
                Tempahan Berjaya!
            </h1>
            
            <div className="w-16 h-1 bg-gradient-to-r from-transparent via-[#412986]/20 to-transparent mb-4"></div>

            <p className="text-slate-600 mb-8 text-base md:text-lg leading-relaxed">
                Terima kasih. Slot anda telah disahkan sepenuhnya dan sedia untuk digunakan.
            </p>
            
            <div className="space-y-4 w-full">
                <Link 
                    href="/" 
                    className="block w-full bg-[#412986] text-white py-4 rounded-2xl font-bold text-lg shadow-lg shadow-[#412986]/30 hover:bg-[#35206e] hover:shadow-[#412986]/50 transition-all transform hover:-translate-y-1 active:scale-95"
                >
                    Kembali ke Laman Utama 🏠
                </Link>
                <div className="text-xs text-slate-400 font-medium">
                    Resit telah dihantar ke emel anda.
                </div>
            </div>
        </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    // Main Container dengan Theme Color Gradient background
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#f8f7fc] p-4 md:p-6 text-center relative selection:bg-[#412986] selection:text-white">
      
      {/* Background Decorative Blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#412986]/5 rounded-full blur-[100px]"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#412986]/10 rounded-full blur-[100px]"></div>
      </div>

      <div className="relative z-10 w-full flex justify-center">
          <Suspense fallback={
              <div className="text-[#412986] animate-pulse font-semibold">Memuatkan...</div>
          }>
            <SuccessContent />
          </Suspense>
      </div>
    </div>
  );
}