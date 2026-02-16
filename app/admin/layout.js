"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

export default function AdminLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname(); // Untuk tahu kita kat page mana
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    // 1. Cek: Adakah user dah ada kunci?
    const isAdmin = localStorage.getItem("studioRayaAdmin");

    // 2. Kalau kita dah memang kat page login, jangan tendang (elak infinite loop)
    if (pathname === "/admin/login") {
        setAuthorized(true);
        return;
    }

    // 3. Kalau TIADA kunci, tendang ke page Login
    if (!isAdmin) {
        router.push("/admin/login");
    } else {
        // 4. Kalau ADA kunci, benarkan masuk
        setAuthorized(true);
    }
  }, [pathname, router]);

  // Kalau belum authorized, tunjuk loading kosong (jangan tunjuk content rahsia)
  if (!authorized) {
      return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading Admin...</div>;
  }

  // Kalau dah authorized, baru tunjuk content
  return (
    <div className="min-h-screen bg-gray-50">
       {/* Butang Logout Kecil (Hanya muncul jika bukan di page login) */}
       {pathname !== "/admin/login" && (
           <div className="fixed bottom-4 right-4 z-50">
               <button 
                onClick={() => {
                    localStorage.removeItem("studioRayaAdmin"); // Buang kunci
                    router.push("/admin/login"); // Tendang keluar
                }}
                className="bg-red-600 text-white px-4 py-2 rounded-full shadow-lg font-bold text-xs hover:bg-red-700 hover:cursor-pointer transition"
               >
                   Log Keluar
               </button>
           </div>
       )}
       
       {children}
    </div>
  );
}