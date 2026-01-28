<script setup lang="ts">
import type { GachaRecord, Timezone } from "../../types/gacha";

const props = defineProps<{
  records: GachaRecord[];
  timezone: Timezone;
  isDev: boolean;
  formatTime: (timestamp: number) => string;
}>();

const emit = defineEmits<{
  (e: "export-excel"): void;
  (e: "clear-history"): void;
}>();
</script>

<template>
  <div class="history-card-wrapper">
    <section class="card history-card">
      <div class="history-header">
        <h2>记录列表</h2>
        <div class="history-actions">
          <el-button v-if="props.isDev" type="danger" @click="emit('clear-history')">清空记录</el-button>
          <el-button type="primary" @click="emit('export-excel')">导出 Excel</el-button>
        </div>
      </div>
      <el-table :data="props.records" style="width: 100%">
        <el-table-column prop="socialAccount" label="社媒账号" min-width="140" />
        <el-table-column prop="prizeName" label="奖品名称" min-width="140" />
        <el-table-column prop="email" label="邮箱" min-width="180" />
        <el-table-column label="抽奖时间" min-width="180">
          <template #default="{ row }">
            {{ props.formatTime(row.drawnAt) }}
          </template>
        </el-table-column>
      </el-table>
      <p class="history-tip">当前显示时区：{{ props.timezone }}</p>
    </section>
  </div>
</template>

<style scoped>
.history-card-wrapper {
  padding: var(--space-2xl);
}

.history-card {
  display: grid;
  gap: var(--space-md);
  max-width: 1200px;
  margin: 0 auto;
}

.history-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
}

.history-actions {
  display: flex;
  gap: var(--space-md);
  align-items: center;
}

.history-tip {
  margin: 0;
  font-size: 0.9rem;
  opacity: 0.7;
}

@media (max-width: 640px) {
  .history-card-wrapper {
    padding: var(--space-lg);
  }
}
</style>
