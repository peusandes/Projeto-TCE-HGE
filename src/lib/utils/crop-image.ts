/**
 * Aplica crop + rotação a uma imagem e retorna como Blob JPEG.
 * Se pixelCrop = null, usa a imagem inteira (rotacionada).
 */

export type CropArea = { x: number; y: number; width: number; height: number };

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

const toRadians = (deg: number) => (deg * Math.PI) / 180;

export async function getCroppedBlob(
  imageSrc: string,
  pixelCrop: CropArea | null,
  rotation = 0,
  quality = 0.92,
): Promise<Blob> {
  const image = await loadImage(imageSrc);
  const radians = toRadians(rotation);

  // Bounding box da imagem rotacionada
  const sin = Math.abs(Math.sin(radians));
  const cos = Math.abs(Math.cos(radians));
  const rotatedW = image.width * cos + image.height * sin;
  const rotatedH = image.width * sin + image.height * cos;

  // Canvas 1: aplica rotação centralizada
  const canvas = document.createElement("canvas");
  canvas.width = rotatedW;
  canvas.height = rotatedH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context indisponível");

  ctx.translate(rotatedW / 2, rotatedH / 2);
  ctx.rotate(radians);
  ctx.drawImage(image, -image.width / 2, -image.height / 2);

  // Área a extrair — se não tem crop, pega imagem inteira rotacionada
  const crop = pixelCrop ?? { x: 0, y: 0, width: rotatedW, height: rotatedH };

  const out = document.createElement("canvas");
  out.width = crop.width;
  out.height = crop.height;
  const outCtx = out.getContext("2d");
  if (!outCtx) throw new Error("Canvas 2D context indisponível");

  outCtx.drawImage(
    canvas,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    crop.width,
    crop.height,
  );

  return await new Promise<Blob>((resolve, reject) => {
    out.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Falha ao gerar blob"))),
      "image/jpeg",
      quality,
    );
  });
}
