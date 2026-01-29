<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { Plus } from "@element-plus/icons-vue";
import { useGachaStore } from "../stores/gacha";
import { useImageLibraryStore } from "../stores/imageLibrary";

const gachaStore = useGachaStore();
const imageStore = useImageLibraryStore();

const keyword = ref("");
const previewVisible = ref(false);
const previewImageUrl = ref("");

const list = computed(() => {
  const kw = keyword.value.trim().toLowerCase();
  if (!kw) return imageStore.items;
  return imageStore.items.filter((it) => {
    const name = (it.originalName ?? it.fileName ?? "").toLowerCase();
    return name.includes(kw) || (it.tags ?? []).some((t) => String(t).toLowerCase().includes(kw));
  });
});

const validateImage = (file: File) => {
  const isImage = file.type.startsWith("image/");
  if (!isImage) {
    ElMessage.error("只能上传图片文件！");
    return false;
  }
  return true;
};

const handleUpload = async (file: File): Promise<boolean> => {
  if (!validateImage(file)) return false;
  try {
    await imageStore.uploadFile(file);
    ElMessage.success("图片上传成功");
  } catch (e) {
    console.error(e);
    ElMessage.error("图片上传失败，请重试");
  }
  return false; // 阻止默认上传
};

const handlePreview = (url?: string) => {
  if (!url) return;
  previewImageUrl.value = url;
  previewVisible.value = true;
};

const handleDelete = async (id: string) => {
  try {
    await ElMessageBox.confirm("确定删除该图片吗？删除后，胶片/屏保/奖品等引用会被自动清空。", "确认删除", {
      type: "warning",
      confirmButtonText: "删除",
      cancelButtonText: "取消",
    });
  } catch {
    return;
  }

  try {
    await imageStore.remove(id);
    gachaStore.cleanupImageReferences(id);
    ElMessage.success("已删除");
  } catch (e) {
    console.error(e);
    ElMessage.error("删除失败");
  }
};

onMounted(async () => {
  if (!imageStore.hydrated) {
    await imageStore.hydrate();
  }
});
</script>

<template>
  <main class="page-container image-manager-page">
    <section class="card image-manager-card" aria-label="图片管理" data-enter="up">
      <div class="header">
        <div class="title">
          <h2>图片管理</h2>
          <p class="subtitle">所有图片的上传与删除都在此页面进行；其它地方仅从图库选择。</p>
        </div>

        <div class="actions">
          <el-input v-model="keyword" placeholder="搜索文件名/标签" clearable style="width: 220px" />
          <el-upload class="uploader" :show-file-list="false" :before-upload="(f: File) => handleUpload(f)"
            accept="image/*" multiple>
            <el-button type="primary">
              <el-icon>
                <Plus />
              </el-icon>
              上传图片
            </el-button>
          </el-upload>
        </div>
      </div>

      <div v-if="list.length" class="grid">
        <div v-for="it in list" :key="it.id" class="item">
          <el-image :src="it.dataUrl" fit="cover" class="thumb" @click="handlePreview(it.dataUrl)" />
          <div class="meta">
            <div class="name" :title="it.originalName || it.fileName">{{ it.originalName || it.fileName }}</div>
            <div class="tags" v-if="it.tags?.length">#{{ it.tags.join(" #") }}</div>
          </div>
          <div class="item-actions">
            <el-button type="danger" size="small" plain @click="handleDelete(it.id)">删除</el-button>
          </div>
        </div>
      </div>

      <div v-else class="empty">
        <div class="empty-title">暂无图片</div>
        <div class="empty-subtitle">点击右上角“上传图片”添加素材</div>
      </div>
    </section>

    <el-dialog v-model="previewVisible" title="图片预览" width="600px">
      <img :src="previewImageUrl" alt="预览图片" style="width: 100%" />
    </el-dialog>
  </main>
</template>

<style scoped>
.image-manager-page {
  display: grid;
  align-content: start;
  gap: var(--space-xl);
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--space-2xl) var(--space-xl);
}

.image-manager-card {
  display: grid;
  gap: var(--space-md);
}

.header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-lg);
  flex-wrap: wrap;
}

.title h2 {
  margin: 0;
}

.subtitle {
  margin: 6px 0 0 0;
  opacity: 0.75;
  font-size: 0.9rem;
}

.actions {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  flex-wrap: wrap;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: var(--space-md);
}

.item {
  display: grid;
  gap: 8px;
  padding: 10px;
  border: 1px solid var(--el-border-color);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.75);
  box-shadow: var(--shadow-sm);
}

.thumb {
  width: 100%;
  height: 140px;
  border-radius: 10px;
  overflow: hidden;
  cursor: pointer;
  background: #fff;
}

.meta {
  display: grid;
  gap: 4px;
}

.name {
  font-weight: 700;
  font-size: 0.95rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tags {
  font-size: 0.8rem;
  opacity: 0.7;
}

.item-actions {
  display: flex;
  justify-content: flex-end;
}

.empty {
  padding: 22px 16px;
  border: 1px dashed var(--el-border-color);
  border-radius: 12px;
  text-align: center;
  opacity: 0.85;
}

.empty-title {
  font-weight: 800;
}

.empty-subtitle {
  margin-top: 6px;
  font-size: 0.9rem;
  opacity: 0.75;
}
</style>
