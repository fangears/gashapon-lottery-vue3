<script setup lang="ts">
import { computed, watch, ref } from "vue";
import { ElMessage } from "element-plus";
import { Plus } from "@element-plus/icons-vue";
import { useGachaStore } from "../stores/gacha";

const store = useGachaStore();
const config = computed(() => store.config);

const timezones = [
  { label: "中国（上海）", value: "Asia/Shanghai" },
  { label: "美国（洛杉矶）", value: "America/Los_Angeles" },
  { label: "美国（拉斯维加斯）", value: "America/Las_Vegas" },
];

const addPrize = () => store.addPrize();

const removePrize = (index: number) => {
  if (config.value.prizes.length <= 1) {
    ElMessage.warning("至少保留一个奖品。");
    return;
  }
  store.removePrize(index);
};

// 图片预览相关
const previewVisible = ref(false);
const previewImageUrl = ref("");

const handlePreview = (url: string) => {
  previewImageUrl.value = url;
  previewVisible.value = true;
};

// 处理图片上传，将图片转换为 Base64 保存到本地
const handleImageUpload = (file: File, index: number): Promise<boolean> => {
  return new Promise((resolve) => {
    // 验证文件类型
    const isImage = file.type.startsWith("image/");
    if (!isImage) {
      ElMessage.error("只能上传图片文件！");
      resolve(false);
      return;
    }

    // 验证文件大小（限制 2MB）
    const isLt2M = file.size / 1024 / 1024 < 2;
    if (!isLt2M) {
      ElMessage.error("图片大小不能超过 2MB！");
      resolve(false);
      return;
    }

    // 将图片转换为 Base64
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      store.updatePrize(index, { imageUrl: base64 });
      ElMessage.success("图片上传成功！");
      resolve(false); // 返回 false 阻止默认上传行为
    };
    reader.onerror = () => {
      ElMessage.error("图片读取失败！");
      resolve(false);
    };
    reader.readAsDataURL(file);
  });
};

const removeImage = (index: number) => {
  store.updatePrize(index, { imageUrl: "" });
};

watch(
  () => config.value.useStockAsWeight,
  (useStock) => {
    if (useStock) {
      config.value.prizes.forEach((prize, index) => {
        if (prize.stock < 1) {
          store.updatePrize(index, { stock: 1 });
        }
      });
    }
  }
);
</script>

<template>
  <main class="page-container admin-page">
    <section class="hero">
      <h1 class="hero-title">后台管理</h1>
      <p class="hero-subtitle">配置抽奖规则与奖品池，右键 Ctrl+右键可切换页面。</p>
    </section>

    <section class="card admin-config">
      <h2>抽奖配置</h2>
      <el-form label-width="160px">
        <el-form-item label="填写社媒账号开始抽奖">
          <el-switch v-model="config.requireSocialAccount" />
        </el-form-item>
        <el-form-item label="库存决定中奖概率">
          <el-switch v-model="config.useStockAsWeight" />
        </el-form-item>
        <el-form-item label="时区">
          <el-select v-model="config.timezone" placeholder="请选择时区" style="width: 240px">
            <el-option v-for="item in timezones" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
      </el-form>
    </section>

    <section class="card admin-prizes">
      <div class="prize-header">
        <h2>奖品配置</h2>
        <el-button type="primary" @click="addPrize">新增奖品</el-button>
      </div>
      <el-table :data="config.prizes" style="width: 100%">
        <el-table-column label="图片" width="120">
          <template #default="{ row, $index }">
            <div class="image-uploader">
              <div v-if="row.imageUrl" class="image-preview-container">
                <el-image
                  :src="row.imageUrl"
                  fit="cover"
                  class="preview-image"
                  @click="handlePreview(row.imageUrl)"
                />
                <div class="image-actions">
                  <el-button
                    type="danger"
                    :icon="'Delete'"
                    size="small"
                    circle
                    @click="removeImage($index)"
                  />
                </div>
              </div>
              <el-upload
                v-else
                class="avatar-uploader"
                :show-file-list="false"
                :before-upload="(file: File) => handleImageUpload(file, $index)"
                accept="image/*"
              >
                <div class="upload-placeholder">
                  <el-icon><Plus /></el-icon>
                </div>
              </el-upload>
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
            <el-input
              v-model="row.description"
              type="textarea"
              :rows="2"
              placeholder="描述"
              resize="none"
            />
          </template>
        </el-table-column>
        <el-table-column label="库存" width="160">
          <template #default="{ row }">
            <el-input-number
              v-model="row.stock"
              :min="config.useStockAsWeight ? 1 : -1"
              :step="1"
              controls-position="right"
              style="width: 100%"
            />
          </template>
        </el-table-column>
        <el-table-column label="权重" width="160">
          <template #default="{ row }">
            <el-input-number
              v-model="row.weight"
              :min="1"
              :step="1"
              controls-position="right"
              style="width: 100%"
            />
          </template>
        </el-table-column>
        <el-table-column label="需要邮箱" width="100">
          <template #default="{ row }">
            <el-switch v-model="row.needEmail" />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="80">
          <template #default="{ $index }">
            <el-button type="danger" plain @click="removePrize($index)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 图片预览对话框 -->
      <el-dialog v-model="previewVisible" title="图片预览" width="500px">
        <img :src="previewImageUrl" alt="预览图片" style="width: 100%" />
      </el-dialog>
      <p class="prize-tip">
        库存为 0 时中奖概率为 0；库存为 -1 时忽略库存限制。启用库存模式后，库存必须 ≥ 1。
      </p>
    </section>
  </main>
</template>

<style scoped>
.admin-page {
  display: grid;
  gap: var(--space-2xl);
}

.admin-config,
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
}

.upload-placeholder:hover {
  border-color: var(--el-color-primary);
}

.upload-placeholder .el-icon {
  font-size: 24px;
  color: var(--el-text-color-secondary);
}
</style>
