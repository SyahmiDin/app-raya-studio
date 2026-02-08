"use client";
import { useState, useEffect, Suspense } from "react";
import { supabase } from "@/lib/supabase";
import { loadStripe } from "@stripe/stripe-js";
import { useSearchParams } from "next/navigation";

// Key Stripe Public (Live)
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

function BookingContent() {
  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  
  // State tarikh
  const [selectedDate, setSelectedDate] = useState(""); 
  
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [formData, setFormData] = useState({ name: "", email: "", phone: "", referral: "" });
  const [loading, setLoading] = useState(false);
  
  // State untuk Referral Code
  const [promoStatus, setPromoStatus] = useState(null); // null, 'checking', 'valid', 'invalid'
  const [promoMessage, setPromoMessage] = useState("");

  // UBAH: takenSlots sekarang simpan object {start, end}, bukan string masa sahaja
  const [takenSlots, setTakenSlots] = useState([]);
  
  const [isPackageLocked, setIsPackageLocked] = useState(false);
  const searchParams = useSearchParams();

  // Helper: Tukar masa "10:30" kepada minit (cth: 630)
  const timeToMinutes = (timeStr) => {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  };

  // --- 1. AUTO SET TARIKH HARINI (Waktu Malaysia) ---
  useEffect(() => {
    const today = new Date().toLocaleDateString('en-CA', {
        timeZone: 'Asia/Kuala_Lumpur'
    });
    setSelectedDate(today);
  }, []);

  // --- 2. FETCH SERVICES & AUTO SELECT PAKEJ ---
  useEffect(() => {
    async function fetchServices() {
      const { data } = await supabase.from('services').select('*').order('price');
      if (data) {
        setServices(data);

        const packageIdFromUrl = searchParams.get('package');
        if (packageIdFromUrl) {
            const foundService = data.find(s => s.id == packageIdFromUrl);
            if (foundService) {
                setSelectedService(foundService);
                setIsPackageLocked(true);
            }
        }
      }
    }
    fetchServices();
  }, [searchParams]);

  // --- 3. FETCH TAKEN SLOTS (LOGIC BARU) ---
  useEffect(() => {
    if (selectedService && selectedDate) {
      async function fetchSlots() {
        // KITA PERLU AMBIL DURATION JUGA DARI TABLE SERVICES
        const { data } = await supabase
          .from('bookings')
          .select('start_time, services(duration_minutes)') // <--- Update Query
          .eq('booking_date', selectedDate)
          .eq('status', 'paid');

        if (data) {
          // Tukar setiap booking jadi range minit: { start: 600, end: 630 }
          // Kita tambah buffer 5 minit siap-siap pada booking orang lain
          const blockedRanges = data.map(b => {
             const start = timeToMinutes(b.start_time.slice(0, 5));
             const duration = b.services?.duration_minutes || 30; 
             // Formula: Start + Duration + 5 minit buffer
             return { start: start, end: start + duration + 5 }; 
          });
          setTakenSlots(blockedRanges);
        }
      }
      fetchSlots();
    }
  }, [selectedDate, selectedService]);

  // --- GENERATE TIME SLOTS (LOGIC BARU - CHECK OVERLAP) ---
  const generateTimeSlots = () => {
    if (!selectedService) return [];
    
    const slots = [];
    const myDuration = selectedService.duration_minutes || 30;
    const gap = 5; // Buffer 5 minit
    
    let currentMin = 10 * 60; 
    const endMin = 23 * 60; 

    while (currentMin < endMin) {
        const h = Math.floor(currentMin / 60);
        const m = currentMin % 60;
        const timeLabel = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
        
        // Kira waktu mula dan tamat slot yang user nak pilih ni
        const myStart = currentMin;
        const myEnd = currentMin + myDuration + gap; 

        // Check Overlap: Adakah slot saya bertindih dengan mana-mana booking sedia ada?
        // Formula Overlap: (StartA < EndB) && (EndA > StartB)
        const isTaken = takenSlots.some(booked => {
            return myStart < booked.end && myEnd > booked.start;
        });

        slots.push({ 
            time: timeLabel, 
            available: !isTaken 
        });

        // Lompat ke slot seterusnya (setiap 30 minit untuk paparan, atau ikut duration)
        // Kalau tuan nak paparan fix setiap 30 minit (cth: 10:00, 10:30, 11:00), guna +30
        // Kalau tuan nak dynamic ikut pakej + gap, guna myDuration + gap
        currentMin += (myDuration + gap); 
    }
    return slots;
  };

  // --- FUNCTION CHECK REFERRAL CODE ---
  const checkReferralCode = async () => {
    const code = formData.referral.trim().toUpperCase(); // Pastikan huruf besar

    if (!code) {
        setPromoStatus(null);
        setPromoMessage("");
        return;
    }

    setPromoStatus("checking");
    setPromoMessage("Sedang menyemak...");

    try {
        // Query table 'referral_codes'
        const { data, error } = await supabase
            .from('referral_codes')
            .select('*')
            .eq('code', code)
            .eq('is_active', true) // Pastikan kod aktif
            .single();

        if (error || !data) {
            setPromoStatus("invalid");
            setPromoMessage("❌ Kod Tidak Sah / Tidak Wujud");
        } else {
            setPromoStatus("valid");
            setPromoMessage(`✅ Kod Sah! (Staff: ${data.staff_name || 'Admin'})`);
        }
    } catch (err) {
        console.error(err);
        setPromoStatus("invalid");
        setPromoMessage("❌ Ralat sistem semasa menyemak kod.");
    }
  };


  // --- HANDLE PAYMENT ---
  const handlePayment = async () => {
    if (!selectedService || !selectedDate || !selectedSlot) {
        alert("Sila lengkapkan pilihan pakej, tarikh dan masa.");
        return;
    }

    setLoading(true);
    
    try {
        const res = await fetch("/api/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            service: selectedService,
            date: selectedDate,
            time: selectedSlot,
            customer: formData,
          }),
        });

        const json = await res.json();

        if (json.error) {
            alert("Ralat Pembayaran: " + json.error);
            setLoading(false);
            return;
        }

        if (json.url) {
            window.location.href = json.url; 
        } else {
            alert("Gagal mendapatkan link pembayaran.");
            setLoading(false);
        }

    } catch (err) {
        console.error("System Error:", err);
        alert("Gagal menghubungi server. Sila cuba lagi.");
        setLoading(false);
    }
  };

  const visibleServices = isPackageLocked && selectedService ? [selectedService] : services;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8 font-sans text-gray-900">
      <div className="max-w-4xl mx-auto">
        
        {/* HEADER: TAJUK */}
        <div className="text-center mb-8 space-y-2">
            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
                Studio Raya <span className="text-indigo-600">2026</span>
            </h1>
            <p className="text-slate-500 text-sm md:text-base">
                Tempah slot fotografi anda dengan mudah & pantas.
            </p>
        </div>

        {/* DATE PICKER */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8 flex flex-col items-center justify-center gap-4">

          <h3 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">Pilih Tarikh</h3>

          <div className="flex items-center gap-3 bg-gray-50 px-4 py-2 rounded-xl border border-gray-200 shadow-sm">
                <label className="text-sm font-bold text-gray-600">Tarikh:</label>
                <input 
                    type="date" 
                    className="bg-transparent border-none focus:ring-0 text-gray-900 font-bold outline-none cursor-pointer"
                    onChange={(e) => setSelectedDate(e.target.value)}
                    value={selectedDate}
                    min={new Date().toISOString().split("T")[0]}
                />
            </div>
        </div>

        {/* STEP 1: PILIH PAKEJ */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-6 relative">
          
          {isPackageLocked && (
            <div className="absolute top-4 right-4 z-10">
                <span className="bg-purple-100 text-[#412986] text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 border border-purple-200">
                    🔒 Pakej Pilihan
                </span>
            </div>
          )}

          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <span className="bg-indigo-100 text-indigo-600 w-8 h-8 rounded-full flex items-center justify-center text-sm">1</span>
            Pakej Fotografi
          </h2>
          
          <div className={`gap-4 ${isPackageLocked ? 'flex justify-center' : 'grid grid-cols-1 md:grid-cols-3'}`}>
            {visibleServices.map((service) => {
                 const originalPrice = Math.ceil(service.price / 0.9);
                 const isSelected = selectedService?.id === service.id;

                 return (
                    <div 
                        key={service.id}
                        onClick={() => {
                            if (!isPackageLocked) {
                                setSelectedService(service);
                                setSelectedSlot(null);
                            }
                        }}
                        className={`
                        p-4 rounded-xl border-2 transition-all relative overflow-hidden
                        ${isPackageLocked ? 'w-full max-w-sm' : ''} 
                        ${isSelected
                            ? "border-[#412986] bg-purple-50 ring-1 ring-[#412986]" 
                            : "border-gray-200 bg-white"
                        }
                        ${!isPackageLocked ? 'cursor-pointer hover:border-purple-300' : ''}
                        `}
                    >
                        {isSelected && (
                            <div className="absolute top-0 right-0 bg-[#412986] text-white text-xs px-2 py-1 rounded-bl-lg font-bold">SELECTED</div>
                        )}

                        <h3 className="font-bold text-lg mb-1">{service.name}</h3>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs text-gray-400 line-through">RM{originalPrice}</span>
                            <span className="text-xl font-black text-[#412986]">RM{service.price}</span>
                        </div>
                        <p className="text-xs text-gray-500 mb-2">{service.description}</p>
                        <div className="text-xs font-semibold bg-gray-100 inline-block px-2 py-1 rounded">
                            ⏱️ {service.duration_minutes} Minit
                        </div>
                    </div>
                 );
            })}
          </div>

          {isPackageLocked && (
            <div className="mt-6 text-center border-t border-gray-100 pt-4">
                <a href="/" className="inline-block text-xs font-bold text-gray-600 bg-gray-100 px-4 py-2 rounded-full hover:bg-gray-200 transition">
                    ← Pilih Pakej Lain
                </a>
            </div>
          )}
        </div>

        {/* STEP 2: PILIH SLOT MASA */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8 flex flex-col gap-4">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <span className="bg-indigo-100 text-indigo-600 w-8 h-8 rounded-full flex items-center justify-center text-sm">2</span>
              Pilih Slot Masa
            </h2>
        {selectedService && (
          <div id="calendar-section" className="animate-fade-in-up">
            
            {!selectedDate ? (
                 <div className="text-center py-8 bg-gray-50 rounded-xl text-gray-400">Loading Calendar...</div>
            ) : (
                <div className="space-y-8 py-8">
                    {(() => {
                        const allSlots = generateTimeSlots();
                        
                        const filterSlots = (startHour, endHour) => {
                            return allSlots.filter(slot => {
                                const hour = parseInt(slot.time.split(':')[0]);
                                return hour >= startHour && hour < endHour;
                            });
                        };

                        const sessions = [
                            { label: "Pagi (10AM - 1PM)", slots: filterSlots(10, 13), color: "bg-[#412986]" }, 
                            { label: "Petang (2PM - 6PM)", slots: filterSlots(14, 18), color: "bg-[#412986]" },
                            { label: "Malam (8PM - 11PM)", slots: filterSlots(20, 24), color: "bg-[#412986]" }  
                        ];

                        if (allSlots.length === 0) {
                            return <p className="text-center text-gray-400 text-sm mt-4">Tiada slot tersedia untuk tarikh ini.</p>;
                        }

                        return sessions.map((session, index) => (
                            session.slots.length > 0 && (
                                <div key={index} className="rounded-xl overflow-hidden shadow-sm border border-gray-200 bg-white">
                                    <div className={`${session.color} text-white px-6 py-4 font-bold text-lg`}>
                                        {session.label}
                                    </div>
                                    <div className="p-6">
                                        <div className="flex flex-wrap gap-x-8 gap-y-8">
                                            {session.slots.map((slot, idx) => {
                                                const isSelected = slot.time === selectedSlot;
                                                const isDisabled = !slot.available;

                                                return (
                                                    <div key={idx} className="flex flex-col items-center gap-2">
                                                        <button
                                                            disabled={isDisabled}
                                                            onClick={() => setSelectedSlot(slot.time)}
                                                            className={`
                                                                w-14 h-14 rounded-full flex items-center justify-center hover:scale-110 border-2 transition-all
                                                                ${isDisabled 
                                                                    ? "border-gray-200 text-gray-200 bg-gray-50 cursor-not-allowed" 
                                                                    : isSelected
                                                                        ? "border-[#412986] bg-[#412986] text-white shadow-lg scale-100"
                                                                        : "border-[#412986] text-[#412986] bg-white hover:bg-purple-50 hover:cursor-pointer"
                                                                }
                                                            `}
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                            </svg>
                                                        </button>
                                                        <span className={`text-xs font-bold font-mono ${isSelected ? "text-[#412986]" : "text-gray-500"}`}>
                                                            {new Date(`2000-01-01 ${slot.time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            )
                        ));
                    })()}
                </div>
            )}
          </div>
        )}
        </div>

        {/* STEP 3: MAKLUMAT DIRI */}
        {selectedSlot && selectedDate && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-6 animate-fade-in-up">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <span className="bg-indigo-100 text-indigo-600 w-8 h-8 rounded-full flex items-center justify-center text-sm">3</span>
              Butiran Anda
            </h2>

            <div className="bg-[#eff6ff] p-6 rounded-xl border border-blue-50 space-y-5">
              
              {/* --- BAHAGIAN KOD PROMO (DIBETULKAN) --- */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">KOD PROMO / STAFF</label>
                <div className="flex gap-3">
                    <input 
                        type="text" 
                        placeholder="CTH: STAFF023" 
                        className="flex-1 p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-200 outline-none text-gray-700 placeholder-gray-400 bg-white uppercase font-bold" 
                        onChange={(e) => setFormData({...formData, referral: e.target.value.toUpperCase()})} 
                        value={formData.referral} 
                    />
                    <button 
                        type="button" 
                        disabled={promoStatus === 'checking'}
                        className="bg-[#1e293b] text-white font-bold px-6 rounded-lg hover:bg-black hover:cursor-pointer transition-colors disabled:bg-gray-400" 
                        onClick={checkReferralCode}
                    >
                        {promoStatus === 'checking' ? 'Checking...' : 'Check'}
                    </button>
                </div>
                {/* Mesej Status Kod */}
                {promoMessage && (
                    <p className={`text-xs font-bold mt-2 ${promoStatus === 'valid' ? 'text-green-600' : 'text-red-500'}`}>
                        {promoMessage}
                    </p>
                )}
              </div>
              {/* ------------------------------------------- */}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div><label className="block text-xs font-bold text-gray-500 mb-2">Nama Penuh</label><input type="text" placeholder="Ali bin Abu" className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-200 outline-none text-gray-700 bg-white placeholder-gray-400" onChange={(e) => setFormData({...formData, name: e.target.value})} /></div>
                <div><label className="block text-xs font-bold text-gray-500 mb-2">No. WhatsApp</label><input type="tel" placeholder="0123456789" className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-200 outline-none text-gray-700 bg-white placeholder-gray-400" onChange={(e) => setFormData({...formData, phone: e.target.value})} /></div>
              </div>

              <div><label className="block text-xs font-bold text-gray-500 mb-2">Alamat Email</label><input type="email" placeholder="ali@contoh.com" className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-200 outline-none text-gray-700 bg-white placeholder-gray-400" onChange={(e) => setFormData({...formData, email: e.target.value})} /></div>
            </div>
            
            <div className="mt-8 bg-purple-50 p-4 rounded-xl border border-purple-100">
                <div className="flex justify-between items-center mb-1"><span className="text-gray-600 text-sm">Pakej:</span><span className="font-bold text-sm">{selectedService.name}</span></div>
                <div className="flex justify-between items-center mb-1"><span className="text-gray-600 text-sm">Tarikh:</span><span className="font-bold text-sm">{selectedDate}</span></div>
                <div className="flex justify-between items-center mb-1"><span className="text-gray-600 text-sm">Masa:</span><span className="font-bold text-sm">{selectedSlot}</span></div>
                <div className="border-t border-purple-200 my-2 pt-2 flex justify-between items-center text-lg">
                    <span className="font-bold text-purple-900">Total:</span>
                    <span className="font-black text-2xl text-[#412986]">RM{selectedService.price}</span>
                </div>
            </div>

            <button 
              onClick={handlePayment}
              disabled={loading || !formData.name || !formData.phone}
              className={`mt-6 w-full py-4 rounded-xl hover:cursor-pointer text-white font-bold text-lg shadow-xl transition-all ${loading ? "bg-gray-400 cursor-not-allowed" : "bg-[#412986] hover:bg-[#301F63] hover:scale-[1.02]"}`}
            >
              {loading ? "Sedang Memproses..." : "💳 Teruskan ke Pembayaran"}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

export default function BookingPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-500">Loading System...</div>}>
            <BookingContent />
        </Suspense>
    );
}