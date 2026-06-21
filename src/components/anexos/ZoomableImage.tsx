"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ZoomIn, ZoomOut, Maximize2 } from "lucide-react";

/**
 * Visualizador de imagem com zoom + pan PRÓPRIOS (transform, sem scroll → não
 * "pula"). Ancorado no cursor/dedos: o ponto sob o cursor fica parado ao dar
 * zoom. touch-action:none mata o gesto nativo (que causava o pulo). Suporta:
 *  - roda do mouse (zoom no cursor)
 *  - pinça (dois dedos)
 *  - arrastar pra mover quando ampliado
 *  - duplo-clique pra alternar zoom
 *  - botões +/− e "ajustar".
 */
const MIN = 1;
const MAX = 8;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

export function ZoomableImage({ src, alt }: { src: string; alt: string }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [t, setT] = useState({ s: 1, x: 0, y: 0 });
  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchDist = useRef<number | null>(null);
  const dragging = useRef(false);

  const pos = (clientX: number, clientY: number) => {
    const r = wrap.current!.getBoundingClientRect();
    return { x: clientX - r.left, y: clientY - r.top };
  };

  // Zoom por um fator, mantendo o ponto (cx,cy) — em coords do container — fixo.
  const zoomAt = useCallback((factor: number, cx: number, cy: number) => {
    setT((p) => {
      const s2 = clamp(p.s * factor, MIN, MAX);
      if (s2 === p.s) return p;
      if (s2 === 1) return { s: 1, x: 0, y: 0 }; // volta ao ajuste = recentraliza
      const f = s2 / p.s;
      return { s: s2, x: cx - (cx - p.x) * f, y: cy - (cy - p.y) * f };
    });
  }, []);

  // Roda do mouse: listener nativo não-passivo pra poder previnir o scroll.
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      zoomAt(e.deltaY < 0 ? 1.15 : 1 / 1.15, e.clientX - r.left, e.clientY - r.top);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomAt]);

  const onPointerDown = (e: React.PointerEvent) => {
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinchDist.current = Math.hypot(a.x - b.x, a.y - b.y);
      dragging.current = false;
    } else if (pointers.current.size === 1) {
      dragging.current = true;
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    const prev = pointers.current.get(e.pointerId)!;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size === 2 && pinchDist.current != null) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const mid = pos((a.x + b.x) / 2, (a.y + b.y) / 2);
      if (pinchDist.current > 0) zoomAt(dist / pinchDist.current, mid.x, mid.y);
      pinchDist.current = dist;
    } else if (dragging.current && pointers.current.size === 1) {
      const dx = e.clientX - prev.x;
      const dy = e.clientY - prev.y;
      setT((p) => (p.s === 1 ? p : { ...p, x: p.x + dx, y: p.y + dy }));
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinchDist.current = null;
    if (pointers.current.size === 0) dragging.current = false;
  };

  const onDoubleClick = (e: React.MouseEvent) => {
    const { x, y } = pos(e.clientX, e.clientY);
    setT((p) => (p.s > 1 ? { s: 1, x: 0, y: 0 } : { s: 2.5, x: x - x * 2.5, y: y - y * 2.5 }));
  };

  const center = () => {
    const r = wrap.current!.getBoundingClientRect();
    return { x: r.width / 2, y: r.height / 2 };
  };

  return (
    <div
      ref={wrap}
      className="relative bg-black overflow-hidden select-none"
      style={{ height: "75dvh", touchAction: "none" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onDoubleClick={onDoubleClick}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        draggable={false}
        className="absolute inset-0 h-full w-full object-contain"
        style={{
          transform: `translate(${t.x}px, ${t.y}px) scale(${t.s})`,
          transformOrigin: "0 0",
          cursor: t.s > 1 ? "grab" : "zoom-in",
          willChange: "transform",
        }}
      />

      <div className="absolute bottom-2 right-2 flex gap-1.5">
        <button
          type="button"
          aria-label="Diminuir zoom"
          onClick={() => { const c = center(); zoomAt(1 / 1.4, c.x, c.y); }}
          className="rounded-md bg-black/60 p-2 text-white hover:bg-black/80"
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label="Aumentar zoom"
          onClick={() => { const c = center(); zoomAt(1.4, c.x, c.y); }}
          className="rounded-md bg-black/60 p-2 text-white hover:bg-black/80"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label="Ajustar"
          onClick={() => setT({ s: 1, x: 0, y: 0 })}
          className="rounded-md bg-black/60 p-2 text-white hover:bg-black/80"
        >
          <Maximize2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
