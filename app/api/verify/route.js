import { NextResponse } from "next/server";
import Stripe from "stripe";
import nodemailer from "nodemailer"; // 1. Import Nodemailer

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("session_id");

  if (!sessionId) return NextResponse.json({ error: "Tiada Session ID" }, { status: 400 });

  try {
    // 1. Check Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== "paid") {
        return NextResponse.json({ error: "Belum bayar" }, { status: 400 });
    }

    const info = session.metadata;

    // 2. SETUP NODEMAILER (Guna SMTP Hosting Tuan)
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: true, // Letak 'true' kalau port 465, 'false' kalau port 587
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // 3. HANTAR EMAIL
    try {
        // A. Email ke Client (Guna HTML string biasa, tak payah template React rumit)
        await transporter.sendMail({
            from: '"Studio ABG" <admin@dhdgroup.com.my>', // Sender Name <email>
            to: info.client_email,
            subject: "✅ Tempahan Studio ABG Disahkan",
            html: `
                <h1>Terima Kasih, ${info.client_name}!</h1>
                <p>Bayaran RM${info.final_price_paid} telah diterima.</p>
                <p><strong>Tarikh:</strong> ${info.booking_date}</p>
                <p><strong>Masa:</strong> ${info.start_time}</p>
                <p>Jumpa anda di studio!</p>
            `,
        });

        // B. Email ke Admin (Tuan)
        await transporter.sendMail({
            from: '"Sistem Booking" <admin@dhdgroup.com.my>',
            to: "admin@dhdgroup.com.my", // Email Tuan
            subject: `💰 Booking Baru: ${info.client_name}`,
            html: `
                <h2>Ada Client Baru!</h2>
                <ul>
                    <li>Nama: ${info.client_name}</li>
                    <li>Phone: ${info.client_phone}</li>
                    <li>Bayaran: RM${info.final_price_paid}</li>
                </ul>
            `,
        });

    } catch (emailError) {
        console.error("SMTP Error:", emailError);
        // Jangan stop process walau email fail
    }

    return NextResponse.json({ success: true, bookingData: session.metadata });

  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}