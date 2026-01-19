<script setup lang="ts">
defineProps<{ disabled?: boolean; active?: boolean }>();
</script>

<template>
  <button class="knob-button" :class="{ active }" :disabled="disabled" type="button" aria-label="开始抽奖">
    <span class="knob-text">PUSH</span>
  </button>
</template>

<style scoped>
.knob-button {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  border: none;
  background: #fff;
  box-shadow: 0 6px 0 #ccc, 0 10px 10px rgba(0, 0, 0, 0.2);
  cursor: pointer;
  position: absolute;
  left: 50%;
  top: 30px;
  transform: translateX(-50%);
  transition: transform 0.1s;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

.knob-button::before {
  content: "";
  position: absolute;
  width: 90%;
  height: 20px;
  background: #e0e0e0;
  border-radius: 10px;
  transform: rotate(90deg);
  z-index: -1;
}

.knob-text {
  font-weight: 700;
  font-size: 16px;
  color: var(--machine-dark, #d65c5c);
  letter-spacing: 0.6px;
}

.knob-button:active {
  box-shadow: 0 2px 0 #ccc, 0 4px 4px rgba(0, 0, 0, 0.2);
  transform: translateX(-50%) translateY(4px);
}

.knob-button.active {
  animation: rotateKnob 0.5s ease-in-out infinite;
  pointer-events: none;
}

.knob-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

@keyframes rotateKnob {
  0% {
    transform: translateX(-50%) rotate(0deg);
  }
  25% {
    transform: translateX(-50%) rotate(20deg);
  }
  75% {
    transform: translateX(-50%) rotate(-20deg);
  }
  100% {
    transform: translateX(-50%) rotate(0deg);
  }
}
</style>
