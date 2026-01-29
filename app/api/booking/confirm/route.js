// app/api/booking/confirm/route.js
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

// Setup Stripe & Supabase (Server Side)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function POST(request) {
  try {
    const { session_id } = await request.json();

    if (!session_id) return NextResponse.json({ error: "Tiada ID Resit" }, { status: 400 });

    // 1. Tanya Stripe: Betul ke dah bayar?
    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (session.payment_status !== "paid") {
        return NextResponse.json({ success: false, message: "Pembayaran belum selesai" });
    }

    // 2. Kalau dah bayar, ambil info dari Metadata (yang kita simpan masa checkout tadi)
    const { service_id, booking_date, start_time, client_name, client_email, client_phone } = session.metadata;

    // 3. Simpan ke Database Supabase
    const { data, error } = await supabase
        .from("bookings")
        .insert([{
            client_name,
            client_email,
            client_phone,
            service_id,
            booking_date,
            start_time,
            status: "paid",
            stripe_payment_id: session.id
        }])
        .select();

    if (error) {
        console.error("Supabase Error:", error);
        return NextResponse.json({ success: false, message: "Gagal simpan database" });
    }

    return NextResponse.json({ success: true, booking: data[0] });

  } catch (error) {
    console.error("Server Error:", error);
    return NextResponse.json({ success: false, message: "Error teknikal" });
  }
}