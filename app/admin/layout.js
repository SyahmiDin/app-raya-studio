// app/admin/layout.js
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLayout({ children }) {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    // Check ada tak "resit" (cookie) login tadi
    const cookies = document.cookie.split('; ');
    const sessionCookie = cookies.find(row => row.startsWith('admin_session='));

    if (!sessionCookie) {
      // Kalau tiada cookie, tendang balik ke Home
      router.push("/"); 
    } else {
      setIsAuthorized(true);
    }
  }, [router]);

  // Jangan tunjuk apa-apa selagi tak confirm login
  if (!isAuthorized) {
    return null; 
  }

  return <>{children}</>;
}