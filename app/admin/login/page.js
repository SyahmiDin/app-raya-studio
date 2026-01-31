"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = (e) => {
    e.preventDefault();

    // --- TETAPKAN PASSWORD ADMIN DI SINI ---
    // Tuan boleh tukar "admin" dan "raya2026" ikut suka
    const ADMIN_USER = "admin";
    const ADMIN_PASS = "abg2026"; 

    if (username === ADMIN_USER && password === ADMIN_PASS) {
      // Kalau betul, simpan "kunci" dalam browser
      localStorage.setItem("studioRayaAdmin", "true");
      // Redirect masuk ke dashboard
      router.push("/admin");
    } else {
      setError("Username atau Password salah!");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-xl shadow-lg max-w-sm w-full border border-gray-200">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Admin Login 🔒</h1>
          <p className="text-gray-500 text-sm">Sila log masuk untuk akses.</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Username</label>
            <input 
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-black outline-none"
              placeholder="Masukkan username"
            />
          </div>
          
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-black outline-none"
              placeholder="Masukkan password"
            />
          </div>

          {error && <p className="text-red-500 text-xs font-bold text-center">{error}</p>}

          <button 
            type="submit" 
            className="w-full bg-black text-white font-bold py-3 rounded-lg hover:bg-gray-800 transition"
          >
            MASUK
          </button>
        </form>

        <div className="mt-6 text-center">
            <a href="/" className="text-xs text-gray-400 hover:text-gray-600">← Kembali ke Home</a>
        </div>
      </div>
    </div>
  );
}