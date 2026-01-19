<script setup lang="ts">
import { computed, ref } from "vue";
import { ElMessage } from "element-plus";
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
  
  // Phase 2: Drop the ball (Animation in GachaBall triggered by transition)
  status.value = "dropping";
  await delay(600); // Wait for drop animation to complete

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

  if (prize.needEmail) {
    showEmailDialog.value = true;
  } else {
    // Auto-close if no interaction needed? 
    // Usually keep it open for a bit or wait for user to click.
    // The reference HTML has a "reset" button on the prize paper, but our logic flows automatically or via dialogs.
    // We'll mimic the flow: wait a bit then finalize.
    await delay(2000);
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
</script>

<template>
  <main class="page-container gacha-page">
    <section class="gacha-layout">
      <!-- Refactored usage of GachaMachine -->
      <GachaMachine :status="status" :prize="activePrize" :disabled="!canStart" @start="handleStart" />
    </section>

    <el-dialog v-model="showSocialDialog" title="Enter Social Media Account" width="360px">
      <el-input v-model="socialAccount" placeholder="Please enter your social media account" />
      <template #footer>
        <el-button @click="showSocialDialog = false">Cancel</el-button>
        <el-button type="primary" @click="confirmSocial">Continue</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showEmailDialog" title="Enter Email" width="360px">
      <el-input v-model="email" placeholder="Please enter your email" />
      <template #footer>
        <el-button @click="showEmailDialog = false">Later</el-button>
        <el-button type="primary" @click="confirmEmail">Submit</el-button>
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
