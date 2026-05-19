"use client";

import { useEffect, useState } from "react";
import { Share, Plus, X } from "lucide-react";

const STORAGE_KEY = "lanc:ios-install-hint-dismissed";

function isIosSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) ||
    // iPad iOS 13+ se reporta como Mac com touch
    (ua.includes("Mac") && "ontouchend" in document);
  if (!isIOS) return false;
  // Chrome iOS = "CriOS"; Firefox iOS = "FxiOS"; Safari pura é só Safari.
  return ua.includes("Safari") && !/(CriOS|FxiOS|EdgiOS|OPiOS)/.test(ua);
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  // iOS-specific
  if ("standalone" in window.navigator && (window.navigator as { standalone?: boolean }).standalone) {
    return true;
  }
  // standard
  if (window.matchMedia?.("(display-mode: standalone)").matches) return true;
  return false;
}

/**
 * Banner discreto pra usuários no iOS Safari que ainda não instalaram o
 * app na tela de início. iOS Safari não tem o "beforeinstallprompt" do
 * Chrome — o user precisa fazer manualmente. Aviso explica como.
 */
export function IosInstallHint() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!isIosSafari()) return;
    if (isStandalone()) return;
    try {
      if (localStorage.getItem(STORAGE_KEY) === "1") return;
    } catch {
      // localStorage bloqueado? ignora.
    }
    setShow(true);
  }, []);

  function dismiss() {
    setShow(false);
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // ignora.
    }
  }

  if (!show) return null;

  return (
    <div className="fixed bottom-24 left-3 right-3 z-30 rounded-xl border border-cobalt/40 bg-cobalt/10 backdrop-blur px-4 py-3 shadow-lg animate-in fade-in slide-in-from-bottom-2">
      <div className="flex items-start gap-3">
        <span className="size-9 rounded-lg bg-cobalt text-white flex items-center justify-center shrink-0">
          <Plus className="h-4 w-4" strokeWidth={2.2} />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-ink leading-tight">
            Instale o app na tela de início
          </p>
          <p className="text-[11px] text-graphite leading-snug mt-1 flex items-center gap-1 flex-wrap">
            Toque em{" "}
            <Share className="inline h-3 w-3 text-cobalt-soft" strokeWidth={2} />{" "}
            no Safari → <strong className="text-ink">Adicionar à Tela de Início</strong>
          </p>
          <p className="text-[10px] text-ash italic mt-1">
            Vira app de verdade — sem barra de URL, abre offline, fica num
            ícone.
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Fechar dica"
          className="size-8 rounded-md text-ash hover:text-ink flex items-center justify-center -mt-1 -mr-1 shrink-0"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
