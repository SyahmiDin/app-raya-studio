"use client";
import { useEffect, useState, useRef, Suspense } from "react"; 
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const router = useRouter();
  
  // Status: loading | success | error | double_booking
  const [status, setStatus] = useState("loading"); 
  const [bookingDetails, setBookingDetails] = useState(null); // Simpan info untuk refund
  const hasRun = useRef(false);

  useEffect(() => {
    if (!sessionId || hasRun.current) return;
    hasRun.current = true;

    async function saveBooking() {
      try {
        // 1. Dapatkan data dari API Verify
        const res = await fetch(`/api/verify?session_id=${sessionId}`);
        const data = await res.json();

        if (!res.ok) throw new Error(data.error || "Gagal verify");

        const info = data.bookingData;
        const bookingId = info.booking_id; // Kita dah ada ID dari checkout tadi

        // 2. UPDATE STATUS KE 'PAID' (Bukan Insert baru)
        const { error } = await supabase
            .from('bookings')
            .update({ 
                status: 'paid',
                final_price: info.final_price_paid // Update harga sebenar
            })
            .eq('id', bookingId); // Cari guna ID yang kita simpan masa checkout

        if (error) {
            console.error("Supabase Error:", error);
            throw error;
        }

        setStatus("success");

      } catch (err) {
        console.error(err);
        setStatus("error");
      }
    }

    saveBooking();
  }, [sessionId]);

  // --- UI: LOADING ---
  if (status === "loading") {
    return (
        <div className="animate-pulse">
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Sedang Mengesahkan Pembayaran... 🔄</h1>
            <p className="text-gray-500">Jangan tutup browser ini.</p>
        </div>
    );
  }

  // --- UI: DOUBLE BOOKING (KES SPESIAL) ---
  if (status === "double_booking") {
    return (
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border-l-4 border-yellow-400">
            <div className="w-20 h-20 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl">
                ⚠️
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Slot Telah Penuh!</h1>
            <p className="text-gray-600 mb-4 text-sm">
                Maaf, terdapat dua pembayaran serentak dan slot ini telah diambil oleh pelanggan yang lebih pantas sesaat daripada anda.
            </p>
            
            <div className="bg-gray-50 p-4 rounded-lg mb-6 text-left text-sm border border-gray-200">
                <p className="font-bold text-gray-800 mb-1">Status Duit Anda:</p>
                <p className="text-green-600 font-bold">✅ Duit telah ditolak (Stripe)</p>
                <p className="text-red-600 font-bold">❌ Booking Gagal (Slot Penuh)</p>
                <p className="mt-2 text-xs text-gray-500">Sila WhatsApp admin untuk <span className="underline">Full Refund</span> atau tukar slot.</p>
            </div>

            <a 
                href={`https://wa.me/60192234342?text=Hi Admin, saya terkena Double Booking. Session ID: ${sessionId}`} // Ganti no phone admin
                target="_blank"
                className="block w-full bg-[#25D366] text-white py-3 rounded-xl font-bold hover:bg-[#128C7E] transition shadow-lg shadow-green-200"
            >
                WhatsApp Admin Sekarang 📞
            </a>
            
            <Link href="/" className="block mt-4 text-sm text-gray-400 hover:text-gray-600">
                Kembali ke Utama
            </Link>
        </div>
    );
  }

  // --- UI: ERROR BIASA ---
  if (status === "error") {
    return (
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full">
            <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl">
                ❌
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Ralat Sistem</h1>
            <p className="text-gray-600 mb-6">Pembayaran mungkin berjaya, tetapi kami gagal simpan rekod. Sila WhatsApp admin segera.</p>
            <a href="https://wa.me/60192234342" className="block w-full bg-gray-800 text-white py-3 rounded-xl font-bold hover:bg-black transition">
                WhatsApp Admin 📞
            </a>
        </div>
    );
  }

  // --- UI: SUCCESS ---
  return (
    <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full animate-fade-in-up">
        <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl">
            ✅
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Tempahan Berjaya!</h1>
        <p className="text-gray-600 mb-8">Terima kasih. Slot anda telah disahkan. Resit telah dihantar ke email anda.</p>
        
        <div className="space-y-3">
            <Link href="/" className="block w-full bg-black text-white py-3 rounded-xl font-bold hover:bg-gray-800 transition">
                Kembali ke Laman Utama 🏠
            </Link>
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