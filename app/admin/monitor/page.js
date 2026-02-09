"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function MonitorPage() {
  const router = useRouter();
  
  // State
  const [selectedDate, setSelectedDate] = useState("");
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // --- STATE BARU: INTERVAL VIEW ---
  // 20 = Grid untuk sesi 15 min (+5 min buffer)
  // 30 = Grid untuk sesi 25 min (+5 min buffer)
  const [viewInterval, setViewInterval] = useState(20); 

  // Modal State
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // --- 1. SET TARIKH HARINI ---
  useEffect(() => {
    const today = new Date().toLocaleDateString('en-CA', {
        timeZone: 'Asia/Kuala_Lumpur'
    });
    setSelectedDate(today);
  }, []);

  // --- 2. FETCH BOOKINGS ---
  useEffect(() => {
    if (!selectedDate) return;

    async function fetchBookings() {
      setLoading(true);
      const { data, error } = await supabase
        .from('bookings')
        .select('*, services(name, duration_minutes)')
        .eq('booking_date', selectedDate)
        .eq('status', 'paid'); 

      if (data) {
        const processed = data.map(b => {
            const startMin = timeToMinutes(b.start_time.slice(0, 5));
            const duration = b.services?.duration_minutes || 30;
            return {
                ...b,
                startMin: startMin,
                endMin: startMin + duration
            };
        });
        setBookings(processed);
      }
      setLoading(false);
    }

    fetchBookings();
  }, [selectedDate]);

  // --- HELPER: TUKAR MASA KE MINIT ---
  const timeToMinutes = (timeStr) => {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  };

  // --- HELPER: CARI BOOKING DALAM SLOT ---
  const findBookingForSlot = (slotTime) => {
    const slotMin = timeToMinutes(slotTime);
    // Cari booking yang sedang berjalan pada waktu slot ini
    return bookings.find(b => slotMin >= b.startMin && slotMin < b.endMin);
  };

  // --- COMPONENT: SLOT BUTTON ---
  const TimeSlot = ({ time }) => {
    const booking = findBookingForSlot(time);
    const isBooked = !!booking;

    return (
      <button
        onClick={() => {
            if (isBooked) {
                setSelectedBooking(booking);
                setIsModalOpen(true);
            }
        }}
        disabled={!isBooked}
        className={`
            border rounded-xl p-2 flex flex-col items-center justify-center transition-all shadow-sm h-24 relative overflow-hidden
            ${isBooked 
                ? "bg-[#412986] text-white border-[#412986] hover:bg-[#301F63] cursor-pointer shadow-md transform hover:scale-105 z-10" 
                : "bg-white text-gray-400 border-gray-200 cursor-default"
            }
        `}
      >
        <span className="text-sm font-bold absolute top-2 right-2">
            {new Date(`2000-01-01 ${time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
        </span>
        
        {isBooked ? (
            <div className="mt-4 text-center w-full px-1">
                <span className="block text-[9px] bg-green-400 text-black px-2 py-0.5 rounded-full font-bold truncate mx-auto w-full mb-1">
                    {booking.client_name}
                </span>
                <span className="text-[8px] opacity-80 block truncate leading-tight">
                    {booking.services?.name}
                </span>
            </div>
        ) : (
            <span className="text-[10px] mt-1 opacity-0">.</span>
        )}
      </button>
    );
  };

  // --- GENERATE SLOTS (DYNAMIC INTERVAL) ---
  const generateSlots = (startHour, endHour) => {
    let slots = [];
    let current = startHour * 60;
    const end = endHour * 60;
    while (current < end) {
        const h = Math.floor(current / 60);
        const m = current % 60;
        const time = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
        slots.push(time);
        
        // Guna interval dari state (20 atau 30 minit)
        current += viewInterval; 
    }
    return slots;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans text-gray-900">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER ADMIN */}
        <div className="mb-6">
            <Link href="/admin" className="text-gray-500 text-sm hover:text-black mb-4 inline-block font-bold transition">
                ⬅ Kembali ke Menu Admin
            </Link>
            
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100 gap-6">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 flex items-center gap-2">
                        Monitor Slot
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">Pantau slot tempahan secara visual.</p>
                </div>
                
                <div className="flex flex-col md:flex-row gap-4 w-full xl:w-auto">
                    
                    {/* --- SELECTOR INTERVAL (BARU) --- */}
                    <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200">
                        <button 
                            onClick={() => setViewInterval(20)}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                                viewInterval === 20 ? "bg-white text-[#412986] shadow-sm" : "text-gray-500 hover:text-gray-700"
                            }`}
                        >
                            Grid 15 Minit
                        </button>
                        <button 
                            onClick={() => setViewInterval(30)}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                                viewInterval === 30 ? "bg-white text-[#412986] shadow-sm" : "text-gray-500 hover:text-gray-700"
                            }`}
                        >
                            Grid 25 Minit
                        </button>
                    </div>

                    {/* DATE PICKER */}
                    <div className="flex items-center gap-3 bg-gray-100 px-4 py-2 rounded-xl border border-gray-200">
                        <span className="text-gray-500 font-bold text-xs uppercase tracking-wide">Tarikh:</span>
                        <input 
                            type="date" 
                            className="bg-transparent border-none outline-none font-bold text-lg text-gray-900 cursor-pointer"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                        />
                    </div>
                </div>
            </div>
        </div>

        {loading ? (
            <div className="flex flex-col items-center justify-center py-20 animate-pulse text-gray-400">
                <div className="h-10 w-10 border-4 border-gray-300 border-t-[#412986] rounded-full animate-spin mb-4"></div>
                <span className="font-bold">Memuatkan Jadual...</span>
            </div>
        ) : (
            <div className="space-y-8 bg-white p-6 md:p-8 rounded-3xl shadow-xl border border-gray-100">
                
                {/* SESI PAGI */}
                <div>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-3 h-8 bg-orange-400 rounded-full"></div>
                        <h3 className="text-lg font-bold text-gray-800 uppercase tracking-wider">Sesi Pagi (10AM - 1PM)</h3>
                    </div>
                    {/* Grid responsif ikut saiz skrin */}
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-3">
                        {generateSlots(10, 13).map(time => <TimeSlot key={time} time={time} />)}
                    </div>
                </div>

                <div className="border-t border-gray-100"></div>

                {/* SESI PETANG */}
                <div>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-3 h-8 bg-blue-500 rounded-full"></div>
                        <h3 className="text-lg font-bold text-gray-800 uppercase tracking-wider">Sesi Petang (2PM - 6.00PM)</h3>
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-3">
                        {generateSlots(14, 18.5).map(time => <TimeSlot key={time} time={time} />)}
                    </div>
                </div>

                <div className="border-t border-gray-100"></div>

                {/* SESI MALAM */}
                <div>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-3 h-8 bg-purple-900 rounded-full"></div>
                        <h3 className="text-lg font-bold text-gray-800 uppercase tracking-wider">Sesi Malam (8PM - 11PM)</h3>
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-3">
                        {generateSlots(20, 23).map(time => <TimeSlot key={time} time={time} />)}
                    </div>
                </div>

            </div>
        )}

      </div>

      {/* --- MODAL DETAIL CLIENT --- */}
      {isModalOpen && selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setIsModalOpen(false)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100 relative" onClick={e => e.stopPropagation()}>
                
                {/* Modal Header */}
                <div className="bg-[#412986] p-6 text-white text-center">
                    <h2 className="text-xl font-bold uppercase tracking-wider">Butiran Pelanggan</h2>
                    <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full w-8 h-8 flex items-center justify-center">✕</button>
                </div>

                {/* Modal Body */}
                <div className="p-6 space-y-5">
                    <div className="text-center pb-4 border-b border-gray-100">
                        <div className="inline-block bg-green-100 text-green-700 px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wide border border-green-200 mb-2">
                            ✅ Paid / Dibayar
                        </div>
                        <h3 className="text-2xl font-black text-gray-800">{selectedBooking.client_name}</h3>
                        <p className="text-gray-500 font-medium">{selectedBooking.services?.name}</p>
                    </div>

                    <div className="space-y-3 text-sm bg-gray-50 p-4 rounded-xl border border-gray-100">
                        <div className="flex justify-between">
                            <span className="text-gray-500">Tarikh & Masa:</span>
                            <span className="font-bold text-gray-800 text-right">{selectedBooking.booking_date}<br/>Jam {selectedBooking.start_time}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-500">Bayaran:</span>
                            <span className="font-bold text-green-600 text-lg">RM{selectedBooking.final_price || selectedBooking.price}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-500">Referral Code:</span>
                            <span className="font-mono font-bold bg-white border px-2 py-0.5 rounded text-gray-600">{selectedBooking.referral_code || '-'}</span>
                        </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                        <a href={`tel:${selectedBooking.client_phone}`} className="flex-1 bg-white border border-gray-200 text-gray-700 py-3 rounded-xl font-bold text-center hover:bg-gray-50 transition">
                            📞 Call
                        </a>
                        <a href={`https://wa.me/${selectedBooking.client_phone.replace(/^0/,'60')}`} target="_blank" className="flex-1 bg-[#25D366] text-white py-3 rounded-xl font-bold text-center hover:bg-[#128C7E] shadow-lg shadow-green-100 transition flex items-center justify-center gap-2">
                            <span>WhatsApp</span>
                        </a>
                    </div>
                </div>
            </div>
        </div>
      )}

    </div>
  );
}