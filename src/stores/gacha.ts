import { defineStore } from "pinia";
import type { GachaConfig, GachaRecord, GachaMachineTopImageKey, Prize, Timezone } from "../types/gacha";

const createId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const normalizeShowInLuckyWinners = (value: unknown): boolean => {
  if (value === true) return true;
  if (value === false) return false;
  if (typeof value === "number") {
    if (value === 1) return true;
    if (value === 0) return false;
  }
  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    if (v === "true" || v === "1" || v === "yes" || v === "y") return true;
    if (v === "false" || v === "0" || v === "no" || v === "n") return false;
  }
  // 默认展示
  return true;
};

const createDefaultConfig = (): GachaConfig => ({
  requireSocialAccount: false,
  useStockAsWeight: false,
  timezone: "Asia/Shanghai",
  screensaverEnabled: true,
  screensaverIdleMinutes: 5,
  gachaMachineTopImage: "gacha-top-half",
  filmImageIds: [],
  screensaverImageIds: [],
  prizes: [
    {
      id: createId(),
      name: "幸运奖",
      description: "谢谢参与",
      stock: -1,
      weight: 40,
      needEmail: false,
      showInLuckyWinners: true,
    },
    {
      id: createId(),
      name: "小礼品",
      description: "随机小礼物",
      stock: 5,
      weight: 35,
      needEmail: false,
      showInLuckyWinners: true,
    },
    {
      id: createId(),
      name: "大奖",
      description: "限量惊喜礼包",
      stock: 1,
      weight: 5,
      needEmail: true,
      showInLuckyWinners: true,
    },
  ],
});

const normalizePrize = (prize: Prize): Prize => ({
  id: prize.id || createId(),
  name: prize.name ?? "",
  description: prize.description ?? "",
  stock: Number.isFinite(prize.stock) ? prize.stock : -1,
  showInLuckyWinners: normalizeShowInLuckyWinners((prize as Prize).showInLuckyWinners),
  imageUrl: prize.imageUrl ?? "",
  weight: Number.isFinite(prize.weight) ? prize.weight : 1,
  needEmail: Boolean(prize.needEmail),
});

const normalizeConfig = (config?: GachaConfig): GachaConfig => {
  const base = config ?? createDefaultConfig();
  // 兼容迁移：旧版配置无 screensaverImageIds 键时才用 filmImageIds，否则两者独立
  const hasScreensaverKey = (base as Partial<GachaConfig>).screensaverImageIds !== undefined;
  const screensaverImageIdsFallback = hasScreensaverKey
    ? (base.screensaverImageIds ?? [])
    : (base.filmImageIds ?? []);
  const topImageKey = (base as Partial<GachaConfig>).gachaMachineTopImage;
  const validTopImageKeys: GachaMachineTopImageKey[] = ["gacha-machine-top-2", "gacha-top-half"];
  const gachaMachineTopImage =
    topImageKey && validTopImageKeys.includes(topImageKey as GachaMachineTopImageKey)
      ? (topImageKey as GachaMachineTopImageKey)
      : "gacha-top-half";

  // 时区：America/Las_Vegas 非 IANA 有效，拉斯维加斯使用 America/Los_Angeles（太平洋时区）
  const rawTz = base.timezone ?? "Asia/Shanghai";
  const timezone: Timezone =
    rawTz === "America/Las_Vegas"
      ? "America/Los_Angeles"
      : rawTz === "America/Los_Angeles" || rawTz === "Asia/Shanghai"
        ? rawTz
        : "Asia/Shanghai";

  return {
    requireSocialAccount: Boolean(base.requireSocialAccount),
    useStockAsWeight: Boolean(base.useStockAsWeight),
    timezone,
    screensaverEnabled: typeof base.screensaverEnabled === "boolean" ? base.screensaverEnabled : true,
    screensaverIdleMinutes:
      typeof (base as Partial<GachaConfig>).screensaverIdleMinutes === "number" &&
      (base as Partial<GachaConfig>).screensaverIdleMinutes! > 0
        ? (base as Partial<GachaConfig>).screensaverIdleMinutes!
        : 5,
    gachaMachineTopImage,
    filmImageIds: (base.filmImageIds ?? []).filter(Boolean),
    screensaverImageIds: (screensaverImageIdsFallback ?? []).filter(Boolean),
    prizes: (base.prizes ?? []).map(normalizePrize),
  };
};

export const useGachaStore = defineStore("gacha", {
  state: () => ({
    config: normalizeConfig(),
    history: [] as GachaRecord[],
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
    setScreensaverEnabled(value: boolean) {
      this.config.screensaverEnabled = value;
    },
    setScreensaverIdleMinutes(minutes: number) {
      const safe = Number.isFinite(minutes) && minutes > 0 ? minutes : 1;
      this.config.screensaverIdleMinutes = safe;
    },
    setGachaMachineTopImage(key: GachaMachineTopImageKey) {
      this.config.gachaMachineTopImage = key;
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
          showInLuckyWinners: true,
          imageUrl: "",
        }),
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
    updateRecord(id: string, patch: Partial<Omit<GachaRecord, "id">>) {
      const index = this.history.findIndex((r) => r.id === id);
      if (index === -1) return;
      this.history[index] = { ...this.history[index], ...patch };
    },
    removeRecord(id: string) {
      this.history = this.history.filter((r) => r.id !== id);
    },

    setFilmImageIds(ids: string[]) {
      this.config.filmImageIds = (ids ?? []).filter(Boolean);
    },
    removeFilmImageId(id: string) {
      this.config.filmImageIds = this.config.filmImageIds.filter((x) => x !== id);
    },
    clearFilmImageIds() {
      this.config.filmImageIds = [];
    },

    setScreensaverImageIds(ids: string[]) {
      this.config.screensaverImageIds = (ids ?? []).filter(Boolean);
    },
    removeScreensaverImageId(id: string) {
      this.config.screensaverImageIds = this.config.screensaverImageIds.filter((x) => x !== id);
    },
    clearScreensaverImageIds() {
      this.config.screensaverImageIds = [];
    },
    /** 删除图库图片后，清理所有引用（胶片/屏保/奖品） */
    cleanupImageReferences(deletedId: string) {
      if (!deletedId) return;
      this.removeFilmImageId(deletedId);
      this.removeScreensaverImageId(deletedId);
      this.config.prizes = this.config.prizes.map((p) =>
        normalizePrize({
          ...p,
          imageUrl: p.imageUrl === deletedId ? "" : p.imageUrl,
        }),
      );
    },
  },
  // 图片库走 Tauri 文件系统；这里只持久化小体积的配置与历史，避免写爆 localStorage
  persist: { pick: ["config", "history"] },
});
