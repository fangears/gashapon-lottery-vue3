<script setup lang="ts">
const props = defineProps<{
  enabled: boolean;
  idleMinutes: number;
}>();

const emit = defineEmits<{
  (e: "update:enabled", value: boolean): void;
  (e: "update:idleMinutes", value: number): void;
}>();

const handleToggleEnabled = (value: boolean) => {
  emit("update:enabled", value);
};

const handleIdleMinutesChange = (value: number | undefined) => {
  const minutes = typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 1;
  emit("update:idleMinutes", minutes);
};
</script>

<template>
  <section class="card admin-screensaver">
    <div class="header">
      <h2>屏保设置</h2>
      <span class="header-tag">自动切换到屏保页面</span>
    </div>

    <div class="field-row">
      <div class="field-main">
        <div class="field-label">
          <span class="field-title">启用自动屏保</span>
          <span class="field-desc">开启后，长时间无操作会自动进入屏保页面。</span>
        </div>
      </div>
      <el-switch :model-value="props.enabled" @update:model-value="handleToggleEnabled" />
    </div>

    <div class="field-row">
      <div class="field-main">
        <div class="field-label">
          <span class="field-title">静置时间</span>
          <span class="field-desc">从最近一次用户操作开始计算，超过该时间后进入屏保。</span>
        </div>
      </div>
      <div class="field-control">
        <el-input-number
          :model-value="props.idleMinutes"
          :min="1"
          :max="240"
          :step="1"
          controls-position="right"
          style="width: 140px"
          @change="handleIdleMinutesChange"
        />
        <span class="field-unit">分钟</span>
      </div>
    </div>

    <p class="tip">
      关闭自动屏保后，系统不会因为静置而自动跳转到屏保页面，但仍可以通过顶部导航的「屏保」菜单手动进入。
    </p>
  </section>
</template>

<style scoped>
.admin-screensaver {
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

.field-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
  flex-wrap: wrap;
}

.field-main {
  flex: 1 1 auto;
  min-width: 0;
}

.field-label {
  display: grid;
  gap: 4px;
}

.field-title {
  font-weight: 600;
}

.field-desc {
  font-size: 0.85rem;
  opacity: 0.7;
}

.field-control {
  display: flex;
  align-items: center;
  gap: 8px;
}

.field-unit {
  font-size: 0.9rem;
  opacity: 0.8;
}

.tip {
  margin: 0;
  font-size: 0.85rem;
  opacity: 0.7;
}
</style>

