import { defineStore } from "pinia";
import type { GachaConfig, GachaRecord, Prize, Timezone } from "../types/gacha";

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
  },
  persist: true,
});
