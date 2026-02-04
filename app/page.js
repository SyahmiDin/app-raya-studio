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
        <img src="/bg.jpeg" alt="Background Studio" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/70"></div>
      </div>

      {/* NAVBAR */}
      <nav className="relative z-40 w-full max-w-7xl mx-auto p-6 flex justify-between items-center text-white">
        <div className="text-xl font-bold tracking-widest uppercase"> 
          Studio ABG Raya 2026
        </div>


      </nav>

      {/* MAIN CONTENT */}
      <main className="relative z-10 flex-grow flex flex-col items-center justify-center text-center px-4 py-12">
        <h1 className="text-5xl md:text-7xl font-black text-white mb-4 drop-shadow-lg">
          MEMORI AIDILFITRI
        </h1>
        <p className="text-gray-200 text-lg md:text-xl max-w-2xl mb-12 drop-shadow-md">
          Gambar raya berkualiti studio profesional. Cepat, selesa, dan harga mampu milik.
        </p>

      <style>{`
        @keyframes customFadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-custom-fade {
          opacity: 0; /* Mula-mula ghaib */
          animation: customFadeIn 0.8s ease-out forwards;
        }
      `}</style>

      {/* PAKEJ LIST */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full mb-12">
        {services.length === 0 ? (
          /* Loading State */
          [1, 2, 3].map((i) => <div key={i} className="bg-white/10 h-40 rounded-xl animate-pulse"></div>)
        ) : (
          /* Data Loaded */
          services.map((service, index) => (
            <div 
              key={service.id} 
              className="animate-custom-fade bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-2xl text-white hover:bg-white/20 transition duration-300 hover:scale-102"
              style={{ 
                animationDelay: `${index * 200}ms` // Delay berbeza ikut urutan (0ms, 200ms, 400ms...)
              }}
            >
              <h3 className="font-extrabold text-lg mb-1 text-gray-200">{service.name}</h3>
              <div className="text-3xl font-bold mb-2">RM{service.price}</div>
              <p className="text-sm text-gray-300">{service.description}</p>
              <div className="mt-3 text-xs bg-black/30 inline-block px-3 py-1 rounded-full">
                ⏱️ {service.duration_minutes} Minit
              </div>
            </div>
          ))
        )}
      </div>

        {/* --- CONTAINER BUTTON (DIV BARU) --- */}
        <div className="flex flex-col md:flex-row gap-6 mt-8 justify-center items-center w-full animate-fade-in-up delay-200">
            
            {/* Button 1: Booking */}
            <Link 
              href="/booking" 
              className="group relative inline-flex items-center justify-center px-8 py-4 font-bold text-white transition-all duration-200 bg-[#412986] font-lg rounded-full hover:bg-[#301F63] hover:scale-105 focus:outline-none ring-offset-2 focus:ring-2 shadow-2xl shadow-purple-500/50 w-full md:w-auto animate-custom-fade"
            >
              <span>TEMPAH SLOT SEKARANG</span>
            </Link>

            {/* Button 2: Availability */}
            <Link 
              href="/availability" 
              className="group relative inline-flex items-center justify-center px-8 py-4 font-bold text-white transition-all duration-200 bg-transparent border-2 border-[#412986] font-lg rounded-full hover:bg-[#301F63] hover:border-[#301F63] hover:scale-105 focus:outline-none shadow-2xl shadow-purple-500/20 w-full md:w-auto animate-custom-fade"
            >
              <span>LIHAT KEKOSONGAN</span>
            </Link>

        </div>
      </main>

      {/* --- FOOTER --- */}
      <footer className="bg-gray-900 z-40 text-white py-5 text-center border-t border-gray-800">
        <h3 className="font-black text-xl mb-2 tracking-widest">STUDIO ABG 2026</h3>
        <p className="text-gray-700 text-xs">
          Hak Cipta Terpelihara © 2026 Al Bayan Global.
        </p>
      </footer>

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