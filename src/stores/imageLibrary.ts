import { defineStore } from "pinia";
import type { ImageLibraryItem, ImageLibraryTag } from "../utils/imageLibraryStorage";
import { deleteImageFromLibrary, loadImageFromLibraryAsDataUrl, readImageLibraryIndex, saveImageToLibrary } from "../utils/imageLibraryStorage";

export interface ImageLibraryItemWithUrl extends ImageLibraryItem {
  dataUrl?: string;
}

const isDataUrl = (value: string) => /^data:image\/[a-z0-9.+-]+;base64,/i.test(value);

export const useImageLibraryStore = defineStore("imageLibrary", {
  state: () => ({
    items: [] as ImageLibraryItemWithUrl[],
    hydrated: false,
    loading: false,
  }),
  getters: {
    urlMap: (state): Record<string, string> => {
      const map: Record<string, string> = {};
      state.items.forEach((it) => {
        if (it.dataUrl) map[it.id] = it.dataUrl;
      });
      return map;
    },
  },
  actions: {
    async hydrate() {
      if (this.loading) return;
      this.loading = true;
      try {
        const index = await readImageLibraryIndex();
        const withUrls = await Promise.all(
          index.map(async (it) => {
            try {
              const dataUrl = await loadImageFromLibraryAsDataUrl(it.fileName);
              return { ...it, dataUrl } satisfies ImageLibraryItemWithUrl;
            } catch {
              return { ...it } satisfies ImageLibraryItemWithUrl;
            }
          }),
        );
        this.items = withUrls;
        this.hydrated = true;
      } finally {
        this.loading = false;
      }
    },

    getUrl(imageRef?: string): string {
      if (!imageRef) return "";
      if (isDataUrl(imageRef)) return imageRef; // 兼容旧配置（base64）
      return this.urlMap[imageRef] ?? "";
    },

    async importDataUrl(base64DataUrl: string, originalName?: string, tags?: ImageLibraryTag[]): Promise<ImageLibraryItemWithUrl> {
      const item = await saveImageToLibrary(base64DataUrl, originalName, tags);
      const dataUrl = await loadImageFromLibraryAsDataUrl(item.fileName);
      const withUrl: ImageLibraryItemWithUrl = { ...item, dataUrl };
      this.items.unshift(withUrl);
      return withUrl;
    },

    async uploadFile(file: File, tags?: ImageLibraryTag[]): Promise<ImageLibraryItemWithUrl> {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("图片读取失败"));
        reader.readAsDataURL(file);
      });
      return this.importDataUrl(base64, file.name, tags);
    },

    async remove(id: string) {
      await deleteImageFromLibrary(id);
      this.items = this.items.filter((x) => x.id !== id);
    },
  },
});
