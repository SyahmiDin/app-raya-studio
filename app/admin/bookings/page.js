// app/admin/bookings/page.js
"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBookings();
  }, []);

  async function fetchBookings() {
    setLoading(true);
    
    // --- MAGIC HAPPENS HERE (RELATION QUERY) ---
    // Kita select semua dari 'bookings' (*),
    // DAN kita minta dia ambil 'name' dari table 'services' yang bersambung
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        services ( name, duration_minutes )
      `)
      .order('booking_date', { ascending: false }) // Yang baru duduk atas
      .order('start_time', { ascending: true });

    if (error) {
      console.error("Error fetching bookings:", error);
      alert("Gagal ambil data booking");
    } else {
      setBookings(data);
    }
    setLoading(false);
  }

  // Helper: Format nombor untuk link WhatsApp (buang - , tambah 60)
  const getWhatsappLink = (phone, name, date, time) => {
    let cleanPhone = phone.replace(/\D/g, ''); // Buang semua simbol
    if (cleanPhone.startsWith('0')) cleanPhone = '6' + cleanPhone; // Tukar 012 jadi 6012
    
    const message = `Salam ${name}, saya dari Studio Raya. Nak confirmkan booking anda pada ${date} jam ${time}.`;
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  };

  // Helper: Format Tarikh cantik (DD/MM/YYYY)
  const formatDate = (dateString) => {
    const options = { day: 'numeric', month: 'short', year: 'numeric' };
    return new Date(dateString).toLocaleDateString('ms-MY', options);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Senarai Tempahan (Bookings)</h1>
          <div className="flex gap-2">
             <button onClick={fetchBookings} className="bg-white border px-4 py-2 rounded shadow text-gray-800 hover:bg-gray-100">
               Refresh ↻
             </button>
             <a href="/admin" className="bg-black text-white px-4 py-2 rounded hover:bg-gray-800">
               Ke Gallery Upload →
             </a>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-500 animate-pulse">Sedang memuatkan data... ⏳</div>
        ) : bookings.length === 0 ? (
          <div className="bg-white p-10 rounded-xl shadow text-center text-gray-500">
            Belum ada tempahan lagi.
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-100 text-gray-600 uppercase text-xs tracking-wider">
                    <th className="p-4 border-b">Tarikh & Masa</th>
                    <th className="p-4 border-b">Client</th>
                    <th className="p-4 border-b">Pakej (Service)</th>
                    <th className="p-4 border-b">Status</th>
                    <th className="p-4 border-b text-center">Tindakan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {bookings.map((book) => (
                    <tr key={book.id} className="hover:bg-blue-50 transition duration-150">
                      
                      {/* COLUMN 1: TARIKH */}
                      <td className="p-4">
                        <div className="font-bold text-gray-800">{formatDate(book.booking_date)}</div>
                        <div className="text-blue-600 font-mono text-lg">{book.start_time.slice(0,5)}</div>
                      </td>

                      {/* COLUMN 2: CLIENT */}
                      <td className="p-4">
                        <div className="font-bold text-gray-900">{book.client_name}</div>
                        <div className="text-xs text-gray-500">{book.client_email}</div>
                        <div className="text-xs text-gray-500">{book.client_phone}</div>
                      </td>

                      {/* COLUMN 3: PAKEJ (Data dari relation services) */}
                      <td className="p-4">
                        {book.services ? (
                            <div>
                                <span className="bg-gray-100 text-gray-800 text-xs font-bold px-2 py-1 rounded border">
                                    {book.services.name}
                                </span>
                                <div className="text-xs text-gray-400 mt-1">{book.services.duration_minutes} minit</div>
                            </div>
                        ) : (
                            <span className="text-red-500 text-xs">Pakej dah dipadam?</span>
                        )}
                      </td>

                      {/* COLUMN 4: STATUS */}
                      <td className="p-4">
                        {book.status === 'paid' ? (
                            <span className="bg-green-100 text-green-700 text-xs font-bold px-3 py-1 rounded-full border border-green-200">
                                ✅ PAID
                            </span>
                        ) : (
                            <span className="bg-yellow-100 text-yellow-700 text-xs font-bold px-3 py-1 rounded-full border border-yellow-200">
                                ⏳ PENDING
                            </span>
                        )}
                        <div className="text-[10px] text-gray-400 mt-1 truncate w-24" title={book.stripe_payment_id}>
                            Ref: {book.stripe_payment_id?.slice(-8)}
                        </div>
                      </td>

                      {/* COLUMN 5: ACTION */}
                      <td className="p-4 text-center">
                        <a 
                            href={getWhatsappLink(book.client_phone, book.client_name, formatDate(book.booking_date), book.start_time)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center w-10 h-10 bg-green-500 text-white rounded-full hover:bg-green-600 shadow-md transition transform hover:scale-110"
                            title="WhatsApp Client"
                        >
                            📞
                        </a>
                      </td>

                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}