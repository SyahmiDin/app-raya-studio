"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { loadStripe } from "@stripe/stripe-js";

// Load Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

export default function BookingPage() {
  // --- STATE ---
  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [slotList, setSlotList] = useState([]); // Nama variable baru supaya jelas
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Form Details
  const [formData, setFormData] = useState({ name: "", email: "", phone: "" });
  const [isProcessing, setIsProcessing] = useState(false);

  // --- 1. FETCH SERVICES ---
  useEffect(() => {
    async function fetchServices() {
      const { data } = await supabase.from('services').select('*').order('price');
      if (data) {
        setServices(data);
        if (data.length > 0) setSelectedService(data[0]); 
      }
      setLoading(false);
    }
    fetchServices();
  }, []);

  // --- 2. GENERATE TIME SLOTS (SHOW BOOKED AS DISABLED) 🕒 ---
  useEffect(() => {
    if (!selectedService || !selectedDate) return;

    async function checkAvailability() {
      setLoading(true);
      // Reset pilihan slot bila tukar tarikh/pakej
      setSelectedSlot(null);

      // A. Setup Sesi Waktu
      const sessions = [
        { name: "Pagi", start: "10:00", end: "12:30" },
        { name: "Petang", start: "14:00", end: "17:30" },
        { name: "Malam", start: "20:00", end: "22:30" }
      ];

      // B. Ambil booking sedia ada (Status: Paid)
      const { data: existingBookings } = await supabase
        .from('bookings')
        .select('start_time')
        .eq('booking_date', selectedDate)
        .eq('status', 'paid');

      const bookedTimes = existingBookings?.map(b => b.start_time.slice(0, 5)) || [];

      // C. Tentukan Tempoh Sistem (System Duration + Buffer)
      // Small/Medium (15m) -> +5m = 20m
      // Large (25m) -> +5m = 30m
      let systemDuration = selectedService.duration_minutes + 5;

      // D. Generate Slot
      let slots = [];

      sessions.forEach(session => {
        let currentTime = new Date(`${selectedDate}T${session.start}:00`);
        const endTime = new Date(`${selectedDate}T${session.end}:00`);

        while (currentTime.getTime() + systemDuration * 60000 <= endTime.getTime()) {
            
            const timeString = currentTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
            
            // LOGIK BARU: 
            // Kita tak skip, tapi kita tanda status dia
            const isBooked = bookedTimes.includes(timeString);

            slots.push({
                time: timeString,
                booked: isBooked // True kalau dah ada orang
            });

            // Lompat ke slot seterusnya
            currentTime = new Date(currentTime.getTime() + systemDuration * 60000);
        }
      });

      setSlotList(slots);
      setLoading(false);
    }

    checkAvailability();
  }, [selectedDate, selectedService]);


  // --- 3. HANDLE PAYMENT ---
  const handleCheckout = async (e) => {
    e.preventDefault();
    if (!selectedSlot || !formData.name || !formData.phone) {
        alert("Sila lengkapkan semua maklumat.");
        return;
    }
    setIsProcessing(true);

    try {
        const response = await fetch("/api/checkout", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                service: selectedService,
                date: selectedDate,
                time: selectedSlot, // selectedSlot cuma pegang string masa (cth: "10:00")
                client: formData
            }),
        });

        const { id } = await response.json();
        const stripe = await stripePromise;
        await stripe.redirectToCheckout({ sessionId: id });

    } catch (err) {
        console.error("Payment Error:", err);
        alert("Gagal memproses pembayaran. Sila cuba lagi.");
        setIsProcessing(false);
    }
  };

  const formatTimeDisplay = (time24) => {
    const [hour, min] = time24.split(':');
    const h = parseInt(hour);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${min} ${ampm}`;
  };

  if (loading && services.length === 0) return <div className="text-center p-10">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">
        
        {/* Header */}
        <div className="bg-black text-white p-6 text-center">
            <h1 className="text-3xl font-bold">Tempah Studio Raya</h1>
            <p className="text-gray-400">Pilih pakej dan slot masa anda</p>
        </div>

        <div className="p-6 md:p-10">
            
            {/* STEP 1: PILIH PAKEJ */}
            <h3 className="font-bold text-gray-800 mb-4 text-lg border-b pb-2">1. Pilih Pakej</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                {services.map(service => (
                    <div 
                        key={service.id}
                        onClick={() => { setSelectedService(service); setSelectedSlot(null); }}
                        className={`cursor-pointer border-2 rounded-xl p-4 transition hover:shadow-md ${selectedService?.id === service.id ? 'border-blue-600 bg-blue-50' : 'border-gray-200'}`}
                    >
                        <h4 className="font-bold text-gray-800">{service.name}</h4>
                        <div className="text-2xl font-black text-blue-600 my-2">RM{service.price}</div>
                        <p className="text-xs text-gray-500">⏱️ {service.duration_minutes} Minit</p>
                        <p className="text-xs text-gray-500 mt-1">{service.description}</p>
                    </div>
                ))}
            </div>

            {/* STEP 2: PILIH TARIKH */}
            <h3 className="font-bold text-gray-800 mb-4 text-lg border-b pb-2">2. Pilih Tarikh</h3>
            <div className="mb-8">
                <input 
                    type="date" 
                    value={selectedDate}
                    min={new Date().toISOString().split('T')[0]} 
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full md:w-1/2 p-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-black"
                />
            </div>

            {/* STEP 3: PILIH MASA */}
            {selectedDate && (
                <div className="mb-8 animate-fade-in">
                    <h3 className="font-bold text-gray-800 mb-4 text-lg border-b pb-2">3. Pilih Masa</h3>
                    
                    {loading ? (
                        <div className="text-gray-500 animate-pulse">Sedang semak kekosongan... ⏳</div>
                    ) : (
                        <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                            {slotList.map((slotObj, index) => (
                                <button
                                    key={index}
                                    disabled={slotObj.booked} // Matikan butang kalau booked
                                    onClick={() => setSelectedSlot(slotObj.time)}
                                    className={`
                                        py-2 px-1 rounded-lg text-sm font-bold transition border
                                        ${slotObj.booked 
                                            ? 'bg-gray-100 text-gray-300 border-gray-100 cursor-not-allowed line-through' // Style kalau Booked (Pudar)
                                            : selectedSlot === slotObj.time 
                                                ? 'bg-black text-white border-black shadow-lg transform scale-105' // Style kalau Selected
                                                : 'bg-white text-gray-700 border-gray-200 hover:border-black hover:bg-gray-50' // Style kalau Available
                                        }
                                    `}
                                >
                                    {formatTimeDisplay(slotObj.time)}
                                </button>
                            ))}
                        </div>
                    )}
                    {slotList.length === 0 && !loading && (
                        <div className="text-red-500 text-sm mt-2">Tiada slot langsung (Mungkin hari cuti).</div>
                    )}
                </div>
            )}

            {/* STEP 4: BUTIRAN */}
            {selectedSlot && (
                <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 animate-fade-in-up">
                    <h3 className="font-bold text-gray-800 mb-4 text-lg">4. Butiran Anda</h3>
                    <form onSubmit={handleCheckout} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nama Penuh</label>
                                <input type="text" required className="w-full p-3 border rounded-lg" onChange={e => setFormData({...formData, name: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">No. WhatsApp</label>
                                <input type="tel" required className="w-full p-3 border rounded-lg" onChange={e => setFormData({...formData, phone: e.target.value})} />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email</label>
                            <input type="email" required className="w-full p-3 border rounded-lg" onChange={e => setFormData({...formData, email: e.target.value})} />
                        </div>

                        <div className="pt-4">
                            <button 
                                type="submit" 
                                disabled={isProcessing}
                                className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-blue-700 transition disabled:opacity-50"
                            >
                                {isProcessing ? 'Sedang Proses...' : `BAYAR RM${selectedService.price} & CONFIRM 🔒`}
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