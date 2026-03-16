"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function SalesReportPage() {
  const [loading, setLoading] = useState(true);
  const [salesData, setSalesData] = useState([]);
  
  // KPI States
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalDeals, setTotalDeals] = useState(0);
  const [averageValue, setAverageValue] = useState(0);
  
  // Breakdown States
  const [packageStats, setPackageStats] = useState([]);
  const [monthlyStats, setMonthlyStats] = useState([]);

  useEffect(() => {
    fetchSalesData();
  }, []);

  async function fetchSalesData() {
    setLoading(true);

    // Ambil semua booking yang DAH DIBAYAR beserta nama pakej
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        booking_date,
        final_price,
        client_name,
        services ( name )
      `)
      .eq('status', 'paid');

    if (error) {
      console.error("Error fetching sales:", error);
      setLoading(false);
      return;
    }

    // Tapis buang "ADMIN BLOCK"
    const validSales = (data || []).filter(b => !b.client_name?.toUpperCase().includes('ADMIN BLOCK'));

    // 1. KIRA KPI UTAMA
    const revenue = validSales.reduce((sum, b) => sum + (b.final_price || 0), 0);
    const deals = validSales.length;
    const avg = deals > 0 ? revenue / deals : 0;

    setTotalRevenue(revenue);
    setTotalDeals(deals);
    setAverageValue(avg);

    // 2. KIRA JUALAN MENGIKUT PAKEJ
    const pkgMap = {};
    validSales.forEach(b => {
      const pkgName = b.services?.name || "Pakej Dipadam";
      if (!pkgMap[pkgName]) pkgMap[pkgName] = { count: 0, revenue: 0 };
      pkgMap[pkgName].count += 1;
      pkgMap[pkgName].revenue += (b.final_price || 0);
    });
    // Susun dari jualan tertinggi ke terendah
    const pkgArray = Object.entries(pkgMap)
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.revenue - a.revenue);
    setPackageStats(pkgArray);

    // 3. KIRA JUALAN MENGIKUT BULAN
    const monthMap = {};
    validSales.forEach(b => {
      if (!b.booking_date) return;
      const dateObj = new Date(b.booking_date);
      // Dapatkan format bulan: "Mac 2026"
      const monthYear = dateObj.toLocaleDateString('ms-MY', { month: 'long', year: 'numeric' });
      
      if (!monthMap[monthYear]) monthMap[monthYear] = { count: 0, revenue: 0, rawDate: dateObj };
      monthMap[monthYear].count += 1;
      monthMap[monthYear].revenue += (b.final_price || 0);
    });
    // Susun dari bulan terkini
    const monthArray = Object.entries(monthMap)
      .map(([month, stats]) => ({ month, ...stats }))
      .sort((a, b) => b.rawDate - a.rawDate);
    setMonthlyStats(monthArray);

    setSalesData(validSales);
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-12">
      
      {/* --- HEADER SECTION --- */}
      <div className="bg-[#412986] pb-24 pt-10 px-6 shadow-xl">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-white text-center md:text-left">
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Laporan Jualan 📈</h1>
                <p className="text-indigo-200 mt-1 text-sm md:text-base">Ringkasan pendapatan dan prestasi pakej Studio ABG Raya.</p>
            </div>
            
            <a href="/admin" className="group flex justify-center items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-5 py-2.5 rounded-full backdrop-blur-sm transition-all text-sm font-medium border border-white/20">
                <span>← Kembali ke Dashboard</span>
            </a>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 -mt-16 space-y-6">
        
        {loading ? (
           <div className="bg-white rounded-2xl shadow-lg p-20 flex flex-col items-center justify-center">
               <div className="w-12 h-12 border-4 border-[#412986]/20 border-t-[#412986] rounded-full animate-spin mb-4"></div>
               <p className="text-gray-500 font-medium animate-pulse">Mengira data jualan...</p>
           </div>
        ) : (
          <>
            {/* --- 1. KPI CARDS --- */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in-up">
                {/* Total Revenue */}
                <div className="bg-white rounded-2xl shadow-lg p-6 border border-emerald-100 relative overflow-hidden">
                    <div className="absolute -right-4 -top-4 text-7xl opacity-5">💰</div>
                    <p className="text-emerald-600 font-bold uppercase tracking-wider text-xs mb-2">Keseluruhan Jualan</p>
                    <h2 className="text-4xl font-black text-emerald-600">
                        RM{totalRevenue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                    </h2>
                </div>

                {/* Total Deals */}
                <div className="bg-white rounded-2xl shadow-lg p-6 border border-blue-100 relative overflow-hidden">
                    <div className="absolute -right-4 -top-4 text-7xl opacity-5">👥</div>
                    <p className="text-blue-500 font-bold uppercase tracking-wider text-xs mb-2">Jumlah Pelanggan</p>
                    <h2 className="text-4xl font-black text-blue-600">
                        {totalDeals} <span className="text-xl text-gray-400 font-bold">Tempahan</span>
                    </h2>
                </div>

                {/* Average Order Value */}
                <div className="bg-white rounded-2xl shadow-lg p-6 border border-purple-100 relative overflow-hidden">
                    <div className="absolute -right-4 -top-4 text-7xl opacity-5">📊</div>
                    <p className="text-[#412986] font-bold uppercase tracking-wider text-xs mb-2">Purata Belanja / Pelanggan</p>
                    <h2 className="text-4xl font-black text-[#412986]">
                        RM{averageValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                    </h2>
                </div>
            </div>

            {/* --- 2. BAHAHGIAN KEDUA: PAKEJ & BULANAN --- */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in-up delay-100">
                
                {/* PAKEJ TERLARIS */}
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                    <div className="bg-gray-50 p-5 border-b border-gray-100">
                        <h2 className="font-bold text-lg text-gray-800 flex items-center gap-2">🏆 Prestasi Pakej</h2>
                    </div>
                    <div className="p-0">
                        {packageStats.length === 0 ? (
                            <p className="p-8 text-center text-gray-400">Belum ada jualan direkodkan.</p>
                        ) : (
                            <table className="w-full text-left">
                                <thead className="bg-gray-50/50 text-gray-400 text-xs uppercase tracking-wider">
                                    <tr>
                                        <th className="p-4 pl-6 font-medium">Nama Pakej</th>
                                        <th className="p-4 text-center font-medium">Kuantiti</th>
                                        <th className="p-4 text-right pr-6 font-medium">Nilai Jualan</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {packageStats.map((pkg, idx) => (
                                        <tr key={idx} className="hover:bg-gray-50 transition">
                                            <td className="p-4 pl-6 font-bold text-gray-700">{pkg.name}</td>
                                            <td className="p-4 text-center text-gray-600 font-medium">
                                                <span className="bg-gray-100 px-3 py-1 rounded-full text-xs">{pkg.count}</span>
                                            </td>
                                            <td className="p-4 text-right pr-6 font-bold text-[#412986]">
                                                RM{pkg.revenue.toLocaleString(undefined, {minimumFractionDigits: 2})}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>

                {/* JUALAN BULANAN */}
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                    <div className="bg-gray-50 p-5 border-b border-gray-100">
                        <h2 className="font-bold text-lg text-gray-800 flex items-center gap-2">📅 Jualan Bulanan</h2>
                    </div>
                    <div className="p-0">
                        {monthlyStats.length === 0 ? (
                            <p className="p-8 text-center text-gray-400">Belum ada jualan direkodkan.</p>
                        ) : (
                            <table className="w-full text-left">
                                <thead className="bg-gray-50/50 text-gray-400 text-xs uppercase tracking-wider">
                                    <tr>
                                        <th className="p-4 pl-6 font-medium">Bulan</th>
                                        <th className="p-4 text-center font-medium">Deals</th>
                                        <th className="p-4 text-right pr-6 font-medium">Total Jualan</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {monthlyStats.map((month, idx) => (
                                        <tr key={idx} className="hover:bg-gray-50 transition">
                                            <td className="p-4 pl-6 font-bold text-gray-700 capitalize">{month.month}</td>
                                            <td className="p-4 text-center text-gray-600 font-medium">
                                                <span className="bg-gray-100 px-3 py-1 rounded-full text-xs">{month.count}</span>
                                            </td>
                                            <td className="p-4 text-right pr-6 font-bold text-emerald-600">
                                                RM{month.revenue.toLocaleString(undefined, {minimumFractionDigits: 2})}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>

            </div>
          </>
        )}

      </div>
    </div>
  );
}