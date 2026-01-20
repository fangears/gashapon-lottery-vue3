<script setup lang="ts">
import { computed, ref } from "vue";
import gsap from "gsap";
import type { Prize } from "../../types/gacha";

const props = defineProps<{
  status: "idle" | "shaking" | "dropping" | "revealing" | "open";
  prize?: Prize | null;
}>();

const ballRef = ref<HTMLElement | null>(null);

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

// 使用 GSAP 实现掉落动画：匀速掉落 + 小回弹
const onEnter = (el: Element, done: () => void) => {
  const element = el as HTMLElement;
  
  // 创建 GSAP Timeline
  const tl = gsap.timeline({
    onComplete: done
  });

  // 设置初始位置（只设置 y，x 由 CSS left 控制居中）
  gsap.set(element, {
    y: -70 // 从出奖口顶部上方开始
  });

  // 阶段1：匀速掉落 (300ms)
  tl.to(element, {
    y: 0,
    duration: 0.3,
    ease: "none" // 匀速
  });

  // 阶段2：回弹向上 (120ms)
  tl.to(element, {
    y: -12,
    duration: 0.12,
    ease: "power2.out"
  });

  // 阶段3：回弹落下 (120ms)
  tl.to(element, {
    y: 0,
    duration: 0.12,
    ease: "power2.in"
  });
};

// 离开动画（淡出）
const onLeave = (el: Element, done: () => void) => {
  gsap.to(el, {
    opacity: 0,
    duration: 0.15,
    ease: "power1.out",
    onComplete: done
  });
};
</script>

<template>
  <Transition
    :css="false"
    @enter="onEnter"
    @leave="onLeave"
  >
    <div
      v-if="isVisible"
      ref="ballRef"
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
  /* 居中在出奖口底部 - 使用 calc 而非 transform 来避免与 GSAP 冲突 */
  bottom: 12px;
  left: calc(50% - 23px); /* 50% - 半径(46px/2) */
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
