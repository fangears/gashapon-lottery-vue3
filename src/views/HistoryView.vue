<script setup lang="ts">
import { computed } from "vue";
import * as XLSX from "xlsx";
import { ElMessage } from "element-plus";
import { useGachaStore } from "../stores/gacha";

const store = useGachaStore();
const history = computed(() => store.history);
const timezone = computed(() => store.config.timezone);

const formatTime = (timestamp: number) =>
  new Intl.DateTimeFormat("zh-CN", {
    timeZone: timezone.value,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(timestamp));

const exportExcel = () => {
  if (history.value.length === 0) {
    ElMessage.warning("暂无记录可导出。");
    return;
  }
  const rows = history.value.map((record) => ({
    社媒账号: record.socialAccount ?? "",
    奖品名称: record.prizeName,
    邮箱: record.email ?? "",
    抽奖时间: formatTime(record.drawnAt),
  }));
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "抽奖记录");
  XLSX.writeFile(workbook, "抽奖记录.xlsx");
};

const clearHistory = () => {
  store.clearHistory();
  ElMessage.success("抽奖记录已清空。");
};

const isDev = import.meta.env.DEV;
</script>

<template>
  <main class="page-container history-page">
    <section class="hero">
      <h1 class="hero-title">抽奖记录</h1>
      <p class="hero-subtitle">所有抽奖行为都会在这里记录，支持一键导出 Excel。</p>
    </section>

    <section class="card history-card">
      <div class="history-header">
        <h2>记录列表</h2>
        <div class="history-actions">
          <el-button v-if="isDev" type="danger" @click="clearHistory">清空记录</el-button>
          <el-button type="primary" @click="exportExcel">导出 Excel</el-button>
        </div>
      </div>
      <el-table :data="history" style="width: 100%">
        <el-table-column prop="socialAccount" label="社媒账号" min-width="140" />
        <el-table-column prop="prizeName" label="奖品名称" min-width="140" />
        <el-table-column prop="email" label="邮箱" min-width="180" />
        <el-table-column label="抽奖时间" min-width="180">
          <template #default="{ row }">
            {{ formatTime(row.drawnAt) }}
          </template>
        </el-table-column>
      </el-table>
      <p class="history-tip">当前显示时区：{{ timezone }}</p>
    </section>
  </main>
</template>

<style scoped>
.history-page {
  display: grid;
  gap: var(--space-2xl);
}

.history-card {
  display: grid;
  gap: var(--space-md);
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
</style>
