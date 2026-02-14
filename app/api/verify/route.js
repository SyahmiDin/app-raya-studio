import { NextResponse } from "next/server";
import Stripe from "stripe";
import nodemailer from "nodemailer"; 

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("session_id");

  if (!sessionId) return NextResponse.json({ error: "No Session" }, { status: 400 });

  try {
    // 1. DAPATKAN DATA DARI STRIPE
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['payment_intent.latest_charge', 'line_items'] 
    });

    if (session.payment_status !== "paid") {
        return NextResponse.json({ error: "Unpaid" }, { status: 400 });
    }

    const packageName = session.line_items?.data?.[0]?.description || "Pakej Studio";
    const receiptUrl = session.payment_intent?.latest_charge?.receipt_url;
    
    // --- [FIX] KIRA HARGA SEBENAR DARI STRIPE ---
    // Stripe bagi nilai dalam sen (cth: 10000 sen), bahagi 100 jadi RM100
    const realAmountPaid = session.amount_total / 100;

    // --- [FIX] GABUNGKAN DATA PENTING ---
    // Kita create object info baru yang ada 'final_price_paid'
    const info = {
        ...session.metadata,
        final_price_paid: realAmountPaid, // Frontend perlukan nilai ini!
        receipt_url: receiptUrl
    };

    // 2. SETUP PENGHANTAR (Guna akaun Admin Utama)
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: true, 
      auth: {
        user: process.env.SMTP_USER, 
        pass: process.env.SMTP_PASS, 
      },
    });

    // --- SENARAI STAFF YANG AKAN TERIMA NOTIFIKASI ---
    const staffEmails = [
        "syahmi@dhdgroup.com.my",
        "zaid@dhdgroup.com.my",
        "luqman@dhdgroup.com.my",
        "suhail@dhdgroup.com.my",
        "hazrul@dhdgroup.com.my",
        "qayyum@dhdgroup.com.my"
    ];

    // 3. HANTAR EMAIL KE CLIENT (Resit)
    await transporter.sendMail({
       from: '"Studio ABG" <admin@dhdgroup.com.my>',
       to: info.client_email, 
       subject: "Tempahan & Resit Bayaran",
       html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; border: 1px solid #ddd; padding: 20px; border-radius: 10px;">
            <h2 style="color: #333;">Terima Kasih, ${info.client_name}!</h2>
            <p>Bayaran anda sebanyak <strong>RM${info.final_price_paid}</strong> telah diterima.</p>
            <p><strong>Pakej:</strong> ${packageName}</p>
            <p><strong>Pax:</strong> ${info.pax}</p>
            <p><strong>Tarikh:</strong> ${info.booking_date} @ ${info.start_time}</p>
            <br>
            <a href="${receiptUrl}" style="background-color: #2563EB; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">📄 Lihat Resit Rasmi</a>
        </div>
       `
    });

    // 4. HANTAR EMAIL KE SEMUA STAFF (Notifikasi)
    await transporter.sendMail({
        from: '"Sistem Booking" <admin@dhdgroup.com.my>',
        to: staffEmails, 
        subject: `TEMPAHAN BAHARU: ${info.client_name} (RM${info.final_price_paid})`,
        html: `
            <div style="font-family: Arial, sans-serif; border: 2px solid green; padding: 20px; background-color: #f0fff4;">
                <h2 style="color: green; margin-top: 0;">Tempahan Baharu!</h2>
                <p>Sila bersedia untuk slot berikut:</p>
                
                <ul style="background-color: white; padding: 15px 30px; border-radius: 5px; border: 1px solid #ddd;">
                    <li><strong>Nama:</strong> ${info.client_name}</li>
                    <li><strong>Phone:</strong> <a href="tel:${info.client_phone}">${info.client_phone}</a></li>
                    <li><strong>Pakej:</strong> ${packageName}</li>
                    <li><strong>Pax:</strong> ${info.pax}</li>
                    <li><strong>Tarikh:</strong> ${info.booking_date}</li>
                    <li><strong>Masa:</strong> ${info.start_time}</li>
                </ul>

                <p><strong>Status Bayaran:</strong> ✅ SUDAH BAYAR (RM${info.final_price_paid})</p>
                <p><strong>Referral Code:</strong> ${info.referral_code || '-'}</p>
                <br>
                <p style="font-size: 12px; color: #555;">Email ini dihantar kepada: ${staffEmails.join(", ")}</p>
            </div>
        `
    });

    // 5. RETURN DATA LENGKAP KE FRONTEND
    // Frontend akan baca bookingData.final_price_paid untuk save ke DB
    return NextResponse.json({ success: true, bookingData: info });

  } catch (err) {
    console.error("Error verify:", err);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}