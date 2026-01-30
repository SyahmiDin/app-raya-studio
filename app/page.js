"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation"; // Untuk redirect lepas login
import { supabase } from "@/lib/supabase";

export default function Home() {
  const [services, setServices] = useState([]);
  
  // State untuk Modal Login
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    async function fetchServices() {
      const { data } = await supabase.from('services').select('*').order('price');
      if (data) setServices(data);
    }
    fetchServices();
  }, []);

  // --- FUNCTION LOGIN ---
  const handleLogin = (e) => {
    e.preventDefault();
    
    // Check Password (Hardcode)
    // Tuan boleh tukar password di sini
    if (username === "admin" && password === "abg2026") {
      // 1. Simpan "token" dalam cookie browser supaya Admin page tahu kita dah login
      document.cookie = "admin_session=true; path=/; max-age=3600"; // Tahan 1 jam
      
      // 2. Tutup modal & Redirect ke admin
      setIsLoginOpen(false);
      router.push("/admin");
    } else {
      setError("Username atau Password salah!");
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col font-sans">
      
      {/* BACKGROUND */}
      <div className="absolute inset-0 z-0">
        <img src="/bg.jpeg" alt="Background Studio" className="w-full h-full object-cover"/>
        <div className="absolute inset-0 bg-black/70"></div>
      </div>

      {/* NAVBAR */}
      <nav className="relative z-40 w-full max-w-7xl mx-auto p-6 flex justify-between items-center text-white">
        <div className="text-xl font-bold tracking-widest uppercase">
          Studio ABG Raya 2026
        </div>
        
        {/* Butang ini sekarang BUKA MODAL, bukan link terus */}
        <button 
          onClick={() => setIsLoginOpen(true)} 
          className="bg-white/10 hover:bg-white/30 backdrop-blur-md border border-white/20 px-6 py-2 rounded-full text-sm font-semibold transition cursor-pointer"
        >
          Admin 🔒
        </button>
      </nav>

      {/* MAIN CONTENT */}
      <main className="relative z-10 flex-grow flex flex-col items-center justify-center text-center px-4 py-12">
        <h1 className="text-5xl md:text-7xl font-black text-white mb-4 drop-shadow-lg">
          MEMORI AIDILFITRI
        </h1>
        <p className="text-gray-200 text-lg md:text-xl max-w-2xl mb-12 drop-shadow-md">
          Gambar raya berkualiti studio profesional. Cepat, selesa, dan harga mampu milik.
        </p>

        {/* PAKEJ LIST */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full mb-12">
          {services.length === 0 ? (
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

        {/* BUTTON TEMPAH */}
        <Link 
          href="/booking" 
          className="group relative inline-flex items-center justify-center px-8 py-4 font-bold text-white transition-all duration-200 bg-blue-600 font-lg rounded-full hover:bg-blue-700 hover:scale-105 focus:outline-none ring-offset-2 focus:ring-2 shadow-2xl shadow-blue-500/50"
        >
          <span>TEMPAH SLOT SEKARANG</span>
        </Link>
      </main>


      {/* --- LOGIN MODAL POPUP --- */}
      {isLoginOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop Gelap */}
          <div 
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setIsLoginOpen(false)} // Klik luar untuk tutup
          ></div>

          {/* Kotak Login */}
          <div className="relative bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm transform transition-all scale-100">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Admin Access 🔐</h2>
            
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-900"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder=""
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input 
                  type="password" 
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-900"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder=""
                />
              </div>

              {error && <p className="text-red-500 text-sm text-center font-bold">{error}</p>}

              <button 
                type="submit" 
                className="w-full bg-black text-white font-bold py-3 rounded-lg hover:bg-gray-800 transition"
              >
                Log Masuk
              </button>
            </form>

            <button 
              onClick={() => setIsLoginOpen(false)}
              className="mt-4 w-full text-center text-gray-500 text-sm hover:text-gray-800"
            >
              Batal / Tutup
            </button>
          </div>
        </div>
      )}

    </div>
  );
}