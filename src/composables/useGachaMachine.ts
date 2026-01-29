import { computed } from "vue";
import { useGachaStore } from "../stores/gacha";
import type { GachaRecord, Prize } from "../types/gacha";

const createId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const getEligiblePrizes = (prizes: Prize[], useStockAsWeight: boolean) => {
  // 规则：
  // - stock === -1：无限库存（可抽中，不受库存限制）
  // - stock === 0：不可抽中
  // - stock  >  0：可抽中；是否用库存决定概率由开关控制
  // 因此“是否可参与抽奖”只受 stock === 0 影响
  void useStockAsWeight;
  return prizes.filter((prize) => prize.stock !== 0);
};

const pickByWeight = (prizes: Prize[], useStockAsWeight: boolean) => {
  const weights = prizes.map((prize) => {
    if (!useStockAsWeight) return Math.max(0, prize.weight);
    // 开启“库存决定概率”时：
    // - stock > 0：用库存作为权重
    // - stock < 0（如 -1 无限库存）：用权重作为兜底，避免出现负权重
    return prize.stock > 0 ? prize.stock : Math.max(0, prize.weight);
  });
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
