<script setup lang="ts">
import { computed, ref } from "vue";
import * as XLSX from "xlsx";
import { ElMessage } from "element-plus";
import HistoryRecordsCard from "../components/History/HistoryRecordsCard.vue";
import { useGachaStore } from "../stores/gacha";
import type { GachaRecord, Timezone } from "../types/gacha";

const store = useGachaStore();
const history = computed(() => store.history);
const timezone = computed(() => store.config.timezone);

const timezones: Array<{ label: string; value: Timezone }> = [
  { label: "中国（上海）", value: "Asia/Shanghai" },
  { label: "美国（拉斯维加斯）", value: "America/Los_Angeles" },
];

const exportExcel = () => {
  if (history.value.length === 0) {
    ElMessage.warning("暂无记录可导出。");
    return;
  }
  // 导出原数据：时间使用 UTC ISO 字符串，不随显示时区变化
  const rows = history.value.map((record) => ({
    社媒账号: record.socialAccount ?? "",
    奖品名称: record.prizeName,
    邮箱: record.email ?? "",
    抽奖时间: new Date(record.drawnAt).toISOString(),
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

const deleteRecord = (record: GachaRecord) => {
  store.removeRecord(record.id);
  ElMessage.success("已删除该条记录。");
};

const editDialogVisible = ref(false);
const editingRecord = ref<GachaRecord | null>(null);
const editForm = ref({
  socialAccount: "",
  prizeName: "",
  email: "",
  drawnAt: 0,
});

const openEdit = (record: GachaRecord) => {
  editingRecord.value = record;
  editForm.value = {
    socialAccount: record.socialAccount ?? "",
    prizeName: record.prizeName,
    email: record.email ?? "",
    drawnAt: record.drawnAt,
  };
  editDialogVisible.value = true;
};

const submitEdit = () => {
  if (!editingRecord.value) return;
  const drawnAt = Number(editForm.value.drawnAt);
  if (!editForm.value.prizeName.trim()) {
    ElMessage.warning("请填写奖品名称。");
    return;
  }
  store.updateRecord(editingRecord.value.id, {
    socialAccount: editForm.value.socialAccount.trim() || undefined,
    prizeName: editForm.value.prizeName.trim(),
    email: editForm.value.email.trim() || undefined,
    drawnAt: Number.isFinite(drawnAt) ? drawnAt : editingRecord.value.drawnAt,
  });
  editDialogVisible.value = false;
  editingRecord.value = null;
  ElMessage.success("记录已更新。");
};

const isDev = import.meta.env.DEV;
</script>

<template>
  <main class="page-container" data-enter="up">
    <HistoryRecordsCard :records="history" :timezone="timezone" :timezones="timezones" :is-dev="isDev"
      @update:timezone="(v) => store.setTimezone(v)" @export-excel="exportExcel"
      @clear-history="clearHistory" @edit-record="openEdit" @delete-record="deleteRecord" />
    <el-dialog v-model="editDialogVisible" title="编辑记录" width="420px" destroy-on-close>
      <el-form :model="editForm" label-width="80px">
        <el-form-item label="社媒账号">
          <el-input v-model="editForm.socialAccount" placeholder="选填" clearable />
        </el-form-item>
        <el-form-item label="奖品名称">
          <el-input v-model="editForm.prizeName" placeholder="必填" />
        </el-form-item>
        <el-form-item label="邮箱">
          <el-input v-model="editForm.email" placeholder="选填" clearable />
        </el-form-item>
        <el-form-item label="抽奖时间">
          <el-date-picker v-model="editForm.drawnAt" type="datetime" value-format="x"
            placeholder="选择日期时间" style="width: 100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitEdit">保存</el-button>
      </template>
    </el-dialog>
  </main>
</template>
