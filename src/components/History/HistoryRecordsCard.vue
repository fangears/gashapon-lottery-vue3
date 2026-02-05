<script setup lang="ts">
import { Delete, Edit } from "@element-plus/icons-vue";
import { ElMessageBox } from "element-plus";
import type { GachaRecord, Timezone } from "../../types/gacha";

type TimezoneOption = { label: string; value: Timezone };

const props = defineProps<{
  records: GachaRecord[];
  timezone: Timezone;
  timezones: TimezoneOption[];
  isDev: boolean;
}>();

/** 按当前选中时区格式化 UTC 时间戳，仅用于表格显示，原数据（drawnAt）不变 */
const formatTimeByTimezone = (timestamp: number) =>
  new Intl.DateTimeFormat("zh-CN", {
    timeZone: props.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(timestamp));

const emit = defineEmits<{
  (e: "export-excel"): void;
  (e: "clear-history"): void;
  (e: "update:timezone", value: Timezone): void;
  (e: "edit-record", record: GachaRecord): void;
  (e: "delete-record", record: GachaRecord): void;
}>();

const handleClearHistory = () => {
  ElMessageBox.confirm("确定要清空所有抽奖记录吗？此操作不可恢复。", "清空记录", {
    confirmButtonText: "确定清空",
    cancelButtonText: "取消",
    type: "warning",
  })
    .then(() => emit("clear-history"))
    .catch(() => {});
};

const handleDeleteRecord = (row: GachaRecord) => {
  ElMessageBox.confirm(`确定要删除该条记录（${row.prizeName}）吗？`, "删除记录", {
    confirmButtonText: "确定删除",
    cancelButtonText: "取消",
    type: "warning",
  })
    .then(() => emit("delete-record", row))
    .catch(() => {});
};
</script>

<template>
  <div class="history-card-wrapper">
    <section class="card history-card">
      <div class="history-header">
        <h2>记录列表</h2>
        <div class="history-actions">
          <el-button-group>
            <el-button
              v-for="item in props.timezones"
              :key="item.value"
              :type="props.timezone === item.value ? 'primary' : 'default'"
              @click="emit('update:timezone', item.value)"
            >
              {{ item.label }}
            </el-button>
          </el-button-group>
          <el-button type="danger" @click="handleClearHistory">清空记录</el-button>
          <el-button type="primary" @click="emit('export-excel')">导出 Excel</el-button>
        </div>
      </div>
      <el-table :data="props.records" style="width: 100%">
        <el-table-column prop="socialAccount" label="社媒账号" min-width="140" />
        <el-table-column prop="prizeName" label="奖品名称" min-width="140" />
        <el-table-column prop="email" label="邮箱" min-width="180" />
        <el-table-column label="抽奖时间" min-width="180">
          <template #default="{ row }">
            {{ formatTimeByTimezone(row.drawnAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" :icon="Edit" @click="emit('edit-record', row)" title="编辑" />
            <el-button link type="danger" :icon="Delete" @click="handleDeleteRecord(row)" title="删除" />
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
