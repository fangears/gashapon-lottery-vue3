import { computed } from "vue";
import { useGachaStore } from "../stores/gacha";
import type { GachaRecord, Prize } from "../types/gacha";

const createId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const getEligiblePrizes = (prizes: Prize[], useStockAsWeight: boolean) => {
  if (useStockAsWeight) {
    return prizes.filter((prize) => prize.stock >= 1);
  }
  return prizes.filter((prize) => prize.stock !== 0);
};

const pickByWeight = (prizes: Prize[], useStockAsWeight: boolean) => {
  const weights = prizes.map((prize) => (useStockAsWeight ? prize.stock : prize.weight));
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  if (total <= 0) return null;

  let hit = Math.random() * total;
  for (let i = 0; i < prizes.length; i += 1) {
    hit -= weights[i];
    if (hit <= 0) return prizes[i];
  }
  return prizes[prizes.length - 1] ?? null;
};

export const useGachaMachine = () => {
  const store = useGachaStore();
  const config = computed(() => store.config);

  const canDraw = computed(() => {
    const eligible = getEligiblePrizes(config.value.prizes, config.value.useStockAsWeight);
    return eligible.length > 0;
  });

  const drawPrize = () => {
    const eligible = getEligiblePrizes(config.value.prizes, config.value.useStockAsWeight);
    if (eligible.length === 0) return null;
    return pickByWeight(eligible, config.value.useStockAsWeight);
  };

  const buildRecord = (prize: Prize, socialAccount?: string, email?: string): GachaRecord => ({
    id: createId(),
    socialAccount: socialAccount?.trim() || undefined,
    prizeId: prize.id,
    prizeName: prize.name,
    email: email?.trim() || undefined,
    drawnAt: Date.now(),
  });

  return {
    config,
    canDraw,
    drawPrize,
    buildRecord,
  };
};
