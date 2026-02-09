import { NextResponse } from "next/server";
import Stripe from "stripe";

// Pastikan Key Stripe Wujud
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY missing in environment variables");
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(request) {
  try {
    // 1. Terima Data dari Frontend
    const body = await request.json();
    const { service, date, time, customer } = body;

    // Safety Check: Pastikan data wujud
    if (!service || !date || !time) {
        return NextResponse.json({ error: "Missing Booking Data" }, { status: 400 });
    }

    // 2. Tentukan Origin (PENTING UNTUK REDIRECT)
    // Ini automatik detect sama ada kita di localhost atau domain sebenar
    const origin = request.headers.get("origin") || "http://localhost:3000";

    // 3. Create Stripe Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card", "fpx", "grabpay"],
      line_items: [
        {
          price_data: {
            currency: "myr",
            product_data: {
              name: service.name,
              description: `${date} @ ${time} (${service.duration_minutes} Minit)`,
              // Boleh letak gambar jika ada: images: [service.image_url],
            },
            unit_amount: Math.round(service.price * 100), // Stripe kira dalam sen (RM100 = 10000 sen)
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      
      // Simpan data booking dalam metadata (Supaya boleh save ke DB lepas bayar)
      metadata: {
        booking_date: date,
        start_time: time,
        client_name: customer.name,
        client_email: customer.email,
        client_phone: customer.phone,
        package_name: service.name,
        package_id: service.id,
        duration: service.duration_minutes,
        price: service.price,
        referral_code: customer.referral || "",
      },

      // URL Redirect (Guna variable origin tadi)
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/booking`,
    });

    // 4. Return Session ID ke Frontend
    return NextResponse.json({ url: session.url });

  } catch (err) {
    console.error("STRIPE API ERROR:", err); // Ini akan keluar di Terminal VS Code (Bukan browser)
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}