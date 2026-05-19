"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { Camera, Trash2, User } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import imageCompression from "browser-image-compression";
import { createClient } from "@/lib/supabase/client";
import { atualizarPerfil } from "@/app/(app)/perfil/actions";
import { cn, errMsg } from "@/lib/utils";

type Props = {
  userId: string;
  avatarUrl: string | null;
};

export function AvatarPicker({ userId, avatarUrl }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  async function handleFile(f: File | undefined) {
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      toast.error("Envie uma imagem.");
      return;
    }
    const localUrl = URL.createObjectURL(f);
    setPreviewUrl(localUrl);

    startTransition(async () => {
      try {
        // Tenta comprimir; se o browser não decoda o formato (ex.: HEIC do iPhone
        // que Canvas API não suporta), faz upload do original direto.
        let toUpload: File | Blob = f;
        try {
          toUpload = await imageCompression(f, {
            maxSizeMB: 0.5,
            maxWidthOrHeight: 512,
            useWebWorker: true,
          });
        } catch (compressErr) {
          console.warn("Compressão falhou, enviando original:", compressErr);
        }

        // Deriva a extensão do que vai EFETIVAMENTE subir, não do original.
        // Compressão converte HEIC → JPEG mas mantém o File.name antigo;
        // se usássemos .heic com bytes JPEG, browsers não renderizariam.
        const finalType = (toUpload as Blob).type || f.type || "image/jpeg";
        const ext =
          finalType === "image/jpeg"
            ? "jpg"
            : finalType === "image/png"
              ? "png"
              : finalType === "image/webp"
                ? "webp"
                : finalType === "image/heic"
                  ? "heic"
                  : finalType === "image/heif"
                    ? "heif"
                    : f.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `${userId}/avatar.${ext}`;
        const supabase = createClient();
        const { error: upErr } = await supabase.storage
          .from("avatares")
          .upload(path, toUpload, {
            contentType: finalType,
            upsert: true,
          });
        if (upErr) throw new Error(upErr.message);

        const { data: pub } = supabase.storage.from("avatares").getPublicUrl(path);
        // Cache-bust pra forçar reload do avatar onde quer que apareça
        const publicUrl = `${pub.publicUrl}?t=${Date.now()}`;

        await atualizarPerfil({ avatar_url: publicUrl });
        toast.success("Foto atualizada");
        setPreviewUrl(null);
        router.refresh();
      } catch (err) {
        toast.error("Erro ao salvar foto", { description: errMsg(err) });
        setPreviewUrl(null);
      } finally {
        URL.revokeObjectURL(localUrl);
      }
    });
  }

  async function handleRemove() {
    if (!confirm("Remover sua foto de perfil?")) return;
    startTransition(async () => {
      try {
        const supabase = createClient();
        // Tenta apagar todos arquivos no folder do user
        const { data: list } = await supabase.storage.from("avatares").list(userId);
        if (list?.length) {
          await supabase.storage
            .from("avatares")
            .remove(list.map((f) => `${userId}/${f.name}`));
        }
        await atualizarPerfil({ avatar_url: null });
        toast.success("Foto removida");
        router.refresh();
      } catch (err) {
        toast.error("Erro ao remover", { description: errMsg(err) });
      }
    });
  }

  const display = previewUrl ?? avatarUrl;

  return (
    <div className="flex items-center gap-4">
      <div
        className={cn(
          "relative size-20 rounded-full overflow-hidden border-2 border-hairline bg-paper-soft shrink-0",
          pending && "opacity-60",
        )}
      >
        {display ? (
          <Image
            src={display}
            alt="Foto de perfil"
            fill
            sizes="80px"
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="flex items-center justify-center h-full text-ash">
            <User className="h-8 w-8" strokeWidth={1.5} />
          </div>
        )}
      </div>
      <div className="flex flex-col gap-2 flex-1">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={pending}
          className="inline-flex items-center gap-2 px-3 h-10 rounded-md bg-cobalt text-white text-[13px] font-medium active:scale-[0.98] transition-transform disabled:opacity-50"
        >
          <Camera className="h-4 w-4" strokeWidth={1.8} />
          {pending ? "Salvando..." : avatarUrl ? "Trocar foto" : "Adicionar foto"}
        </button>
        {avatarUrl && (
          <button
            type="button"
            onClick={handleRemove}
            disabled={pending}
            className="inline-flex items-center gap-2 px-3 h-9 rounded-md border border-hairline text-vermillion text-[12px] font-medium hover:border-vermillion/50"
          >
            <Trash2 className="h-3.5 w-3.5" strokeWidth={1.8} />
            Remover
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0] ?? undefined)}
      />
    </div>
  );
}
