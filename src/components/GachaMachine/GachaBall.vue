<script setup lang="ts">
import { computed, ref, watch, nextTick } from "vue";
import type { Prize } from "../../types/gacha";

// Define inheritAttrs in a separate normal script block
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

// 初始位置（从出奖口位置开始）
const initialPosition = ref<{ top: string; left: string } | null>(null);

// 是否已经移动到中心
const isCentered = ref(false);

// 监听状态变化
watch(() => props.status, async (newStatus) => {
  if (newStatus === "revealing") {
    // 计算出奖口位置作为起始点
    const gate = props.gateEl;
    if (gate) {
      const rect = gate.getBoundingClientRect();
      initialPosition.value = {
        top: `${rect.top + rect.height / 2 - 23}px`, // 23 是球半径
        left: `${rect.left + rect.width / 2 - 23}px`
      };
    }
    isCentered.value = false;
    
    // 等待 DOM 更新后，触发移动到中心的动画
    await nextTick();
    // 短暂延迟确保初始位置已应用
    requestAnimationFrame(() => {
      isCentered.value = true;
    });
  } else if (newStatus === "idle") {
    isCentered.value = false;
    initialPosition.value = null;
  }
});

// 计算样式
const ballStyle = computed(() => {
  const baseStyle = { '--ball-color': ballColor.value };
  
  if (isCentered.value) {
    // 移动到中心并放大
    return {
      ...baseStyle,
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%) scale(3)',
      transition: 'all 0.8s cubic-bezier(0.25, 1, 0.5, 1)'
    };
  } else if (initialPosition.value) {
    // 初始位置（出奖口位置）
    return {
      ...baseStyle,
      ...initialPosition.value,
      transform: 'translate(0, 0) scale(1)',
      transition: 'none'
    };
  }
  
  return baseStyle;
});
</script>

<template>
  <Teleport to="body">
    <Transition name="ball-reveal">
      <div
        v-if="isVisible"
        class="gacha-ball"
        :class="{ 'open': status === 'open' }"
        :style="ballStyle"
      >
        <div class="ball-half top"></div>
        <div class="ball-half bottom"></div>
        <div class="prize-paper">
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

/* 外部球出现动画 */
.ball-reveal-enter-from {
  opacity: 0;
}

.ball-reveal-enter-active {
  transition: opacity 0.1s;
}

.ball-reveal-enter-to {
  opacity: 1;
}

.ball-reveal-leave-active {
  transition: opacity 0.3s;
}

.ball-reveal-leave-to {
  opacity: 0;
}

.gacha-ball.open .ball-half.top {
  transform: translateY(-40px) rotate(-15deg);
  opacity: 0.8;
}

.gacha-ball.open .ball-half.bottom {
  transform: translateY(40px) rotate(15deg);
  opacity: 0.8;
}

.gacha-ball.open .prize-paper {
  width: 140px;
  height: 110px;
  font-size: 14px;
  padding: 10px;
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
  transition: transform 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.5s;
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
  font-size: 0;
  overflow: hidden;
  transition: all 0.5s 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  z-index: 1;
  border: 2px solid #e0c090;
  padding: 0;
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
