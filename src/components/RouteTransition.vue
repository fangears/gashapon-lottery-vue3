<script setup lang="ts">
import { ref, watch } from "vue";
import { useRoute } from "vue-router";
import { gsap } from "gsap";

const route = useRoute();

// 存储当前和上一个路由路径
const currentPath = ref(route.path);
const previousPath = ref(route.path);

// 路由历史栈，用于判断前进/后退方向
const routeHistory = ref<string[]>([route.path]);

// 获取路由索引顺序（用于判断方向）
const routeOrder: Record<string, number> = {
  "/": 0,
  "/admin": 1,
  "/history": 2,
};

// 判断路由切换方向
const getTransitionDirection = (from: string, to: string): "forward" | "backward" => {
  // 检查路由历史
  const fromIndex = routeHistory.value.indexOf(from);
  const toIndex = routeHistory.value.indexOf(to);

  // 如果在历史中找到，且 to 在 from 之前，则是后退
  if (fromIndex !== -1 && toIndex !== -1 && toIndex < fromIndex) {
    return "backward";
  }

  // 否则根据路由顺序判断
  const fromOrder = routeOrder[from] ?? 0;
  const toOrder = routeOrder[to] ?? 0;
  return toOrder > fromOrder ? "forward" : "backward";
};

// 入场子元素动画上下文，按路由根元素管理，方便在离场时统一清理
const enterCtxMap = new WeakMap<Element, gsap.Context>();

const prefersReducedMotion = () => {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
};

const animateEnterItems = (root: Element) => {
  if (prefersReducedMotion()) return;

  const items = Array.from(
    root.querySelectorAll<HTMLElement>("[data-enter]")
  );

  if (!items.length) return;

  const ctx = gsap.context(() => {
    items.forEach((el, index) => {
      const type = el.dataset.enter ?? "up";
      const order =
        el.dataset.enterOrder !== undefined
          ? Number(el.dataset.enterOrder)
          : index;
      const baseDelay =
        el.dataset.enterDelay !== undefined
          ? Number(el.dataset.enterDelay)
          : 0;
      const delay = baseDelay + order * 0.06;

      let fromVars: gsap.TweenVars;
      switch (type) {
        case "left":
          fromVars = { x: -32, y: 0 };
          break;
        case "right":
          fromVars = { x: 32, y: 0 };
          break;
        case "scale":
          fromVars = { scale: 0.96 };
          break;
        default:
          // up
          fromVars = { y: 24 };
      }

      gsap.from(el, {
        opacity: 0,
        ...fromVars,
        duration: 0.4,
        ease: "power2.out",
        delay,
        clearProps: "transform,opacity",
      });
    });
  }, root);

  enterCtxMap.set(root, ctx);
};

// 过渡动画钩子（整页）
const onBeforeEnter = (el: Element) => {
  const direction = getTransitionDirection(previousPath.value, currentPath.value);
  const isForward = direction === "forward";

  gsap.set(el, {
    x: isForward ? "100%" : "-100%",
    opacity: 0,
  });
};

const onEnter = (el: Element, done: () => void) => {
  gsap.to(el, {
    x: 0,
    opacity: 1,
    duration: 0.4,
    ease: "power2.inOut",
    onComplete: done,
  });

  // 页面子元素入场动画
  animateEnterItems(el);
};

const onLeave = (el: Element, done: () => void) => {
  const direction = getTransitionDirection(previousPath.value, currentPath.value);
  const isForward = direction === "forward";

  // 清理子元素动画上下文，避免样式残留
  const ctx = enterCtxMap.get(el);
  if (ctx) {
    ctx.revert();
    enterCtxMap.delete(el);
  }

  gsap.to(el, {
    x: isForward ? "-100%" : "100%",
    opacity: 0,
    duration: 0.4,
    ease: "power2.inOut",
    onComplete: done,
  });
};

// 监听路由变化，更新历史栈
watch(
  () => route.path,
  (newPath, oldPath) => {
    previousPath.value = oldPath;
    currentPath.value = newPath;

    const currentIndex = routeHistory.value.indexOf(newPath);

    if (currentIndex === -1) {
      // 新路由，添加到历史
      routeHistory.value.push(newPath);
    } else {
      // 已存在的路由，可能是后退
      routeHistory.value = routeHistory.value.slice(0, currentIndex + 1);
    }
  }
);
</script>

<template>
  <div class="route-transition-wrapper">
    <transition :css="false" @before-enter="onBeforeEnter" @enter="onEnter" @leave="onLeave" mode="out-in">
      <router-view :key="route.path" />
    </transition>
  </div>
</template>

<style scoped>
.route-transition-wrapper {
  position: relative;
  width: 100%;
  min-height: 100%;
  overflow: hidden;
}

/* 确保路由视图可以正确进行动画 */
:deep(.page-container) {
  position: relative;
  width: 100%;
  will-change: transform, opacity;
}

/* 移动端优化 */
@media (max-width: 768px) {
  .route-transition-wrapper {
    touch-action: pan-y;
  }

  :deep(.page-container) {
    touch-action: pan-y;
  }
}
</style>