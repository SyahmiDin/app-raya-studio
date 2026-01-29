// app/booking/page.js
"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function BookingPage() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Selection
  const [selectedService, setSelectedService] = useState(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState(null);
  
  // Client Form (BARU)
  const [clientData, setClientData] = useState({ name: "", email: "", phone: "" });
  const [isProcessing, setIsProcessing] = useState(false); // Loading masa tekan bayar

  // Logic
  const [availableSlots, setAvailableSlots] = useState([]);
  const [checkingSlots, setCheckingSlots] = useState(false);

  // 1. Fetch Pakej
  useEffect(() => {
    async function fetchServices() {
      const { data } = await supabase.from('services').select('*').order('price');
      if (data) setServices(data);
      setLoading(false);
    }
    fetchServices();
  }, []);

  // 2. Generate Slot Masa
  useEffect(() => {
    if (!selectedService || !selectedDate) return;

    async function generateSlots() {
      setCheckingSlots(true);
      setAvailableSlots([]);
      setSelectedTime(null);

      const { data: existingBookings } = await supabase
        .from('bookings')
        .select('start_time')
        .eq('booking_date', selectedDate);

      const takenTimes = existingBookings?.map(b => b.start_time.slice(0, 5)) || [];

      let slots = [];
      let currentTime = 9 * 60; // 9:00 AM
      const endTime = 18 * 60;  // 6:00 PM

      while (currentTime + selectedService.duration_minutes <= endTime) {
        const hours = Math.floor(currentTime / 60);
        const mins = currentTime % 60;
        const timeString = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
        const isTaken = takenTimes.includes(timeString);
        slots.push({ time: timeString, available: !isTaken });
        currentTime += selectedService.duration_minutes;
      }
      setAvailableSlots(slots);
      setCheckingSlots(false);
    }
    generateSlots();
  }, [selectedDate, selectedService]);

  // --- FUNCTION BAYAR (BARU) 🚀 ---
  async function handlePayment() {
    if (!clientData.name || !clientData.email || !clientData.phone) {
        alert("Sila isi maklumat diri anda lengkap.");
        return;
    }

    setIsProcessing(true);

    try {
        // Panggil API Stripe yang kita baru buat
        const res = await fetch("/api/checkout", {
            method: "POST",
            body: JSON.stringify({
                service: selectedService,
                date: selectedDate,
                time: selectedTime,
                client: clientData
            })
        });

        const data = await res.json();

        if (data.url) {
            // Redirect user ke page Stripe
            window.location.href = data.url;
        } else {
            alert("Gagal sambung ke bank.");
            setIsProcessing(false);
        }

    } catch (err) {
        console.error(err);
        alert("Ada masalah teknikal.");
        setIsProcessing(false);
    }
  }

  // UI Components
  const resetSelection = () => {
    setSelectedService(null);
    setSelectedDate("");
    setSelectedTime(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-extrabold text-gray-900">Tempah Studio Raya</h1>
          {selectedService && (
             <button onClick={resetSelection} className="text-sm text-blue-600 hover:underline mt-2">← Tukar Pakej</button>
          )}
        </div>

        {!selectedService ? (
           loading ? <div className="text-center animate-pulse">Loading...</div> : (
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               {services.map((service) => (
                 <div key={service.id} className="bg-white rounded-2xl shadow border p-6 hover:shadow-lg transition">
                   <h3 className="font-bold text-gray-900 text-xl">{service.name}</h3>
                   <p className="text-3xl font-black text-blue-600 my-2">RM{service.price}</p>
                   <p className="text-sm text-gray-500 mb-4">{service.duration_minutes} Minit Sesi</p>
                   <button onClick={() => setSelectedService(service)} className="w-full bg-black text-white py-3 rounded-lg font-bold">Pilih</button>
                 </div>
               ))}
             </div>
           )
        ) : (
          <div className="bg-white rounded-2xl shadow-xl border overflow-hidden flex flex-col md:flex-row">
             {/* KIRI: Info */}
             <div className="bg-gray-900 text-white p-8 md:w-1/3 flex flex-col justify-between">
                <div>
                    <h3 className="text-gray-400 text-xs uppercase tracking-widest mb-2">Pakej Pilihan</h3>
                    <h2 className="text-2xl font-bold mb-4">{selectedService.name}</h2>
                    <div className="space-y-4 text-sm text-gray-300">
                        <p>💰 Harga: <span className="text-white font-bold">RM{selectedService.price}</span></p>
                        <p>⏱️ Durasi: <span className="text-white font-bold">{selectedService.duration_minutes} Minit</span></p>
                    </div>
                </div>
                {selectedDate && selectedTime && (
                    <div className="mt-8 pt-8 border-t border-gray-700">
                        <p className="text-xs text-gray-500">Slot Pilihan:</p>
                        <p className="text-xl font-bold">{selectedDate}</p>
                        <p className="text-2xl font-bold text-green-400">{selectedTime}</p>
                    </div>
                )}
             </div>

             {/* KANAN: Form */}
             <div className="p-8 md:w-2/3">
                <div className="mb-8">
                    <label className="block text-sm font-bold text-gray-700 mb-2">Pilih Tarikh</label>
                    <input 
                      type="date" 
                      min={new Date().toISOString().split("T")[0]}
                      className="w-full p-4 border rounded-xl text-lg font-bold outline-none focus:ring-2 focus:ring-blue-500"
                      onChange={(e) => setSelectedDate(e.target.value)}
                    />
                </div>

                {selectedDate && (
                    <div className="mb-8">
                        <label className="block text-sm font-bold text-gray-700 mb-3">Pilih Masa Kosong</label>
                        {checkingSlots ? (
                            <div className="text-gray-500 animate-pulse">Semak kekosongan...</div>
                        ) : (
                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                                {availableSlots.map((slot, i) => (
                                    <button
                                        key={i}
                                        disabled={!slot.available}
                                        onClick={() => setSelectedTime(slot.time)}
                                        className={`py-3 rounded-lg font-bold text-sm transition ${
                                            !slot.available ? "bg-gray-100 text-gray-300 cursor-not-allowed" : 
                                            selectedTime === slot.time ? "bg-blue-600 text-white shadow-lg transform scale-105" : "bg-white border hover:border-black text-gray-800"
                                        }`}
                                    >
                                        {slot.time}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* FORM MAKLUMAT DIRI (BARU) */}
                {selectedTime && (
                    <div className="animate-fade-in-up border-t pt-8 mt-8">
                        <h3 className="font-bold text-gray-800 text-lg mb-4">Maklumat Anda</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-gray-500">Nama Penuh</label>
                                <input 
                                    type="text" 
                                    className="w-full p-3 border rounded-lg" 
                                    placeholder="Cth: Ali bin Abu"
                                    value={clientData.name}
                                    onChange={(e) => setClientData({...clientData, name: e.target.value})}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-500">Email</label>
                                    <input 
                                        type="email" 
                                        className="w-full p-3 border rounded-lg" 
                                        placeholder="ali@gmail.com"
                                        value={clientData.email}
                                        onChange={(e) => setClientData({...clientData, email: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500">No. Telefon</label>
                                    <input 
                                        type="tel" 
                                        className="w-full p-3 border rounded-lg" 
                                        placeholder="012-3456789"
                                        value={clientData.phone}
                                        onChange={(e) => setClientData({...clientData, phone: e.target.value})}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* BUTANG BAYAR */}
                        <div className="mt-8 text-right">
                            <button 
                                onClick={handlePayment}
                                disabled={isProcessing}
                                className="w-full sm:w-auto bg-green-500 hover:bg-green-600 text-white px-8 py-4 rounded-xl font-bold text-lg disabled:opacity-50 shadow-lg transition transform active:scale-95 flex items-center justify-center gap-2"
                            >
                                {isProcessing ? "Sedang Proses..." : `Bayar RM${selectedService.price} →`}
                            </button>
                            <p className="text-xs text-gray-400 mt-2 text-center sm:text-right">Pembayaran selamat melalui Stripe 🔒</p>
                        </div>
                    </div>
                )}

             </div>
          </div>
        )}
      </div>
    </div>
  );
}