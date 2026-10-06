"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Silently re-fetches the server-rendered page every 30s so the fleet view
// stays live without any client-side data fetching.
export default function AutoRefresh({ seconds = 30 }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => router.refresh(), seconds * 1000);
    return () => clearInterval(id);
  }, [router, seconds]);
  return null;
}
