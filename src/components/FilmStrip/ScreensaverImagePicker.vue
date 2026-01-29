<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useGachaStore } from "../../stores/gacha";
import { useImageLibraryStore } from "../../stores/imageLibrary";

const store = useGachaStore();
const router = useRouter();
const imageStore = useImageLibraryStore();

const selectedIds = computed(() => store.config.screensaverImageIds ?? []);
const selectedItems = computed(() =>
  selectedIds.value
    .map((id) => ({ id, url: imageStore.getUrl(id) }))
    .filter((x) => Boolean(x.url)),
);

// 图片预览相关
const previewVisible = ref(false);
const previewImageUrl = ref("");
const handlePreview = (url: string) => {
  previewImageUrl.value = url;
  previewVisible.value = true;
};

// 选择图片对话框
const pickerVisible = ref(false);
const tempSelected = ref<string[]>([]);

const openPicker = () => {
  tempSelected.value = selectedIds.value.slice();
  pickerVisible.value = true;
};

const toggleSelected = (id: string) => {
  const next = tempSelected.value.slice();
  const idx = next.indexOf(id);
  if (idx >= 0) next.splice(idx, 1);
  else next.push(id);
  tempSelected.value = next;
};

const confirmPicker = () => {
  store.setScreensaverImageIds(tempSelected.value);
  pickerVisible.value = false;
};

const removeFromSelection = (id: string) => {
  store.removeScreensaverImageId(id);
};

const clearSelection = () => {
  store.clearScreensaverImageIds();
};

onMounted(async () => {
  if (!imageStore.hydrated) await imageStore.hydrate();
});

watch(
  () => imageStore.items.length,
  () => {
    // 图片库变化时，自动清理失效引用
    const exists = new Set(imageStore.items.map((x) => x.id));
    const next = selectedIds.value.filter((id) => /^data:image\//i.test(id) || exists.has(id));
    if (next.length !== selectedIds.value.length) {
      store.setScreensaverImageIds(next);
    }
  },
);
</script>

<template>
  <section class="card admin-film">
    <div class="film-header">
      <h2>屏保图片选择</h2>
      <div class="film-actions">
        <el-button type="primary" @click="openPicker">选择图片</el-button>
        <el-button plain @click="router.push('/images')">去图片管理上传/删除</el-button>
        <el-button v-if="selectedIds.length" type="danger" plain @click="clearSelection">清空选择</el-button>
      </div>
    </div>

    <div v-if="selectedItems.length" class="film-grid">
      <div v-for="(it, idx) in selectedItems" :key="`${idx}-${it.id}`" class="film-item">
        <el-image :src="it.url" fit="cover" class="film-thumb" @click="handlePreview(it.url)" />
        <div class="film-item-actions">
          <el-button type="danger" size="small" circle @click="removeFromSelection(it.id)">删</el-button>
        </div>
      </div>
    </div>

    <div v-else class="film-empty">
      <div class="film-empty-title">暂无屏保图片</div>
      <div class="film-empty-subtitle">请先在“图片管理”上传素材，然后在此选择用于屏保展示的图片</div>
    </div>

    <el-dialog v-model="previewVisible" title="图片预览" width="500px" append-to-body>
      <img :src="previewImageUrl" alt="预览图片" style="width: 100%" />
    </el-dialog>

    <el-dialog v-model="pickerVisible" title="选择屏保图片" width="900px" append-to-body>
      <div class="picker-scroll">
        <div class="picker-grid">
          <button v-for="it in imageStore.items" :key="it.id" class="picker-item"
            :class="{ active: tempSelected.includes(it.id) }" type="button" @click="toggleSelected(it.id)">
            <img class="picker-thumb" :src="it.dataUrl" :alt="it.originalName || it.fileName" />
            <div class="picker-name">{{ it.originalName || it.fileName }}</div>
          </button>
        </div>
      </div>
      <template #footer>
        <el-button @click="pickerVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmPicker">确定（{{ tempSelected.length }}）</el-button>
      </template>
    </el-dialog>
  </section>
</template>

<style scoped>
.admin-film {
  display: grid;
  gap: var(--space-md);
}

.film-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
}

.film-actions {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.film-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
  gap: var(--space-md);
}

.film-item {
  position: relative;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: var(--shadow-sm);
  background: #fff;
}

.film-thumb {
  width: 100%;
  height: 110px;
  cursor: pointer;
}

.film-item-actions {
  position: absolute;
  top: 6px;
  right: 6px;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.film-item:hover .film-item-actions {
  opacity: 1;
}

.film-empty {
  padding: 22px 16px;
  border: 1px dashed var(--el-border-color);
  border-radius: 12px;
  text-align: center;
  opacity: 0.85;
}

.film-empty-title {
  font-weight: 800;
}

.film-empty-subtitle {
  margin-top: 6px;
  font-size: 0.9rem;
  opacity: 0.75;
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
  border: 2px solid transparent;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.8);
  cursor: pointer;
  text-align: left;
}

.picker-item.active {
  border-color: var(--el-color-primary);
  box-shadow: var(--shadow-sm);
  background: rgba(238, 242, 255, 0.85);
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
