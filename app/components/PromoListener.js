"use client";
import { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";

function ListenerLogic() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const code = searchParams.get("ref");
    if (code) {
      // Jumpa kod dalam URL? Simpan dalam poket browser (LocalStorage)
      // Supaya bila dia pindah page lain, kod ni tak hilang.
      localStorage.setItem("studioRayaReferral", code);
      console.log("Promo code saved:", code);
    }
  }, [searchParams]);

  return null; // Komponen ni tak paparkan apa-apa, dia buat kerja senyap-senyap
}

export default function PromoListener() {
  return (
    <Suspense fallback={null}>
      <ListenerLogic />
    </Suspense>
  );
}