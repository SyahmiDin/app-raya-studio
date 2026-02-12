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
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div>
            <h1 className="text-3xl font-bold text-[#412986]">Senarai Tempahan</h1>
            <p className="text-gray-500 text-sm mt-1">Urus jadual dan tempahan pelanggan.</p>
          </div>
          <div className="flex flex-wrap gap-3 w-full md:w-auto">
             <a href="/admin" className="flex-1 md:flex-none text-center bg-gray-900 text-white px-5 py-2.5 rounded-xl hover:bg-gray-800 font-medium transition text-sm shadow-sm">
               ← Utama
             </a>
          </div>
        </div>

        {/* FILTER BAR */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 mb-8 flex flex-col md:flex-row items-center gap-4 justify-between">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-3 w-full md:w-auto">
                <span className="font-bold text-gray-700 text-sm">📅 Pilih Tarikh:</span>
                <input 
                  type="date" 
                  value={filterDate} 
                  onChange={(e) => setFilterDate(e.target.value)} 
                  className="w-full md:w-auto border border-gray-300 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-[#412986] focus:border-[#412986] transition"
                />
            </div>
            <div className="flex gap-3 w-full md:w-auto">
                <button 
                  onClick={setToday} 
                  className="flex-1 md:flex-none bg-[#412986]/10 text-[#412986] px-5 py-2 rounded-xl font-bold hover:bg-[#412986]/20 hover:cursor-pointer transition text-sm"
                >
                  Hari Ini
                </button>
                <button 
                  onClick={() => setFilterDate("")} 
                  className={`flex-1 md:flex-none px-5 py-2 rounded-xl font-bold transition text-sm border ${filterDate === "" ? 'bg-[#412986] text-white border-[#412986] shadow-md' : 'bg-white text-gray-600 border-gray-300 hover:cursor-pointer hover:bg-gray-50'}`}
                >
                  Tunjuk Semua
                </button>
            </div>
        </div>

        {/* TABLE CONTENT */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl shadow-sm border border-gray-100">
            <div className="w-10 h-10 border-4 border-[#412986]/20 border-t-[#412986] rounded-full animate-spin mb-4"></div>
            <div className="text-[#412986] font-medium animate-pulse">Sedang mencari data...</div>
          </div>
        ) : bookings.length === 0 ? (
          <div className="bg-white p-16 rounded-2xl shadow-sm text-center border border-dashed border-gray-300">
            <div className="text-5xl mb-4">📭</div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Tiada tempahan ditemui</h3>
            <p className="text-gray-500 text-sm">{filterDate ? `Tiada orang booking pada tarikh ${formatDate(filterDate)}.` : "Belum ada sebarang booking lagi."}</p>
            {filterDate && (
              <button onClick={() => setFilterDate("")} className="mt-6 text-[#412986] hover:text-[#2d1c5e] font-bold underline transition">
                Lihat semua tarikh
              </button>
            )}
          </div>
        ) : (
          <div className="bg-transparent md:bg-white md:rounded-2xl md:shadow-sm overflow-hidden md:border border-gray-100 animate-fade-in-up">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse block md:table">
                <thead className="hidden md:table-header-group">
                  <tr className="bg-[#412986] text-white uppercase text-xs tracking-wider font-semibold">
                    <th className="p-5">Tarikh & Masa</th>
                    <th className="p-5">Client</th>
                    <th className="p-5">Pakej</th>
                    <th className="p-5">Referral (Staff)</th>
                    <th className="p-5">Status</th>
                    <th className="p-5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="block md:table-row-group divide-y divide-gray-100">
                  {bookings.map((book) => (
                    <tr key={book.id} className="block md:table-row hover:bg-[#412986]/5 transition duration-150 mb-4 md:mb-0 bg-white rounded-xl shadow-sm md:shadow-none border border-gray-100 md:border-none">
                      
                      <td className="p-4 md:p-5 flex justify-between md:table-cell items-center md:items-start border-b border-gray-50 md:border-none">
                        <span className="md:hidden font-bold text-xs text-gray-500 uppercase">Tarikh & Masa</span>
                        <div className="text-right md:text-left">
                          <div className="font-bold text-gray-900">{formatDate(book.booking_date)}</div>
                          <div className="text-[#412986] font-mono text-lg font-extrabold">{book.start_time?.slice(0,5)}</div>
                        </div>
                      </td>
                      
                      <td className="p-4 md:p-5 flex justify-between md:table-cell items-center md:items-start border-b border-gray-50 md:border-none">
                        <span className="md:hidden font-bold text-xs text-gray-500 uppercase">Client</span>
                        <div className="text-right md:text-left">
                          <div className="font-bold text-gray-900">{book.client_name}</div>
                          <div className="text-xs text-gray-500">{book.client_email}</div>
                          <div className="text-xs text-gray-500">{book.client_phone}</div>
                        </div>
                      </td>
                      
                      <td className="p-4 md:p-5 flex justify-between md:table-cell items-center md:items-start border-b border-gray-50 md:border-none">
                        <span className="md:hidden font-bold text-xs text-gray-500 uppercase">Pakej</span>
                        <div className="text-right md:text-left">
                          {book.services ? (
                              <div className="flex flex-col items-end md:items-start">
                                  <span className="bg-gray-100 text-gray-800 text-xs font-bold px-2.5 py-1 rounded-md border border-gray-200 whitespace-nowrap">
                                      {book.services.name}
                                  </span>
                                  <div className="text-xs text-gray-500 mt-1.5 font-mono font-medium">
                                      Paid: RM{book.final_price || '-'}
                                  </div>
                              </div>
                          ) : (
                              <span className="text-red-600 text-xs font-bold bg-red-50 px-2 py-1 rounded-md">Deleted Service</span>
                          )}
                        </div>
                      </td>
                      
                      <td className="p-4 md:p-5 flex justify-between md:table-cell items-center md:items-start border-b border-gray-50 md:border-none">
                        <span className="md:hidden font-bold text-xs text-gray-500 uppercase">Referral</span>
                        <div className="text-right md:text-left">
                          {book.referral_code ? (
                              <span className="bg-[#412986]/10 text-[#412986] text-xs font-bold px-2.5 py-1 rounded-md border border-[#412986]/20 inline-flex items-center gap-1">
                                  🏷️ {book.referral_code}
                              </span>
                          ) : (
                              <span className="text-gray-300 text-xs font-medium">-</span>
                          )}
                        </div>
                      </td>

                      <td className="p-4 md:p-5 flex justify-between md:table-cell items-center md:items-start border-b border-gray-50 md:border-none">
                        <span className="md:hidden font-bold text-xs text-gray-500 uppercase">Status</span>
                        <div className="text-right md:text-left">
                          {book.status === 'paid' ? (
                              <span className="bg-green-100 text-green-700 text-xs font-bold px-3 py-1.5 rounded-full border border-green-200">
                                  ✅ PAID
                              </span>
                          ) : (
                              <span className="bg-yellow-100 text-yellow-700 text-xs font-bold px-3 py-1.5 rounded-full border border-yellow-200">
                                  ⏳ PENDING
                              </span>
                          )}
                        </div>
                      </td>
                      
                      <td className="p-4 md:p-5 flex justify-center md:justify-center items-center gap-3">
                        <a href={getWhatsappLink(book.client_phone, book.client_name, formatDate(book.booking_date), book.start_time)} target="_blank" rel="noopener noreferrer" className="w-10 h-10 flex items-center justify-center bg-[#25D366] text-white rounded-xl hover:bg-[#1ebe57] shadow-sm transition hover:scale-105" title="WhatsApp Client">
                          <FaWhatsapp size={22} />
                        </a>
                        <button onClick={() => handleDelete(book.id, book.client_name)} className="w-10 h-10 flex items-center justify-center bg-white border border-red-200 text-red-500 rounded-xl hover:bg-red-50 hover:text-red-700 transition hover:scale-105 shadow-sm" title="Padam Booking">
                          🗑️
                        </button>
                      </td>
                      
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="bg-gray-50 p-4 text-xs text-gray-500 text-center border-t border-gray-100 hidden md:block">
                Menunjukkan <span className="font-bold text-[#412986]">{bookings.length}</span> tempahan {filterDate ? `untuk tarikh ${formatDate(filterDate)}` : "keseluruhan"}.
            </div>
          </div>
        )}

        {/* MOBILE FOOTER COUNTER */}
        {!loading && bookings.length > 0 && (
          <div className="md:hidden mt-4 text-center text-xs text-gray-500 pb-8">
            Menunjukkan <span className="font-bold text-[#412986]">{bookings.length}</span> tempahan {filterDate ? `untuk tarikh ${formatDate(filterDate)}` : "keseluruhan"}.
          </div>
        )}

      </div>
    </div>
  );
}