<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import gsap from "gsap";
import { useGachaStore } from "../../stores/gacha";
import filmFrameImage from "../../assets/扭蛋机组装素材/右边照片录播-优化.png";

const store = useGachaStore();
const filmSourceImages = computed(() => store.filmImages.filter(Boolean));

const viewportRef = ref<HTMLDivElement | null>(null);
const trackRef = ref<HTMLDivElement | null>(null);
const viewportHeight = ref(0);

// 单帧高度（与 CSS 保持一致）
const SLIDE_HEIGHT = 180;
const SLIDE_GAP = 20;
const SLIDE_STRIDE = SLIDE_HEIGHT + SLIDE_GAP;

// 滚动速度（像素/秒）
const scrollSpeed = 50;

// 为了“无缝”，至少需要 2 组；
// 如果图片太少导致“一组高度 < 视口高度”，则需要更多组，避免出现露白
const filmSlides = computed(() => {
  const images = filmSourceImages.value;
  if (images.length === 0) return [];

  const singleLoopHeight = images.length * SLIDE_STRIDE;
  if (singleLoopHeight <= 0) return [];

  const repeats = Math.max(2, 1 + Math.ceil((viewportHeight.value || 0) / singleLoopHeight));
  return Array.from({ length: repeats }, () => images).flat();
});

let tween: gsap.core.Tween | null = null;
let rafResize = 0;
let isResizeListening = false;

function updateViewportHeight() {
  viewportHeight.value = viewportRef.value?.clientHeight ?? 0;
}

async function waitForAllImagesLoaded(container: HTMLElement) {
  const imgs = Array.from(container.querySelectorAll("img"));
  const pending = imgs
    .filter((img) => !img.complete)
    .map(
      (img) =>
        new Promise<void>((resolve) => {
          const done = () => resolve();
          img.addEventListener("load", done, { once: true });
          img.addEventListener("error", done, { once: true });
        }),
    );
  if (pending.length) await Promise.all(pending);
}

function killTween() {
  tween?.kill();
  tween = null;
}

function stopAnimations() {
  if (isResizeListening) {
    window.removeEventListener("resize", onResize);
    isResizeListening = false;
  }
  cancelAnimationFrame(rafResize);
  killTween();
}

function startAnimations() {
  if (!isResizeListening) {
    window.addEventListener("resize", onResize, { passive: true });
    isResizeListening = true;
  }
  refresh();
}

function startGsapLoop() {
  const track = trackRef.value;
  const imagesCount = filmSourceImages.value.length;
  if (!track || imagesCount === 0) return;

  const singleLoopHeight = imagesCount * SLIDE_STRIDE;
  if (singleLoopHeight <= 0) return;

  killTween();
  gsap.set(track, { y: 0 });

  // modifiers + wrap：实现“自动匀速一直滚动 + 无缝循环”
  const wrap = gsap.utils.wrap(-singleLoopHeight, 0);
  tween = gsap.to(track, {
    y: `-=${singleLoopHeight}`,
    duration: singleLoopHeight / scrollSpeed,
    ease: "none",
    repeat: -1,
    modifiers: {
      y: (y) => `${wrap(parseFloat(String(y)))}px`,
    },
  });
}

async function refresh() {
  updateViewportHeight();
  await nextTick();
  if (viewportRef.value) await waitForAllImagesLoaded(viewportRef.value);
  startGsapLoop();
}

function onResize() {
  cancelAnimationFrame(rafResize);
  rafResize = requestAnimationFrame(() => {
    refresh();
  });
}

onMounted(() => {
  startAnimations();
});

watch(
  filmSourceImages,
  () => {
    refresh();
  },
  { deep: true },
);

onUnmounted(() => {
  stopAnimations();
});
</script>

<template>
  <div class="film-strip">
    <div v-if="filmSlides.length > 0" ref="viewportRef" class="film-viewport">
      <div ref="trackRef" class="film-track" :style="{ backgroundImage: `url(${filmFrameImage})` }">
        <div v-for="(src, idx) in filmSlides" :key="`${idx}-${src.slice(0, 24)}`" class="film-slide">
          <img class="film-image" :src="src" alt="film" />
        </div>
      </div>
    </div>

    <div v-else class="film-empty">
      <div class="film-empty-title">No Film Images</div>
      <div class="film-empty-subtitle">Please go to Admin Panel → Film List to upload</div>
    </div>
  </div>
</template>

<style scoped>
.film-strip {
  position: relative;
  width: 85%;
  max-width: 300px;
  height: 100%;
}


.film-viewport {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  overflow: hidden;
}

.film-track {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 20px;
  will-change: transform;
  background-repeat: repeat-y;
  background-size: 100% auto;
  background-position: center top;
  padding: 0 12%;
}

.film-slide {
  width: 100%;
  aspect-ratio: 1.5;
  border-radius: 12px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.85);
}

.film-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transform: translateZ(0);
}

.film-empty {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  text-align: center;
  padding: 20px;
}

.film-empty-title {
  font-weight: 800;
  font-size: 18px;
  color: rgba(0, 0, 0, 0.75);
}

.film-empty-subtitle {
  margin-top: 6px;
  font-size: 13px;
  color: rgba(0, 0, 0, 0.55);
}
</style>
