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
    
    if (!supabase) return;

    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        services ( name, duration_minutes )
      `)
      .order('booking_date', { ascending: false }) // Tarikh terkini di atas
      .order('start_time', { ascending: true });

    if (error) {
      console.error("Error fetching bookings:", error);
    } else {
      setBookings(data || []);
    }
    setLoading(false);
  }

  // --- FUNGSI DELETE BARU ---
  async function handleDelete(id, clientName) {
    // 1. Tanya confirmation dulu (Safety)
    const isConfirmed = confirm(`Adakah anda pasti nak batalkan booking untuk ${clientName}?`);
    
    if (!isConfirmed) return;

    // 2. Delete dari database
    const { error } = await supabase
        .from('bookings')
        .delete()
        .eq('id', id);

    if (error) {
        alert("Gagal memadam booking.");
        console.error(error);
    } else {
        alert("Booking berjaya dipadam. 🗑️");
        fetchBookings(); // Refresh list automatik
    }
  }

  const getWhatsappLink = (phone, name, date, time) => {
    if (!phone) return "#";
    let cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) cleanPhone = '6' + cleanPhone;
    
    const message = `Salam ${name}, saya dari Studio Raya. Nak confirmkan booking anda pada ${date} jam ${time}.`;
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const options = { day: 'numeric', month: 'short', year: 'numeric' };
    return new Date(dateString).toLocaleDateString('ms-MY', options);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Senarai Tempahan (Bookings)</h1>
          <div className="flex gap-2">
             <button onClick={fetchBookings} className="bg-white border border-gray-300 px-4 py-2 rounded shadow-sm hover:bg-gray-100 text-gray-800 font-medium">
               Refresh ↻
             </button>
             <a href="/admin" className="bg-black text-white px-4 py-2 rounded hover:bg-gray-800 font-medium">
               Ke Gallery Upload →
             </a>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-600 animate-pulse font-medium">Sedang memuatkan data... ⏳</div>
        ) : bookings.length === 0 ? (
          <div className="bg-white p-10 rounded-xl shadow text-center text-gray-600 font-medium">
            Belum ada tempahan lagi.
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-100 text-gray-800 uppercase text-xs tracking-wider font-bold">
                    <th className="p-4 border-b border-gray-200">Tarikh & Masa</th>
                    <th className="p-4 border-b border-gray-200">Client</th>
                    <th className="p-4 border-b border-gray-200">Pakej</th>
                    <th className="p-4 border-b border-gray-200">Status</th>
                    <th className="p-4 border-b border-gray-200 text-center">Tindakan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {bookings.map((book) => (
                    <tr key={book.id} className="hover:bg-blue-50 transition duration-150">
                      <td className="p-4">
                        <div className="font-bold text-gray-900">{formatDate(book.booking_date)}</div>
                        <div className="text-blue-700 font-mono text-lg font-bold">{book.start_time?.slice(0,5)}</div>
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-gray-900">{book.client_name}</div>
                        <div className="text-sm text-gray-700">{book.client_email}</div>
                        <div className="text-sm text-gray-700">{book.client_phone}</div>
                      </td>
                      <td className="p-4">
                        {book.services ? (
                            <div>
                                <span className="bg-gray-100 text-gray-900 text-xs font-bold px-2 py-1 rounded border border-gray-300">
                                    {book.services.name}
                                </span>
                            </div>
                        ) : (
                            <span className="text-red-600 text-xs font-bold">Deleted Service</span>
                        )}
                      </td>
                      <td className="p-4">
                        {book.status === 'paid' ? (
                            <span className="bg-green-100 text-green-800 text-xs font-bold px-3 py-1 rounded-full border border-green-200">
                                ✅ PAID
                            </span>
                        ) : (
                            <span className="bg-yellow-100 text-yellow-800 text-xs font-bold px-3 py-1 rounded-full border border-yellow-200">
                                ⏳ PENDING
                            </span>
                        )}
                      </td>
                      <td className="p-4 flex justify-center gap-2">
                        {/* WhatsApp Button */}
                        <a 
                            href={getWhatsappLink(book.client_phone, book.client_name, formatDate(book.booking_date), book.start_time)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center w-10 h-10 bg-green-500 text-white rounded-full hover:bg-green-600 shadow-md transition transform hover:scale-110"
                            title="WhatsApp Client"
                        >
                            📞
                        </a>

                        {/* DELETE Button (Baru) */}
                        <button 
                            onClick={() => handleDelete(book.id, book.client_name)}
                            className="inline-flex items-center justify-center w-10 h-10 bg-red-100 text-red-600 rounded-full hover:bg-red-600 hover:text-white border border-red-200 shadow-sm transition transform hover:scale-110"
                            title="Padam Booking"
                        >
                            🗑️
                        </button>
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