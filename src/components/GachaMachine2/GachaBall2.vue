<script setup lang="ts">
import { computed, ref, watch, onUnmounted } from "vue";
import gsap from "gsap";
import type { Prize } from "../../types/gacha";
// 导入扭蛋分体素材
import ball1Top from "../../assets/扭蛋机组装素材/扭蛋分体素材/扭蛋1/扭蛋-1.png";
import ball1Bottom from "../../assets/扭蛋机组装素材/扭蛋分体素材/扭蛋1/扭蛋-2.png";
import ball2Top from "../../assets/扭蛋机组装素材/扭蛋分体素材/扭蛋2/扭蛋-1.png";
import ball2Bottom from "../../assets/扭蛋机组装素材/扭蛋分体素材/扭蛋2/扭蛋-2.png";
import ball3Top from "../../assets/扭蛋机组装素材/扭蛋分体素材/扭蛋3/扭蛋-1.png";
import ball3Bottom from "../../assets/扭蛋机组装素材/扭蛋分体素材/扭蛋3/扭蛋-2.png";
import ball4Top from "../../assets/扭蛋机组装素材/扭蛋分体素材/扭蛋4/扭蛋-1.png";
import ball4Bottom from "../../assets/扭蛋机组装素材/扭蛋分体素材/扭蛋4/扭蛋-2.png";

defineOptions({
  inheritAttrs: false
});

const props = defineProps<{
  status: "idle" | "shaking" | "dropping" | "revealing" | "open";
  prize?: Prize | null;
  gateEl?: HTMLElement | null;
  ballIndex?: number; // 扭蛋素材索引（0-3）
  initialRotation?: number; // 弹窗扭蛋初始角度（与出奖口静止时一致）
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
// 存储 open 动画 timeline（用于反向回收）
let openTimeline: gsap.core.Timeline | null = null;

const isClosing = ref(false);
const locallyHidden = ref(false);
const skipNextLeaveAnimation = ref(false);

const reverseOpenIfNeeded = (): Promise<void> => {
  return new Promise((resolve) => {
    if (!openTimeline) {
      resolve();
      return;
    }

    // 若正在播放，直接从当前位置反向；若已结束，则从末尾反向
    openTimeline.eventCallback("onReverseComplete", () => {
      resolve();
    });
    openTimeline.reverse();
  });
};

const playCloseAndDrop = (): Promise<void> => {
  return new Promise((resolve) => {
    if (!ballRef.value) {
      resolve();
      return;
    }

    const el = ballRef.value;

    // 启用 GPU 加速
    gsap.set(el, { willChange: "transform, opacity", force3D: true });

    const offscreenY = Math.max(window.innerHeight * 0.9, 700);

    // 关闭弹窗时的“滑落式自然旋转”：根据下落速度动态顺时针旋转
    // 思路：y 由 GSAP 补间驱动；每帧用 dy/dt 估算速度，再转成角速度(°/s)累积到 rotation 上
    let lastY = Number(gsap.getProperty(el, "y")) || 0;
    let lastTime = performance.now();
    let rotationDeg = Number(gsap.getProperty(el, "rotation")) || 0;
    const setRotation = gsap.quickSetter(el, "rotation", "deg");

    const tl = gsap.timeline({
      onComplete: () => {
        gsap.set(el, { willChange: "auto" });
        resolve();
      },
    });

    // 先向上弹一下，然后直接下坠消失（不做回落过程）
    tl.to(el, { y: -36, duration: 0.18, ease: "power2.out" }, 0);
    // 直接下落消失出屏（从上弹的最高点无缝衔接）
    tl.to(
      el,
      {
        y: offscreenY,
        opacity: 0,
        scale: 2.5,
        duration: 0.8,
        ease: "power2.in",
        onStart: () => {
          lastY = Number(gsap.getProperty(el, "y")) || 0;
          lastTime = performance.now();
          rotationDeg = Number(gsap.getProperty(el, "rotation")) || 0;
        },
        onUpdate: () => {
          const now = performance.now();
          const dt = (now - lastTime) / 1000;
          if (dt <= 0) return;

          const y = Number(gsap.getProperty(el, "y")) || 0;
          const v = (y - lastY) / dt; // px/s，向下为正

          // 将速度映射为角速度（°/s），并限制上限，避免过快眩晕
          const omega = Math.min(1440, Math.max(0, v * 0.35));

          rotationDeg += omega * dt; // 顺时针累积
          setRotation(rotationDeg);

          lastY = y;
          lastTime = now;
        },
      },
      ">"
    );
  });
};

const handleConfirm = async () => {
  // 防止重复点击
  if (isClosing.value) return;
  isClosing.value = true;

  // 关闭期间不让内容闪动
  if (prizePaperRef.value) {
    prizePaperRef.value.style.pointerEvents = "none";
  }

  killAnimations();

  // 反向执行开启动画（纸条收起 + 上下半球回位）
  await reverseOpenIfNeeded();

  // 扭蛋关闭后模拟物理下落：上弹一下 → 下落出屏消失
  await playCloseAndDrop();

  // 已完成自定义离场动画，接下来通过 v-if 卸载，但跳过 Transition 的 leave 动画
  skipNextLeaveAnimation.value = true;
  locallyHidden.value = true;
  isClosing.value = false;

  emit("confirm");
};

const ballImages = [
  { top: ball1Top, bottom: ball1Bottom },
  { top: ball2Top, bottom: ball2Bottom },
  { top: ball3Top, bottom: ball3Bottom },
  { top: ball4Top, bottom: ball4Bottom },
];

const currentBallImages = computed(() => {
  const index = props.ballIndex ?? 0;
  return ballImages[index];
});

// 外部球：只在 revealing 和 open 阶段显示
const isVisible = computed(() => ["revealing", "open"].includes(props.status) && !locallyHidden.value);

// 清理动画
const killAnimations = () => {
  if (currentTimeline) {
    currentTimeline.kill();
    currentTimeline = null;
  }
};

// 执行 revealing 动画：从出奖口移动到屏幕中心并放大（带旋转和阴影效果）
const playRevealingAnimation = () => {
  if (!ballRef.value || !props.gateEl) return;

  const gate = props.gateEl;
  const rect = gate.getBoundingClientRect();
  const toMinRotationDeg = (deg: number) => {
    const v = ((deg + 180) % 360 + 360) % 360; // [0, 360)
    return v - 180; // (-180, 180]
  };
  const initialRotation = toMinRotationDeg(Number(props.initialRotation ?? 0) || 0);

  // 启用 GPU 加速
  gsap.set(ballRef.value, {
    willChange: "transform, opacity",
    force3D: true
  });

  // 设置初始位置（出奖口位置）
  gsap.set(ballRef.value, {
    position: "fixed",
    top: rect.top + rect.height / 2 - 23,
    left: rect.left + rect.width / 2 - 23,
    scale: 1,
    opacity: 1,
    rotation: initialRotation
  });

  // 设置初始阴影（通过 CSS 变量）
  ballRef.value.style.setProperty("--shadow-opacity", "0.2");
  ballRef.value.style.setProperty("--shadow-blur", "8px");
  ballRef.value.style.setProperty("--shadow-spread", "2px");

  // 创建 revealing 动画 timeline
  currentTimeline = gsap.timeline();

  // 移动到屏幕中心并放大，带阴影动画
  currentTimeline.to(ballRef.value, {
    top: "50%",
    left: "50%",
    xPercent: -50,
    yPercent: -50,
    scale: 3,
    rotation: 0, // 使用最小旋转角归正到 0
    duration: 1.0,
    ease: "power2.out"
  });

  // 同时动画阴影（通过 CSS 变量）
  currentTimeline.to(ballRef.value, {
    "--shadow-opacity": "0.4",
    "--shadow-blur": "30px",
    "--shadow-spread": "10px",
    duration: 1.0,
    ease: "power2.out"
  }, 0);
};

// 执行 open 动画：扭蛋打开，纸条展开（使用真实分体素材）
const playOpenAnimation = () => {
  if (!topHalfRef.value || !bottomHalfRef.value || !prizePaperRef.value) return;

  // 启用 GPU 加速
  gsap.set([topHalfRef.value, bottomHalfRef.value, prizePaperRef.value], {
    willChange: "transform, opacity",
    force3D: true
  });

  openTimeline = gsap.timeline();
  currentTimeline = openTimeline;

  // 上半球向上移动、旋转和缩放
  openTimeline.to(topHalfRef.value, {
    y: -60,
    rotation: -25,
    scale: 1.1,
    opacity: 0.9,
    duration: 0.6,
    ease: "back.out(1.7)"
  }, 0);

  // 下半球向下移动、旋转和缩放
  openTimeline.to(bottomHalfRef.value, {
    y: 60,
    rotation: 25,
    scale: 1.1,
    opacity: 0.9,
    duration: 0.6,
    ease: "back.out(1.7)"
  }, 0);

  // 纸条展开（稍微延迟，带弹性效果）
  openTimeline.to(prizePaperRef.value, {
    width: 140,
    height: 110,
    padding: 10,
    opacity: 1,
    duration: 0.5,
    ease: "back.out(1.4)"
  }, 0.2);

  // 纸条内容淡入
  const paperContent = prizePaperRef.value.querySelector('.prize-content');
  if (paperContent) {
    openTimeline.fromTo(paperContent,
      { opacity: 0, y: 10 },
      { opacity: 1, y: 0, duration: 0.3, ease: "power2.out" },
      0.4
    );
  }
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
    onComplete: () => {
      // 清理 will-change
      gsap.set(ballRef.value, { willChange: "auto" });
      done();
    }
  });
};

// 重置所有元素状态
const resetElements = () => {
  if (topHalfRef.value) {
    gsap.set(topHalfRef.value, { y: 0, rotation: 0, scale: 1, opacity: 1 });
  }
  if (bottomHalfRef.value) {
    gsap.set(bottomHalfRef.value, { y: 0, rotation: 0, scale: 1, opacity: 1 });
  }
  if (prizePaperRef.value) {
    gsap.set(prizePaperRef.value, { width: 0, height: 0, padding: 0, opacity: 0 });
    prizePaperRef.value.style.pointerEvents = "";
  }
  if (ballRef.value) {
    gsap.set(ballRef.value, { y: 0, rotation: 0, opacity: 1 });
  }
};

// 监听状态变化
watch(() => props.status, (newStatus, oldStatus) => {
  // 从非 visible 状态进入 revealing
  if (newStatus === "revealing" && !["revealing", "open"].includes(oldStatus || "")) {
    // 等待 DOM 渲染后执行动画
    requestAnimationFrame(() => {
      locallyHidden.value = false;
      isClosing.value = false;
      skipNextLeaveAnimation.value = false;
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
    openTimeline = null;
    locallyHidden.value = false;
    isClosing.value = false;
    skipNextLeaveAnimation.value = false;
    // 清理 will-change
    if (ballRef.value) {
      gsap.set(ballRef.value, { willChange: "auto" });
    }
    if (topHalfRef.value) {
      gsap.set(topHalfRef.value, { willChange: "auto" });
    }
    if (bottomHalfRef.value) {
      gsap.set(bottomHalfRef.value, { willChange: "auto" });
    }
    if (prizePaperRef.value) {
      gsap.set(prizePaperRef.value, { willChange: "auto" });
    }
  }
});

// Vue Transition hooks
const onEnter = (el: Element, done: () => void) => {
  gsap.set(el, { opacity: 1 });
  done();
};

const onLeave = (_el: Element, done: () => void) => {
  if (skipNextLeaveAnimation.value) {
    skipNextLeaveAnimation.value = false;
    done();
    return;
  }
  playLeaveAnimation(done);
};

onUnmounted(() => {
  killAnimations();
});
</script>

<template>
  <Teleport to="body">
    <Transition :css="false" @enter="onEnter" @leave="onLeave">
      <div v-if="isVisible" ref="ballRef" class="gacha-ball">
        <img ref="topHalfRef" :src="currentBallImages.top" alt="Gacha Ball Top" class="ball-half top" />
        <img ref="bottomHalfRef" :src="currentBallImages.bottom" alt="Gacha Ball Bottom" class="ball-half bottom" />
        <div ref="prizePaperRef" class="prize-paper">
          <div class="prize-content">
            <div v-if="prize?.showInLuckyWinners !== false" class="prize-title">Congratulations</div>
            <div class="prize-name">{{ prize?.name || 'Mystery Prize' }}</div>
            <button class="confirm-btn" :disabled="isClosing" @click="handleConfirm">Confirm</button>
          </div>
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
  transform-style: preserve-3d;
  z-index: 100;
  /* GPU 加速优化 */
  will-change: transform, opacity;
  transform: translate3d(0, 0, 0);
  /* 动态阴影 */
  --shadow-opacity: 0.2;
  --shadow-blur: 8px;
  --shadow-spread: 2px;
  filter: drop-shadow(0 var(--shadow-spread) var(--shadow-blur) rgba(0, 0, 0, var(--shadow-opacity)));
}

.ball-half {
  position: absolute;
  width: 100%;
  height: 50%;
  left: 0;
  object-fit: cover;
  z-index: 2;
  /* GPU 加速 */
  will-change: transform, opacity;
  transform: translate3d(0, 0, 0);
}

.ball-half.top {
  top: 0;
  transform-origin: center bottom;
}

.ball-half.bottom {
  bottom: 0;
  transform-origin: center top;
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
  opacity: 0;
  border-radius: 8px;
  /* GPU 加速 */
  will-change: transform, width, height, padding, opacity;
}

.prize-content {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  opacity: 0;
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

.confirm-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.confirm-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(214, 92, 92, 0.4);
}

.confirm-btn:active {
  transform: scale(0.98);
}
</style>
