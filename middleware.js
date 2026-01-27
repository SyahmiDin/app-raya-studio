import { NextResponse } from "next/server";

export function middleware(req) {
  // 1. Check kalau user cuba masuk folder '/admin'
  if (req.nextUrl.pathname.startsWith("/admin")) {
    
    // 2. Tengok ada tak dia bawa "kunci" (Authorization Header)
    const basicAuth = req.headers.get("authorization");

    if (basicAuth) {
      // 3. Pecahkan kunci tu (Decode base64)
      const authValue = basicAuth.split(" ")[1];
      const [user, pwd] = atob(authValue).split(":");

      // 4. Check sama tak dengan password dalam .env kita
      if (
        user === process.env.ADMIN_USER &&
        pwd === process.env.ADMIN_PASSWORD
      ) {
        // Kalau sama, SILAKAN MASUK Tuan!
        return NextResponse.next();
      }
    }

    // 5. Kalau tak ada kunci atau salah password, halang dia!
    // Browser akan keluarkan popup minta password
    return new NextResponse("Authentication Required", {
      status: 401,
      headers: {
        "WWW-Authenticate": 'Basic realm="Secure Admin Area"',
      },
    });
  }

  // Kalau bukan page admin (contoh: gallery client), bagi lepas je
  return NextResponse.next();
}