<script setup lang="ts">
import { computed } from "vue";
import * as XLSX from "xlsx";
import { ElMessage } from "element-plus";
import HistoryRecordsCard from "../components/History/HistoryRecordsCard.vue";
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
  <main class="page-container" data-enter="up">
    <HistoryRecordsCard :records="history" :timezone="timezone" :is-dev="isDev" :format-time="formatTime"
      @export-excel="exportExcel" @clear-history="clearHistory" />
  </main>
</template>
