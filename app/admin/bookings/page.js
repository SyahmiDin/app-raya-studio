"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { FaWhatsapp } from "react-icons/fa";

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState("");

  useEffect(() => {
    fetchBookings();
  }, [filterDate]);

  async function fetchBookings() {
    setLoading(true);
    
    if (!supabase) return;

    let query = supabase
      .from('bookings')
      .select(`
        *,
        services ( name, duration_minutes )
      `)
      .order('booking_date', { ascending: false })
      .order('start_time', { ascending: true });

    if (filterDate) {
        query = query.eq('booking_date', filterDate);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching bookings:", error);
    } else {
      setBookings(data || []);
    }
    setLoading(false);
  }

  async function handleDelete(id, clientName) {
    const isConfirmed = confirm(`Adakah anda pasti nak batalkan booking untuk ${clientName}?`);
    if (!isConfirmed) return;

    const { error } = await supabase.from('bookings').delete().eq('id', id);
    if (error) alert("Gagal memadam booking.");
    else { alert("Booking berjaya dipadam. 🗑️"); fetchBookings(); }
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

  const setToday = () => {
    const today = new Date().toISOString().split('T')[0];
    setFilterDate(today);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Senarai Tempahan</h1>
          </div>
          <div className="flex gap-2">
             <a href="/admin/promo" className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 font-bold text-sm shadow transition">
               💰 Urus Komisen
             </a>
             <a href="/admin" className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 font-medium transition text-sm">
               ← Upload Gallery
             </a>
          </div>
        </div>

        {/* FILTER BAR */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-8 flex flex-col md:flex-row items-center gap-4 justify-between">
            <div className="flex items-center gap-2 w-full md:w-auto">
                <span className="font-bold text-gray-700">📅 Pilih Tarikh:</span>
                <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"/>
            </div>
            <div className="flex gap-2 w-full md:w-auto">
                <button onClick={setToday} className="flex-1 md:flex-none bg-blue-100 text-blue-700 px-4 py-2 rounded-lg font-bold hover:bg-blue-200 transition text-sm">Hari Ini</button>
                <button onClick={() => setFilterDate("")} className={`flex-1 md:flex-none px-4 py-2 rounded-lg font-bold transition text-sm border ${filterDate === "" ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}>Tunjuk Semua</button>
            </div>
        </div>

        {/* TABLE CONTENT */}
        {loading ? (
          <div className="text-center py-20 text-gray-600 animate-pulse font-medium">Sedang cari data... ⏳</div>
        ) : bookings.length === 0 ? (
          <div className="bg-white p-12 rounded-xl shadow text-center border border-dashed border-gray-300">
            <div className="text-4xl mb-2">📭</div>
            <h3 className="text-lg font-bold text-gray-800">Tiada tempahan ditemui</h3>
            <p className="text-gray-500 text-sm">{filterDate ? `Tiada orang booking pada tarikh ${formatDate(filterDate)}.` : "Belum ada sebarang booking lagi."}</p>
            {filterDate && <button onClick={() => setFilterDate("")} className="mt-4 text-blue-600 hover:underline text-sm font-bold">Lihat semua tarikh</button>}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200 animate-fade-in-up">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-100 text-gray-800 uppercase text-xs tracking-wider font-bold">
                    <th className="p-4 border-b border-gray-200">Tarikh & Masa</th>
                    <th className="p-4 border-b border-gray-200">Client</th>
                    <th className="p-4 border-b border-gray-200">Pakej</th>
                    {/* COLUMN BARU */}
                    <th className="p-4 border-b border-gray-200">Referral (Staff)</th>
                    <th className="p-4 border-b border-gray-200">Status</th>
                    <th className="p-4 border-b border-gray-200 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {bookings.map((book) => (
                    <tr key={book.id} className="hover:bg-blue-50 transition duration-150 group">
                      <td className="p-4">
                        <div className="font-bold text-gray-900">{formatDate(book.booking_date)}</div>
                        <div className="text-blue-700 font-mono text-lg font-bold">{book.start_time?.slice(0,5)}</div>
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-gray-900">{book.client_name}</div>
                        <div className="text-xs text-gray-500">{book.client_email}</div>
                        <div className="text-xs text-gray-500">{book.client_phone}</div>
                      </td>
                      <td className="p-4">
                        {book.services ? (
                            <div>
                                <span className="bg-gray-100 text-gray-900 text-xs font-bold px-2 py-1 rounded border border-gray-300 whitespace-nowrap">
                                    {book.services.name}
                                </span>
                                {/* Papar Harga Akhir */}
                                <div className="text-xs text-gray-500 mt-1 font-mono">
                                    Paid: RM{book.final_price || '-'}
                                </div>
                            </div>
                        ) : (
                            <span className="text-red-600 text-xs font-bold">Deleted Service</span>
                        )}
                      </td>
                      
                      {/* DATA REFERRAL BARU */}
                      <td className="p-4">
                        {book.referral_code ? (
                            <span className="bg-purple-100 text-purple-700 text-xs font-bold px-2 py-1 rounded border border-purple-200">
                                🏷️ {book.referral_code}
                            </span>
                        ) : (
                            <span className="text-gray-300 text-xs">-</span>
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
                        <a href={getWhatsappLink(book.client_phone, book.client_name, formatDate(book.booking_date), book.start_time)} target="_blank" className="w-9 h-9 flex items-center justify-center bg-green-500 text-white rounded-lg hover:bg-green-600 shadow-sm transition" title="WhatsApp Client"><FaWhatsapp size={20} /></a>
                        <button onClick={() => handleDelete(book.id, book.client_name)} className="w-9 h-9 flex items-center justify-center bg-white border border-red-200 text-red-500 rounded-lg hover:bg-red-50 hover:text-red-700 transition" title="Padam Booking">🗑️</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="bg-gray-50 p-3 text-xs text-gray-500 text-center border-t border-gray-200">
                Menunjukkan {bookings.length} tempahan {filterDate ? `untuk tarikh ${filterDate}` : "keseluruhan"}.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}