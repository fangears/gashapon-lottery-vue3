<script setup lang="ts">
import { ref } from 'vue';
defineProps<{ active?: boolean }>();

const rootRef = ref<HTMLElement | null>(null);
defineExpose({ rootRef });
</script>

<template>
  <div ref="rootRef" class="exit-gate" :class="{ active }">
    <div class="gate-door"></div>
  </div>
</template>

<style scoped>
.exit-gate {
  position: absolute;
  bottom: 20px;
  left: 20px;
  width: 70px;
  height: 70px;
  background: #333;
  border-radius: 10px 10px 30px 10px;
  box-shadow: inset 0 5px 10px rgba(0, 0, 0, 0.5);
  overflow: hidden;
  z-index: 5;
}

.exit-gate::after {
  content: "EXIT";
  color: #666;
  font-size: 10px;
  position: absolute;
  top: 5px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 2;
}

.gate-door {
    /* Optional: inner details if needed, otherwise empty is fine */
}
</style>
