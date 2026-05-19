"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { RotateCw, RotateCcw, RefreshCcw, Scissors, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type ImageEditState = {
  /** null = não recortar, usa imagem inteira */
  appliedCrop: Area | null;
  /** graus 0..359 — sempre aplicado se ≠ 0 */
  rotation: number;
};

type Props = {
  file: File;
  onStateChange: (state: ImageEditState) => void;
  /** Estado inicial — usado quando o editor é remontado ao trocar de foto no lote. */
  initial?: ImageEditState;
};

/**
 * Editor opt-in: o usuário vê a imagem inteira no preview e pode zoomar/rotacionar
 * sem alterar o que é enviado. Só recorta se ligar o toggle "Aplicar recorte".
 */
export function ImageEditor({ file, onStateChange, initial }: Props) {
  const imageUrl = useMemo(() => URL.createObjectURL(file), [file]);
  useEffect(() => () => URL.revokeObjectURL(imageUrl), [imageUrl]);

  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(initial?.rotation ?? 0);
  const [pendingCrop, setPendingCrop] = useState<Area | null>(initial?.appliedCrop ?? null);
  const [applyCrop, setApplyCrop] = useState(Boolean(initial?.appliedCrop));

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setPendingCrop(pixels);
  }, []);

  useEffect(() => {
    onStateChange({
      appliedCrop: applyCrop ? pendingCrop : null,
      rotation,
    });
  }, [applyCrop, pendingCrop, rotation, onStateChange]);

  function reset() {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
    setApplyCrop(false);
  }

  const edited = rotation !== 0 || applyCrop;

  return (
    <div className="space-y-3">
      <div className="relative w-full h-[280px] rounded-lg overflow-hidden bg-paper-deep border border-hairline">
        <Cropper
          image={imageUrl}
          crop={crop}
          zoom={zoom}
          rotation={rotation}
          aspect={undefined}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onRotationChange={setRotation}
          onCropComplete={onCropComplete}
          objectFit="contain"
          showGrid={applyCrop}
          // Quando o crop não vai ser aplicado, desabilita a interação com a "seleção"
          // pra ficar claro que é só pré-visualização.
          style={{
            containerStyle: { backgroundColor: "#16191F" },
            cropAreaStyle: applyCrop
              ? undefined
              : { border: "none", boxShadow: "none", color: "transparent" },
          }}
        />
        {edited && (
          <span className="absolute top-2 right-2 inline-flex items-center gap-1 px-2 py-1 rounded-full bg-cobalt/90 text-white text-[10px] uppercase tracking-editorial font-medium">
            <Check className="h-3 w-3" strokeWidth={2.2} />
            editado
          </span>
        )}
      </div>

      {/* Toggle Recortar */}
      <button
        type="button"
        onClick={() => setApplyCrop((v) => !v)}
        className={cn(
          "w-full flex items-center justify-between px-3 py-2.5 rounded-lg border transition-colors",
          applyCrop
            ? "border-cobalt bg-cobalt/10 text-ink"
            : "border-hairline bg-paper-soft text-graphite hover:border-cobalt/40",
        )}
      >
        <span className="inline-flex items-center gap-2 text-[13px] font-medium">
          <Scissors className="h-4 w-4" strokeWidth={1.8} />
          Aplicar recorte
        </span>
        <span
          className={cn(
            "inline-flex items-center h-5 w-9 rounded-full transition-colors",
            applyCrop ? "bg-cobalt" : "bg-hairline",
          )}
        >
          <span
            className={cn(
              "size-4 rounded-full bg-white transition-transform mx-0.5",
              applyCrop ? "translate-x-4" : "translate-x-0",
            )}
          />
        </span>
      </button>
      <p className="text-[11px] text-ash px-1 -mt-1">
        {applyCrop
          ? "Ajuste a área no preview. O envio vai usar só o que estiver dentro do quadro."
          : "Vai enviar a foto inteira. Ligue se quiser cortar uma parte específica."}
      </p>

      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <EditorBtn
          onClick={() => setRotation((r) => (r - 90 + 360) % 360)}
          label="Girar esquerda"
        >
          <RotateCcw className="h-4 w-4" strokeWidth={1.8} />
        </EditorBtn>
        <EditorBtn
          onClick={() => setRotation((r) => (r + 90) % 360)}
          label="Girar direita"
        >
          <RotateCw className="h-4 w-4" strokeWidth={1.8} />
        </EditorBtn>
        <div className="flex-1 flex items-center gap-2 px-2">
          <span className="text-[10px] uppercase tracking-editorial text-ash">zoom</span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="flex-1 accent-cobalt"
          />
          <span className="font-mono text-[10px] text-ash tab-num w-9 text-right">
            {zoom.toFixed(2)}x
          </span>
        </div>
        <EditorBtn onClick={reset} label="Resetar">
          <RefreshCcw className="h-4 w-4" strokeWidth={1.8} />
        </EditorBtn>
      </div>

      {rotation !== 0 && (
        <p className="text-[11px] text-cobalt-soft px-1 -mt-1">
          Rotação {rotation}° será aplicada no envio.
        </p>
      )}
    </div>
  );
}

function EditorBtn({
  onClick,
  label,
  children,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        "size-10 rounded-md border border-hairline bg-paper-deep text-graphite",
        "flex items-center justify-center transition-colors shrink-0",
        "hover:border-cobalt/50 hover:text-ink active:scale-95",
      )}
    >
      {children}
    </button>
  );
}
