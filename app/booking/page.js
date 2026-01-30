"use client";
import { useState, useEffect, Suspense } from "react"; // Tambah Suspense
import { supabase } from "@/lib/supabase";
import { useSearchParams } from "next/navigation"; // Tambah useSearchParams

// KITA ASINGKAN CONTENT KE DALAM FUNCTION INI
function BookingContent() {
  const searchParams = useSearchParams();
  
  // State Sedia Ada
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

  // --- 1. CHECK URL BILA PAGE LOAD (AUTO FILL) ---
  useEffect(() => {
    const refCode = searchParams.get("ref"); // Ambil ?ref=... dari URL
    
    if (refCode) {
        setPromoCode(refCode); // Masukkan dalam input
        handleCheckCode(refCode); // Terus check valid ke tak
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
      const sessions = [{ name: "Pagi", start: "10:00", end: "12:30" }, { name: "Petang", start: "14:00", end: "17:30" }, { name: "Malam", start: "20:00", end: "22:30" }];
      
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
  // Kita ubah sikit supaya boleh terima 'codeToCheck' (pilihan)
  const handleCheckCode = async (codeToCheck = null) => {
    // Kalau function dipanggil tanpa parameter (dari butang), guna state promoCode
    // Kalau dipanggil dari URL (auto), guna codeToCheck
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

  if (loading && services.length === 0) return <div className="text-center p-10">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-black text-white p-6 text-center"><h1 className="text-3xl font-bold">Tempah Studio Raya</h1></div>
        
        <div className="p-6 md:p-10 space-y-8">
            <div><h3 className="font-bold border-b text-gray-900 pb-2 mb-4">1. Pilih Pakej</h3><div className="grid md:grid-cols-3 gap-4 text-gray-900">{services.map(s => (<div key={s.id} onClick={()=>{setSelectedService(s);setSelectedSlot(null);}} className={`cursor-pointer border-2 p-4 rounded-xl ${selectedService?.id===s.id?'border-blue-600 bg-blue-50':'border-gray-200'}`}><h4>{s.name}</h4><div className="text-2xl font-black text-blue-600 my-2">RM{s.price}</div><p className="text-xs text-gray-500">{s.duration_minutes} Minit</p></div>))}</div></div>
            <div><h3 className="font-bold border-b pb-2 mb-4 text-gray-900">2. Pilih Tarikh</h3><input type="date" value={selectedDate} min={new Date().toISOString().split('T')[0]} onChange={e=>setSelectedDate(e.target.value)} className="w-full md:w-1/2 p-3 border rounded-lg"/></div>
            {selectedDate && <div><h3 className="font-bold border-b pb-2 mb-4 text-gray-900">3. Pilih Masa</h3><div className="grid grid-cols-4 gap-2 text-gray-900">{slotList.map((s,i)=>(<button key={i} disabled={s.booked} onClick={()=>setSelectedSlot(s.time)} className={`p-2 text-sm rounded border ${s.booked?'opacity-50 line-through bg-gray-100':selectedSlot===s.time?'bg-black text-white':'bg-white hover:bg-gray-100'}`}>{formatTimeDisplay(s.time)}</button>))}</div></div>}

            {selectedSlot && (
                <div className="bg-gray-50 p-6 rounded-xl border animate-fade-in-up">
                    <h3 className="font-bold text-gray-800 mb-4 text-lg">4. Butiran & Pembayaran</h3>
                    
                    <div className="mb-6 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Kod Referral Staff (Jika Ada)</label>
                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                value={promoCode}
                                onChange={(e) => setPromoCode(e.target.value)}
                                placeholder="Contoh: STAFF01"
                                className="flex-1 p-2 border border-gray-300 rounded uppercase"
                            />
                            {/* Butang check biasa */}
                            <button onClick={() => handleCheckCode()} type="button" className="bg-gray-800 text-white px-4 rounded font-bold text-sm hover:bg-gray-700">Check</button>
                        </div>
                        {promoMessage && <p className={`text-xs mt-1 font-bold ${validReferral ? 'text-green-600' : 'text-red-500'}`}>{promoMessage}</p>}
                    </div>

                    <form onSubmit={handleCheckout} className="space-y-4">
                        <div className="grid md:grid-cols-2 gap-4">
                            <input type="text" placeholder="Nama Penuh" required className="p-3 border rounded-lg w-full" onChange={e=>setFormData({...formData,name:e.target.value})}/>
                            <input type="tel" placeholder="No. WhatsApp" required className="p-3 border rounded-lg w-full" onChange={e=>setFormData({...formData,phone:e.target.value})}/>
                        </div>
                        <input type="email" placeholder="Email" required className="p-3 border rounded-lg w-full" onChange={e=>setFormData({...formData,email:e.target.value})}/>

                        <div className="pt-4">
                            <button type="submit" disabled={isProcessing} className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-blue-700 transition flex justify-between px-6 items-center disabled:opacity-50">
                                <span>BAYAR SEKARANG 🔒</span>
                                <span className="text-xl">RM{selectedService.price}</span>
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
      </div>
    </div>
  );
}

// COMPONENT UTAMA (WRAPPER)
export default function BookingPage() {
    return (
        <Suspense fallback={<div className="text-center p-20">Loading Booking System...</div>}>
            <BookingContent />
        </Suspense>
    );
}