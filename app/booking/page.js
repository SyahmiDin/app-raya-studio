"use client";
import { useState, useEffect, Suspense } from "react";
import { supabase } from "@/lib/supabase";
import { useSearchParams } from "next/navigation";

// KITA ASINGKAN CONTENT KE DALAM FUNCTION INI
function BookingContent() {
  const searchParams = useSearchParams();
  
  // State Sedia Ada (LOGIC TIDAK DISENTUH)
  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [slotList, setSlotList] = useState([]); 
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({ name: "", email: "", phone: "" });
  const [isProcessing, setIsProcessing] = useState(false);

  // State Referral
  const [promoCode, setPromoCode] = useState("");
  const [validReferral, setValidReferral] = useState(null);
  const [promoMessage, setPromoMessage] = useState("");

  // Helpers
  const timeToMinutes = (timeStr) => { const [h, m] = timeStr.split(':').map(Number); return h * 60 + m; };
  const minutesToTime = (totalMinutes) => { const h = Math.floor(totalMinutes / 60); const m = totalMinutes % 60; return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`; };
  const formatTimeDisplay = (time24) => { const [h, m] = time24.split(':'); const hr = parseInt(h); return `${hr % 12 || 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}`; };

  // --- 1. CHECK URL & LOCAL STORAGE (AUTO FILL) ---
  useEffect(() => {
    let refCode = searchParams.get("ref");
    if (!refCode && typeof window !== 'undefined') {
        refCode = localStorage.getItem("studioRayaReferral");
    }
    if (refCode) {
        setPromoCode(refCode);
        handleCheckCode(refCode);
    }
  }, [searchParams]);

  // --- FETCH SERVICES ---
  useEffect(() => {
    async function fetchServices() {
      const { data } = await supabase.from('services').select('*').order('price');
      if (data) { setServices(data); if (data.length > 0) setSelectedService(data[0]); }
      setLoading(false);
    }
    fetchServices();
  }, []);

  // --- GENERATE SLOTS ---
  useEffect(() => {
    if (!selectedService || !selectedDate) return;
    async function checkAvailability() {
      setLoading(true); setSelectedSlot(null);
      const sessions = [{ name: "Pagi", start: "10:00", end: "13:00" }, { name: "Petang", start: "14:00", end: "17:30" }, { name: "Malam", start: "20:00", end: "23:00" }];
      
      const { data: existingBookings } = await supabase.from('bookings').select(`start_time, services ( duration_minutes )`).eq('booking_date', selectedDate).eq('status', 'paid');
      const blockedRanges = existingBookings?.map(b => { 
         const start = timeToMinutes(b.start_time.slice(0, 5)); 
         return { start, end: start + b.services.duration_minutes + 5 }; 
      }) || [];

      let currentServiceDuration = selectedService.duration_minutes + 5;
      let slots = [];

      sessions.forEach(session => {
        let currentMin = timeToMinutes(session.start);
        const endMin = timeToMinutes(session.end);
        while (currentMin + currentServiceDuration <= endMin) {
            const timeString = minutesToTime(currentMin);
            const myStart = currentMin; const myEnd = currentMin + currentServiceDuration;
            const isOverlap = blockedRanges.some(r => myStart < r.end && myEnd > r.start);
            slots.push({ time: timeString, booked: isOverlap });
            currentMin += currentServiceDuration;
        }
      });
      setSlotList(slots); setLoading(false);
    }
    checkAvailability();
  }, [selectedDate, selectedService]);

  // --- CHECK KOD ---
  const handleCheckCode = async (codeToCheck = null) => {
    const finalCode = (typeof codeToCheck === 'string' ? codeToCheck : promoCode).toUpperCase();

    if (!finalCode) return;
    setPromoMessage("Checking...");
    
    const { data } = await supabase
        .from('referral_codes')
        .select('*')
        .eq('code', finalCode)
        .eq('is_active', true)
        .single();

    if (data) {
        setValidReferral(data.code);
        setPromoMessage(`✅ Kod sah! (Support: ${data.staff_name})`);
    } else {
        setValidReferral(null);
        setPromoMessage("❌ Kod tidak dijumpai.");
    }
  };

  const handleCheckout = async (e) => {
    e.preventDefault();
    if (!selectedSlot || !formData.name || !formData.phone) return alert("Lengkapkan maklumat!");
    setIsProcessing(true);

    try {
        const response = await fetch("/api/checkout", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                service: selectedService,
                date: selectedDate,
                time: selectedSlot,
                client: formData,
                referralCode: validReferral
            }),
        });
        const data = await response.json();
        if (data.url) window.location.href = data.url; 
        else { alert("Error payment"); setIsProcessing(false); }
    } catch (err) { alert("System Error"); setIsProcessing(false); } 
  };

  // --- UI COMPONENTS (LOADING) ---
  if (loading && services.length === 0) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        <p className="mt-4 text-slate-500 animate-pulse">Memuatkan Pakej...</p>
    </div>
  );

  // --- RETURN (DESIGN BARU) ---
  return (
    <div className="min-h-screen bg-[#F8FAFC] py-8 px-4 sm:px-6 font-sans">
      <div className="max-w-3xl mx-auto">
        
        {/* HEADER SECTION */}
        <div className="text-center mb-8 space-y-2">
            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
                Studio Raya <span className="text-indigo-600">2026</span>
            </h1>
            <p className="text-slate-500 text-sm md:text-base">
                Tempah slot fotografi anda dengan mudah & pantas.
            </p>
        </div>
        
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/60 overflow-hidden border border-slate-100">
            
            {/* PROGRESS BAR SIMPLIFIED */}
            <div className="bg-slate-50 border-b border-slate-100 px-6 py-4 flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <span className={selectedService ? "text-indigo-600" : ""}>1. Pakej</span>
                <span className="text-slate-300">/</span>
                <span className={selectedDate ? "text-indigo-600" : ""}>2. Tarikh</span>
                <span className="text-slate-300">/</span>
                <span className={selectedSlot ? "text-indigo-600" : ""}>3. Bayar</span>
            </div>

            <div className="p-6 md:p-8 space-y-10">
                
                {/* 1. SECTION: PILIH PAKEJ */}
                <section>
                    <h3 className="flex items-center gap-2 font-bold text-lg text-slate-800 mb-5">
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 text-xs">1</span>
                        Pilih Pakej Anda
                    </h3>
                    <div className="grid md:grid-cols-3 gap-4">
                        {services.map(s => {
                            const isSelected = selectedService?.id === s.id;
                            return (
                                <div 
                                    key={s.id} 
                                    onClick={() => { setSelectedService(s); setSelectedSlot(null); }} 
                                    className={`relative group cursor-pointer border-2 p-5 rounded-2xl transition-all duration-200 ease-in-out
                                        ${isSelected 
                                            ? 'border-indigo-600 bg-indigo-50/50 shadow-md transform scale-[1.02]' 
                                            : 'border-slate-100 hover:border-indigo-300 hover:shadow-sm bg-white'
                                        }`}
                                >
                                    {isSelected && (
                                        <div className="absolute -top-3 -right-2 bg-indigo-600 text-white p-1 rounded-full shadow-sm">
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                                        </div>
                                    )}
                                    <h4 className={`font-bold ${isSelected ? 'text-indigo-900' : 'text-slate-700'}`}>{s.name}</h4>
                                    <div className="flex items-baseline gap-1 my-2">
                                        <span className="text-sm font-medium text-slate-500">RM</span>
                                        <span className={`text-3xl font-extrabold ${isSelected ? 'text-indigo-600' : 'text-slate-900'}`}>{s.price}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-slate-500 font-medium bg-slate-100 w-fit px-2 py-1 rounded-lg">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                        {s.duration_minutes} Minit
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </section>

                {/* 2. SECTION: TARIKH & MASA */}
                <section className="space-y-6">
                    <div>
                        <h3 className="flex items-center gap-2 font-bold text-lg text-slate-800 mb-5">
                            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 text-xs">2</span>
                            Tetapkan Tarikh
                        </h3>
                        <div className="relative">
                            <input 
                                type="date" 
                                value={selectedDate} 
                                min={new Date().toISOString().split('T')[0]} 
                                onChange={e => setSelectedDate(e.target.value)} 
                                className="w-full md:w-1/2 p-4 pl-12 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-slate-700 font-medium cursor-pointer"
                            />
                            <svg className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 transform -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                        </div>
                    </div>

                    {selectedDate && (
                        <div className="animate-fade-in">
                            <div className="flex justify-between items-end mb-4">
                                <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Pilih Slot Masa</h4>
                                <span className="text-xs text-slate-400">{slotList.filter(s => !s.booked).length} slot kosong</span>
                            </div>
                            
                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                                {slotList.map((s, i) => {
                                    const isSelected = selectedSlot === s.time;
                                    return (
                                        <button 
                                            key={i} 
                                            disabled={s.booked} 
                                            onClick={() => setSelectedSlot(s.time)} 
                                            className={`
                                                relative p-3 text-sm font-semibold rounded-xl border transition-all
                                                ${s.booked 
                                                    ? 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed decoration-slate-300' 
                                                    : isSelected
                                                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200 scale-105'
                                                        : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-400 hover:text-indigo-600'
                                                }
                                            `}
                                        >
                                            {formatTimeDisplay(s.time)}
                                            {s.booked && <span className="absolute inset-0 flex items-center justify-center text-slate-300 opacity-40"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg></span>}
                                        </button>
                                    )
                                })}
                            </div>
                            {slotList.length === 0 && !loading && (
                                <div className="text-center p-6 bg-orange-50 text-orange-600 rounded-xl text-sm">Tiada slot kosong pada tarikh ini.</div>
                            )}
                        </div>
                    )}
                </section>

                {/* 3. SECTION: CHECKOUT FORM */}
                {selectedSlot && (
                    <div className="animate-fade-in-up pt-6 border-t border-dashed border-slate-200">
                        <h3 className="flex items-center gap-2 font-bold text-lg text-slate-800 mb-6">
                            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 text-xs">3</span>
                            Butiran Akhir
                        </h3>
                        
                        <div className="bg-gradient-to-br from-indigo-50 to-slate-50 p-6 rounded-2xl border border-indigo-100/50 mb-8">
                            
                            {/* Referral Code UI yang lebih kemas */}
                            <div className="mb-6">
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Kod Promo / Staff</label>
                                <div className="flex gap-2">
                                    <input 
                                        type="text" 
                                        value={promoCode}
                                        onChange={(e) => setPromoCode(e.target.value)}
                                        placeholder="Cth: STAFF023"
                                        className="flex-1 p-3 border border-slate-300 rounded-xl uppercase font-mono text-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white"
                                    />
                                    <button 
                                        onClick={() => handleCheckCode()} 
                                        type="button" 
                                        className="bg-slate-800 text-white px-6 rounded-xl font-bold text-sm hover:bg-slate-700 transition-colors shadow-lg shadow-slate-200"
                                    >
                                        Check
                                    </button>
                                </div>
                                {promoMessage && (
                                    <div className={`flex items-center gap-2 text-xs mt-2 font-bold p-2 rounded-lg ${validReferral ? 'text-green-700 bg-green-50' : 'text-red-600 bg-red-50'}`}>
                                        {promoMessage}
                                    </div>
                                )}
                            </div>

                            <form onSubmit={handleCheckout} className="space-y-4">
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-slate-500 ml-1">Nama Penuh</label>
                                        <input type="text" placeholder="Ali bin Abu" required className="p-3 border border-slate-200 rounded-xl w-full focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" onChange={e=>setFormData({...formData,name:e.target.value})}/>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-slate-500 ml-1">No. WhatsApp</label>
                                        <input type="tel" placeholder="0123456789" required className="p-3 border border-slate-200 rounded-xl w-full focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" onChange={e=>setFormData({...formData,phone:e.target.value})}/>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-slate-500 ml-1">Alamat Email</label>
                                    <input type="email" placeholder="ali@contoh.com" required className="p-3 border border-slate-200 rounded-xl w-full focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" onChange={e=>setFormData({...formData,email:e.target.value})}/>
                                </div>

                                <div className="pt-6">
                                    <button 
                                        type="submit" 
                                        disabled={isProcessing} 
                                        className="w-full bg-indigo-600 text-white font-bold py-4 rounded-xl shadow-xl shadow-indigo-200 hover:bg-indigo-700 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex justify-between px-8 items-center disabled:opacity-70 disabled:cursor-not-allowed group"
                                    >
                                        <span className="flex items-center gap-2">
                                            {isProcessing ? "Memproses..." : "SAHKAN TEMPAHAN"}
                                            {!isProcessing && <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>}
                                        </span>
                                        <span className="text-lg bg-indigo-800/30 px-3 py-1 rounded-lg">RM{selectedService.price}</span>
                                    </button>
                                    <p className="text-center text-xs text-slate-400 mt-3 flex justify-center items-center gap-1">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                                        Pembayaran selamat dijamin
                                    </p>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
        
        {/* FOOTER SIMPLE */}
        <div className="text-center mt-8 pb-8 text-slate-400 text-xs">
            &copy; 2026 Studio ABG Raya. All rights reserved.
        </div>
      </div>
    </div>
  );
}

// COMPONENT UTAMA (WRAPPER)
export default function BookingPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-slate-500">Loading System...</div>}>
            <BookingContent />
        </Suspense>
    );
}