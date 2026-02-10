import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export async function POST(request) {
  try {
    const body = await request.json();
    const { service, date, time, customer } = body;

    if (!service || !date || !time) {
        return NextResponse.json({ error: "Missing Booking Data" }, { status: 400 });
    }

    const origin = request.headers.get("origin") || "http://localhost:3000";

    // --- 1. CHECK KEKOSONGAN & BERSIHKAN SLOT EXPIRED ---
    
    // Cari booking sedia ada (Paid atau Pending)
    const { data: existingBookings, error: fetchError } = await supabase
        .from('bookings')
        .select('*')
        .eq('booking_date', date)
        .eq('start_time', time);

    if (fetchError) throw new Error("Database Error");

    // Jika ada booking...
    if (existingBookings && existingBookings.length > 0) {
        const booking = existingBookings[0];

        // A. Kalau dah PAID, memang tak boleh kacau.
        if (booking.status === 'paid') {
            return NextResponse.json({ error: "Maaf, slot ini telah penuh." }, { status: 409 });
        }

        // B. Kalau PENDING... check masa dia.
        if (booking.status === 'pending') {
            const createdTime = new Date(booking.created_at).getTime();
            const currentTime = new Date().getTime();
            const diffMinutes = (currentTime - createdTime) / 1000 / 60;

            // Kalau baru lagi (< 10 minit), kita anggap slot ni "Dipegang" (Reserved)
            if (diffMinutes < 10) {
                return NextResponse.json({ 
                    error: "Slot sedang dipegang oleh pelanggan lain. Sila cuba 10 minit lagi jika mereka tidak meneruskan bayaran." 
                }, { status: 409 });
            } 
            
            // Kita DELETE slot pending tu supaya user baru boleh masuk.
            await supabase.from('bookings').delete().eq('id', booking.id);
        }
    }

    // --- 2. LOCK SLOT (INSERT PENDING) ---
    // simpan dulu di DB sebelum generate Stripe!
    // halang user kedua daripada masuk.
    const { data: newBooking, error: insertError } = await supabase
        .from('bookings')
        .insert([{
            booking_date: date,
            start_time: time,
            client_name: customer.name,
            client_email: customer.email,
            client_phone: customer.phone,
            service_id: service.id,
            status: 'pending', // <--- PENTING: Status Pending
            final_price: service.price,
            referral_code: customer.referral || null
        }])
        .select()
        .single();

    if (insertError) {
        // Kalau error constraint (maknanya ada orang lain insert milisaat yang sama)
        if (insertError.code === '23505') {
            return NextResponse.json({ error: "Slot baru sahaja diambil orang lain." }, { status: 409 });
        }
        throw new Error(insertError.message);
    }

    // --- 3. CREATE STRIPE SESSION ---
    // Kita set masa expired Stripe 30 minit (lebih sikit dari db 15 minit takpe)
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card", "fpx", "grabpay"],
      line_items: [
        {
          price_data: {
            currency: "myr",
            product_data: {
              name: service.name,
              description: `${date} @ ${time} (${service.duration_minutes} Minit)`,
            },
            unit_amount: Math.round(service.price * 100),
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      expires_at: Math.floor(Date.now() / 1000) + (30 * 60), // Link mati lepas 30 minit
      
      // Kita hantar ID Booking yang kita baru create tadi
      metadata: {
        booking_id: newBooking.id, // <--- KITA SIMPAN ID INI
        booking_date: date,
        start_time: time,
        client_name: customer.name,
        client_email: customer.email,
        client_phone: customer.phone,
        package_name: service.name,
        price: service.price,
        referral_code: customer.referral || "",
      },

      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/booking`, // Kalau cancel, slot pending akan expired sendiri nanti
    });

    // Update booking tadi dengan Stripe ID (untuk rujukan)
    await supabase.from('bookings').update({ stripe_payment_id: session.id }).eq('id', newBooking.id);

    return NextResponse.json({ url: session.url });

  } catch (err) {
    console.error("CHECKOUT ERROR:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}