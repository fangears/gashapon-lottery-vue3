<script setup lang="ts">
import { computed, watch } from "vue";
import type { Prize } from "../../types/gacha";

// Define inheritAttrs in a separate normal script block
defineOptions({
  inheritAttrs: false
});

const props = defineProps<{
  status: "idle" | "shaking" | "dropping" | "revealing" | "open";
  prize?: Prize | null;
  gateEl?: HTMLElement | null;
}>();

const ballColor = computed(() => {
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7D794'];
  const seed = props.prize?.id || props.prize?.name || Math.random().toString();
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash + seed.charCodeAt(i)) % 1000;
  }
  return colors[hash % colors.length];
});

const isVisible = computed(() => ["dropping", "revealing", "open"].includes(props.status));

const centeredStyle = {
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%) scale(3)',
  transition: 'all 0.8s cubic-bezier(0.25, 1, 0.5, 1)'
};

// Transition hooks
const onEnter = (el: Element, done: () => void) => {
  const element = el as HTMLElement;
  const gate = props.gateEl;
  
  if (!gate) {
    done();
    return;
  }

  // Phase 1: Drop into gate
  const rect = gate.getBoundingClientRect();
  const startTop = rect.top - 60;
  const endTop = rect.top + 12; // 12px padding inside gate
  const left = rect.left + 12;

  // Initial position (above gate)
  element.style.position = 'fixed';
  element.style.left = `${left}px`;
  element.style.top = `${startTop}px`;
  element.style.transform = 'translate(0, 0) scale(1)';
  element.style.transition = 'top 0.6s cubic-bezier(0.5, 0, 0.75, 0)';
  element.style.zIndex = '100';

  // Force reflow
  void element.offsetWidth;

  // Animate drop
  element.style.top = `${endTop}px`;

  // Wait for drop to finish (600ms match CSS)
  setTimeout(() => {
    done();
  }, 600);
};

// We don't need a complex watch if we use the :style binding in template for the 'revealing' phase
</script>

<template>
  <Teleport to="body">
    <Transition
      name="ball-drop"
      :css="false"
      @enter="onEnter"
    >
      <div
        v-if="isVisible"
        class="gacha-ball"
        :class="{ 'open': status === 'open' }"
        :style="[
          { '--ball-color': ballColor },
          (status === 'revealing' || status === 'open') ? centeredStyle : {}
        ]"
      >
        <div class="ball-half top"></div>
        <div class="ball-half bottom"></div>
        <div class="prize-paper">
          <div class="prize-title">Congratulations</div>
          <div class="prize-name">{{ prize?.name || 'Mystery Prize' }}</div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.gacha-ball {
  position: fixed;
  width: 46px;
  height: 46px;
  border-radius: 50%;
  transform-style: preserve-3d;
  z-index: 100;
  /* Initial state is handled by JS hooks in onEnter, 
     but when 'revealing' style kicks in, we want smooth transition. 
     The 'centeredStyle' object has a transition property. */
}

.gacha-ball.open .ball-half.top {
  transform: translateY(-40px) rotate(-15deg);
  opacity: 0.8;
}

.gacha-ball.open .ball-half.bottom {
  transform: translateY(40px) rotate(15deg);
  opacity: 0.8;
}

.gacha-ball.open .prize-paper {
  width: 140px;
  height: 80px;
  font-size: 14px;
  padding: 10px;
  z-index: 10;
}

.ball-half {
  position: absolute;
  width: 100%;
  height: 50%;
  left: 0;
  box-sizing: border-box;
  border: 2px solid rgba(0,0,0,0.1);
  background: var(--ball-color, #ff6b6b);
  transition: transform 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.5s;
  z-index: 2;
}

.ball-half.top {
  top: 0;
  border-radius: 23px 23px 0 0;
  border-bottom: none;
  background: radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.8), transparent),
    var(--ball-color);
}

.ball-half.bottom {
  bottom: 0;
  border-radius: 0 0 23px 23px;
  border-top: 1px solid rgba(0, 0, 0, 0.1);
  background: #ffffff;
}

.prize-paper {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  background: #fffdf0;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  font-weight: 700;
  color: #d65c5c;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
  font-size: 0;
  overflow: hidden;
  transition: all 0.5s 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  z-index: 1;
  border: 2px solid #e0c090;
  padding: 0;
}

.prize-title {
  font-size: 12px;
  opacity: 0.8;
  margin-bottom: 4px;
}

.prize-name {
  font-size: 16px;
  line-height: 1.2;
  white-space: pre-line;
}
</style>
