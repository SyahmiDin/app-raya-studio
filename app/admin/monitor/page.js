"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FaWhatsapp, FaTrash, FaBan } from "react-icons/fa";

export default function MonitorPage() {
  const router = useRouter();
  
  // State
  const [selectedDate, setSelectedDate] = useState("");
  const [bookings, setBookings] = useState([]);
  const [blockServices, setBlockServices] = useState([]); // Simpan service untuk block
  const [loading, setLoading] = useState(false);
  
  // --- STATE INTERVAL VIEW ---
  const [viewInterval, setViewInterval] = useState(20); 

  // Modal State
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // State Baru untuk Block
  const [slotToBlock, setSlotToBlock] = useState(null);
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);

  // --- 1. SET TARIKH HARINI ---
  useEffect(() => {
    const today = new Date().toLocaleDateString('en-CA', {
        timeZone: 'Asia/Kuala_Lumpur'
    });
    setSelectedDate(today);
  }, []);

  // --- 2. FETCH DATA (BOOKINGS & BLOCK SERVICES) ---
  useEffect(() => {
    if (!selectedDate) return;

    async function fetchData() {
      setLoading(true);
      
      // A. Ambil Bookings
      const { data: bookingData } = await supabase
        .from('bookings')
        .select('*, services(name, duration_minutes)')
        .eq('booking_date', selectedDate)
        .in('status', ['paid', 'pending']); 

      if (bookingData) {
        const processed = bookingData.map(b => {
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

      // B. Ambil Service "BLOCK" (Update: Tambah Sorting)
      if (blockServices.length === 0) {
          const { data: serviceData } = await supabase
            .from('services')
            .select('*')
            .ilike('name', '%BLOCK%') // Cari semua yang ada nama BLOCK
            .order('duration_minutes', { ascending: true }); // Susun ikut masa (Paling pendek atas)
          
          if (serviceData) setBlockServices(serviceData);
      }

      setLoading(false);
    }

    fetchData();
  }, [selectedDate]);

  // --- HELPER: TUKAR MASA KE MINIT ---
  const timeToMinutes = (timeStr) => {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  };

  // --- HELPER: CARI BOOKING DALAM SLOT ---
  const findBookingForSlot = (slotTime) => {
    const slotMin = timeToMinutes(slotTime);
    return bookings.find(b => slotMin >= b.startMin && slotMin < b.endMin);
  };

  // --- ACTION: BLOCK SLOT ---
  const handleBlockSlot = async (serviceId) => {
    if (!slotToBlock || !selectedDate) return;

    const confirmBlock = confirm("Adakah anda pasti mahu TUTUP slot ini?");
    if (!confirmBlock) return;

    // Insert Booking Palsu (Status PAID supaya slot jadi blocked)
    const { error } = await supabase.from('bookings').insert([{
        booking_date: selectedDate,
        start_time: slotToBlock,
        client_name: "⛔ ADMIN BLOCK", // Nama khas untuk detect
        client_email: "admin@studio.com",
        client_phone: "000000000",
        service_id: serviceId,
        status: 'paid', 
        final_price: 0
    }]);

    if (error) {
        alert("Gagal block slot: " + error.message);
    } else {
        alert("Slot berjaya ditutup!");
        setIsBlockModalOpen(false);
        setSlotToBlock(null);
        window.location.reload(); // Refresh data
    }
  };

  // --- ACTION: DELETE/OPEN SLOT ---
  const handleDeleteBooking = async (id) => {
      if(confirm("Adakah anda pasti mahu memadam booking ini? Slot akan dibuka semula.")) {
          await supabase.from('bookings').delete().eq('id', id);
          window.location.reload();
      }
  }

  // --- COMPONENT: SLOT BUTTON ---
  const TimeSlot = ({ time }) => {
    const booking = findBookingForSlot(time);
    const isBooked = !!booking;
    
    // Check jika ini adalah block manual admin
    const isAdminBlock = isBooked && booking.client_name === "⛔ ADMIN BLOCK";

    return (
      <button
        onClick={() => {
            if (isBooked) {
                // Jika dah ada booking (Customer atau Admin Block), buka detail
                setSelectedBooking(booking);
                setIsModalOpen(true);
            } else {
                // Jika kosong, buka modal untuk BLOCK
                setSlotToBlock(time);
                setIsBlockModalOpen(true);
            }
        }}
        className={`
            border rounded-xl p-2 flex flex-col items-center justify-center transition-all shadow-sm h-24 relative overflow-hidden group
            ${isBooked 
                ? isAdminBlock
                    ? "bg-gray-800 text-white border-gray-600 hover:bg-black cursor-pointer" // Style Admin Block
                    : "bg-[#412986] text-white border-[#412986] hover:bg-[#301F63] cursor-pointer shadow-md" // Style Customer
                : "bg-white text-gray-400 border-gray-200 hover:border-red-400 hover:text-red-400 cursor-cell" // Style Kosong
            }
        `}
      >
        <span className="text-sm font-bold absolute top-2 right-2">
            {new Date(`2000-01-01 ${time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
        </span>
        
        {isBooked ? (
            <div className="mt-4 text-center w-full px-1">
                <span className={`block text-[9px] px-2 py-0.5 rounded-full font-bold truncate mx-auto w-full mb-1 ${isAdminBlock ? 'bg-red-500 text-white' : 'bg-green-400 text-black'}`}>
                    {booking.client_name}
                </span>
                <span className="text-[8px] opacity-80 block truncate leading-tight">
                    {booking.services?.name}
                </span>
            </div>
        ) : (
            // Hover effect untuk slot kosong
            <div className="mt-4 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center text-red-400">
                <FaBan size={16} />
                <span className="text-[9px] font-bold mt-1">BLOCK?</span>
            </div>
        )}
      </button>
    );
  };

  // --- GENERATE SLOTS ---
  const generateSlots = (startHour, endHour) => {
    let slots = [];
    let current = startHour * 60;
    const end = endHour * 60;
    while (current < end) {
        const h = Math.floor(current / 60);
        const m = current % 60;
        const time = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
        slots.push(time);
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
                        Monitor Jadual 📅
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">Klik slot kosong untuk <b>BLOCK</b>. Klik slot berwarna untuk lihat detail.</p>
                </div>
                
                <div className="flex flex-col md:flex-row gap-4 w-full xl:w-auto">
                    <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200">
                        <button onClick={() => setViewInterval(20)} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewInterval === 20 ? "bg-white text-[#412986] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>Grid 20 Min</button>
                        <button onClick={() => setViewInterval(30)} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewInterval === 30 ? "bg-white text-[#412986] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>Grid 30 Min</button>
                    </div>
                    <div className="flex items-center gap-3 bg-gray-100 px-4 py-2 rounded-xl border border-gray-200">
                        <span className="text-gray-500 font-bold text-xs uppercase tracking-wide">Tarikh:</span>
                        <input type="date" className="bg-transparent border-none outline-none font-bold text-lg text-gray-900 cursor-pointer" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
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
                    <div className="flex items-center gap-3 mb-4"><div className="w-3 h-8 bg-orange-400 rounded-full"></div><h3 className="text-lg font-bold text-gray-800 uppercase tracking-wider">Sesi Pagi (10AM - 1PM)</h3></div>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-3">
                        {generateSlots(10, 13).map(time => <TimeSlot key={time} time={time} />)}
                    </div>
                </div>
                <div className="border-t border-gray-100"></div>
                
                {/* SESI PETANG */}
                <div>
                    <div className="flex items-center gap-3 mb-4"><div className="w-3 h-8 bg-blue-500 rounded-full"></div><h3 className="text-lg font-bold text-gray-800 uppercase tracking-wider">Sesi Petang (2PM - 6PM)</h3></div>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-3">
                        {generateSlots(14, 18.5).map(time => <TimeSlot key={time} time={time} />)}
                    </div>
                </div>
                <div className="border-t border-gray-100"></div>
                
                {/* SESI MALAM */}
                <div>
                    <div className="flex items-center gap-3 mb-4"><div className="w-3 h-8 bg-purple-900 rounded-full"></div><h3 className="text-lg font-bold text-gray-800 uppercase tracking-wider">Sesi Malam (8PM - 11PM)</h3></div>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-3">
                        {generateSlots(20, 23).map(time => <TimeSlot key={time} time={time} />)}
                    </div>
                </div>
            </div>
        )}
      </div>

      {/* --- MODAL 1: BLOCK SLOT (Bila klik slot kosong) --- */}
      {isBlockModalOpen && slotToBlock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setIsBlockModalOpen(false)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden p-6 text-center" onClick={e => e.stopPropagation()}>
                <h3 className="text-xl font-black text-gray-900 mb-2">🔒 Tutup Slot {slotToBlock}?</h3>
                <p className="text-sm text-gray-500 mb-6">Pilih tempoh masa untuk menutup slot ini.</p>
                
                <div className="space-y-3">
                    {blockServices.length > 0 ? blockServices.map(service => (
                        <button 
                            key={service.id}
                            onClick={() => handleBlockSlot(service.id)}
                            className="w-full py-3 bg-gray-100 hover:bg-red-500 hover:text-white rounded-xl font-bold transition-colors border border-gray-200 flex items-center justify-center gap-2"
                        >
                            ⛔ {service.name}
                        </button>
                    )) : (
                        <p className="text-red-500 text-sm">Tiada Service 'BLOCK' dijumpai di database.</p>
                    )}
                </div>
                <button onClick={() => setIsBlockModalOpen(false)} className="mt-6 text-gray-400 text-sm hover:text-gray-600 font-bold">Batal</button>
            </div>
        </div>
      )}

      {/* --- MODAL 2: DETAIL (Bila klik slot berisi) --- */}
      {isModalOpen && selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setIsModalOpen(false)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100 relative" onClick={e => e.stopPropagation()}>
                
                {/* Header */}
                <div className={`${selectedBooking.client_name === "⛔ ADMIN BLOCK" ? "bg-gray-800" : "bg-[#412986]"} p-6 text-white text-center`}>
                    <h2 className="text-xl font-bold uppercase tracking-wider">
                        {selectedBooking.client_name === "⛔ ADMIN BLOCK" ? "SLOT DITUTUP ADMIN" : "BUTIRAN PELANGGAN"}
                    </h2>
                    <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full w-8 h-8 flex items-center justify-center">✕</button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-5">
                    {selectedBooking.client_name !== "⛔ ADMIN BLOCK" ? (
                        /* --- VIEW UNTUK CUSTOMER BIASA --- */
                        <>
                            <div className="text-center pb-4 border-b border-gray-100">
                                <div className={`inline-block px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wide border mb-2 ${selectedBooking.status === 'paid' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-orange-100 text-orange-700 border-orange-200'}`}>
                                    {selectedBooking.status === 'paid' ? '✅ Paid' : '⏳ Pending'}
                                </div>
                                <h3 className="text-2xl font-black text-gray-800">{selectedBooking.client_name}</h3>
                                <p className="text-gray-500 font-medium">{selectedBooking.services?.name}</p>
                            </div>

                            <div className="space-y-3 text-sm bg-gray-50 p-4 rounded-xl border border-gray-100">
                                <div className="flex justify-between"><span className="text-gray-500">Masa:</span><span className="font-bold text-gray-800">{selectedBooking.start_time}</span></div>
                                <div className="flex justify-between"><span className="text-gray-500">Phone:</span><span className="font-bold text-gray-800">{selectedBooking.client_phone}</span></div>
                                <div className="flex justify-between"><span className="text-gray-500">Email:</span><span className="font-bold text-gray-800 truncate max-w-[150px]">{selectedBooking.client_email}</span></div>
                                <div className="flex justify-between"><span className="text-gray-500">Code:</span><span className="font-mono font-bold bg-white border px-2 py-0.5 rounded text-gray-600">{selectedBooking.referral_code || '-'}</span></div>
                                <div className="flex justify-between"><span className="text-gray-500">Pax:</span><span className="font-mono font-bold bg-white border px-2 py-0.5 rounded text-gray-600">{selectedBooking.pax || '0'}</span></div>
                            </div>

                            <div className="flex gap-2 pt-2">
                                <a href={`https://wa.me/${selectedBooking.client_phone.replace(/^0/,'60')}`} target="_blank" className="flex-1 bg-[#25D366] text-white py-3 rounded-xl font-bold text-center hover:bg-[#128C7E] shadow-lg shadow-green-100 transition flex items-center justify-center gap-2"><FaWhatsapp size={20}/> WhatsApp</a>
                                <button onClick={() => handleDeleteBooking(selectedBooking.id)} className="flex-none bg-red-100 text-red-500 p-3 rounded-xl hover:bg-red-200 transition"><FaTrash size={20}/></button>
                            </div>
                        </>
                    ) : (
                        /* --- VIEW UNTUK ADMIN BLOCK --- */
                        <>
                            <div className="text-center py-4">
                                <p className="text-gray-500 mb-6">Slot ini telah ditutup secara manual. Pelanggan tidak boleh menempah slot ini.</p>
                                <button onClick={() => handleDeleteBooking(selectedBooking.id)} className="w-full bg-green-500 text-white py-4 rounded-xl font-bold hover:bg-green-600 shadow-lg shadow-green-200 flex items-center justify-center gap-2">
                                    ✅ Buka Semula Slot Ini
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
      )}

    </div>
  );
}