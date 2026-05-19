"use client";

import { useEffect, useState } from "react";

/**
 * Status de conexão. Começa otimista (true) porque, se a página
 * carregou, tivemos rede em algum momento. `navigator.onLine` na
 * inicialização é notoriamente bugado em alguns browsers (retorna
 * false mesmo online); só confiamos no evento offline/online
 * que o browser dispara quando a conexão muda de verdade.
 */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState<boolean>(true);

  useEffect(() => {
    // Se o browser já estiver reportando offline ao montar, respeita
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      setOnline(false);
    }

    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, []);

  return online;
}
