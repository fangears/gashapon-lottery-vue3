<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { Prize } from "../../types/gacha";
import PhysicsCanvas from "./PhysicsCanvas.vue";
import GachaBall from "./GachaBall.vue";
import InnerBall from "./InnerBall.vue";
import ExitGate from "./ExitGate.vue";
import KnobButton from "./KnobButton.vue";
import OverlayMask from "./OverlayMask.vue";

type MachineStatus = "idle" | "shaking" | "dropping" | "revealing" | "open";

const props = defineProps<{
  status: MachineStatus;
  prize?: Prize | null;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  (event: "start"): void;
  (event: "confirm"): void;
}>();

const canvasRef = ref<InstanceType<typeof PhysicsCanvas> | null>(null);
const exitGateRef = ref<InstanceType<typeof ExitGate> | null>(null);
const isAnimating = computed(() => props.status !== "idle");
// Correctly access the exposed rootRef from ExitGate
const gateElement = computed(() => exitGateRef.value?.rootRef ?? null);

watch(
  () => props.status,
  async (status) => {
    if (status === "shaking") {
      await canvasRef.value?.shake(1200);
    }
  }
);
</script>

<template>
  <div class="gacha-machine-container">
    <div class="machine-body">
      <div class="top-lid" />
      <div class="glass-window">
        <PhysicsCanvas ref="canvasRef" />
      </div>
      <div class="controls">
        <ExitGate ref="exitGateRef" :active="isAnimating">
          <!-- 内部球：在出奖口内部掉落，被 overflow:hidden 裁剪 -->
          <InnerBall :status="status" :prize="prize" />
        </ExitGate>
        <KnobButton :disabled="disabled || isAnimating" :active="status === 'shaking'" @click="emit('start')" />
      </div>
    </div>
    <!-- 外部球：展示阶段，通过 Teleport 渲染到 body -->
    <GachaBall :status="status" :prize="prize" :gate-el="gateElement" @confirm="emit('confirm')" />
    <OverlayMask :active="status === 'revealing' || status === 'open'" />
  </div>
</template>

<style scoped>
.gacha-machine-container {
  /* Variables from HTML */
  --machine-color: #ff8e8e;
  --machine-dark: #d65c5c;
  --glass-border: rgba(255, 255, 255, 0.4);
  
  position: relative;
  display: flex;
  justify-content: center;
}

.machine-body {
  position: relative;
  width: 360px;
  height: 520px;
  background: var(--machine-color);
  border-radius: 40px 40px 20px 20px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2), inset 0 -10px 20px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  align-items: center;
  z-index: 1;
}

.top-lid {
  width: 150px;
  height: 30px;
  background: var(--machine-dark);
  border-radius: 20px 20px 0 0;
  position: absolute;
  top: -20px;
  left: 50%;
  transform: translateX(-50%);
  box-shadow: 0 5px 0 rgba(0, 0, 0, 0.1);
}

.glass-window {
  width: 300px;
  height: 300px;
  margin-top: 30px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  border: 8px solid var(--glass-border);
  position: relative;
  overflow: hidden;
  box-shadow: inset 0 10px 30px rgba(0, 0, 0, 0.1);
  background: radial-gradient(
    circle at 70% 30%,
    rgba(255, 255, 255, 0.8) 0%,
    rgba(255, 255, 255, 0.1) 20%,
    rgba(255, 255, 255, 0) 60%
  );
}

.controls {
  width: 100%;
  height: 180px;
  position: relative;
  margin-top: 10px;
}
</style>
