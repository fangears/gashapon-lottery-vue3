<script setup lang="ts">
import { computed, ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { useGachaMachine } from "../composables/useGachaMachine";
import { useGachaStore } from "../stores/gacha";
import type { Prize } from "../types/gacha";
import GachaMachine from "../components/GachaMachine/index.vue";

type MachineStatus = "idle" | "shaking" | "dropping" | "revealing" | "open";

const store = useGachaStore();
const { config, canDraw, drawPrize, buildRecord } = useGachaMachine();

const status = ref<MachineStatus>("idle");
const activePrize = ref<Prize | null>(null);
const socialAccount = ref("");
const email = ref("");
const showSocialDialog = ref(false);
const showEmailDialog = ref(false);
const isRunning = ref(false);
const pendingConfirm = ref(false); // 等待用户点击确认按钮

const canStart = computed(() => canDraw.value && !isRunning.value);

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const consumeStock = (prize: Prize) => {
  if (prize.stock <= 0) return;
  const index = store.config.prizes.findIndex((item) => item.id === prize.id);
  if (index >= 0) {
    store.updatePrize(index, { stock: store.config.prizes[index].stock - 1 });
  }
};

const finalizeRecord = (prize: Prize) => {
  const record = buildRecord(prize, socialAccount.value, email.value);
  store.addRecord(record);
  consumeStock(prize);
};

const resetFlow = async () => {
  await delay(800);
  status.value = "idle";
  activePrize.value = null;
  email.value = "";
  isRunning.value = false;
};

const startFlow = async () => {
  if (!canDraw.value) {
    ElMessage.warning("No prizes available. Please configure prizes in the admin panel first.");
    return;
  }
  isRunning.value = true;
  
  // Phase 1: Shake the machine
  status.value = "shaking";
  await delay(1200); 
  
  // Phase 2: Drop the ball (Animation in InnerBall)
  // 时序：掉落 300ms + 回弹 240ms + 静止后延迟 200ms = 740ms
  status.value = "dropping";
  await delay(750); // Wait for drop + bounce + delay

  // Draw prize logic
  const prize = drawPrize();
  if (!prize) {
    ElMessage.error("Draw failed. Please check the prize configuration.");
    status.value = "idle";
    isRunning.value = false;
    return;
  }
  activePrize.value = prize;

  // Phase 3: Reveal (Move to center)
  status.value = "revealing";
  await delay(800); // Wait for move-to-center animation

  // Phase 4: Open ball
  status.value = "open";
  pendingConfirm.value = true;
  // 等待用户点击确认按钮，不再自动关闭
};

// 处理中奖纸条确认按钮点击
const handlePrizeConfirm = async () => {
  if (!pendingConfirm.value || !activePrize.value) return;
  pendingConfirm.value = false;

  const prize = activePrize.value;
  
  if (prize.needEmail) {
    // 需要填写邮箱，弹出邮箱模态框
    showEmailDialog.value = true;
  } else {
    // 不需要邮箱，直接记录并关闭
    finalizeRecord(prize);
    await resetFlow();
  }
};

const handleStart = () => {
  if (config.value.requireSocialAccount && !socialAccount.value.trim()) {
    showSocialDialog.value = true;
    return;
  }
  startFlow();
};

const confirmSocial = () => {
  if (!socialAccount.value.trim()) {
    ElMessage.warning("Please enter your social media account to continue.");
    return;
  }
  showSocialDialog.value = false;
  startFlow();
};

const confirmEmail = async () => {
  if (!email.value.trim()) {
    ElMessage.warning("Email is required for this prize.");
    return;
  }
  if (activePrize.value) {
    finalizeRecord(activePrize.value);
  }
  showEmailDialog.value = false;
  await resetFlow();
};

// 取消邮箱填写（需要二次确认）
const cancelEmail = async () => {
  try {
    await ElMessageBox.confirm(
      "确定不填写邮箱吗？取消后将不会录入邮箱信息。",
      "确认取消",
      {
        confirmButtonText: "确定取消",
        cancelButtonText: "继续填写",
        type: "warning",
      }
    );
    // 用户确认取消，不录入邮箱字段
    if (activePrize.value) {
      email.value = ""; // 清空邮箱
      finalizeRecord(activePrize.value);
    }
    showEmailDialog.value = false;
    await resetFlow();
  } catch {
    // 用户选择继续填写，保持邮箱弹窗打开
  }
};
</script>

<template>
  <main class="page-container gacha-page">
    <section class="gacha-layout">
      <!-- Refactored usage of GachaMachine -->
      <GachaMachine :status="status" :prize="activePrize" :disabled="!canStart" @start="handleStart" @confirm="handlePrizeConfirm" />
    </section>

    <el-dialog v-model="showSocialDialog" title="Enter Social Media Account" width="360px">
      <el-input v-model="socialAccount" placeholder="Please enter your social media account" />
      <template #footer>
        <el-button @click="showSocialDialog = false">Cancel</el-button>
        <el-button type="primary" @click="confirmSocial">Continue</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showEmailDialog" title="填写邮箱" width="360px" :close-on-click-modal="false" :close-on-press-escape="false" :show-close="false">
      <el-input v-model="email" placeholder="请输入您的邮箱地址" />
      <template #footer>
        <el-button @click="cancelEmail">取消</el-button>
        <el-button type="primary" @click="confirmEmail">提交</el-button>
      </template>
    </el-dialog>
  </main>
</template>

<style scoped>
.gacha-page {
  display: grid;
  gap: var(--space-2xl);
  /* Ensure full height for better centering like reference */
  place-items: center;
  background-color: #fce4ec; /* Background from reference */
}

.gacha-layout {
  display: flex;
  justify-content: center;
  width: 100%;
}
</style>
