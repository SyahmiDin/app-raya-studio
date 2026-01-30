// app/api/verify/route.js
import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("session_id");

  if (!sessionId) {
    return NextResponse.json({ error: "Tiada Session ID" }, { status: 400 });
  }

  try {
    // 1. Tanya Stripe: "Status session ni apa?"
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    // 2. Kalau belum bayar, reject
    if (session.payment_status !== "paid") {
        return NextResponse.json({ error: "Pembayaran belum selesai" }, { status: 400 });
    }

    // 3. Kalau dah bayar, pulangkan maklumat booking (Metadata)
    return NextResponse.json({ 
        success: true, 
        bookingData: session.metadata 
    });

  } catch (error) {
    console.error("Verify Error:", error);
    return NextResponse.json({ error: "Gagal verify pembayaran" }, { status: 500 });
  }
}