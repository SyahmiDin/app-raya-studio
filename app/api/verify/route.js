import { NextResponse } from "next/server";
import Stripe from "stripe";
import nodemailer from "nodemailer"; 

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("session_id");

  if (!sessionId) return NextResponse.json({ error: "No Session" }, { status: 400 });

  try {
    // 1. PANGGIL STRIPE (DENGAN EXTRA DATA)
    // Kita tambah 'line_items' supaya dia bawak sekali nama pakej
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['payment_intent.latest_charge', 'line_items'] 
    });

    if (session.payment_status !== "paid") {
        return NextResponse.json({ error: "Unpaid" }, { status: 400 });
    }

    // 2. AMBIL NAMA PAKEJ YANG BETUL
    // Sekarang data ni dah wujud sebab kita dah expand
    const packageName = session.line_items?.data?.[0]?.description || "Pakej Studio";
    
    const receiptUrl = session.payment_intent?.latest_charge?.receipt_url;
    const info = session.metadata;

    // 3. SETUP EMAIL
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: true, 
      auth: {
        user: process.env.SMTP_USER, 
        pass: process.env.SMTP_PASS, 
      },
    });

    // 4. HANTAR EMAIL (Client)
    await transporter.sendMail({
       from: '"Studio ABG" <admin@dhdgroup.com.my>',
       to: info.client_email,
       subject: "✅ Tempahan & Resit Bayaran",
       html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; border: 1px solid #ddd; padding: 20px; border-radius: 10px;">
            <h2 style="color: #333;">Terima Kasih, ${info.client_name}!</h2>
            <p>Bayaran anda sebanyak <strong>RM${info.final_price_paid}</strong> telah berjaya diterima.</p>
            
            <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p style="margin: 5px 0;"><strong>📅 Tarikh:</strong> ${info.booking_date}</p>
                <p style="margin: 5px 0;"><strong>⏰ Masa:</strong> ${info.start_time}</p>
                
                <p style="margin: 5px 0;"><strong>📦 Pakej:</strong> ${packageName}</p>
            </div>

            <p>Sila klik butang di bawah untuk melihat atau memuat turun resit rasmi anda:</p>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="${receiptUrl}" style="background-color: #2563EB; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                    📄 Lihat Resit Rasmi (Stripe)
                </a>
            </div>

            <p style="font-size: 12px; color: #777;">Jika butang di atas tidak berfungsi, sila copy link ini:<br>${receiptUrl}</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="font-size: 12px; color: #999;">Email ini dijana secara automatik oleh Sistem Studio ABG.</p>
        </div>
       `
    });

    // 5. HANTAR EMAIL (Admin)
    await transporter.sendMail({
        from: '"Sistem Booking" <admin@dhdgroup.com.my>',
        to: "admin@dhdgroup.com.my", 
        subject: `💰 Booking Baru: ${info.client_name}`,
        html: `
            <h3>Client Baru!</h3>
            <p>Nama: ${info.client_name}</p>
            <p>Pakej: ${packageName}</p>
            <p>Bayaran: RM${info.final_price_paid}</p>
            <p><a href="${receiptUrl}">Lihat Resit Client</a></p>
        `
    });

    return NextResponse.json({ success: true, bookingData: session.metadata });

  } catch (err) {
    console.error("Error verify:", err);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}