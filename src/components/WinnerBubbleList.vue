<template>
  <div class="winner-bubble-panel apple-blur">
    <TransitionGroup name="bubble" tag="div" class="bubble-list">
      <div
        v-for="item in visibleList"
        :key="item.uid"
        class="bubble-item"
      >
        <div
          class="avatar"
          :style="{ background: getAvatarColor(item.uid) }"
        >
          {{ getInitial(item.record.email) }}
        </div>
        <div class="content-box">
          <div class="winner-name">
            {{ formatEmail(item.record.email) }}
            <span class="badge">刚刚</span>
          </div>
          <div class="prize-text">
            {{ item.record.prizeName }}
          </div>
        </div>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import type { GachaRecord } from "../types/gacha";

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
let uidSeed = 0;

const safeRecords = computed(() =>
  (props.records ?? []).filter((r) => r && r.prizeName)
);

const showNext = () => {
  if (!safeRecords.value.length) return;
  const list = safeRecords.value;
  const record = list[currentIndex.value % list.length];
  currentIndex.value += 1;

  const bubble: BubbleItem = {
    record,
    uid: uidSeed++,
  };

  visibleList.value = [...visibleList.value, bubble].slice(-maxVisible.value);
};

const start = () => {
  stop();
  if (!safeRecords.value.length) return;
  showNext();
  timer = window.setInterval(showNext, intervalMs.value);
};

const stop = () => {
  if (timer != null) {
    clearInterval(timer);
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
  if (!email) return "未知邮箱";
  const [name, domain] = email.split("@");
  if (!domain) return email;
  if (name.length <= 2) return `${name[0] ?? ""}***@${domain}`;
  return `${name.slice(0, 2)}***@${domain}`;
};

onMounted(start);
onBeforeUnmount(stop);
</script>

<style scoped>
.winner-bubble-panel {
  width: 85%;
  max-width: 320px;
  height: 48%;
  max-height: 520px;
  border-radius: 20px;
  padding: 14px 12px;
  display: flex;
  justify-content: flex-end;
  align-items: flex-end;
  box-shadow: 0 18px 45px rgba(0, 0, 0, 0.18);
  overflow: hidden;
}

.apple-blur {
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.45);
}

.bubble-list {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}

.bubble-item {
  display: flex;
  align-items: center;
  padding: 10px 14px;
  border-radius: 18px;
  width: 100%;
  margin-top: 10px;
  flex-shrink: 0;
  box-shadow: 0 4px 18px rgba(0, 0, 0, 0.08);
  background: linear-gradient(135deg, #ffffff, #f5f7ff);
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
}

.badge {
  background: rgba(0, 122, 255, 0.1);
  color: #007aff;
  padding: 1px 6px;
  border-radius: 6px;
  font-size: 10px;
  font-weight: 600;
  margin-left: 6px;
  flex-shrink: 0;
}

.bubble-enter-active,
.bubble-leave-active {
  transition: opacity 0.5s cubic-bezier(0.23, 1, 0.32, 1),
    transform 0.5s cubic-bezier(0.23, 1, 0.32, 1),
    margin-top 0.5s cubic-bezier(0.23, 1, 0.32, 1);
}

.bubble-enter-from {
  opacity: 0;
  transform: translateY(30px) scale(0.9);
  margin-top: -32px;
}

.bubble-enter-to {
  opacity: 1;
  transform: translateY(0) scale(1);
  margin-top: 10px;
}

.bubble-leave-from {
  opacity: 1;
  transform: translateY(0) scale(1);
  margin-top: 10px;
}

.bubble-leave-to {
  opacity: 0;
  transform: translateY(-24px) scale(0.9);
  margin-top: -12px;
}
</style>

