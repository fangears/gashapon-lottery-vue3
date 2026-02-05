<script setup lang="ts">
import { computed, ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { useGachaMachine } from "../composables/useGachaMachine";
import { useGachaStore } from "../stores/gacha";
import { useImageLibraryStore } from "../stores/imageLibrary";
import type { Prize } from "../types/gacha";
import GachaMachine2 from "../components/GachaMachine2/index.vue";
import FilmStrip from "../components/FilmStrip/FilmStrip.vue";
import WinnerBubbleList from "../components/WinnerBubbleList.vue";

type MachineStatus = "idle" | "shaking" | "dropping" | "revealing" | "open";

const store = useGachaStore();
const imageStore = useImageLibraryStore();
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

/** 当开启「填写社媒账号」时，校验社媒账号是否已在历史记录中（不可重复） */
const isSocialAccountDuplicate = (account: string) => {
  if (!account.trim()) return false;
  const normalized = account.trim().toLowerCase();
  return store.history.some(
    (r) => r.socialAccount != null && r.socialAccount.trim().toLowerCase() === normalized
  );
};

// 检查是否有胶片图片
const hasFilmImages = computed(() => (store.config.filmImageIds ?? []).some((id) => Boolean(imageStore.getUrl(id))));

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

const resetFlow = async (waitMs = 0) => {
  if (waitMs > 0) await delay(waitMs);
  status.value = "idle";
  activePrize.value = null;
  // 每次抽奖流程结束后清空邮箱和社媒账号，方便下一次重新填写
  email.value = "";
  socialAccount.value = "";
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

  // Phase 2: Drop the ball (Animation in InnerBall2)
  // 时序：掉落 300ms + 回弹 180ms + 再次落下 180ms + 小回弹 120ms + 最终静止 120ms = 900ms
  status.value = "dropping";
  await delay(900); // Wait for drop + bounce + delay

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
  await delay(1000); // Wait for move-to-center animation (优化后为 1000ms)

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
    await resetFlow(0);
  }
};

const handleStart = () => {
  // 若开启“填写社媒账号开始抽奖”，每次点击开始都弹出社媒填写弹窗
  if (config.value.requireSocialAccount) {
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
  if (isSocialAccountDuplicate(socialAccount.value)) {
    ElMessage.warning("This social media account has already participated in the lottery and cannot be used again.");
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
  await resetFlow(0);
};

// 取消邮箱填写（需要二次确认）
const cancelEmail = async () => {
  try {
    await ElMessageBox.confirm(
      "Are you sure you don't want to enter your email? Canceling will not record your email information.",
      "Confirm Cancel",
      {
        confirmButtonText: "Confirm Cancel",
        cancelButtonText: "Continue",
        type: "warning",
      }
    );
    // 用户确认取消，不录入邮箱字段
    if (activePrize.value) {
      email.value = ""; // 清空邮箱
      finalizeRecord(activePrize.value);
    }
    showEmailDialog.value = false;
    await resetFlow(0);
  } catch {
    // 用户选择继续填写，保持邮箱弹窗打开
  }
};
</script>

<template>
  <main class="page-container gacha-page">
    <section class="gacha-layout">
      <!-- 左侧中奖气泡列表（有记录时才显示） -->
      <div class="gacha-side gacha-side--left" v-if="store.history.length" data-enter="left">
        <WinnerBubbleList :records="store.history" />
      </div>
      <div v-else class="gacha-side" data-enter="left"></div>

      <!-- 中间扭蛋机 -->
      <div class="gacha-center" data-enter="up" data-enter-order="1">
        <GachaMachine2 :status="status" :prize="activePrize" :disabled="!canStart" @start="handleStart"
          @confirm="handlePrizeConfirm" />
      </div>

      <!-- 右侧空元素 -->
      <div v-if="hasFilmImages" class="gacha-side gacha-side--right" data-enter="right" data-enter-order="2">
        <FilmStrip />
      </div>
      <div v-else class="gacha-side" data-enter="right" data-enter-order="2"></div>
    </section>

    <el-dialog v-model="showSocialDialog" title="Enter Social Media Account" width="360px">
      <el-input v-model="socialAccount" placeholder="Please enter your social media account" />
      <template #footer>
        <el-button @click="showSocialDialog = false">Cancel</el-button>
        <el-button type="primary" @click="confirmSocial">Continue</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showEmailDialog" title="Enter Email" width="360px" :close-on-click-modal="false"
      :close-on-press-escape="false" :show-close="false">
      <el-input v-model="email" placeholder="Please enter your email address" />
      <template #footer>
        <el-button @click="cancelEmail">Cancel</el-button>
        <el-button type="primary" @click="confirmEmail">Submit</el-button>
      </template>
    </el-dialog>
  </main>
</template>

<style scoped>
.page-container {
  height: 100vh;
}

.gacha-page {
  display: grid;
  gap: var(--space-2xl);
  /* Ensure full height for better centering like reference */
  place-items: center;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}

.gacha-layout {
  display: flex;
  flex-wrap: nowrap;
  width: 100%;
  height: 100%;
}

.gacha-side {
  flex: 1 1 33.333%;
  width: 33.333%;
  height: 100%;
}

.gacha-side--right {
  display: flex;
  justify-content: flex-start;
  align-items: center;
  padding-left: 60px;
}

.gacha-side--left {
  display: flex;
  justify-content: flex-end;
  align-items: center;
}

.gacha-center {
  flex: 1 1 33.333%;
  width: 33.333%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}
</style>
