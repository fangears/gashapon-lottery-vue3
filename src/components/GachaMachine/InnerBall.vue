<script setup lang="ts">
import { computed } from "vue";
import type { Prize } from "../../types/gacha";

const props = defineProps<{
  status: "idle" | "shaking" | "dropping" | "revealing" | "open";
  prize?: Prize | null;
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

// 只在 dropping 阶段显示
const isVisible = computed(() => props.status === "dropping");

// 掉落动画：匀速掉落 + 小回弹
const onEnter = (el: Element, done: () => void) => {
  const element = el as HTMLElement;
  
  // 阶段1：匀速掉落 (300ms)
  element.style.transform = 'translateX(-50%) translateY(-120%)';
  element.style.transition = 'transform 0.3s linear';
  
  // 强制重排
  void element.offsetWidth;
  
  // 开始掉落到底部
  element.style.transform = 'translateX(-50%) translateY(0)';
  
  // 阶段2：回弹动画 (掉落完成后开始)
  setTimeout(() => {
    // 回弹向上 (120ms)
    element.style.transition = 'transform 0.12s ease-out';
    element.style.transform = 'translateX(-50%) translateY(-12px)';
    
    // 回弹落下 (120ms)
    setTimeout(() => {
      element.style.transition = 'transform 0.12s ease-in';
      element.style.transform = 'translateX(-50%) translateY(0)';
      
      // 动画完全结束
      setTimeout(() => {
        done();
      }, 120);
    }, 120);
  }, 300);
};
</script>

<template>
  <Transition
    :css="false"
    @enter="onEnter"
  >
    <div
      v-if="isVisible"
      class="inner-ball"
      :style="{ '--ball-color': ballColor }"
    >
      <div class="ball-half top"></div>
      <div class="ball-half bottom"></div>
    </div>
  </Transition>
</template>

<style scoped>
.inner-ball {
  position: absolute;
  width: 46px;
  height: 46px;
  border-radius: 50%;
  /* 居中在出奖口底部 */
  bottom: 12px;
  left: 50%;
  transform: translateX(-50%) translateY(-120%);
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
</style>
