import { BaseDirectory, exists, mkdir, readFile, remove, writeFile } from "@tauri-apps/plugin-fs";

const IMAGE_LIBRARY_DIR = "image_library";
const INDEX_FILE = "image_library_index.json";

// 旧版胶片目录（迁移用）
const LEGACY_FILM_IMAGES_DIR = "film_images";
const LEGACY_FILM_INDEX_FILE = "film_images_index.json";

export type ImageLibraryTag = "film" | "screensaver" | "prize";

export interface ImageLibraryItem {
  /** 全局唯一 ID（当前实现与 fileName 相同） */
  id: string;
  fileName: string;
  originalName?: string;
  createdAt: number;
  tags?: ImageLibraryTag[];
}

type ImageLibraryIndex = ImageLibraryItem[];

// 索引更新队列：确保并发上传/删除时索引更新原子性
let indexUpdateQueue: Promise<void> = Promise.resolve();

async function ensureImageLibraryDir(): Promise<void> {
  if (!(await exists(IMAGE_LIBRARY_DIR, { baseDir: BaseDirectory.AppData }))) {
    await mkdir(IMAGE_LIBRARY_DIR, { baseDir: BaseDirectory.AppData, recursive: true });
  }
}

function generateFileName(originalName?: string): string {
  const ext = originalName?.match(/\.(jpg|jpeg|png|gif|webp|bmp)$/i)?.[1]?.toLowerCase() || "png";
  return `img_${Date.now()}_${Math.random().toString(36).slice(2, 9)}.${ext}`;
}

function base64ToUint8Array(base64: string): Uint8Array {
  // 移除 data:image/xxx;base64, 前缀
  const base64Data = base64.replace(/^data:image\/[a-z0-9.+-]+;base64,/, "");
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function readIndex(): Promise<ImageLibraryIndex> {
  try {
    await ensureImageLibraryDir();
    const indexPath = `${IMAGE_LIBRARY_DIR}/${INDEX_FILE}`;
    if (!(await exists(indexPath, { baseDir: BaseDirectory.AppData }))) return [];
    const data = await readFile(indexPath, { baseDir: BaseDirectory.AppData });
    const text = new TextDecoder().decode(data);
    const parsed = JSON.parse(text) as ImageLibraryIndex;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeIndex(index: ImageLibraryIndex): Promise<void> {
  await ensureImageLibraryDir();
  const indexPath = `${IMAGE_LIBRARY_DIR}/${INDEX_FILE}`;
  const text = JSON.stringify(index);
  const data = new TextEncoder().encode(text);
  await writeFile(indexPath, data, { baseDir: BaseDirectory.AppData });
}

async function readLegacyFilmIndex(): Promise<string[]> {
  try {
    const indexPath = `${LEGACY_FILM_IMAGES_DIR}/${LEGACY_FILM_INDEX_FILE}`;
    if (!(await exists(indexPath, { baseDir: BaseDirectory.AppData }))) return [];
    const data = await readFile(indexPath, { baseDir: BaseDirectory.AppData });
    const text = new TextDecoder().decode(data);
    const parsed = JSON.parse(text) as string[];
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
}

async function migrateLegacyFilmImagesIfNeeded(): Promise<void> {
  // 若旧索引不存在/为空，则无需迁移
  const legacyNames = await readLegacyFilmIndex();
  if (!legacyNames.length) return;

  await ensureImageLibraryDir();

  indexUpdateQueue = indexUpdateQueue.then(async () => {
    const currentIndex = await readIndex();
    const existingFileNames = new Set(currentIndex.map((x) => x.fileName));

    let changed = false;
    for (const fileName of legacyNames) {
      if (!fileName) continue;
      if (existingFileNames.has(fileName)) continue;

      const legacyPath = `${LEGACY_FILM_IMAGES_DIR}/${fileName}`;
      if (!(await exists(legacyPath, { baseDir: BaseDirectory.AppData }))) continue;

      // 复制到新目录（读取->写入->删除旧文件）
      try {
        const bytes = await readFile(legacyPath, { baseDir: BaseDirectory.AppData });
        const newPath = `${IMAGE_LIBRARY_DIR}/${fileName}`;
        await writeFile(newPath, bytes, { baseDir: BaseDirectory.AppData });
        await remove(legacyPath, { baseDir: BaseDirectory.AppData });

        currentIndex.push({
          id: fileName,
          fileName,
          originalName: fileName,
          createdAt: Date.now(),
          tags: ["film"],
        });
        existingFileNames.add(fileName);
        changed = true;
      } catch {
        // 忽略单个文件迁移失败
      }
    }

    if (changed) {
      await writeIndex(currentIndex);
    }

    // 迁移完成后，尝试删除旧索引文件（不影响功能）
    try {
      const legacyIndexPath = `${LEGACY_FILM_IMAGES_DIR}/${LEGACY_FILM_INDEX_FILE}`;
      if (await exists(legacyIndexPath, { baseDir: BaseDirectory.AppData })) {
        await remove(legacyIndexPath, { baseDir: BaseDirectory.AppData });
      }
    } catch {
      // ignore
    }
  });

  await indexUpdateQueue;
}

export async function readImageLibraryIndex(): Promise<ImageLibraryIndex> {
  await migrateLegacyFilmImagesIfNeeded();
  return readIndex();
}

export async function saveImageToLibrary(base64DataUrl: string, originalName?: string, tags?: ImageLibraryTag[]): Promise<ImageLibraryItem> {
  await migrateLegacyFilmImagesIfNeeded();
  await ensureImageLibraryDir();

  const fileName = generateFileName(originalName);
  const filePath = `${IMAGE_LIBRARY_DIR}/${fileName}`;
  const imageData = base64ToUint8Array(base64DataUrl);

  // 先保存文件
  await writeFile(filePath, imageData, { baseDir: BaseDirectory.AppData });

  const item: ImageLibraryItem = {
    id: fileName,
    fileName,
    originalName,
    createdAt: Date.now(),
    tags: tags?.length ? Array.from(new Set(tags)) : undefined,
  };

  // 再更新索引（队列保证原子性）
  indexUpdateQueue = indexUpdateQueue.then(async () => {
    const index = await readIndex();
    if (!index.some((x) => x.id === item.id)) {
      index.unshift(item);
      await writeIndex(index);
    }
  });
  await indexUpdateQueue;

  return item;
}

export async function loadImageFromLibraryAsDataUrl(fileNameOrId: string): Promise<string> {
  const fileName = fileNameOrId;
  const filePath = `${IMAGE_LIBRARY_DIR}/${fileName}`;
  const data = await readFile(filePath, { baseDir: BaseDirectory.AppData });

  const bytes = data as Uint8Array;
  let binaryString = "";
  for (let i = 0; i < bytes.length; i++) {
    binaryString += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binaryString);

  const ext = fileName.split(".").pop()?.toLowerCase();
  const mimeType =
    ext === "jpg" || ext === "jpeg"
      ? "image/jpeg"
      : ext === "png"
        ? "image/png"
        : ext === "gif"
          ? "image/gif"
          : ext === "webp"
            ? "image/webp"
            : ext === "bmp"
              ? "image/bmp"
              : "image/png";

  return `data:${mimeType};base64,${base64}`;
}

export async function deleteImageFromLibrary(id: string): Promise<void> {
  await migrateLegacyFilmImagesIfNeeded();

  const fileName = id;
  const filePath = `${IMAGE_LIBRARY_DIR}/${fileName}`;

  indexUpdateQueue = indexUpdateQueue.then(async () => {
    const index = await readIndex();
    const newIndex = index.filter((x) => x.id !== id);
    await writeIndex(newIndex);
  });
  await indexUpdateQueue;

  try {
    if (await exists(filePath, { baseDir: BaseDirectory.AppData })) {
      await remove(filePath, { baseDir: BaseDirectory.AppData });
    }
  } catch {
    // ignore
  }
}
