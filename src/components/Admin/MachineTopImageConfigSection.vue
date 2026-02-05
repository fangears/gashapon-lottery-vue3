<script setup lang="ts">
import type { GachaMachineTopImageKey } from "../../types/gacha";
import topImage2 from "../../assets/gacha-machine-assets/gacha-machine-top-2.png";
import topImageHalf from "../../assets/gacha-machine-assets/gacha-top-half.png";

const props = defineProps<{
  value: GachaMachineTopImageKey;
}>();

const emit = defineEmits<{
  (e: "update:value", value: GachaMachineTopImageKey): void;
}>();

const options: { key: GachaMachineTopImageKey; label: string; thumb: string }[] = [
  { key: "gacha-machine-top-2", label: "Kate 款（招牌 + 遮阳篷）", thumb: topImage2 },
  { key: "gacha-top-half", label: "YOUR ID 款（标语 + 条纹）", thumb: topImageHalf },
];

const handleSelect = (key: GachaMachineTopImageKey) => {
  emit("update:value", key);
};
</script>

<template>
  <section class="card admin-machine-top">
    <div class="header">
      <h2>扭蛋机主体图片</h2>
      <span class="header-tag">展示样式</span>
    </div>
    <p class="desc">选择扭蛋机上半部分（主体）使用的图片，切换后抽奖页会立即生效。</p>
    <div class="options">
      <button
        v-for="opt in options"
        :key="opt.key"
        type="button"
        class="option-card"
        :class="{ active: props.value === opt.key }"
        @click="handleSelect(opt.key)"
      >
        <img :src="opt.thumb" :alt="opt.label" class="option-thumb" />
        <span class="option-label">{{ opt.label }}</span>
      </button>
    </div>
  </section>
</template>

<style scoped>
.admin-machine-top {
  display: grid;
  gap: var(--space-lg);
}

.header {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.header-tag {
  font-size: 0.8rem;
  padding: 2px 8px;
  border-radius: 999px;
  background: #eef2ff;
  color: var(--color-primary);
}

.desc {
  margin: 0;
  font-size: 0.9rem;
  opacity: 0.85;
}

.options {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-md);
}

.option-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm);
  border: 2px solid var(--color-border, #e5e7eb);
  border-radius: var(--radius-md, 8px);
  background: var(--color-bg, #fff);
  cursor: pointer;
  transition: border-color 0.2s, box-shadow 0.2s;
  min-width: 140px;
}

.option-card:hover {
  border-color: var(--color-primary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.option-card.active {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px rgba(var(--color-primary-rgb, 99, 102, 241), 0.2);
}

.option-thumb {
  width: 100px;
  height: auto;
  max-height: 80px;
  object-fit: contain;
  display: block;
}

.option-label {
  font-size: 0.8rem;
  text-align: center;
  line-height: 1.2;
}
</style>
