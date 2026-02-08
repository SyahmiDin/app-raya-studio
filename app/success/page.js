"use client";
import { useEffect, useState, useRef, Suspense } from "react"; // Tambah Suspense
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

// Kita pecahkan kepada komponen kecil untuk handle Search Params
function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const router = useRouter();
  
  const [status, setStatus] = useState("loading"); // loading, success, error
  const hasRun = useRef(false);

  useEffect(() => {
    if (!sessionId || hasRun.current) return;
    hasRun.current = true;

    async function saveBooking() {
      try {
        // 1. Verify pembayaran
        const res = await fetch(`/api/verify?session_id=${sessionId}`);
        const data = await res.json();

        if (!res.ok) throw new Error(data.error || "Gagal verify");

        const info = data.bookingData;

        // 2. Simpan ke Supabase
        const { error } = await supabase.from('bookings').insert([{
            booking_date: info.booking_date,
            start_time: info.start_time,
            client_name: info.client_name,
            client_email: info.client_email,
            client_phone: info.client_phone,
            service_id: info.package_id,
            status: 'paid',
            stripe_payment_id: sessionId,

            referral_code: info.referral_code || null, // Simpan kod kalau ada
            final_price: info.final_price_paid       // Simpan harga sebenar dia bayar
        }]);

        if (error) {
            console.error("Supabase Error:", error);
            if (!error.message.includes("duplicate")) throw error;
        }

        setStatus("success");

      } catch (err) {
        console.error(err);
        setStatus("error");
      }
    }

    saveBooking();
  }, [sessionId]);

  if (status === "loading") {
    return (
        <div className="animate-pulse">
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Sedang Mengesahkan Pembayaran... 🔄</h1>
            <p className="text-gray-500">Jangan tutup browser ini.</p>
        </div>
    );
  }

  if (status === "error") {
    return (
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full">
            <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl">
                ⚠️
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Ralat Sistem</h1>
            <p className="text-gray-600 mb-6">Pembayaran mungkin berjaya, tetapi kami gagal simpan rekod. Sila WhatsApp admin segera.</p>
            <a href="https://wa.me/60123456789" className="block w-full bg-green-500 text-white py-3 rounded-xl font-bold hover:bg-green-600 transition">
                WhatsApp Admin 📞
            </a>
        </div>
    );
  }

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

// Komponen Utama yang dibungkus dengan Suspense
export default function SuccessPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6 text-center">
      {/* Fallback ni keluar sekejap sementara tunggu parameter URL ready */}
      <Suspense fallback={<div>Loading...</div>}>
        <SuccessContent />
      </Suspense>
    </div>
  );
}