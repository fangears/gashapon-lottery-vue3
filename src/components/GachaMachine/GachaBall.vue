<script setup lang="ts">
import { computed, ref, watch, onUnmounted } from "vue";
import gsap from "gsap";
import type { Prize } from "../../types/gacha";

defineOptions({
  inheritAttrs: false
});

const props = defineProps<{
  status: "idle" | "shaking" | "dropping" | "revealing" | "open";
  prize?: Prize | null;
  gateEl?: HTMLElement | null;
}>();

const emit = defineEmits<{
  (event: "confirm"): void;
}>();

const ballRef = ref<HTMLElement | null>(null);
const topHalfRef = ref<HTMLElement | null>(null);
const bottomHalfRef = ref<HTMLElement | null>(null);
const prizePaperRef = ref<HTMLElement | null>(null);

// 存储当前动画 timeline，便于清理
let currentTimeline: gsap.core.Timeline | null = null;

const handleConfirm = () => {
  emit("confirm");
};

const ballColor = computed(() => {
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7D794'];
  const seed = props.prize?.id || props.prize?.name || Math.random().toString();
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash + seed.charCodeAt(i)) % 1000;
  }
  return colors[hash % colors.length];
});

// 外部球：只在 revealing 和 open 阶段显示
const isVisible = computed(() => ["revealing", "open"].includes(props.status));

// 清理动画
const killAnimations = () => {
  if (currentTimeline) {
    currentTimeline.kill();
    currentTimeline = null;
  }
};

// 执行 revealing 动画：从出奖口移动到屏幕中心并放大
const playRevealingAnimation = () => {
  if (!ballRef.value || !props.gateEl) return;

  const gate = props.gateEl;
  const rect = gate.getBoundingClientRect();

  // 设置初始位置（出奖口位置）
  gsap.set(ballRef.value, {
    position: "fixed",
    top: rect.top + rect.height / 2 - 23,
    left: rect.left + rect.width / 2 - 23,
    scale: 1,
    opacity: 1
  });

  // 创建 revealing 动画 timeline
  currentTimeline = gsap.timeline();

  // 移动到屏幕中心并放大
  currentTimeline.to(ballRef.value, {
    top: "50%",
    left: "50%",
    xPercent: -50,
    yPercent: -50,
    scale: 3,
    duration: 0.8,
    ease: "power2.out"
  });
};

// 执行 open 动画：扭蛋打开，纸条展开
const playOpenAnimation = () => {
  if (!topHalfRef.value || !bottomHalfRef.value || !prizePaperRef.value) return;

  currentTimeline = gsap.timeline();

  // 上半球向上移动并旋转
  currentTimeline.to(topHalfRef.value, {
    y: -40,
    rotation: -15,
    opacity: 0.8,
    duration: 0.6,
    ease: "back.out(1.7)"
  }, 0);

  // 下半球向下移动并旋转
  currentTimeline.to(bottomHalfRef.value, {
    y: 40,
    rotation: 15,
    opacity: 0.8,
    duration: 0.6,
    ease: "back.out(1.7)"
  }, 0);

  // 纸条展开（稍微延迟）
  currentTimeline.to(prizePaperRef.value, {
    width: 140,
    height: 110,
    padding: 10,
    duration: 0.5,
    ease: "back.out(1.4)"
  }, 0.2);
};

// 执行离开动画
const playLeaveAnimation = (done: () => void) => {
  if (!ballRef.value) {
    done();
    return;
  }

  killAnimations();

  gsap.to(ballRef.value, {
    opacity: 0,
    scale: 2.5,
    duration: 0.3,
    ease: "power2.in",
    onComplete: done
  });
};

// 重置所有元素状态
const resetElements = () => {
  if (topHalfRef.value) {
    gsap.set(topHalfRef.value, { y: 0, rotation: 0, opacity: 1 });
  }
  if (bottomHalfRef.value) {
    gsap.set(bottomHalfRef.value, { y: 0, rotation: 0, opacity: 1 });
  }
  if (prizePaperRef.value) {
    gsap.set(prizePaperRef.value, { width: 0, height: 0, padding: 0 });
  }
};

// 监听状态变化
watch(() => props.status, (newStatus, oldStatus) => {
  // 从非 visible 状态进入 revealing
  if (newStatus === "revealing" && !["revealing", "open"].includes(oldStatus || "")) {
    // 等待 DOM 渲染后执行动画
    requestAnimationFrame(() => {
      resetElements();
      playRevealingAnimation();
    });
  }
  // 进入 open 状态
  else if (newStatus === "open" && oldStatus === "revealing") {
    playOpenAnimation();
  }
  // 重置到 idle
  else if (newStatus === "idle") {
    killAnimations();
  }
});

// Vue Transition hooks
const onEnter = (el: Element, done: () => void) => {
  gsap.set(el, { opacity: 1 });
  done();
};

const onLeave = (_el: Element, done: () => void) => {
  playLeaveAnimation(done);
};

onUnmounted(() => {
  killAnimations();
});
</script>

<template>
  <Teleport to="body">
    <Transition :css="false" @enter="onEnter" @leave="onLeave">
      <div v-if="isVisible" ref="ballRef" class="gacha-ball" :style="{ '--ball-color': ballColor }">
        <div ref="topHalfRef" class="ball-half top"></div>
        <div ref="bottomHalfRef" class="ball-half bottom"></div>
        <div ref="prizePaperRef" class="prize-paper">
          <div class="prize-title">Congratulations</div>
          <div class="prize-name">{{ prize?.name || 'Mystery Prize' }}</div>
          <button class="confirm-btn" @click="handleConfirm">确认</button>
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
}

.ball-half {
  position: absolute;
  width: 100%;
  height: 50%;
  left: 0;
  box-sizing: border-box;
  border: 2px solid rgba(0, 0, 0, 0.1);
  background: var(--ball-color, #ff6b6b);
  z-index: 2;
  /* 移除 CSS transition，完全由 GSAP 控制 */
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
  overflow: hidden;
  z-index: 1;
  border: 2px solid #e0c090;
  padding: 0;
  /* 移除 CSS transition，完全由 GSAP 控制 */
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

.confirm-btn {
  margin-top: 10px;
  padding: 6px 20px;
  font-size: 12px;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(135deg, #ff8e8e 0%, #d65c5c 100%);
  border: none;
  border-radius: 16px;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(214, 92, 92, 0.3);
  transition: all 0.2s ease;
}

.confirm-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(214, 92, 92, 0.4);
}

.confirm-btn:active {
  transform: scale(0.98);
}
</style>
