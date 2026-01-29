"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function Home() {
  const [services, setServices] = useState([]);

  // Kita tarik data pakej supaya harga di depan sentiasa update dengan database
  useEffect(() => {
    async function fetchServices() {
      const { data } = await supabase.from('services').select('*').order('price');
      if (data) setServices(data);
    }
    fetchServices();
  }, []);

  return (
    <div className="relative min-h-screen flex flex-col font-sans">
      
      {/* --- 1. BACKGROUND IMAGE & OVERLAY --- */}
      {/* Gantikan src di bawah dengan gambar tuan dalam folder public, contoh: '/bg-raya.jpg' */}
      <div className="absolute inset-0 z-0">
        <img 
          src='/bg.jpeg' 
          alt="Background Studio" 
          className="w-full h-full object-cover"
        />
        {/* Layer Gelap supaya tulisan nampak (Opacity 70%) */}
        <div className="absolute inset-0 bg-black/75"></div>
      </div>

      {/* --- 2. NAVBAR (Butang Admin) --- */}
      {/* z-50 penting supaya butang ni duduk PALING ATAS dan boleh ditekan */}
      <nav className="relative z-50 w-full max-w-7xl mx-auto p-6 flex justify-between items-center text-white">
        <div className="text-xl font-bold tracking-widest uppercase">
          Studio ABG 2026
        </div>
        <Link 
          href="/admin" 
          className="bg-white/10 hover:bg-white/30 backdrop-blur-md border border-white/20 px-6 py-2 rounded-full text-sm font-semibold transition cursor-pointer"
        >
          Admin Login 🔒
        </Link>
      </nav>

      {/* --- 3. MAIN CONTENT --- */}
      <main className="relative z-10 flex-grow flex flex-col items-center justify-center text-center px-4 py-12">
        
        <h1 className="text-5xl md:text-7xl font-black text-white mb-4 drop-shadow-lg">
          MEMORI AIDILFITRI
        </h1>
        <p className="text-gray-200 text-lg md:text-xl max-w-2xl mb-12 drop-shadow-md">
          Gambar raya berkualiti studio profesional. Cepat, selesa, dan harga mampu milik.
        </p>

        {/* --- SENARAI PAKEJ (Display Only) --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full mb-12">
          {services.length === 0 ? (
             // Kalau loading, tunjuk kotak kosong sekejap
             [1,2,3].map((i) => <div key={i} className="bg-white/10 h-40 rounded-xl animate-pulse"></div>)
          ) : (
             services.map((service) => (
               <div key={service.id} className="bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-2xl text-white hover:bg-white/20 transition duration-300">
                 <h3 className="font-bold text-lg mb-1 text-blue-300">{service.name}</h3>
                 <div className="text-3xl font-bold mb-2">RM{service.price}</div>
                 <p className="text-sm text-gray-300">{service.description}</p>
                 <div className="mt-3 text-xs bg-black/30 inline-block px-3 py-1 rounded-full">
                    ⏱️ {service.duration_minutes} Minit
                 </div>
               </div>
             ))
          )}
        </div>

        {/* --- BIG ACTION BUTTON --- */}
        <Link 
          href="/booking" 
          className="group relative inline-flex items-center justify-center px-8 py-4 font-bold text-white transition-all duration-200 bg-blue-600 font-lg rounded-full hover:bg-blue-700 hover:scale-105 focus:outline-none ring-offset-2 focus:ring-2 shadow-2xl shadow-blue-500/50"
        >
          <span>TEMPAH SLOT SEKARANG</span>
          <svg className="w-5 h-5 ml-2 -mr-1 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path></svg>
        </Link>

        <p className="mt-6 text-gray-400 text-xs uppercase tracking-widest">
          Slot Terhad • Tempahan Online Sahaja
        </p>

      </main>
    </div>
  );
}