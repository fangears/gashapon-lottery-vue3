<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import { useGachaStore } from "../stores/gacha";
import { useImageLibraryStore } from "../stores/imageLibrary";
import gsap from "gsap";

const store = useGachaStore();
const imageStore = useImageLibraryStore();

// 配置项 (与 Infinite 3D Coverflow 一致)
const CONFIG = {
  baseRotation: 30,
  rotationStep: 15,
  scaleDown: 0.8,
  spacingPercent: 55,
  visibileCount: 3,
  autoPlayInterval: 3000,
  swipeThreshold: 50
};

// 数据来源：store.config.screensaverImageIds（从图库选择）
const images = computed(() => {
  const urls = (store.config.screensaverImageIds ?? []).map((id) => imageStore.getUrl(id)).filter(Boolean);
  return urls.map((url, index) => ({
    id: `img-${index}-${url.slice(0, 20)}`,
    url,
    title: "",
    desc: ""
  }));
});

const activeIndex = ref(0);
const isPaused = ref(false);
const autoPlayTimer = ref<ReturnType<typeof setInterval> | ReturnType<typeof setTimeout> | null>(null);
const isAutoPlaying = ref(false); // 标记是否正在自动播放
const cardRefs = ref<(HTMLElement | null)[]>([]);

const setCardRef = (el: unknown, index: number) => {
  if (el) (cardRefs.value as (HTMLElement | null)[])[index] = el as HTMLElement;
};

const len = computed(() => images.value.length);

// 环形距离
const getCircularOffset = (index: number, active: number, length: number) => {
  if (length === 0) return 0;
  let offset = (index - active) % length;
  if (offset < 0) offset += length;
  if (offset > length / 2) offset -= length;
  return offset;
};

// 计算每个卡片的 Transform（与参考一致）
const calculateTransform = (offset: number) => {
  const absOffset = Math.abs(offset);
  const isActive = offset === 0;

  // 用 GSAP 的 xPercent/yPercent 来居中卡片（-50/-50），再叠加轮播位移
  const xPercent = -50 + offset * CONFIG.spacingPercent;
  const yPercent = -50;

  let rotateY = 0;
  if (!isActive) {
    const direction = offset > 0 ? -1 : 1;
    const rotationMagnitude = Math.min(
      CONFIG.baseRotation + (absOffset - 1) * CONFIG.rotationStep,
      85
    );
    rotateY = rotationMagnitude * direction;
  }

  const scale = isActive ? 1 : CONFIG.scaleDown;
  const zIndex = 100 - absOffset;
  const opacity = isActive ? 1 : Math.max(0.4, 1 - absOffset * 0.2);
  const z = isActive ? 0 : -100 - absOffset * 50;

  return { xPercent, yPercent, rotateY, scale, zIndex, opacity, z };
};

// GSAP 动画（与参考一致：每卡 gsap.to + 无限循环瞬移）
const animateCards = (newActiveIndex: number, oldActiveIndex: number | null) => {
  const length = len.value;
  if (length === 0) return;

  cardRefs.value.forEach((el, index) => {
    if (!el) return;

    const newOffset = getCircularOffset(index, newActiveIndex, length);
    const props = calculateTransform(newOffset);

    // 首次渲染/重建时，直接设置到目标状态，避免位置闪动
    if (oldActiveIndex === null) {
      gsap.set(el, {
        xPercent: props.xPercent,
        yPercent: props.yPercent,
        z: props.z,
        rotationY: props.rotateY,
        scale: props.scale,
        opacity: props.opacity,
        zIndex: props.zIndex
      });
    } else {
      const oldOffset = getCircularOffset(index, oldActiveIndex, length);
      const delta = newOffset - oldOffset;

      if (Math.abs(delta) > 2) {
        const virtualStartOffset = delta > 0 ? newOffset - 1 : newOffset + 1;
        const startProps = calculateTransform(virtualStartOffset);

        gsap.set(el, {
          xPercent: startProps.xPercent,
          yPercent: startProps.yPercent,
          rotationY: startProps.rotateY,
          scale: startProps.scale,
          z: startProps.z
        });
      }
      gsap.to(el, {
        duration: 0.7,
        ease: "power3.out",
        xPercent: props.xPercent,
        yPercent: props.yPercent,
        z: props.z,
        rotationY: props.rotateY,
        scale: props.scale,
        opacity: props.opacity,
        zIndex: props.zIndex,
        overwrite: "auto"
      });
    }

    const shadowEl = el.querySelector(".overlay-shadow");
    const highlightEl = el.querySelector(".overlay-highlight");

    if (shadowEl) {
      const nextOpacity = newOffset === 0 ? 0 : 0.6;
      if (oldActiveIndex === null) {
        gsap.set(shadowEl, { opacity: nextOpacity });
      } else {
        gsap.to(shadowEl, {
          duration: 0.7,
          opacity: nextOpacity
        });
      }
    }
    if (highlightEl) {
      const nextOpacity = newOffset === 0 ? 0.2 : 0;
      if (oldActiveIndex === null) {
        gsap.set(highlightEl, { opacity: nextOpacity });
      } else {
        gsap.to(highlightEl, {
          duration: 0.7,
          opacity: nextOpacity
        });
      }
    }
  });
};

// 重置自动播放计时器（手动操作后3秒重新开始）
const resetAutoPlay = () => {
  stopAutoPlay();
  if (len.value === 0 || isPaused.value) return;
  autoPlayTimer.value = setTimeout(() => {
    startAutoPlay();
  }, CONFIG.autoPlayInterval);
};

const handlePrev = (isAuto = false) => {
  if (len.value === 0) return;
  activeIndex.value = (activeIndex.value - 1 + len.value) % len.value;
  if (!isAuto) {
    resetAutoPlay();
  }
};

const handleNext = (isAuto = false) => {
  if (len.value === 0) return;
  activeIndex.value = (activeIndex.value + 1 + len.value) % len.value;
  if (!isAuto) {
    resetAutoPlay();
  }
};

const handleJump = (idx: number) => {
  if (len.value === 0) return;
  const offset = getCircularOffset(idx, activeIndex.value, len.value);
  activeIndex.value = (activeIndex.value + offset + len.value) % len.value;
  resetAutoPlay();
};

const startAutoPlay = () => {
  stopAutoPlay();
  if (len.value === 0) return;
  isAutoPlaying.value = true;
  autoPlayTimer.value = setInterval(() => {
    handleNext(true); // 标记为自动播放
  }, CONFIG.autoPlayInterval);
};

const stopAutoPlay = () => {
  if (autoPlayTimer.value) {
    clearInterval(autoPlayTimer.value as ReturnType<typeof setInterval>);
    clearTimeout(autoPlayTimer.value as ReturnType<typeof setTimeout>);
    autoPlayTimer.value = null;
  }
  isAutoPlaying.value = false;
};

const pauseAutoPlay = () => {
  isPaused.value = true;
  stopAutoPlay();
};

const resumeAutoPlay = () => {
  isPaused.value = false;
  startAutoPlay();
};


const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === "ArrowLeft") {
    handlePrev();
  }
  if (e.key === "ArrowRight") {
    handleNext();
  }
};

const activeImage = computed(() =>
  images.value[activeIndex.value]
    ? images.value[activeIndex.value]
    : { id: "", url: "", title: "", desc: "" }
);

watch(activeIndex, (newVal, oldVal) => {
  animateCards(newVal, oldVal ?? null);
});

watch(
  () => images.value.length,
  (newLen, oldLen) => {
    if (newLen > 0 && oldLen === 0) {
      activeIndex.value = 0;
      animateCards(0, null);
      startAutoPlay();
    } else if (newLen === 0) {
      stopAutoPlay();
    } else if (newLen !== oldLen && activeIndex.value >= newLen) {
      activeIndex.value = Math.max(0, newLen - 1);
      animateCards(activeIndex.value, null);
    }
  }
);

onMounted(() => {
  if (len.value > 0) {
    animateCards(activeIndex.value, null);
    startAutoPlay();
  }
  window.addEventListener("keydown", handleKeyDown);
});

onUnmounted(() => {
  stopAutoPlay();
  window.removeEventListener("keydown", handleKeyDown);
});
</script>

<template>
  <main class="screensaver-page">
    <!-- 1. 动态背景层 -->
    <div class="background-layer">
      <div v-for="(img, idx) in images" :key="'bg-' + img.id" class="background-image" :style="{
        backgroundImage: `url(${img.url})`,
        opacity: activeIndex === idx ? 0.3 : 0,
        filter: 'blur(50px) brightness(0.5)'
      }" />
      <div class="noise-overlay" />
    </div>

    <!-- 2. 主体内容区 -->
    <div class="content-area" @mouseenter="pauseAutoPlay" @mouseleave="resumeAutoPlay">
      <!-- 标题区（有 title/desc 时显示） -->
      <div v-if="activeImage.title || activeImage.desc" :key="activeImage.id" class="title-area animate-fade-in-up">
        <h1 v-if="activeImage.title" class="title-text">
          {{ activeImage.title }}
        </h1>
        <p v-if="activeImage.desc" class="title-desc">
          {{ activeImage.desc }}
        </p>
      </div>

      <!-- 基于 content-area 的左右侧热区（不依赖轮播容器尺寸） -->
      <div class="content-hit-zones" aria-hidden="true">
        <div class="coverflow-zone coverflow-zone-left" aria-label="上一张" @click="() => handlePrev()" />
        <div class="coverflow-zone coverflow-zone-right" aria-label="下一张" @click="() => handleNext()" />
      </div>

      <!-- 3. 轮播视口容器 -->
      <div class="coverflow-outer">
        <div class="coverflow-container perspective-container">
          <div class="coverflow-wrapper transform-style-3d">
            <div v-for="(img, index) in images" :key="img.id" :ref="(el) => setCardRef(el, index)"
              class="coverflow-card card-shadow" @click="handleJump(index)">
              <img :src="img.url" :alt="img.title || 'Image'" class="card-image" loading="lazy" />
              <div class="overlay-highlight" />
              <div class="overlay-shadow" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
.screensaver-page {
  width: 100%;
  height: 100vh;
  height: 100dvh;
  background: #171717;
  color: white;
  position: relative;
  overflow: hidden;
  user-select: none;
  font-family: system-ui, sans-serif;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-in-up {
  animation: fadeInUp 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
}

.perspective-container {
  perspective: 1000px;
}

.transform-style-3d {
  transform-style: preserve-3d;
}

.card-shadow {
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
}

.background-layer {
  position: absolute;
  inset: 0;
  transition: opacity 0.7s ease-in-out;
}

.background-image {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center;
  transition: opacity 1000ms ease;
}

.noise-overlay {
  position: absolute;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.2);
  pointer-events: none;
  background-image: url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noise%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noise)%22 opacity=%220.05%22/%3E%3C/svg%3E');
}

.content-area {
  position: relative;
  z-index: 10;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  /* 让轮播尽量吃满屏高度，同时保留少量安全边距 */
  padding: clamp(12px, 2vh, 24px) 0;
  box-sizing: border-box;
}

.content-hit-zones {
  position: absolute;
  inset: 0;
  /* 覆盖层本身不拦截点击，只让左右热区接收点击 */
  pointer-events: none;
  z-index: 12;
}

.title-area {
  position: absolute;
  top: 4rem;
  left: 0;
  right: 0;
  text-align: center;
  z-index: 20;
  padding: 0 1rem;
}

@media (min-width: 768px) {
  .title-area {
    top: 6rem;
  }
}

.title-text {
  font-size: 2.25rem;
  font-weight: 700;
  letter-spacing: -0.025em;
  margin-bottom: 0.5rem;
  text-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
}

@media (min-width: 768px) {
  .title-text {
    font-size: 3.75rem;
  }
}

.title-desc {
  font-size: 1.125rem;
  color: rgba(255, 255, 255, 0.8);
  font-weight: 300;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}

@media (min-width: 768px) {
  .title-desc {
    font-size: 1.25rem;
  }
}

.coverflow-outer {
  position: relative;
  width: 100%;
  max-width: 80rem;
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 左右点击区域：基于 content-area 定位；宽度为 content-area 的一半 */
.coverflow-zone {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 50%;
  z-index: 5;
  cursor: w-resize;
  touch-action: manipulation;
  pointer-events: auto;
}

.coverflow-zone-right {
  left: auto;
  right: 0;
  cursor: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><path d="M12 8 L20 16 L12 24" stroke="rgba(255,255,255,0.9)" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>') 16 16, e-resize;
}

.coverflow-zone-left {
  left: 0;
  right: auto;
  cursor: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><path d="M20 8 L12 16 L20 24" stroke="rgba(255,255,255,0.9)" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>') 16 16, w-resize;
}

@media (min-width: 768px) {
  .coverflow-zone-left {
    left: 0;
    cursor: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><path d="M20 8 L12 16 L20 24" stroke="rgba(255,255,255,0.9)" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>') 16 16, w-resize;
  }

  .coverflow-zone-right {
    right: 0;
    cursor: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><path d="M12 8 L20 16 L12 24" stroke="rgba(255,255,255,0.9)" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>') 16 16, e-resize;
  }
}

.coverflow-container {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.coverflow-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.coverflow-card {
  position: absolute;
  top: 50%;
  left: 50%;
  /* 以视口高度为基准尽量放大：高度贴近屏幕，允许左右裁切 */
  height: min(92%, 92dvh);
  aspect-ratio: 7 / 10;
  width: auto;
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: #262626;
  will-change: transform, opacity;
}

@media (min-width: 768px) {
  .coverflow-card {
    height: min(92%, 92dvh);
    width: auto;
  }
}

.card-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  pointer-events: none;
}

.overlay-highlight {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top right, rgba(255, 255, 255, 0.15), transparent);
  pointer-events: none;
  opacity: 0;
}

.overlay-shadow {
  position: absolute;
  inset: 0;
  background: black;
  pointer-events: none;
  opacity: 0.6;
}
</style>
