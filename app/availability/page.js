"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function AvailabilityPage() {
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedDuration, setSelectedDuration] = useState(15); // Default 15 minit
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);

  // Set tarikh hari ini bila page load
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setSelectedDate(today);
  }, []);

  // Fetch data bila tarikh berubah
  useEffect(() => {
    if (selectedDate) fetchBookings(selectedDate);
  }, [selectedDate]);

  async function fetchBookings(date) {
    setLoading(true);
    // Ambil booking yang dah bayar SAHAJA
    const { data, error } = await supabase
      .from('bookings')
      .select('start_time, services(duration_minutes)')
      .eq('booking_date', date)
      .eq('status', 'paid');

    if (error) console.error(error);
    else setBookings(data || []);
    setLoading(false);
  }

  // --- LOGIC GENERATE SLOT (Dynamic Interval) ---
  const generateSlots = () => {
    const slots = [];
    let startHour = 10; // Mula 10:00 AM
    let endHour = 23;   // Tutup 11:00 PM (Last slot sebelum ni)

    // Tukar masa ke minit total (Contoh: 10:00 AM = 600 minit)
    const timeToMinutes = (timeStr) => {
      const [h, m] = timeStr.split(':').map(Number);
      return h * 60 + m;
    };

    // Tukar minit ke format "10:30"
    const minutesToTime = (totalMinutes) => {
        const h = Math.floor(totalMinutes / 60);
        const m = totalMinutes % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    };

    // Format AM/PM untuk display
    const formatDisplay = (time24) => {
        const [h, m] = time24.split(':');
        const hr = parseInt(h);
        const ampm = hr >= 12 ? 'PM' : 'AM';
        const displayHr = hr % 12 || 12;
        return `${displayHr}:${m} ${ampm}`;
    };

    // Logic Check Availability
    const isBooked = (currentMin) => {
        // Kita tambah buffer 5 minit untuk elak slot terlalu rapat
        // Kalau Tuan tak nak buffer, boleh buang "+ 5" di bawah
        const myEnd = currentMin + selectedDuration + 5; 

        return bookings.some(b => {
            const bookStart = timeToMinutes(b.start_time.slice(0,5));
            const duration = b.services?.duration_minutes || 30; 
            const bookEnd = bookStart + duration + 5; // Buffer booking sedia ada
            
            // Logic bertindih (Overlap)
            return currentMin < bookEnd && myEnd > bookStart;
        });
    };

    // --- LOOP UTAMA (Guna Total Minit) ---
    // Kita mula dari 600 minit (10 pagi) dan tambah ikut duration pakej (15/25)
    let currentMin = startHour * 60;
    const endMin = endHour * 60;

    // Buffer Gap antara slot (Contoh: Rehat 5 minit lepas setiap sesi)
    // Kalau nak rapat-rapat, letak gap = 0
    const gap = 5; 

    while (currentMin < endMin) {
        const time24 = minutesToTime(currentMin);
        const h = Math.floor(currentMin / 60); // Ambil jam untuk tentukan sesi

        slots.push({
            time24,
            display: formatDisplay(time24),
            booked: isBooked(currentMin),
            // Logic Sesi: Pagi < 1pm, Petang < 7pm (19), Malam > 7pm
            sessionId: h < 13 ? 'pagi' : h < 19 ? 'petang' : 'malam'
        });

        // Lompat ke slot seterusnya (Duration + Gap)
        currentMin += (selectedDuration + gap);
    }

    return slots;
  };

  const slots = generateSlots();

  // groupkan ikut sesi
  const sessions = [
      { id: 'pagi', label: 'Pagi (10AM - 1PM)', color: 'text-gray-100' },
      { id: 'petang', label: 'Petang (2PM - 6PM)', color: 'text-gray-100' },
      { id: 'malam', label: 'Malam (8PM - 11PM)', color: 'text-gray-100' }
  ];

  return (
    <div className="min-h-screen bg-white p-6 md:p-12">
      <div className="max-w-5xl mx-auto">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
            <div>
                <h1 className="text-3xl font-black text-gray-900 tracking-tight">Jadual Kekosongan 📅</h1>
                <p className="text-gray-500">Semak slot berdasarkan pakej pilihan anda.</p>
            </div>
            
            {/* CONTROLS (Date & Duration) */}
            <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                
                {/* PILIH DURASI (15 vs 25) */}
                <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200">
                    <button 
                        onClick={() => setSelectedDuration(15)}
                        className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${selectedDuration === 15 ? 'bg-white text-[#412986] shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        15 Minit
                    </button>
                    <button 
                        onClick={() => setSelectedDuration(25)}
                        className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${selectedDuration === 25 ? 'bg-white text-[#412986] shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        25 Minit
                    </button>
                </div>

                {/* DATE PICKER */}
                <div className="flex items-center gap-2 bg-gray-100 p-2 rounded-lg border border-gray-200">
                    <span className="text-gray-500 text-sm font-bold pl-2">Tarikh:</span>
                    <input 
                        type="date" 
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="bg-white border border-gray-300 text-gray-900 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block p-2 outline-none font-bold"
                    />
                </div>
            </div>
        </div>

        {/* LEGEND (Penunjuk) */}
        <div className="flex gap-6 justify-center mb-8 text-sm font-bold bg-gray-50 p-4 rounded-full w-fit mx-auto border">
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full border-2 border-[#412986] bg-white flex items-center justify-center text-[#412986] text-xs font-bold">✓</div>
                <span className="text-gray-600">Available</span>
            </div>
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-300 text-xs font-bold">X</div>
                <span className="text-gray-400">Booked</span>
            </div>
        </div>

        {/* CONTENT GRID */}
        {loading ? (
             <div className="text-center py-20 animate-pulse text-gray-400 font-bold">Checking Database... 📡</div>
        ) : (
            <div className="space-y-8 animate-fade-in-up">
                {sessions.map((session) => (
                    <div key={session.id} className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                        {/* Session Header */}
                        <div className="bg-[#412986] px-6 py-3 border-b border-gray-100 flex items-center gap-2">
                            <h3 className={`font-bold text-lg ${session.color}`}>{session.label}</h3>
                        </div>

                        {/* Bubbles Grid */}
                        <div className="p-6">
                            <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
                                {slots.filter(s => s.sessionId === session.id).map((slot, index) => (
                                    <div key={index} className="flex flex-col items-center gap-2 group">
                                        <div className={`
                                            w-12 h-12 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300
                                            ${slot.booked 
                                                ? 'bg-gray-100 text-gray-300 cursor-not-allowed' 
                                                : 'bg-white border-2 border-[#412986] text-[#412986] hover:bg-[#301F63] hover:text-white hover:scale-110 shadow-sm cursor-pointer'
                                            }
                                        `}>
                                            {slot.booked ? 'X' : '✓'}
                                        </div>
                                        <span className={`text-xs font-mono font-medium ${slot.booked ? 'text-gray-300 line-through' : 'text-gray-600'}`}>
                                            {slot.display}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        )}

        {/* CTA BOTTOM */}
        <div className="mt-12 text-center">
            <p className="text-gray-900 mb-4">Sudah membuat keputusan yang tepat?</p>
            <a href="/booking" className="inline-block bg-[#412986] text-white px-8 py-3 rounded-full font-bold hover:bg-[#301F63] transition shadow-lg hover:scale-105">
                Tempah Sekarang
            </a>
        </div>

      </div>
    </div>
  );
}