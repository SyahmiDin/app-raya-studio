"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function Home() {
  const [services, setServices] = useState([]);

  // State untuk Modal Login (Kekal)
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
    if (username === "admin" && password === "abg2026") {
      document.cookie = "admin_session=true; path=/; max-age=3600"; 
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
            opacity: 0; 
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
            services.map((service, index) => {
              
              // Logic Kiraan Harga Asal (Display Sahaja)
              const originalPrice = Math.ceil(service.price / 0.9);

              return (
                <div 
                  key={service.id} 
                  className="animate-custom-fade flex flex-col justify-between bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-2xl text-white hover:bg-white/20 transition duration-300 relative overflow-hidden shadow-xl"
                  style={{ animationDelay: `${index * 200}ms` }}
                >
                  {/* Badge Early Bird */}
                  <div className="absolute top-0 right-0 bg-[#412986] text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg uppercase tracking-wider shadow-md">
                    Early Bird
                  </div>

                  <div>
                    <h3 className="font-extrabold text-xl mb-2 text-gray-100 tracking-wide">{service.name}</h3>
                    
                    {/* --- HARGA SECTION --- */}
                    <div className="flex flex-col mb-4 bg-black/20 p-3 rounded-lg border border-white/5">
                        <div className="flex items-center gap-2 justify-center">
                            <span className="text-gray-400 line-through text-sm decoration-red-500/70 decoration-2">
                                RM{originalPrice}
                            </span>
                            <span className="bg-[#412986] text-white text-[10px] font-bold px-1.5 rounded">
                                -10% OFF
                            </span>
                        </div>
                        <div className="text-4xl font-black text-white drop-shadow-sm mt-1">
                            RM{service.price}
                        </div>
                    </div>

                    <p className="text-sm text-gray-200 mb-4 leading-relaxed opacity-90">{service.description}</p>
                    
                    <div className="flex justify-center mb-6">
                        <div className="text-xs bg-white/10 border border-white/20 inline-flex items-center gap-1 px-3 py-1 rounded-full text-gray-200 font-medium">
                            ⏱️ {service.duration_minutes} Minit Sesi
                        </div>
                    </div>
                  </div>

                  {/* --- BUTTON KHAS PADA SETIAP CARD --- */}
                  {/* Kita hantar ID pakej guna query param (?package=ID) */}
                  <Link 
                    href={`/booking?package=${service.id}`}
                    className="w-full py-3 rounded-xl bg-[#412986]/40 text-white font-bold border-4 border-[#301F63] hover:bg-[#301F63] hover:scale-105 transition transform shadow-lg flex items-center justify-center gap-2 group"
                  >
                    <span>TEMPAH SEKARANG</span>
                    <span className="group-hover:translate-x-1 transition-transform">➜</span>
                  </Link>

                </div>
              );
            })
          )}
        </div>

        {/* Promo Text */}
        <div className="max-w-6xl bg-black/50 p-4 rounded-xl mb-4 animate-fade-in-up delay-100 border border-white/10">
          <p className="text-white text-lg md:text-xl max-w-2xl drop-shadow-md italic animate-pulse">
            Harga promo 'Early Bird' terhad sehingga 20 Februari 2026 11.59 malam sahaja!
          </p>
        </div>

      </main>

      {/* --- FOOTER --- */}
      <footer className="bg-gray-900 z-40 text-white py-6 text-center border-t border-gray-800">
        <h3 className="font-black text-xl mb-2 tracking-widest">STUDIO ABG 2026</h3>
        <p className="text-gray-500 text-xs">
          Hak Cipta Terpelihara © 2026 Al Bayan Global.
        </p>
      </footer>

      {/* --- LOGIN MODAL (Tidak Berubah) --- */}
      {isLoginOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsLoginOpen(false)}></div>
          <div className="relative bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm transform transition-all scale-100">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Admin Access 🔐</h2>
            <form onSubmit={handleLogin} className="space-y-4">
              <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" />
              <input type="password" className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" />
              {error && <p className="text-red-500 text-sm text-center font-bold">{error}</p>}
              <button type="submit" className="w-full bg-black text-white font-bold py-3 rounded-lg hover:bg-gray-800 transition">Log Masuk</button>
            </form>
            <button onClick={() => setIsLoginOpen(false)} className="mt-4 w-full text-center text-gray-500 text-sm hover:text-gray-800">Batal / Tutup</button>
          </div>
        </div>
      )}
    </div>
  );
}