"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function AdminPromoPage() {
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newCode, setNewCode] = useState({ code: "", percent: 10, staff: "" });

  useEffect(() => { fetchReport(); }, []);

  async function fetchReport() {
    setLoading(true);

    const { data: promoCodes } = await supabase.from('referral_codes').select('*');
    const { data: bookings } = await supabase.from('bookings').select('referral_code, final_price').eq('status', 'paid').not('referral_code', 'is', null);

    const report = (promoCodes || []).map(promo => {
        const sales = (bookings || []).filter(b => b.referral_code === promo.code);
        const totalSales = sales.reduce((sum, b) => sum + (b.final_price || 0), 0);
        
        // KIRA KOMISEN: Total Jualan x (Percent / 100)
        const commission = totalSales * (promo.discount_percent / 100);

        return { ...promo, usage_count: sales.length, total_sales: totalSales, total_commission: commission };
    });

    setCodes(report); setLoading(false);
  }

  async function handleCreate(e) {
    e.preventDefault();
    const cleanCode = newCode.code.toUpperCase().replace(/\s/g, ''); 
    const { error } = await supabase.from('referral_codes').insert([{ code: cleanCode, discount_percent: newCode.percent, staff_name: newCode.staff }]); 
    if (error) alert("Error tambah kod."); else { alert("Berjaya!"); setNewCode({ code: "", percent: 10, staff: "" }); fetchReport(); }
  }

  async function handleDelete(code) {
    if(!confirm("Padam kod ni?")) return;
    await supabase.from('referral_codes').delete().eq('code', code);
    fetchReport();
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      
      {/* --- HEADER SECTION --- */}
      <div className="bg-[#412986] pb-24 pt-10 px-6 shadow-xl">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-white">
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Komisen Staff 💰</h1>
                <p className="text-indigo-200 mt-1 text-sm md:text-base">Pantau prestasi jualan dan insentif pasukan anda.</p>
            </div>
            <a href="/admin" className="group flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-5 py-2.5 rounded-full backdrop-blur-sm transition-all text-sm font-medium border border-white/20">
                <span>← Kembali ke Dashboard</span>
            </a>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 -mt-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pb-12">
            
            {/* --- FORM SECTION (LEFT / TOP) --- */}
            <div className="lg:col-span-4">
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden sticky top-6">
                    <div className="bg-gray-50 p-5 border-b border-gray-100">
                        <h2 className="font-bold text-lg text-[#412986] flex items-center gap-2">
                            ✨ Cipta Kod Baru
                        </h2>
                    </div>
                    
                    <form onSubmit={handleCreate} className="p-6 space-y-5">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Kod Unik</label>
                            <div className="relative">
                                <span className="absolute left-3 top-3.5 text-gray-400">#</span>
                                <input 
                                    type="text" 
                                    required 
                                    placeholder="STAFF01" 
                                    value={newCode.code} 
                                    onChange={e => setNewCode({...newCode, code: e.target.value})} 
                                    className="w-full pl-8 p-3 bg-gray-50 border border-gray-200 rounded-lg font-mono uppercase text-[#412986] font-bold focus:outline-none focus:ring-2 focus:ring-[#412986] focus:border-transparent transition-all"
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Kadar Komisen (%)</label>
                            <input 
                                type="number" 
                                required 
                                min="1" 
                                max="100" 
                                value={newCode.percent} 
                                onChange={e => setNewCode({...newCode, percent: e.target.value})} 
                                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#412986] transition-all"
                            />
                            <p className="text-[11px] text-gray-400 mt-1">Default: 10% dari nilai jualan.</p>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Nama Staff</label>
                            <input 
                                type="text" 
                                required 
                                placeholder="cth: Ali Bin Abu" 
                                value={newCode.staff} 
                                onChange={e => setNewCode({...newCode, staff: e.target.value})} 
                                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#412986] transition-all"
                            />
                        </div>

                        <button type="submit" className="w-full bg-[#412986] hover:bg-[#34206b] text-white font-bold py-3.5 rounded-xl shadow-lg shadow-indigo-900/20 active:scale-[0.98] transition-all duration-200 flex justify-center items-center gap-2">
                            <span>+ Tambah Staff</span>
                        </button>
                    </form>
                </div>
            </div>

            {/* --- REPORT TABLE SECTION (RIGHT / BOTTOM) --- */}
            <div className="lg:col-span-8">
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 flex flex-col h-full overflow-hidden">
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white">
                        <h2 className="font-bold text-lg text-gray-800">Senarai Prestasi</h2>
                        <span className="text-xs font-medium bg-indigo-50 text-[#412986] px-3 py-1 rounded-full">{codes.length} Staff Aktif</span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left min-w-[700px]">
                            <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-bold tracking-wider border-b border-gray-100">
                                <tr>
                                    <th className="p-5 pl-6">Profile Staff</th>
                                    <th className="p-5 text-center">Kadar</th>
                                    <th className="p-5 text-center">Jualan</th>
                                    <th className="p-5 text-right">Komisen (RM)</th>
                                    <th className="p-5 text-center">Tindakan</th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-gray-100 bg-white">
                                {loading ? (
                                    <tr><td colSpan="5" className="p-10 text-center text-gray-400 italic">Memuatkan data...</td></tr>
                                ) : codes.length === 0 ? (
                                    <tr><td colSpan="5" className="p-10 text-center text-gray-400">Belum ada rekod staff.</td></tr>
                                ) : (
                                    codes.map((item) => (
                                        <tr key={item.code} className="hover:bg-indigo-50/30 transition-colors group">
                                            <td className="p-5 pl-6 align-top">
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <div className="h-8 w-8 rounded-full bg-[#412986]/10 flex items-center justify-center text-[#412986] font-bold text-xs">
                                                            {item.staff_name.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <div className="text-sm text-gray-900 font-bold">{item.code}</div>
                                                            <div className="text-xs text-gray-500">{item.staff_name}</div>
                                                        </div>
                                                    </div>

                                                    {/* --- LINK GENERATOR (ORIGINAL STYLE) --- */}
                                                    <div className="mt-2 text-xs bg-gray-100 p-2 rounded border border-gray-200 flex items-center justify-between gap-2 max-w-[250px]">
                                                        <span className="truncate text-gray-500">.../booking?ref={item.code}</span>
                                                        <button 
                                                            onClick={() => {
                                                                const url = `${window.location.origin}/?ref=${item.code}`;
                                                                navigator.clipboard.writeText(url);
                                                                alert("Link disalin! 📋\n" + url);
                                                            }}
                                                            className="text-blue-600 font-bold hover:underline"
                                                        >
                                                            Copy
                                                        </button>
                                                    </div>
                                                    {/* -------------------------------------- */}
                                                </div>
                                            </td>
                                            
                                            <td className="p-5 text-center align-middle">
                                                <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-bold border border-gray-200">
                                                    {item.discount_percent}%
                                                </span>
                                            </td>

                                            <td className="p-5 text-center align-middle">
                                                <div className="text-gray-900 font-bold">{item.usage_count}</div>
                                                <div className="text-[10px] text-gray-400 uppercase tracking-wide">Deals</div>
                                                <div className="text-xs text-gray-400 mt-1">RM{item.total_sales.toLocaleString()}</div>
                                            </td>

                                            <td className="p-5 text-right align-middle">
                                                <div className="font-bold text-emerald-600 text-xl tracking-tight">
                                                    RM{item.total_commission.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                                                </div>
                                            </td>

                                            <td className="p-5 text-center align-middle">
                                                <button 
                                                    onClick={() => handleDelete(item.code)} 
                                                    className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition-all border border-transparent hover:border-red-100"
                                                    title="Padam"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

        </div>
      </div>
    </div>
  );
}