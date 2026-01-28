<script setup lang="ts">
import { computed, ref } from "vue";
import { ElMessage } from "element-plus";
import { Plus } from "@element-plus/icons-vue";
import { useGachaStore } from "../../stores/gacha";

const store = useGachaStore();
const filmImages = computed(() => store.filmImages);

// 图片预览相关
const previewVisible = ref(false);
const previewImageUrl = ref("");
const handlePreview = (url: string) => {
  previewImageUrl.value = url;
  previewVisible.value = true;
};

const validateImage = (file: File) => {
  const isImage = file.type.startsWith("image/");
  if (!isImage) {
    ElMessage.error("只能上传图片文件！");
    return false;
  }
  return true;
};

// 处理图片上传，将图片转换为 Base64 并保存到 Tauri 文件系统
const handleFilmUpload = (file: File): Promise<boolean> => {
  return new Promise((resolve) => {
    if (!validateImage(file)) {
      resolve(false);
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const base64 = e.target?.result as string;
        await store.addFilmImage(base64, file.name);
        ElMessage.success("胶片图片上传成功！");
      } catch (error) {
        console.error("保存图片失败:", error);
        ElMessage.error("图片保存失败，请重试");
      }
      resolve(false); // 阻止默认上传
    };
    reader.onerror = () => {
      ElMessage.error("图片读取失败！");
      resolve(false);
    };
    reader.readAsDataURL(file);
  });
};

const removeFilmImage = async (index: number) => {
  await store.removeFilmImage(index);
};

const clearAll = async () => {
  await store.clearFilmImages();
  ElMessage.success("已清空所有胶片图片");
};
</script>

<template>
  <section class="card admin-film">
    <div class="film-header">
      <h2>胶片列表</h2>
      <div class="film-actions">
        <el-upload
          class="film-uploader"
          :show-file-list="false"
          :before-upload="(file: File) => handleFilmUpload(file)"
          accept="image/*"
          multiple
        >
          <el-button type="primary">
            <el-icon><Plus /></el-icon>
            上传图片
          </el-button>
        </el-upload>

        <el-button v-if="filmImages.length" type="danger" plain @click="clearAll">清空</el-button>
      </div>
    </div>

    <div v-if="filmImages.length" class="film-grid">
      <div v-for="(url, idx) in filmImages" :key="`${idx}-${url.slice(0, 18)}`" class="film-item">
        <el-image :src="url" fit="cover" class="film-thumb" @click="handlePreview(url)" />
        <div class="film-item-actions">
          <el-button type="danger" size="small" circle @click="removeFilmImage(idx)">删</el-button>
        </div>
      </div>
    </div>

    <div v-else class="film-empty">
      <div class="film-empty-title">暂无胶片图片</div>
      <div class="film-empty-subtitle">上传后会在抽奖页右侧胶片中循环滚动展示</div>
    </div>

    <el-dialog v-model="previewVisible" title="图片预览" width="500px">
      <img :src="previewImageUrl" alt="预览图片" style="width: 100%" />
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
</style>

