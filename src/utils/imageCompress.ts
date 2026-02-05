/**
 * 上传前压缩图片，降低存储与内存占用，避免卡顿
 * - 限制最大边长
 * - JPEG 质量压缩
 */
const DEFAULT_MAX_DIMENSION = 1920;
const DEFAULT_JPEG_QUALITY = 0.82;

export interface CompressOptions {
  maxDimension?: number;
  jpegQuality?: number;
}

/**
 * 将 File 压缩为 dataURL（缩小尺寸 + 质量压缩）
 */
export function compressImageFile(file: File, options: CompressOptions = {}): Promise<string> {
  const maxDimension = options.maxDimension ?? DEFAULT_MAX_DIMENSION;
  const jpegQuality = options.jpegQuality ?? DEFAULT_JPEG_QUALITY;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      try {
        const dataUrl = compressImageElement(img, maxDimension, jpegQuality);
        resolve(dataUrl);
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("图片解码失败"));
    };
    img.src = url;
  });
}

function compressImageElement(
  img: HTMLImageElement,
  maxDimension: number,
  jpegQuality: number
): string {
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  let width = w;
  let height = h;
  if (w > maxDimension || h > maxDimension) {
    if (w >= h) {
      width = maxDimension;
      height = Math.round((h * maxDimension) / w);
    } else {
      height = maxDimension;
      width = Math.round((w * maxDimension) / h);
    }
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2d not available");
  ctx.drawImage(img, 0, 0, width, height);

  const mime = "image/jpeg";
  const dataUrl = canvas.toDataURL(mime, jpegQuality);
  return dataUrl;
}
