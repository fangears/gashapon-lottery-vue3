import { BaseDirectory, readFile, writeFile, exists, mkdir, remove } from "@tauri-apps/plugin-fs";

const FILM_IMAGES_DIR = "film_images";
const INDEX_FILE = "film_images_index.json";

type FilmImageIndex = string[]; // 存储文件名列表

// 索引更新队列，确保并发上传时索引更新的原子性
let indexUpdateQueue: Promise<void> = Promise.resolve();

/**
 * 确保胶片图片目录存在
 */
async function ensureFilmImagesDir(): Promise<void> {
  if (!(await exists(FILM_IMAGES_DIR, { baseDir: BaseDirectory.AppData }))) {
    await mkdir(FILM_IMAGES_DIR, { baseDir: BaseDirectory.AppData, recursive: true });
  }
}

/**
 * 生成唯一的文件名
 */
function generateFileName(originalName?: string): string {
  const ext = originalName?.match(/\.(jpg|jpeg|png|gif|webp|bmp)$/i)?.[1]?.toLowerCase() || "png";
  return `film_${Date.now()}_${Math.random().toString(36).slice(2, 9)}.${ext}`;
}

/**
 * 将 base64 dataURL 转换为 Uint8Array
 */
function base64ToUint8Array(base64: string): Uint8Array {
  // 移除 data:image/xxx;base64, 前缀
  const base64Data = base64.replace(/^data:image\/[a-z]+;base64,/, "");
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * 读取索引文件（导出供外部使用）
 */
export async function readFilmImageIndex(): Promise<FilmImageIndex> {
  return readIndex();
}

/**
 * 读取索引文件（内部使用）
 */
async function readIndex(): Promise<FilmImageIndex> {
  try {
    await ensureFilmImagesDir();
    const indexPath = `${FILM_IMAGES_DIR}/${INDEX_FILE}`;
    if (!(await exists(indexPath, { baseDir: BaseDirectory.AppData }))) {
      return [];
    }
    const data = await readFile(indexPath, { baseDir: BaseDirectory.AppData });
    const text = new TextDecoder().decode(data);
    const parsed = JSON.parse(text) as FilmImageIndex;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * 写入索引文件
 */
async function writeIndex(index: FilmImageIndex): Promise<void> {
  await ensureFilmImagesDir();
  const indexPath = `${FILM_IMAGES_DIR}/${INDEX_FILE}`;
  const text = JSON.stringify(index);
  const data = new TextEncoder().encode(text);
  await writeFile(indexPath, data, { baseDir: BaseDirectory.AppData });
}

/**
 * 将 base64 图片保存为文件
 */
export async function saveFilmImage(base64: string, originalName?: string): Promise<void> {
  await ensureFilmImagesDir();

  const fileName = generateFileName(originalName);
  const filePath = `${FILM_IMAGES_DIR}/${fileName}`;
  const imageData = base64ToUint8Array(base64);

  // 先保存文件
  await writeFile(filePath, imageData, { baseDir: BaseDirectory.AppData });

  // 使用队列确保索引更新的原子性，避免并发上传时的竞态条件
  indexUpdateQueue = indexUpdateQueue.then(async () => {
    const index = await readIndex();
    // 检查是否已存在（防止重复添加）
    if (!index.includes(fileName)) {
      index.push(fileName);
      await writeIndex(index);
    }
  });

  await indexUpdateQueue;
}

/**
 * 读取图片文件并转换为 base64 dataURL（用于显示）
 */
export async function loadFilmImageAsDataUrl(fileName: string): Promise<string> {
  const filePath = `${FILM_IMAGES_DIR}/${fileName}`;
  const data = await readFile(filePath, { baseDir: BaseDirectory.AppData });

  // 转换为 base64
  const bytes = data as Uint8Array;
  let binaryString = "";
  for (let i = 0; i < bytes.length; i++) {
    binaryString += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binaryString);

  // 根据文件扩展名确定 MIME 类型
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

/**
 * 加载所有胶片图片（返回 base64 dataURL 数组，用于显示）
 */
export async function loadFilmImages(): Promise<string[]> {
  try {
    const index = await readIndex();
    if (index.length === 0) return [];

    const images = await Promise.all(index.map((fileName) => loadFilmImageAsDataUrl(fileName).catch(() => null)));

    return images.filter((img): img is string => img !== null);
  } catch {
    return [];
  }
}

/**
 * 删除胶片图片文件
 */
export async function deleteFilmImage(fileName: string): Promise<void> {
  const filePath = `${FILM_IMAGES_DIR}/${fileName}`;

  // 使用队列确保索引更新的原子性
  indexUpdateQueue = indexUpdateQueue.then(async () => {
    const index = await readIndex();
    const newIndex = index.filter((name) => name !== fileName);
    await writeIndex(newIndex);
  });

  await indexUpdateQueue;

  // 删除文件（如果存在）
  try {
    if (await exists(filePath, { baseDir: BaseDirectory.AppData })) {
      await remove(filePath, { baseDir: BaseDirectory.AppData });
    }
  } catch {
    // 忽略删除错误
  }
}

/**
 * 清空所有胶片图片（删除所有文件并清空索引）
 */
export async function clearFilmImages(): Promise<void> {
  // 先读取索引，获取所有文件名
  const index = await readIndex();

  // 逐个删除所有图片文件
  for (const fileName of index) {
    try {
      const filePath = `${FILM_IMAGES_DIR}/${fileName}`;
      if (await exists(filePath, { baseDir: BaseDirectory.AppData })) {
        await remove(filePath, { baseDir: BaseDirectory.AppData });
      }
    } catch (error) {
      // 忽略单个文件删除错误，继续删除其他文件
      console.warn(`删除文件失败: ${fileName}`, error);
    }
  }

  // 使用队列确保索引更新的原子性
  indexUpdateQueue = indexUpdateQueue.then(async () => {
    await writeIndex([]);
  });

  await indexUpdateQueue;
}
