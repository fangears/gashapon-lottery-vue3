<script setup lang="ts">
import { computed } from "vue";
import gsap from "gsap";
import type { Prize } from "../../types/gacha";
// 导入扭蛋图片
import gachaBall1 from "../../assets/扭蛋机组装素材/扭蛋素材/1.png";
import gachaBall2 from "../../assets/扭蛋机组装素材/扭蛋素材/2.png";
import gachaBall3 from "../../assets/扭蛋机组装素材/扭蛋素材/3.png";
import gachaBall4 from "../../assets/扭蛋机组装素材/扭蛋素材/4.png";

const props = defineProps<{
  status: "idle" | "shaking" | "dropping" | "revealing" | "open";
  prize?: Prize | null;
  ballIndex?: number; // 扭蛋素材索引（0-3）
}>();

const emit = defineEmits<{
  (event: "rest", payload: { rotation: number }): void;
}>();

// 扭蛋图片数组
const gachaBallImages = [gachaBall1, gachaBall2, gachaBall3, gachaBall4];

const ballImage = computed(() => {
  const index = props.ballIndex ?? 0;
  return gachaBallImages[index];
});

// 只在 dropping 阶段显示
const isVisible = computed(() => props.status === "dropping");

// 高性能掉落动画：真实物理效果 + 旋转
const onEnter = (el: Element, done: () => void) => {
  const element = el as HTMLElement;

  // 启用 GPU 加速
  gsap.set(element, {
    willChange: "transform",
    force3D: true
  });

  // 创建 GSAP Timeline
  const tl = gsap.timeline({
    onComplete: () => {
      // 将落地静止时的角度告知外部，用于弹窗扭蛋衔接
      const rotation = Number(gsap.getProperty(element, "rotation")) || 0;
      emit("rest", { rotation });
      done();
    },
  });

  // 获取元素的实际高度，用于计算掉落距离和回弹距离
  const elementHeight = element.offsetHeight || 46; // 默认值作为后备
  const dropDistance = elementHeight * 1.5; // 从上方 1.5 倍高度的位置开始掉落
  const bounceHeight1 = elementHeight * 0.25; // 第一次回弹高度为元素高度的 25%
  const bounceHeight2 = elementHeight * 0.12; // 第二次回弹高度为元素高度的 12%

  // 设置初始位置和旋转
  gsap.set(element, {
    x: "-50%", // 保持水平居中
    y: -dropDistance, // 从出奖口顶部上方开始
    rotation: 0,
    transformOrigin: "center center"
  });

  // 阶段1：重力加速掉落 + 旋转 (300ms)
  tl.to(element, {
    y: 0,
    rotation: 360, // 完整旋转一圈
    duration: 0.3,
    ease: "power2.in" // 重力加速效果
  });

  // 阶段2：回弹向上 + 反向旋转 (180ms)
  tl.to(element, {
    y: -bounceHeight1,
    rotation: 360 + 60, // 继续旋转
    duration: 0.18,
    ease: "back.out(1.2)" // 弹性回弹
  });

  // 阶段3：再次落下 + 继续旋转 (180ms)
  tl.to(element, {
    y: 0,
    rotation: 360 + 120,
    duration: 0.18,
    ease: "power2.in"
  });

  // 阶段4：小回弹 (120ms)
  tl.to(element, {
    y: -bounceHeight2,
    rotation: 360 + 150,
    duration: 0.12,
    ease: "back.out(1.1)"
  });

  // 阶段5：最终静止 (120ms)
  tl.to(element, {
    y: 0,
    rotation: 360 + 180,
    duration: 0.12,
    ease: "power2.out"
  });
};

// 离开动画（淡出）
const onLeave = (el: Element, done: () => void) => {
  gsap.to(el, {
    opacity: 0,
    duration: 0.15,
    ease: "power1.out",
    onComplete: () => {
      // 清理 will-change
      gsap.set(el, { willChange: "auto" });
      done();
    }
  });
};
</script>

<template>
  <Transition :css="false" @enter="onEnter" @leave="onLeave">
    <div v-if="isVisible" class="inner-ball">
      <img :src="ballImage" alt="扭蛋" class="ball-image" />
    </div>
  </Transition>
</template>

<style scoped>
.inner-ball {
  position: absolute;
  /* 适配出奖口大小：宽度为父容器的 60%，高度自适应保持比例 */
  width: 60%;
  height: auto;
  aspect-ratio: 1;
  /* 居中在出奖口底部 - left 设置为 50%，x 轴居中由 GSAP 控制 */
  bottom: 8%;
  left: 50%;
  z-index: 10;
  /* GPU 加速优化 */
  will-change: transform;
  max-width: 100%;
  max-height: 100%;
}

.ball-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
  /* 确保图片也使用 GPU 加速 */
  transform: translate3d(0, 0, 0);
}
</style>
