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

  // --- 2. FETCH SERVICES, AUTO SELECT PAKEJ & AUTO REFERRAL ---
  useEffect(() => {
    async function fetchServices() {
      const { data } = await supabase.from('services').select('*').order('price');
      if (data) {
        setServices(data);

        // A. LOGIC LOCK PAKEJ
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

    // B. LOGIC AFFILIATE / REFERRAL
    const refCode = searchParams.get('ref') || searchParams.get('referral');
    
    if (refCode) {
        setFormData(prev => ({ ...prev, referral: refCode.toUpperCase() }));
        if (typeof window !== 'undefined') {
            localStorage.setItem('studioRayaReferral', refCode.toUpperCase());
        }
    } else {
        if (typeof window !== 'undefined') {
            const savedRef = localStorage.getItem('studioRayaReferral');
            if (savedRef) {
                setFormData(prev => ({ ...prev, referral: savedRef }));
            }
        }
    }

  }, [searchParams]);

  // --- 3. FETCH TAKEN SLOTS (LOGIC BARU) ---
  useEffect(() => {
    if (selectedService && selectedDate) {
      async function fetchSlots() {
        const { data } = await supabase
          .from('bookings')
          .select('start_time, services(duration_minutes)') 
          .eq('booking_date', selectedDate)
          .eq('status', 'paid');

        if (data) {
          const blockedRanges = data.map(b => {
             const start = timeToMinutes(b.start_time.slice(0, 5));
             const duration = b.services?.duration_minutes || 30; 
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
        
        const myStart = currentMin;
        const myEnd = currentMin + myDuration + gap; 

        const isTaken = takenSlots.some(booked => {
            return myStart < booked.end && myEnd > booked.start;
        });

        slots.push({ 
            time: timeLabel, 
            available: !isTaken 
        });

        currentMin += (myDuration + gap); 
    }
    return slots;
  };

  // --- FUNCTION CHECK REFERRAL CODE ---
  const checkReferralCode = async () => {
    const code = formData.referral.trim().toUpperCase();

    if (!code) {
        setPromoStatus(null);
        setPromoMessage("");
        return;
    }

    setPromoStatus("checking");
    setPromoMessage("Sedang menyemak...");

    try {
        const { data, error } = await supabase
            .from('referral_codes')
            .select('*')
            .eq('code', code)
            .eq('is_active', true)
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
    // BACKGROUND CREAM (#FDFBF7) - TEMA RAYA CLASSIC
    // Added 'flex flex-col' to allow footer to sit at bottom
    <div className="min-h-screen bg-indigo-100 font-sans text-gray-900 selection:bg-[#412986] selection:text-white flex flex-col justify-between">
        
      {/* WRAPPER CONTENT (Padding applied here so footer is not affected) */}
      <div className="py-6 px-4 sm:px-6 lg:px-8 flex-grow">
        <div className="max-w-4xl mx-auto space-y-6">
            
            {/* HEADER */}
            <div className="text-center py-8 relative">
                {/* Dekorasi Garis Emas */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-1 bg-[#D4AF37] rounded-full opacity-50"></div>
                
                <h1 className="text-4xl md:text-5xl font-extrabold text-[#412986] tracking-tight drop-shadow-sm mb-2">
                    Studio ABG Raya <span className="text-[#D4AF37]">2026</span>
                </h1>
                <p className="text-gray-500 text-lg italic">
                    "Abadikan kenangan Syawal anda bersama kami"
                </p>
            </div>

            {/* STEP 1: DATE PICKER */}
            <div className="bg-white p-8 rounded-2xl shadow-[0_10px_40px_-15px_rgba(0,0,0,0.1)] border border-[#e5e0d8] flex flex-col items-center justify-center text-center relative overflow-hidden">
            {/* Hiasan Bucu */}
            <div className="absolute top-0 left-0 w-16 h-16 border-t-4 border-l-4 border-[#412986]/10 rounded-tl-xl"></div>
            <div className="absolute top-0 right-0 w-16 h-16 border-t-4 border-r-4 border-[#412986]/10 rounded-tr-xl"></div>

            <h3 className="text-xl font-bold text-gray-700 uppercase tracking-widest mb-4">Pilih Tarikh Sesi</h3>

            <div className="relative group w-full max-w-xs mx-auto">
                <div className="absolute -inset-1 bg-gradient-to-r from-[#412986] to-[#D4AF37] rounded-xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                <div className="relative flex items-center gap-3 bg-white px-6 py-4 rounded-xl border border-gray-200 shadow-sm">
                    <span className="text-2xl">📅</span>
                    <input 
                        type="date" 
                        className="bg-transparent border-none focus:ring-0 text-2xl md:text-3xl font-bold text-[#412986] outline-none cursor-pointer w-full text-center uppercase"
                        onChange={(e) => setSelectedDate(e.target.value)}
                        value={selectedDate}
                        min={new Date().toISOString().split("T")[0]}
                    />
                </div>
            </div>
            <p className="mt-3 text-xs text-gray-400 font-medium">Sila pastikan tarikh adalah betul</p>
            </div>

            {/* STEP 2: PILIH PAKEJ */}
            <div className="relative">
            <div className="flex items-center gap-4 mb-6">
                <div className="w-10 h-10 rounded-full bg-[#412986] text-[#D4AF37] flex items-center justify-center font-bold text-lg shadow-lg shadow-purple-900/20">1</div>
                <h2 className="text-2xl font-bold text-gray-800">Pilihan Pakej Anda</h2>
            </div>
            
            <div className={`gap-6 ${isPackageLocked ? 'flex justify-center' : 'grid grid-cols-1 md:grid-cols-3'}`}>
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
                            p-6 rounded-2xl transition-all duration-300 relative overflow-hidden flex flex-col
                            ${isPackageLocked ? 'w-full max-w-sm' : ''} 
                            ${isSelected
                                ? "border-2 border-[#D4AF37] bg-white shadow-2xl shadow-[#412986]/10 transform -translate-y-1" 
                                : "border border-gray-100 bg-white shadow-sm hover:shadow-md hover:border-[#412986]/30"
                            }
                            ${!isPackageLocked ? 'cursor-pointer' : ''}
                            `}
                        >
                            {/* Header Warna Ungu */}
                            <div className={`absolute top-0 left-0 right-0 h-2 ${isSelected ? 'bg-[#D4AF37]' : 'bg-[#412986]'}`}></div>

                            {isSelected && (
                                <div className="absolute top-4 right-4 text-[#D4AF37]">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                </div>
                            )}

                            <div className="mt-4">
                                <h3 className="font-bold text-xl text-gray-900 mb-1">{service.name}</h3>
                                <div className="w-12 h-1 bg-gray-100 rounded-full mb-4"></div>
                                
                                <p className="text-sm text-gray-500 mb-6 leading-relaxed line-clamp-3">{service.description}</p>
                                
                                <div className="mt-auto pt-4 border-t border-dashed border-gray-200">
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <p className="text-xs text-gray-400 line-through italic">RM{originalPrice}</p>
                                            <p className="text-2xl font-extrabold text-[#412986]">RM{service.price}</p>
                                        </div>
                                        <div className="bg-[#412986]/5 text-[#412986] text-xs font-bold px-3 py-1 rounded-full border border-[#412986]/10">
                                            ⏱️ {service.duration_minutes} Minit
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {isPackageLocked && (
                <div className="mt-6 text-center">
                    <a href="/" className="inline-block text-xs font-bold text-[#412986] hover:text-[#D4AF37] border-b border-transparent hover:border-[#D4AF37] transition">
                        ← Pilih Pakej Lain
                    </a>
                </div>
            )}
            </div>

            {/* STEP 3: PILIH SLOT MASA */}
            <div className="relative pt-6">
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-10 h-10 rounded-full bg-[#412986] text-[#D4AF37] flex items-center justify-center font-bold text-lg shadow-lg shadow-purple-900/20">2</div>
                    <h2 className="text-2xl font-bold text-gray-800">Pilih Slot Masa</h2>
                </div>

                {selectedService && (
                    <div id="calendar-section" className="animate-fade-in-up bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-[#e5e0d8]">
                    
                    {!selectedDate ? (
                        <div className="text-center py-12 bg-[#FDFBF7] rounded-xl border border-dashed border-gray-300 text-gray-400 italic">
                            Sila pilih tarikh di atas dahulu...
                        </div>
                    ) : (
                        <div className="space-y-8">
                            {(() => {
                                const allSlots = generateTimeSlots();
                                
                                const filterSlots = (startHour, endHour) => {
                                    return allSlots.filter(slot => {
                                        const hour = parseInt(slot.time.split(':')[0]);
                                        return hour >= startHour && hour < endHour;
                                    });
                                };

                                const sessions = [
                                    { label: "Sesi Pagi [10.00 AM - 1.00 PM]", slots: filterSlots(10, 13) }, 
                                    { label: "Sesi Petang [2.00 PM - 6.00 PM]", slots: filterSlots(14, 18) },
                                    { label: "Sesi Malam [8.00 PM - 11.00 PM]", slots: filterSlots(20, 24) }  
                                ];

                                if (allSlots.length === 0) {
                                    return <p className="text-center text-red-400 font-medium py-8 bg-red-50 rounded-xl">Maaf, semua slot telah penuh pada tarikh ini.</p>;
                                }

                                return sessions.map((session, index) => (
                                    session.slots.length > 0 && (
                                        <div key={index}>
                                            <h4 className="text-[#412986] font-bold uppercase tracking-wider text-lg mb-4 border-l-4 border-[#D4AF37] pl-3">
                                                {session.label}
                                            </h4>
                                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                                                {session.slots.map((slot, idx) => {
                                                    const isSelected = slot.time === selectedSlot;
                                                    const isDisabled = !slot.available;

                                                    return (
                                                        <button
                                                            key={idx}
                                                            disabled={isDisabled}
                                                            onClick={() => setSelectedSlot(slot.time)}
                                                            className={`
                                                                py-3 px-2 rounded-lg border transition-all duration-200 flex flex-col items-center justify-center
                                                                ${isDisabled 
                                                                    ? "border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed decoration-slice" 
                                                                    : isSelected
                                                                        ? "border-[#412986] bg-[#412986] text-white shadow-lg shadow-purple-900/30 scale-105 ring-2 ring-[#D4AF37] ring-offset-2"
                                                                        : "border-[#412986]/20 bg-white text-[#412986] hover:bg-purple-50 hover:border-[#412986]"
                                                                }
                                                            `}
                                                        >
                                                            <span className={`text-sm font-bold ${isDisabled ? "" : "font-mono"}`}>
                                                                {new Date(`2000-01-01 ${slot.time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                                                            </span>
                                                            {isSelected && <span className="text-[10px] text-[#D4AF37] mt-1">Dipilih</span>}
                                                        </button>
                                                    );
                                                })}
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

            {/* STEP 4: MAKLUMAT DIRI & PAYMENT */}
            {selectedSlot && selectedDate && (
                <div className="pt-6 animate-fade-in-up pb-12">
                
                {/* Tajuk Section */}
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-10 h-10 rounded-full bg-[#412986] text-[#D4AF37] flex items-center justify-center font-bold text-lg shadow-lg shadow-purple-900/20">3</div>
                    <h2 className="text-2xl font-bold text-gray-800">Butiran Anda</h2>
                </div>

                {/* Container Utama (Putih) */}
                <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100">
                    
                    {/* 1. SECTION FORM INPUT (Latar Belakang Kelabu Cair) */}
                    <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 space-y-5">
                        
                        {/* A. KOD PROMO (Paling Atas) */}
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Kod Promo / Staff</label>
                            <div className="flex gap-3">
                                <input 
                                    type="text" 
                                    placeholder="CTH: STAFF023" 
                                    className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#412986] outline-none text-gray-700 bg-white placeholder-gray-400 font-bold uppercase" 
                                    onChange={(e) => setFormData({...formData, referral: e.target.value.toUpperCase()})} 
                                    value={formData.referral} 
                                />
                                <button 
                                    type="button" 
                                    disabled={promoStatus === 'checking'}
                                    className="bg-[#1e293b] text-white font-bold px-6 rounded-lg hover:bg-black transition-colors disabled:opacity-50 min-w-[100px]" 
                                    onClick={checkReferralCode}
                                >
                                    {promoStatus === 'checking' ? '...' : 'Check'}
                                </button>
                            </div>
                            {promoMessage && (
                                <p className={`text-xs font-bold mt-2 ${promoStatus === 'valid' ? 'text-green-600' : 'text-red-500'}`}>
                                    {promoMessage}
                                </p>
                            )}
                        </div>

                        {/* B. NAMA & WHATSAPP (Sebaris Desktop, Stack Mobile) */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-2">Nama Penuh</label>
                                <input 
                                    type="text" 
                                    placeholder="Ali bin Abu" 
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#412986] outline-none text-gray-700 bg-white placeholder-gray-400" 
                                    onChange={(e) => setFormData({...formData, name: e.target.value})} 
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-2">No. WhatsApp</label>
                                <input 
                                    type="tel" 
                                    placeholder="0123456789" 
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#412986] outline-none text-gray-700 bg-white placeholder-gray-400" 
                                    onChange={(e) => setFormData({...formData, phone: e.target.value})} 
                                />
                            </div>
                        </div>

                        {/* C. EMAIL (Full Width) */}
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-2">Alamat Email</label>
                            <input 
                                type="email" 
                                placeholder="ali@contoh.com" 
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#412986] outline-none text-gray-700 bg-white placeholder-gray-400" 
                                onChange={(e) => setFormData({...formData, email: e.target.value})} 
                            />
                        </div>
                    </div>

                    {/* 2. SECTION SUMMARY (Kotak Ungu Cair) */}
                    <div className="mt-6 bg-[#faf5ff] p-6 rounded-xl border border-purple-100">
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-gray-600 font-medium text-sm">Pakej:</span>
                            <span className="font-bold text-sm text-gray-900 text-right">{selectedService.name}</span>
                        </div>
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-gray-600 font-medium text-sm">Tarikh:</span>
                            <span className="font-bold text-sm text-gray-900">{selectedDate}</span>
                        </div>
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-gray-600 font-medium text-sm">Masa:</span>
                            <span className="font-bold text-sm text-gray-900">
                                {new Date(`2000-01-01 ${selectedSlot}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                            </span>
                        </div>
                        
                        {/* Garis Pemisah */}
                        <div className="border-t border-purple-200 my-4"></div>

                        {/* Total */}
                        <div className="flex justify-between items-center">
                            <span className="font-bold text-purple-900 text-lg">Total:</span>
                            <span className="font-extrabold text-2xl text-[#412986]">RM{selectedService.price}</span>
                        </div>
                    </div>

                    {/* 3. BUTTON PAYMENT (Paling Bawah) */}
                    <button 
                        onClick={handlePayment}
                        disabled={loading || !formData.name || !formData.phone}
                        className={`mt-6 w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all flex items-center justify-center gap-2
                            ${loading 
                                ? "bg-gray-400 cursor-not-allowed text-white" 
                                : "bg-[#412986] text-white hover:bg-[#301F63] hover:-translate-y-1"
                            }
                        `}
                    >
                        {loading ? (
                            "Sedang Memproses..." 
                        ) : (
                            <>
                                💳 Teruskan ke Pembayaran
                            </>
                        )}
                    </button>
                </div>
                </div>
            )}
        </div>
      </div>

      {/* --- FOOTER (INTEGRATED) --- */}
      <footer className="bg-gray-900 z-40 text-white py-10 text-center border-t border-gray-800 w-full">
        <div className="container mx-auto px-4">
          
          {/* TAJUK */}
          <h3 className="font-black text-xl md:text-2xl mb-4 tracking-widest text-white">
            STUDIO ABG 2026
          </h3>

          {/* ALAMAT (BOLEH KLIK) */}
          <div className="flex justify-center mb-6">
              <a 
                  href="https://www.google.com/maps/search/?api=1&query=60-2,+Jalan+Timur+6/2D,+Bandar+Baru+Enstek,+71760+Nilai,+Negeri+Sembilan"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex flex-col md:flex-row items-center gap-2 text-gray-400 hover:text-[#a78bfa] transition-colors duration-300"
              >
                  {/* Icon Location */}
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 group-hover:animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  
                  {/* Teks Alamat */}
                  <p className="text-sm md:text-base leading-relaxed max-w-xs md:max-w-none">
                      60-2, Jalan Timur 6/2D, Bandar Baru Enstek,<br className="md:hidden" /> 71760 Nilai, Negeri Sembilan
                  </p>
              </a>
          </div>

          {/* COPYRIGHT */}
          <p className="text-gray-600 text-xs tracking-wider">
            Hak Cipta Terpelihara © 2026 Al Bayan Global.
          </p>

        </div>
      </footer>

    </div>
  );
}

export default function BookingPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-[#412986] animate-pulse">Memuatkan Sistem Tempahan...</div>}>
            <BookingContent />
        </Suspense>
    );
}