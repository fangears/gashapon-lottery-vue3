<script setup lang="ts">
import { computed, watch } from "vue";
import { ElMessage } from "element-plus";
import { useGachaStore } from "../stores/gacha";
import FilmImageManager from "../components/FilmStrip/FilmImageManager.vue";
import PrizeConfigSection from "../components/Admin/PrizeConfigSection.vue";
import LotteryConfigSection from "../components/Admin/LotteryConfigSection.vue";

const store = useGachaStore();
const config = computed(() => store.config);

const addPrize = () => store.addPrize();

const updateRequireSocialAccount = (value: boolean) => store.toggleRequireSocialAccount(value);
const updateUseStockAsWeight = (value: boolean) => store.toggleUseStockAsWeight(value);

const removePrize = (index: number) => {
  if (config.value.prizes.length <= 1) {
    ElMessage.warning("至少保留一个奖品。");
    return;
  }
  store.removePrize(index);
};

watch(
  () => config.value.useStockAsWeight,
  (useStock) => {
    if (useStock) {
      config.value.prizes.forEach((prize, index) => {
        if (prize.stock < 1) {
          store.updatePrize(index, { stock: 1 });
        }
      });
    }
  }
);
</script>

<template>
  <main class="page-container admin-page">
    <section class="admin-section" aria-label="抽奖规则配置" data-enter="up">
      <LotteryConfigSection :require-social-account="config.requireSocialAccount"
        :use-stock-as-weight="config.useStockAsWeight"
        @update:requireSocialAccount="updateRequireSocialAccount" @update:useStockAsWeight="updateUseStockAsWeight"
      />
    </section>

    <section class="admin-section" aria-label="奖品池配置" data-enter="up" data-enter-order="1">
      <PrizeConfigSection :prizes="config.prizes" :use-stock-as-weight="config.useStockAsWeight" @add-prize="addPrize"
        @remove-prize="removePrize" @update-prize="({ index, patch }) => store.updatePrize(index, patch)" />
    </section>

    <section class="admin-section" aria-label="胶片与展示素材管理" data-enter="up" data-enter-order="2">
      <FilmImageManager />
    </section>
  </main>
</template>

<style scoped>
.admin-page {
  display: grid;
  align-content: start;
  gap: var(--space-xl);
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--space-2xl) var(--space-xl);
}

.admin-section {
  display: grid;
  gap: var(--space-md);
}
</style>
