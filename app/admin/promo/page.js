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
        // percent ni kita ambil dari database (default 10)
        const commission = totalSales * (promo.discount_percent / 100);

        return { ...promo, usage_count: sales.length, total_sales: totalSales, total_commission: commission };
    });

    setCodes(report); setLoading(false);
  }

  async function handleCreate(e) {
    e.preventDefault();
    const cleanCode = newCode.code.toUpperCase().replace(/\s/g, ''); 
    const { error } = await supabase.from('referral_codes').insert([{ code: cleanCode, discount_percent: newCode.percent, staff_name: newCode.staff }]); // discount_percent ni kita anggap sebagai COMMISSION PERCENT
    if (error) alert("Error tambah kod."); else { alert("Berjaya!"); setNewCode({ code: "", percent: 10, staff: "" }); fetchReport(); }
  }

  async function handleDelete(code) {
    if(!confirm("Padam kod ni?")) return;
    await supabase.from('referral_codes').delete().eq('code', code);
    fetchReport();
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
            <div><h1 className="text-3xl font-bold text-gray-900">Komisen Staff 💰</h1><p className="text-gray-500 text-sm">Lihat prestasi staff anda.</p></div>
            <a href="/admin" className="bg-white border px-4 py-2 rounded text-gray-900 hover:bg-gray-100">← Kembali</a>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* FORM */}
            <div className="lg:col-span-1">
                <div className="bg-white p-6 rounded-xl shadow border border-gray-200 sticky top-6">
                    <h2 className="font-bold text-lg text-gray-900 mb-4">✨ Tambah Kod Staff</h2>
                    <form onSubmit={handleCreate} className="space-y-4">
                        <div><label className="text-xs font-bold text-gray-500 uppercase">Kod Unik</label><input type="text" required placeholder="cth: STAFF01" value={newCode.code} onChange={e => setNewCode({...newCode, code: e.target.value})} className="w-full p-2 border rounded font-mono uppercase"/></div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase">Kadar Komisen Staff (%)</label>
                            <input type="number" required min="1" max="100" value={newCode.percent} onChange={e => setNewCode({...newCode, percent: e.target.value})} className="w-full p-2 border rounded"/>
                            <p className="text-xs text-gray-400 mt-1">Biasanya 10%</p>
                        </div>
                        <div><label className="text-xs font-bold text-gray-500 uppercase">Nama Staff</label><input type="text" required placeholder="cth: Ali" value={newCode.staff} onChange={e => setNewCode({...newCode, staff: e.target.value})} className="w-full p-2 border rounded"/></div>
                        <button type="submit" className="w-full bg-black text-white font-bold py-3 rounded hover:bg-gray-800 transition">+ Cipta Kod</button>
                    </form>
                </div>
            </div>

            {/* TABLE REPORT */}
            <div className="lg:col-span-2">
                <div className="bg-white rounded-xl shadow overflow-hidden border border-gray-200">
                    <table className="w-full text-left">
                        <thead className="bg-gray-100 text-gray-600 text-xs uppercase font-bold">
                            <tr><th className="p-4">Kod & Staff</th><th className="p-4 text-center">Rate</th><th className="p-4 text-center">Jualan</th><th className="p-4 text-right">Komisen Staff (RM)</th><th className="p-4 text-center">Action</th></tr>
                        </thead>

<tbody className="divide-y divide-gray-100">
    {codes.map((item) => (
        <tr key={item.code} className="hover:bg-gray-50">
            <td className="p-4">
                <div className="font-mono font-bold text-lg text-blue-700">{item.code}</div>
                <div className="text-xs text-gray-500">{item.staff_name}</div>
                
                {/* --- TAMBAHAN BARU: Link Generator --- */}
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

            </td>
            <td className="p-4 text-center text-gray-600">{item.discount_percent}%</td>
            {/* ... code lain kekal sama ... */}
                                    <td className="p-4 text-center text-gray-900 font-bold">{item.usage_count} deals</td>
                                    <td className="p-4 text-right">
                                        <div className="text-xs text-gray-400">Sales: RM{item.total_sales}</div>
                                        <div className="font-bold text-green-600 text-lg">RM{item.total_commission.toFixed(2)}</div>
                                    </td>
                                    <td className="p-4 text-center"><button onClick={() => handleDelete(item.code)} className="text-red-400 hover:text-red-600 font-bold text-xs border border-red-200 px-2 py-1 rounded hover:bg-red-50">Delete</button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}