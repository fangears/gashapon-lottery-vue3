<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import type { Prize } from "../../types/gacha";
import { useImageLibraryStore } from "../../stores/imageLibrary";

const props = defineProps<{
  prizes: Prize[];
  useStockAsWeight: boolean;
}>();

const emit = defineEmits<{
  (e: "add-prize"): void;
  (e: "remove-prize", index: number): void;
  (e: "update-prize", payload: { index: number; patch: Partial<Prize> }): void;
}>();

const router = useRouter();
const imageStore = useImageLibraryStore();

// 图片预览相关
const previewVisible = ref(false);
const previewImageUrl = ref("");

const handlePreview = (url: string) => {
  previewImageUrl.value = url;
  previewVisible.value = true;
};

const removeImage = (index: number) => {
  emit("update-prize", { index, patch: { imageUrl: "" } });
};

// 选择图片对话框
const pickerVisible = ref(false);
const pickingIndex = ref<number | null>(null);
const keyword = ref("");

const openPicker = (index: number) => {
  pickingIndex.value = index;
  pickerVisible.value = true;
};

const filtered = computed(() => {
  const kw = keyword.value.trim().toLowerCase();
  if (!kw) return imageStore.items;
  return imageStore.items.filter((it) => (it.originalName ?? it.fileName).toLowerCase().includes(kw));
});

const chooseImage = (id: string) => {
  if (pickingIndex.value === null) return;
  emit("update-prize", { index: pickingIndex.value, patch: { imageUrl: id } });
  pickerVisible.value = false;
  pickingIndex.value = null;
};

const getImageSrc = (imageRef?: string) => imageStore.getUrl(imageRef);

onMounted(async () => {
  if (!imageStore.hydrated) await imageStore.hydrate();
});
</script>

<template>
  <section class="card admin-prizes">
    <div class="prize-header">
      <h2>奖品配置</h2>
      <el-button type="primary" @click="emit('add-prize')">新增奖品</el-button>
    </div>

    <el-table :data="props.prizes" style="width: 100%">
      <el-table-column label="图片" width="120">
        <template #default="{ row, $index }">
          <div class="image-uploader">
            <div v-if="row.imageUrl && getImageSrc(row.imageUrl)" class="image-preview-container">
              <el-image :src="getImageSrc(row.imageUrl)" fit="contain" class="preview-image"
                @click="handlePreview(getImageSrc(row.imageUrl))" />
              <div class="image-actions">
                <el-button type="danger" :icon="'Delete'" size="small" circle @click="removeImage($index)" />
              </div>
            </div>
            <div v-else class="upload-placeholder" @click="openPicker($index)">
              <span class="upload-text">选择</span>
            </div>
          </div>
        </template>
      </el-table-column>

      <el-table-column label="名称" min-width="140">
        <template #default="{ row }">
          <el-input v-model="row.name" placeholder="奖品名称" />
        </template>
      </el-table-column>

      <el-table-column label="描述" min-width="200">
        <template #default="{ row }">
          <el-input v-model="row.description" type="textarea" :rows="2" placeholder="描述" resize="none" />
        </template>
      </el-table-column>

      <el-table-column label="库存" width="160">
        <template #default="{ row }">
          <el-input-number v-model="row.stock" :min="-1" :step="1" controls-position="right" style="width: 100%" />
        </template>
      </el-table-column>

      <el-table-column label="权重" width="160">
        <template #default="{ row }">
          <el-input-number v-model="row.weight" :min="1" :step="1" controls-position="right" style="width: 100%" />
        </template>
      </el-table-column>

      <el-table-column label="需要邮箱" width="100">
        <template #default="{ row }">
          <el-switch v-model="row.needEmail" />
        </template>
      </el-table-column>

      <el-table-column label="Lucky Winners" width="140">
        <template #default="{ row }">
          <el-switch v-model="row.showInLuckyWinners" />
        </template>
      </el-table-column>

      <el-table-column label="操作" width="80">
        <template #default="{ $index }">
          <el-button type="danger" plain @click="emit('remove-prize', $index)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="previewVisible" title="图片预览" width="500px" append-to-body>
      <img :src="previewImageUrl" alt="预览图片" style="width: 100%" />
    </el-dialog>

    <el-dialog v-model="pickerVisible" title="从图库选择奖品图片" width="900px" append-to-body>
      <div class="picker-header">
        <el-input v-model="keyword" placeholder="搜索文件名" clearable style="width: 260px" />
        <el-button plain @click="router.push('/images')">去图片管理上传/删除</el-button>
      </div>
      <div class="picker-scroll">
        <div class="picker-grid">
          <button v-for="it in filtered" :key="it.id" class="picker-item" type="button" @click="chooseImage(it.id)">
            <img class="picker-thumb" :src="it.dataUrl" :alt="it.originalName || it.fileName" />
            <div class="picker-name">{{ it.originalName || it.fileName }}</div>
          </button>
        </div>
      </div>
    </el-dialog>

    <p class="prize-tip">
      库存为 -1：无库存限制（例如折扣码）；<br />
      库存为 0：该奖品不可抽中；<br />
      库存 &gt;
      0：未开启“库存决定概率”时按权重抽取，开启后按库存抽取（库存为 -1 时仍按权重兜底）。
    </p>
  </section>
</template>

<style scoped>
.admin-prizes {
  display: grid;
  gap: var(--space-md);
}

.prize-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
}

.prize-tip {
  margin: 0;
  font-size: 0.9rem;
  opacity: 0.7;
}

/* 图片上传样式 */
.image-uploader {
  width: 80px;
  height: 80px;
}

.image-preview-container {
  position: relative;
  width: 80px;
  height: 80px;
  border-radius: 6px;
  overflow: hidden;
}

.preview-image {
  width: 80px;
  height: 80px;
  cursor: pointer;
  border-radius: 6px;
}

.image-actions {
  position: absolute;
  top: 2px;
  right: 2px;
  opacity: 0;
  transition: opacity 0.2s;
}

.image-preview-container:hover .image-actions {
  opacity: 1;
}

.avatar-uploader {
  width: 80px;
  height: 80px;
}

.upload-placeholder {
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px dashed var(--el-border-color);
  border-radius: 6px;
  cursor: pointer;
  transition: border-color 0.2s;
  background: rgba(255, 255, 255, 0.65);
}

.upload-placeholder:hover {
  border-color: var(--el-color-primary);
}

.upload-text {
  font-weight: 800;
  opacity: 0.75;
}

.picker-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.picker-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 12px;
}

.picker-scroll {
  max-height: min(60vh, 560px);
  overflow: auto;
  padding-right: 6px;
}

.picker-item {
  display: grid;
  gap: 8px;
  padding: 10px;
  border: 1px solid var(--el-border-color);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.8);
  cursor: pointer;
  text-align: left;
}

.picker-thumb {
  width: 100%;
  height: 120px;
  object-fit: cover;
  border-radius: 10px;
  background: #fff;
}

.picker-name {
  font-size: 0.85rem;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
