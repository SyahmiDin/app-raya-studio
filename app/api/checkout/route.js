import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js"; 

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export async function POST(request) {
  try {
    const body = await request.json();
    const { service, date, time, client, referralCode } = body;

    // Harga KEKAL harga asal
    const finalPrice = service.price; 
    let verifiedCode = "";

    // 1. Validate Code (Cuma nak pastikan kod wujud, bukan untuk kira harga)
    if (referralCode) {
        const { data: codeData } = await supabase
            .from('referral_codes')
            .select('code')
            .eq('code', referralCode)
            .eq('is_active', true)
            .single();

        if (codeData) verifiedCode = codeData.code;
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card","fpx"],
      line_items: [
        {
          price_data: {
            currency: "myr",
            product_data: {
              name: `Studio Raya: ${service.name}`,
              description: `Tarikh: ${date} | Masa: ${time} ${verifiedCode ? `(Ref: ${verifiedCode})` : ''}`,
            },
            unit_amount: Math.round(finalPrice * 100), // Harga Penuh
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${request.headers.get("origin")}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${request.headers.get("origin")}/booking`,
      
      metadata: {
        booking_date: date,
        start_time: time,
        client_name: client.name,
        client_email: client.email,
        client_phone: client.phone,
        service_id: service.id,
        referral_code: verifiedCode, // Simpan kod di sini
        final_price_paid: finalPrice 
      }
    });

    return NextResponse.json({ url: session.url });

  } catch (error) {
    console.error("Stripe Error:", error);
    return NextResponse.json({ error: "Gagal create session" }, { status: 500 });
  }
}