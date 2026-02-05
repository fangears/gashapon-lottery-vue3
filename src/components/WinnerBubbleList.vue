<template>
  <div class="winner-bubble-panel apple-blur">
    <img :src="luckyIp1" alt="" class="decorative-icon decorative-icon-top-left" />
    <img :src="luckyIp2" alt="" class="decorative-icon decorative-icon-bottom-right" />
    <div class="header">
      <h2 class="header-title">Lucky Winners</h2>
    </div>
    <div class="bubble-list" aria-live="polite" aria-relevant="additions removals">
      <div v-for="item in visibleList" :key="item.uid" class="bubble-item" :ref="(el) => setBubbleEl(item.uid, el)">
        <div class="avatar" :style="{ background: getAvatarColor(item.uid) }">
          {{ getAvatarText(item.record) }}
        </div>
        <div class="content-box">
          <div class="winner-name">
            {{ formatDisplayName(item.record) }}
            <span class="badge">Just Now</span>
          </div>
          <div class="prize-text">
            {{ item.record.prizeName }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import gsap from "gsap";
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
  type ComponentPublicInstance,
} from "vue";
import type { GachaRecord } from "../types/gacha";
import { useGachaStore } from "../stores/gacha";
import luckyIp1 from "../assets/扭蛋机组装素材/幸运ip-1.png";
import luckyIp2 from "../assets/扭蛋机组装素材/幸运ip-2.png";

const props = defineProps<{
  records: GachaRecord[];
  /** 轮播间隔（毫秒） */
  interval?: number;
  /** 同时展示的最大气泡数量 */
  maxVisible?: number;
}>();

const intervalMs = computed(() => props.interval ?? 2500);
const maxVisible = computed(() => props.maxVisible ?? 5);

type BubbleItem = {
  record: GachaRecord;
  uid: number;
};

const visibleList = ref<BubbleItem[]>([]);
const currentIndex = ref(0);
let timer: number | undefined;
let cancelled = false;
let ticking = false;
let uidSeed = 0;

const store = useGachaStore();

const prizeVisibleMap = computed(() => {
  const map = new Map<string, boolean>();
  for (const prize of store.config.prizes ?? []) {
    map.set(prize.id, prize.showInLuckyWinners !== false);
  }
  return map;
});

const safeRecords = computed(() =>
  (props.records ?? []).filter((r) => {
    if (!r || !r.prizeName) return false;
    // 未找到对应奖品配置时，默认展示（兼容删除奖品/旧数据）
    const visible = prizeVisibleMap.value.get(r.prizeId);
    return visible ?? true;
  })
);

const bubbleElMap = new Map<number, HTMLElement>();
const setBubbleEl = (uid: number, el: Element | ComponentPublicInstance | null) => {
  const resolvedEl: unknown = (el as ComponentPublicInstance | null)?.$el ?? el;
  if (!resolvedEl) {
    bubbleElMap.delete(uid);
    return;
  }
  if (resolvedEl instanceof HTMLElement) bubbleElMap.set(uid, resolvedEl);
};

const prevRects = new Map<number, DOMRect>();
const captureRects = () => {
  prevRects.clear();
  bubbleElMap.forEach((el, uid) => {
    prevRects.set(uid, el.getBoundingClientRect());
  });
};
const animateLayout = () => {
  bubbleElMap.forEach((el, uid) => {
    const prev = prevRects.get(uid);
    if (!prev) return;
    const next = el.getBoundingClientRect();
    const dx = prev.left - next.left;
    const dy = prev.top - next.top;
    if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;
    gsap.set(el, { x: dx, y: dy });
    gsap.to(el, {
      x: 0,
      y: 0,
      duration: 0.45,
      ease: "power3.out",
      overwrite: true,
    });
  });
};

const animateIn = (uid: number) => {
  const el = bubbleElMap.get(uid);
  if (!el) return;
  gsap.fromTo(
    el,
    { opacity: 0, y: 18, scale: 0.96 },
    {
      opacity: 1,
      y: 0,
      scale: 1,
      duration: 0.48,
      ease: "power3.out",
      overwrite: true,
    }
  );
};

const animateOut = (uid: number) =>
  new Promise<void>((resolve) => {
    const el = bubbleElMap.get(uid);
    if (!el) return resolve();
    gsap.to(el, {
      opacity: 0,
      y: -14,
      scale: 0.96,
      duration: 0.32,
      ease: "power2.in",
      overwrite: true,
      onComplete: () => resolve(),
    });
  });

const removeOldestIfNeeded = async () => {
  if (visibleList.value.length < maxVisible.value) return;
  const oldest = visibleList.value[0];
  if (!oldest) return;

  await animateOut(oldest.uid);
  if (cancelled) return;

  captureRects();
  visibleList.value = visibleList.value.filter((x) => x.uid !== oldest.uid);
  await nextTick();
  animateLayout();
};

const addNextBubble = async () => {
  if (!safeRecords.value.length) return;
  const list = safeRecords.value;
  const record = list[currentIndex.value % list.length];
  currentIndex.value += 1;

  const bubble: BubbleItem = {
    record,
    uid: uidSeed++,
  };

  captureRects();
  visibleList.value = [...visibleList.value, bubble];
  await nextTick();
  animateLayout();
  animateIn(bubble.uid);
};

const start = () => {
  stop();
  if (!safeRecords.value.length) return;
  cancelled = false;

  const tick = async () => {
    if (cancelled || ticking) return;
    ticking = true;
    try {
      await removeOldestIfNeeded();
      if (cancelled) return;
      await addNextBubble();
    } finally {
      ticking = false;
    }

    if (cancelled) return;
    timer = window.setTimeout(() => void tick(), intervalMs.value);
  };

  void tick();
};

const stop = () => {
  cancelled = true;
  if (timer != null) {
    clearTimeout(timer);
    timer = undefined;
  }
};

watch(
  () => safeRecords.value,
  (list) => {
    visibleList.value = [];
    currentIndex.value = 0;
    uidSeed = 0;
    if (list.length) start();
    else stop();
  },
  { immediate: true }
);

const avatarColors = [
  "#007aff",
  "#34c759",
  "#af52de",
  "#ff9500",
  "#ff2d55",
  "#5856d6",
  "#ff3b30",
  "#00c7be",
];

const getAvatarColor = (uid: number) => {
  return avatarColors[uid % avatarColors.length];
};

const getInitial = (email?: string) => {
  if (!email) return "U";
  const char = email.trim()[0];
  return (char || "U").toUpperCase();
};

const formatEmail = (email?: string) => {
  if (!email) return "Unknown Email";
  const [name, domain] = email.split("@");
  if (!domain) return email;
  if (name.length <= 2) return `${name[0] ?? ""}***@${domain}`;
  return `${name.slice(0, 2)}***@${domain}`;
};

/** 按配置时区格式化抽奖时间 */
const formatDrawTime = (drawnAt: number, timezone: string) => {
  const date = new Date(drawnAt);
  return new Intl.DateTimeFormat(undefined, {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
};

/** 有邮箱显示格式化邮箱，无邮箱显示抽奖时间（按时区） */
const formatDisplayName = (record: GachaRecord) => {
  if (record.email?.trim()) return formatEmail(record.email);
  const tz = store.config.timezone ?? "Asia/Shanghai";
  return formatDrawTime(record.drawnAt, tz);
};

/** 有邮箱显示首字符，无邮箱按抽奖时间显示 am/pm */
const getAvatarText = (record: GachaRecord) => {
  if (record.email?.trim()) return getInitial(record.email);
  const tz = store.config.timezone ?? "Asia/Shanghai";
  const date = new Date(record.drawnAt);
  const hour = parseInt(
    new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour: "numeric",
      hour12: false,
    }).format(date),
    10
  );
  return hour < 12 ? "am" : "pm";
};

onMounted(() => {
  start();
});
onBeforeUnmount(stop);
</script>

<style scoped>
.winner-bubble-panel {
  /* 固定高度：按 5 条气泡计算（更接近 iOS 消息列表的稳定布局） */
  --bubble-count: 5;
  --bubble-item-h: 56px;
  --bubble-gap: 10px;
  --panel-padding-y: 14px;
  --header-height: 50px;
  --header-margin-bottom: 12px;

  position: relative;
  width: 85%;
  max-width: 320px;
  height: calc(var(--panel-padding-y) * 2 + var(--header-height) + var(--header-margin-bottom) + var(--bubble-item-h) * var(--bubble-count) + var(--bubble-gap) * 4);
  border-radius: 20px;
  padding: 14px 12px;
  display: flex;
  flex-direction: column;
}

.apple-blur {
  background: rgba(255, 255, 255, 0.55);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.45);
}

.decorative-icon {
  position: absolute;
  height: 120px;
  width: auto;
  object-fit: contain;
  pointer-events: none;
  z-index: 1;
}

.decorative-icon-top-left {
  top: -47px;
  left: -36px;
}

.decorative-icon-bottom-right {
  bottom: -20px;
  right: -55px;
}

.header {
  position: relative;
  height: var(--header-height);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: var(--header-margin-bottom);
  z-index: 2;
}

.header-title {
  font-size: 1.8rem;
  font-weight: 700;
  color: #fba29a;
  margin: 0;
  text-align: center;
  text-shadow: 2px 2px 4px rgba(255, 235, 200, 0.6);
}

.bubble-list {
  width: 100%;
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: var(--bubble-gap);
}

.bubble-item {
  display: flex;
  align-items: center;
  padding: 10px 14px;
  border-radius: 18px;
  width: 100%;
  min-height: var(--bubble-item-h);
  flex-shrink: 0;
  background: rgba(255, 255, 255, 0.55);
  will-change: transform, opacity;
}

.avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  font-size: 14px;
  font-weight: 600;
  margin-right: 10px;
  flex-shrink: 0;
}

.content-box {
  flex: 1;
  min-width: 0;
}

.winner-name {
  font-size: 13px;
  font-weight: 600;
  color: #1d1d1f;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.prize-text {
  margin-top: 2px;
  font-size: 12px;
  color: #6e6e73;
  line-height: 1.4;
  word-break: break-all;
  overflow: hidden;
  display: -webkit-box;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.badge {
  background: rgba(0, 122, 255, 0.12);
  color: #007aff;
  padding: 1px 6px;
  border-radius: 6px;
  font-size: 10px;
  font-weight: 600;
  margin-left: 6px;
  flex-shrink: 0;
}
</style>
