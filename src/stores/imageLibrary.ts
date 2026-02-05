import { defineStore } from "pinia";
import type { ImageLibraryItem, ImageLibraryTag } from "../utils/imageLibraryStorage";
import { deleteImageFromLibrary, loadImageFromLibraryAsDataUrl, readImageLibraryIndex, saveImageToLibrary } from "../utils/imageLibraryStorage";
import { compressImageFile } from "../utils/imageCompress";

export interface ImageLibraryItemWithUrl extends ImageLibraryItem {
  dataUrl?: string;
}

const isDataUrl = (value: string) => /^data:image\/[a-z0-9.+-]+;base64,/i.test(value);

export const useImageLibraryStore = defineStore("imageLibrary", {
  state: () => ({
    /** 仅元数据，不含 dataUrl，避免一次性加载全部图片导致卡顿 */
    items: [] as ImageLibraryItem[],
    /** 按需加载的 URL 缓存，用于 getUrl 与列表展示 */
    urlCache: {} as Record<string, string>,
    hydrated: false,
    loading: false,
    /** 正在加载的 id 集合，避免重复请求 */
    loadingIds: new Set<string>(),
  }),
  getters: {
    getUrl(state) {
      return (imageRef?: string): string => {
        if (!imageRef) return "";
        if (isDataUrl(imageRef)) return imageRef;
        return state.urlCache[imageRef] ?? "";
      };
    },
  },
  actions: {
    async hydrate() {
      if (this.loading) return;
      this.loading = true;
      try {
        const index = await readImageLibraryIndex();
        this.items = index;
        this.hydrated = true;
      } finally {
        this.loading = false;
      }
    },

    /** 确保某张图的 URL 已加载到 urlCache（按需加载，避免首屏卡顿） */
    async ensureUrlLoaded(id: string): Promise<string> {
      if (this.urlCache[id]) return this.urlCache[id];
      if (this.loadingIds.has(id)) {
        while (this.loadingIds.has(id)) {
          await new Promise((r) => setTimeout(r, 50));
        }
        return this.urlCache[id] ?? "";
      }
      this.loadingIds.add(id);
      try {
        const dataUrl = await loadImageFromLibraryAsDataUrl(id);
        this.urlCache = { ...this.urlCache, [id]: dataUrl };
        return dataUrl;
      } catch {
        return "";
      } finally {
        this.loadingIds.delete(id);
      }
    },

    /** 批量按需加载（分批执行，避免主线程卡死） */
    async ensureUrlsLoadedBatch(ids: string[], batchSize = 6): Promise<void> {
      for (let i = 0; i < ids.length; i += batchSize) {
        const batch = ids.slice(i, i + batchSize);
        await Promise.all(batch.map((id) => this.ensureUrlLoaded(id)));
        if (i + batchSize < ids.length) await new Promise((r) => setTimeout(r, 0));
      }
    },

    async importDataUrl(base64DataUrl: string, originalName?: string, tags?: ImageLibraryTag[]): Promise<ImageLibraryItemWithUrl> {
      const item = await saveImageToLibrary(base64DataUrl, originalName, tags);
      this.urlCache = { ...this.urlCache, [item.id]: base64DataUrl };
      this.items = [item, ...this.items];
      return { ...item, dataUrl: base64DataUrl };
    },

    async uploadFile(file: File, tags?: ImageLibraryTag[]): Promise<ImageLibraryItemWithUrl> {
      const base64 = await compressImageFile(file);
      return this.importDataUrl(base64, file.name, tags);
    },

    async remove(id: string) {
      await deleteImageFromLibrary(id);
      this.items = this.items.filter((x) => x.id !== id);
      const next = { ...this.urlCache };
      delete next[id];
      this.urlCache = next;
    },
  },
});
