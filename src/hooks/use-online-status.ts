"use client";

import { useEffect, useState } from "react";

/**
 * Reage ao evento online/offline do browser. Em SSR retorna `true` (otimista).
 */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState<boolean>(
    typeof navigator === "undefined" ? true : navigator.onLine,
  );

  useEffect(() => {
    function up() {
      setOnline(true);
    }
    function down() {
      setOnline(false);
    }
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, []);

  return online;
}
