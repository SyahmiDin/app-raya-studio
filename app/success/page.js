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
        <div className="animate-pulse">
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Mengesahkan Pembayaran... 🔄</h1>
            <p className="text-gray-500">Sila tunggu sebentar.</p>
        </div>
    );
  }

  // --- UI: ERROR ---
  if (status === "error") {
    return (
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full">
            <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl">❌</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Ralat Kemaskini</h1>
            <p className="text-gray-600 mb-6">Pembayaran diterima, tetapi status gagal dikemaskini. Sila WhatsApp resit anda kepada admin.</p>
            <a href="https://wa.me/60192234342" className="block w-full bg-green-500 text-white py-3 rounded-xl font-bold hover:bg-green-600 transition">WhatsApp Admin 📞</a>
        </div>
    );
  }

  // --- UI: SUCCESS ---
  return (
    <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full animate-fade-in-up">
        <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl">✅</div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Tempahan Berjaya!</h1>
        <p className="text-gray-600 mb-8">Terima kasih. Slot anda telah disahkan sepenuhnya.</p>
        <div className="space-y-3">
            <Link href="/" className="block w-full bg-black text-white py-3 rounded-xl font-bold hover:bg-gray-800 transition">Kembali ke Laman Utama 🏠</Link>
        </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6 text-center">
      <Suspense fallback={<div>Loading...</div>}>
        <SuccessContent />
      </Suspense>
    </div>
  );
}