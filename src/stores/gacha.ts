import { defineStore } from "pinia";
import type { GachaConfig, GachaRecord, Prize, Timezone } from "../types/gacha";
import { loadFilmImages, saveFilmImage, deleteFilmImage, clearFilmImages as clearFilmImagesStorage, readFilmImageIndex } from "../utils/filmImageStorage";

const createId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const createDefaultConfig = (): GachaConfig => ({
  requireSocialAccount: false,
  useStockAsWeight: false,
  timezone: "Asia/Shanghai",
  prizes: [
    {
      id: createId(),
      name: "幸运奖",
      description: "谢谢参与",
      stock: -1,
      weight: 40,
      needEmail: false,
    },
    {
      id: createId(),
      name: "小礼品",
      description: "随机小礼物",
      stock: 5,
      weight: 35,
      needEmail: false,
    },
    {
      id: createId(),
      name: "大奖",
      description: "限量惊喜礼包",
      stock: 1,
      weight: 5,
      needEmail: true,
    },
  ],
});

const normalizePrize = (prize: Prize): Prize => ({
  id: prize.id || createId(),
  name: prize.name ?? "",
  description: prize.description ?? "",
  stock: Number.isFinite(prize.stock) ? prize.stock : -1,
  imageUrl: prize.imageUrl ?? "",
  weight: Number.isFinite(prize.weight) ? prize.weight : 1,
  needEmail: Boolean(prize.needEmail),
});

const normalizeConfig = (config?: GachaConfig): GachaConfig => {
  const base = config ?? createDefaultConfig();
  return {
    requireSocialAccount: Boolean(base.requireSocialAccount),
    useStockAsWeight: Boolean(base.useStockAsWeight),
    timezone: base.timezone ?? "Asia/Shanghai",
    prizes: (base.prizes ?? []).map(normalizePrize),
  };
};

export const useGachaStore = defineStore("gacha", {
  state: () => ({
    config: normalizeConfig(),
    history: [] as GachaRecord[],
    // 胶片滚动图片（base64 dataURL），由后台“胶片列表”维护
    filmImages: [] as string[],
  }),
  getters: {
    timezone: (state): Timezone => state.config.timezone,
  },
  actions: {
    resetConfig() {
      this.config = normalizeConfig();
    },
    setConfig(config: GachaConfig) {
      this.config = normalizeConfig(config);
    },
    setTimezone(timezone: Timezone) {
      this.config.timezone = timezone;
    },
    toggleUseStockAsWeight(value: boolean) {
      this.config.useStockAsWeight = value;
    },
    toggleRequireSocialAccount(value: boolean) {
      this.config.requireSocialAccount = value;
    },
    addPrize() {
      this.config.prizes.push(
        normalizePrize({
          id: createId(),
          name: "",
          description: "",
          stock: -1,
          weight: 1,
          needEmail: false,
          imageUrl: "",
        })
      );
    },
    updatePrize(index: number, patch: Partial<Prize>) {
      const target = this.config.prizes[index];
      if (!target) return;
      this.config.prizes[index] = normalizePrize({ ...target, ...patch });
    },
    removePrize(index: number) {
      this.config.prizes.splice(index, 1);
    },
    addRecord(record: GachaRecord) {
      this.history.unshift(record);
    },
    setHistory(records: GachaRecord[]) {
      this.history = records.slice();
    },
    clearHistory() {
      this.history = [];
    },

    async hydrateFilmImages() {
      // 从文件系统加载所有图片（转换为 base64 dataURL）
      const images = await loadFilmImages();
      if (images.length) this.filmImages = images;
    },

    async addFilmImage(base64: string, originalName?: string) {
      if (!base64) return;
      // 保存到文件系统，获取文件路径（但为了显示，我们仍然使用 base64）
      await saveFilmImage(base64, originalName);
      // 同时保存 base64 到 state（用于立即显示）
      this.filmImages.push(base64);
    },
    async removeFilmImage(index: number) {
      if (index < 0 || index >= this.filmImages.length) return;
      
      // 从索引中获取对应的文件名并删除文件
      try {
        const fileIndex = await readFilmImageIndex();
        if (index < fileIndex.length) {
          const fileName = fileIndex[index];
          await deleteFilmImage(fileName);
        }
      } catch (error) {
        console.error("删除文件失败:", error);
      }
      
      // 从 state 中移除
      this.filmImages.splice(index, 1);
    },
    setFilmImages(images: string[]) {
      this.filmImages = (images ?? []).filter(Boolean);
    },
    async clearFilmImages() {
      this.filmImages = [];
      await clearFilmImagesStorage();
    },
  },
  // 胶片图片走 Tauri 文件系统；这里只持久化小体积的配置与历史，避免写爆 localStorage
  persist: { pick: ["config", "history"] },
});
