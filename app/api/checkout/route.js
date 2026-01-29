// app/api/checkout/route.js
import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(request) {
  try {
    const { service, date, time, client } = await request.json();

    // Tukar harga ke format 'sen' (Stripe kira dalam sen)
    const priceInCents = Math.round(service.price * 100);

    // Create session Stripe
    const session = await stripe.checkout.sessions.create({
      // --- PERUBAHAN DI SINI (Tambah 'fpx') ---
      payment_method_types: ["card", "fpx"], 
      
      line_items: [
        {
          price_data: {
            currency: "myr",
            product_data: {
              name: service.name,
              description: `Tarikh: ${date} | Masa: ${time} | ${client.name} | ${client.phone}`,
            },
            unit_amount: priceInCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      metadata: {
        service_id: service.id,
        booking_date: date,
        start_time: time,
        client_name: client.name,
        client_email: client.email,
        client_phone: client.phone,
      },
      success_url: `${request.headers.get("origin")}/booking/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${request.headers.get("origin")}/booking`,
    });

    return NextResponse.json({ url: session.url });

  } catch (error) {
    console.error("Stripe Error:", error);
    return NextResponse.json({ error: "Gagal create payment link" }, { status: 500 });
  }
}