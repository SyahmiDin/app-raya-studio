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
  
  // --- STATE UNTUK SENARAI PELANGGAN & RANKING STAFF ---
  const [clientList, setClientList] = useState([]);
  const [staffRanking, setStaffRanking] = useState([]);

  useEffect(() => {
    fetchSalesData();
  }, []);

  async function fetchSalesData() {
    setLoading(true);

    // 1. Ambil rekod Promo Code untuk kita padankan Code dengan Nama Staff
    const { data: promoCodes, error: promoError } = await supabase.from('referral_codes').select('code, staff_name');
    
    if (promoError) {
      console.error("Error fetching promo codes:", promoError);
    }

    const promoMap = {};
    if (promoCodes) {
      promoCodes.forEach(p => {
        // TUKAR KE HURUF BESAR & BUANG SPACE SUPAYA MATCHING TEPAT
        if (p.code && p.staff_name) {
            promoMap[p.code.toUpperCase().trim()] = p.staff_name.trim();
        }
      });
    }

    // 2. Ambil semua booking yang DAH DIBAYAR
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        booking_date,
        start_time,
        final_price,
        client_name,
        referral_code,
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

    // --- KIRA KPI UTAMA ---
    const revenue = validSales.reduce((sum, b) => sum + (b.final_price || 0), 0);
    const deals = validSales.length;
    const avg = deals > 0 ? revenue / deals : 0;

    setTotalRevenue(revenue);
    setTotalDeals(deals);
    setAverageValue(avg);

    // --- KIRA JUALAN MENGIKUT PAKEJ ---
    const pkgMap = {};
    validSales.forEach(b => {
      const pkgName = b.services?.name || "Pakej Dipadam";
      if (!pkgMap[pkgName]) pkgMap[pkgName] = { count: 0, revenue: 0 };
      pkgMap[pkgName].count += 1;
      pkgMap[pkgName].revenue += (b.final_price || 0);
    });
    const pkgArray = Object.entries(pkgMap)
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.revenue - a.revenue);
    setPackageStats(pkgArray);

    // --- KIRA JUALAN MENGIKUT BULAN ---
    const monthMap = {};
    validSales.forEach(b => {
      if (!b.booking_date) return;
      const dateObj = new Date(b.booking_date);
      // Format Bulan Bahasa Melayu (cth: Mac 2026)
      const monthYear = dateObj.toLocaleDateString('ms-MY', { month: 'long', year: 'numeric' });
      
      if (!monthMap[monthYear]) monthMap[monthYear] = { count: 0, revenue: 0, rawDate: dateObj };
      monthMap[monthYear].count += 1;
      monthMap[monthYear].revenue += (b.final_price || 0);
    });
    const monthArray = Object.entries(monthMap)
      .map(([month, stats]) => ({ month, ...stats }))
      .sort((a, b) => b.rawDate - a.rawDate);
    setMonthlyStats(monthArray);

    // --- FORMAT SENARAI PELANGGAN & KIRA PRESTASI STAFF ---
    const staffCounts = {}; // Untuk simpan jumlah pelanggan & komisen setiap staff

    const formattedClients = validSales.map(b => {
      
      // Tukar format tarikh ke DD/MM/YYYY
      let formattedDate = "-";
      if (b.booking_date) {
        const d = new Date(b.booking_date);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        formattedDate = `${day}/${month}/${year}`;
      }

      // Cari nama staff dari kod (Strict Match)
      let staffName = "-";
      let staffCommissionValue = 0; 

      if (b.referral_code) {
          const cleanCode = b.referral_code.toString().toUpperCase().trim();
          
          if (cleanCode !== "") {
              const dbStaffName = promoMap[cleanCode];
              
              if (dbStaffName && dbStaffName !== "") {
                  staffName = dbStaffName.toUpperCase(); 
              } else {
                  staffName = cleanCode; 
              }

              // Tetapkan komisen tetap 10% dari harga jualan (final_price)
              staffCommissionValue = (b.final_price || 0) * 0.10;

              // Tambah kiraan untuk ranking staff
              if (staffName !== "-") {
                 if (!staffCounts[staffName]) {
                     staffCounts[staffName] = { count: 0, revenue: 0, commission: 0 };
                 }
                 staffCounts[staffName].count += 1;
                 staffCounts[staffName].revenue += (b.final_price || 0);
                 staffCounts[staffName].commission += staffCommissionValue; // Masukkan komisen 10%
              }
          }
      }

      return {
        name: b.client_name,
        package: b.services?.name || "Pakej Dipadam",
        price: b.final_price || 0,
        rawDate: b.booking_date || "", 
        date: formattedDate,
        time: b.start_time ? b.start_time.slice(0, 5) : "-",
        referral: staffName
      };
    }).sort((a, b) => new Date(b.rawDate) - new Date(a.rawDate)); // Susun tarikh terbaru
    
    // Susun staf berdasarkan 'count' pelanggan tertinggi (Papar Semua Affiliate Aktif)
    const allStaffs = Object.entries(staffCounts)
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.count - a.count);

    setStaffRanking(allStaffs);
    setClientList(formattedClients);
    setSalesData(validSales);
    setLoading(false);
  }

  // --- FUNGSI PRINT / CETAK PDF ---
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-12 print:bg-white print:pb-0">
      
      {/* --- CSS KHAS UNTUK PRINT --- */}
      <style jsx global>{`
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background-color: white !important; }
          .no-print { display: none !important; }
          .print-clean { box-shadow: none !important; border: 1px solid #e5e7eb !important; break-inside: avoid; }
        }
      `}</style>
      
      {/* --- HEADER SECTION --- */}
      <div className="bg-[#412986] pb-24 pt-10 px-6 shadow-xl no-print">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-white text-center md:text-left">
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Laporan Jualan 📈</h1>
                <p className="text-indigo-200 mt-1 text-sm md:text-base">Ringkasan pendapatan dan prestasi pakej Studio ABG Raya.</p>
            </div>
            
            <div className="flex gap-3">
                <button 
                    onClick={handlePrint}
                    className="flex justify-center items-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-[#412986] px-5 py-2.5 rounded-full transition-all text-sm font-bold shadow-md"
                >
                    🖨️ Cetak PDF
                </button>
                <a href="/admin" className="group flex justify-center items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-5 py-2.5 rounded-full backdrop-blur-sm transition-all text-sm font-medium border border-white/20">
                    <span>← Kembali</span>
                </a>
            </div>
        </div>
      </div>

      {/* --- HEADER KHAS SEMASA PRINT --- */}
      <div className="hidden print:block text-center py-6 border-b-2 border-gray-800 mb-6">
         <h1 className="text-3xl font-black uppercase tracking-widest">Laporan Jualan Studio ABG Raya</h1>
         <p className="text-gray-500 mt-2">Tarikh Cetakan: {new Date().toLocaleDateString('ms-MY')}</p>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 -mt-16 print:mt-0 space-y-6">
        
        {loading ? (
           <div className="bg-white rounded-2xl shadow-lg p-20 flex flex-col items-center justify-center no-print">
               <div className="w-12 h-12 border-4 border-[#412986]/20 border-t-[#412986] rounded-full animate-spin mb-4"></div>
               <p className="text-gray-500 font-medium animate-pulse">Mengira data jualan...</p>
           </div>
        ) : (
          <>
            {/* --- 1. KPI CARDS --- */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in-up">
                <div className="bg-white rounded-2xl shadow-lg p-6 border border-emerald-100 relative overflow-hidden print-clean">
                    <div className="absolute -right-4 -top-4 text-7xl opacity-5">💰</div>
                    <p className="text-emerald-600 font-bold uppercase tracking-wider text-xs mb-2">Keseluruhan Jualan</p>
                    <h2 className="text-4xl font-black text-emerald-600">
                        RM{totalRevenue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                    </h2>
                </div>

                <div className="bg-white rounded-2xl shadow-lg p-6 border border-blue-100 relative overflow-hidden print-clean">
                    <div className="absolute -right-4 -top-4 text-7xl opacity-5">👥</div>
                    <p className="text-blue-500 font-bold uppercase tracking-wider text-xs mb-2">Jumlah Pelanggan</p>
                    <h2 className="text-4xl font-black text-blue-600">
                        {totalDeals} <span className="text-xl text-gray-400 font-bold">Tempahan</span>
                    </h2>
                </div>

                <div className="bg-white rounded-2xl shadow-lg p-6 border border-purple-100 relative overflow-hidden print-clean">
                    <div className="absolute -right-4 -top-4 text-7xl opacity-5">📊</div>
                    <p className="text-[#412986] font-bold uppercase tracking-wider text-xs mb-2">Sasaran Jualan</p>
                    <h2 className="text-4xl font-black text-[#412986]">
                        {/* RM{averageValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} */}
                        RM1,300.00
                    </h2>
                </div>
            </div>

            {/* --- 2. BAHAHGIAN KEDUA: PAKEJ & BULANAN --- */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in-up delay-100">
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden print-clean">
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

                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden print-clean">
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

            {/* --- 3. SENARAI PELANGGAN BERJAYA DENGAN STAFF REFERRAL --- */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden mt-6 animate-fade-in-up delay-200 print-clean">
                <div className="bg-gray-50 p-5 border-b border-gray-100 flex justify-between items-center">
                    <h2 className="font-bold text-lg text-gray-800 flex items-center gap-2">📝 Rekod Pelanggan (Berbayar)</h2>
                    <span className="text-xs bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full font-bold">{clientList.length} Selesai</span>
                </div>
                
                <div className="overflow-x-auto p-0">
                    {clientList.length === 0 ? (
                        <p className="p-8 text-center text-gray-400">Tiada rekod tempahan pelanggan.</p>
                    ) : (
                        <table className="w-full text-left min-w-[600px]">
                            <thead className="bg-white text-gray-400 text-xs uppercase tracking-wider border-b border-gray-100">
                                <tr>
                                    <th className="p-4 pl-6 font-medium">Maklumat Pelanggan & Pakej</th>
                                    <th className="p-4 text-center font-medium">Referral (Staff)</th>
                                    <th className="p-4 text-right font-medium">Tarikh Sesi</th>
                                    <th className="p-4 text-right pr-6 font-medium">Masa Sesi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {clientList.map((client, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50 transition group">
                                        
                                        <td className="p-4 pl-6">
                                            <div className="font-bold text-gray-800 text-sm">{client.name}</div>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-xs text-gray-500">{client.package}</span>
                                                <span className="text-[10px] font-bold bg-[#412986]/10 text-[#412986] px-2 py-0.5 rounded">
                                                    RM{client.price}
                                                </span>
                                            </div>
                                        </td>

                                        <td className="p-4 text-center align-middle">
                                            {client.referral !== "-" ? (
                                                <span className="font-bold text-gray-700">
                                                    {client.referral}
                                                </span>
                                            ) : (
                                                <span className="text-gray-700 font-bold">-</span>
                                            )}
                                        </td>
                                        
                                        <td className="p-4 text-right">
                                            <div className="font-bold text-gray-700">{client.date}</div>
                                        </td>
                                        
                                        <td className="p-4 text-right pr-6">
                                            <div className="font-bold text-gray-700">
                                                {client.time}
                                            </div>
                                        </td>

                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* --- 4. SENARAI PRESTASI AFFILIATE (STAFF) --- */}
            {staffRanking.length > 0 && (
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden mt-6 animate-fade-in-up delay-300 print-clean">
                    <div className="bg-gray-50 p-5 border-b border-gray-100 flex justify-between items-center">
                        <h2 className="font-bold text-lg text-gray-800 flex items-center gap-2">Komisen Staff</h2>
                    </div>
                    
                    <div className="overflow-x-auto p-0">
                        <table className="w-full text-left min-w-[600px]">
                            <thead className="bg-white text-gray-400 text-xs uppercase tracking-wider border-b border-gray-100">
                                <tr>
                                    <th className="p-4 pl-6 font-medium">Kedudukan & Nama Affiliate</th>
                                    <th className="p-4 text-center font-medium">Jumlah Pelanggan</th>
                                    <th className="p-4 text-right pr-6 font-medium">Total Komisen Terkumpul</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {staffRanking.map((staff, index) => {
                                    
                                    // Ikon Pingat untuk Top 3. Bawah dari Top 3 dipaparkan sebagai Nombor
                                    const rankIcon = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : <span className="text-gray-400 font-bold text-base">{index + 1}.</span>;
                                    
                                    return (
                                        <tr key={index} className="hover:bg-gray-50 transition group">
                                            
                                            <td className="p-4 pl-6">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-2xl w-8 text-center flex justify-center">{rankIcon}</span>
                                                    <div className="font-bold text-gray-800 text-sm uppercase">
                                                        {staff.name}
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="p-4 text-center align-middle">
                                                <span className="font-bold text-gray-700">
                                                    {staff.count} Tempahan
                                                </span>
                                            </td>
                                            
                                            <td className="p-4 text-right pr-6">
                                                <div className="font-bold text-emerald-600 text-lg">
                                                    RM{(staff.commission || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                                                </div>
                                            </td>

                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

          </>
        )}

      </div>
    </div>
  );
}