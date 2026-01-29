import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col">
      
      {/* --- 1. NAVBAR (Header) --- */}
      <header className="w-full max-w-7xl mx-auto p-6 flex justify-between items-center">
        {/* Kiri: Logo / Nama Studio */}
        <div className="text-2xl font-black tracking-tighter">
          STUDIO RAYA 📸
        </div>

        {/* Kanan: Butang Login Admin */}
        <Link 
          href="/admin" 
          className="text-sm font-bold border border-gray-200 px-5 py-2 rounded-full hover:bg-black hover:text-white transition duration-300"
        >
          Admin Login 🔒
        </Link>
      </header>

      {/* --- 2. HERO SECTION (Isi Tengah) --- */}
      <main className="flex-grow flex flex-col items-center justify-center px-4 text-center mt-[-80px]"> 
        {/* mt-[-80px] tu supaya dia naik atas sikit, balance secara visual */}

        <span className="text-blue-600 font-bold tracking-widest uppercase text-xs mb-4">
          Tempahan Raya 2026 Kini Dibuka
        </span>

        <h1 className="text-5xl md:text-7xl font-extrabold mb-6 leading-tight max-w-4xl">
          Abadikan Kenangan <br/> 
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
            Aidilfitri Anda
          </span>
        </h1>

        <p className="text-lg md:text-xl text-gray-500 max-w-2xl mb-10 leading-relaxed">
          Slot terhad! Dapatkan gambar raya kualiti studio profesional bersama keluarga tersayang. Siap pantas, harga berbaloi.
        </p>

        {/* Butang ke Booking Page */}
        <div className="flex gap-4 flex-col sm:flex-row">
            <Link 
              href="/booking" 
              className="bg-black text-white px-10 py-5 rounded-full text-xl font-bold shadow-xl hover:scale-105 hover:shadow-2xl transition transform duration-300 flex items-center justify-center gap-2"
            >
              Tempah Slot Sekarang 🗓️
            </Link>
            
            {/* Butang Extra (Optional - contoh ke Gallery) */}
            <Link 
              href="/gallery" 
              className="bg-white text-black border border-gray-200 px-10 py-5 rounded-full text-xl font-bold hover:bg-gray-50 transition"
            >
              Lihat Galeri
            </Link>
        </div>

        {/* Social Proof (Hiasan Bawah) */}
        <div className="mt-16 flex items-center gap-4 text-gray-400 text-sm">
            <span>⭐️ 5.0 Rating</span>
            <span>•</span>
            <span>100+ Keluarga Berpuas Hati</span>
        </div>

      </main>

      {/* --- FOOTER --- */}
      <footer className="p-6 text-center text-gray-400 text-xs">
        &copy; 2026 Studio Raya. All rights reserved.
      </footer>

    </div>
  );
}