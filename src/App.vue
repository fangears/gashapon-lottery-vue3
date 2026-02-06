<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted, nextTick } from "vue";
import { useRoute, useRouter } from "vue-router";
import { gsap } from "gsap";
import ContextMenu from "@imengyu/vue3-context-menu";
import RouteTransition from "./components/RouteTransition.vue";
import backgroundImage from "./assets/gacha-machine-assets/background.jpg";
import { useGachaStore } from "./stores/gacha";
import { useFullscreen } from "./composables/useFullscreen";

const router = useRouter();
const { isFullscreen, toggle: toggleFullscreen } = useFullscreen();
const route = useRoute();
const gachaStore = useGachaStore();

const navItems = [
  { label: "扭蛋抽奖", path: "/" },
  { label: "后台管理", path: "/admin" },
  { label: "图片管理", path: "/images" },
  { label: "抽奖记录", path: "/history" },
  { label: "屏保", path: "/screensaver" },
];

const activePath = computed(() => route.path);
const isNotHomePage = computed(() => route.path !== "/" && route.path !== "/screensaver");
const headerRef = ref<HTMLElement | null>(null);
let headerAnimation: gsap.core.Tween | null = null;

// 屏保相关状态：从配置中读取是否启用及静置时间
let inactivityTimer: ReturnType<typeof setTimeout> | null = null;
const previousPath = ref<string>("/"); // 记录进入屏保前的路径

const appBackgroundStyle = computed(() => ({
  backgroundImage: `url(${backgroundImage})`,
}));

const screensaverEnabled = computed(() => gachaStore.config.screensaverEnabled);
const screensaverTimeoutMs = computed(() => {
  if (!screensaverEnabled.value) return 0;
  const minutes = gachaStore.config.screensaverIdleMinutes;
  if (!Number.isFinite(minutes) || minutes <= 0) return 0;
  return minutes * 60 * 1000;
});

const handleContextMenu = (event: MouseEvent) => {
  if (!event.ctrlKey) return;
  event.preventDefault();
  ContextMenu.showContextMenu({
    x: event.x,
    y: event.y,
    items: navItems.map((item) => ({
      label: item.label,
      onClick: () => router.push(item.path),
    })),
  });
};

// 使用 GSAP 动画控制 header 显示/隐藏
watch(
  isNotHomePage,
  async (shouldShow) => {
    if (!headerRef.value) return;

    // 清理之前的动画
    if (headerAnimation) {
      headerAnimation.kill();
    }

    await nextTick();

    if (shouldShow) {
      // 显示动画：从上方滑入 + 淡入
      headerRef.value.style.display = "flex";
      headerAnimation = gsap.fromTo(
        headerRef.value,
        {
          y: -100,
          opacity: 0,
        },
        {
          y: 0,
          opacity: 1,
          duration: 0.5,
          ease: "power3.out",
        }
      );
    } else {
      // 隐藏动画：向上滑出 + 淡出
      headerAnimation = gsap.to(headerRef.value, {
        y: -100,
        opacity: 0,
        duration: 0.4,
        ease: "power3.in",
        onComplete: () => {
          if (headerRef.value) {
            headerRef.value.style.display = "none";
          }
        },
      });
    }
  },
  { immediate: true }
);

// 监听路由变化，重置定时器（除了从屏保返回时）
watch(
  () => route.path,
  (newPath) => {
    // 如果离开屏保页面，重置定时器
    if (newPath !== "/screensaver") {
      resetInactivityTimer();
    }
  }
);

// 重置无操作定时器
const resetInactivityTimer = () => {
  // 屏保页不通过定时器退出，仅通过 ESC 退出
  if (route.path === "/screensaver") {
    return;
  }

  // 清除之前的定时器
  if (inactivityTimer) {
    clearTimeout(inactivityTimer);
    inactivityTimer = null;
  }

  const timeout = screensaverTimeoutMs.value;
  // 未启用或配置为非正数时，不自动进入屏保
  if (!timeout || timeout <= 0) {
    return;
  }

  // 设置新的定时器
  inactivityTimer = setTimeout(() => {
    // 记录当前路径
    if (route.path !== "/screensaver") {
      previousPath.value = route.path;
    }
    // 切换到屏保页面
    router.push("/screensaver");
  }, timeout);
};

// 用户活动事件处理：屏保页仅 ESC 退出，其它操作不退出
const handleUserActivity = (e?: Event) => {
  if (route.path === "/screensaver") {
    if (e?.type === "keydown" && (e as KeyboardEvent).key === "Escape") {
      router.push(previousPath.value || "/");
    }
    return;
  }
  resetInactivityTimer();
};

onMounted(() => {
  // 初始化时根据 isNotHomePage 设置初始状态
  if (headerRef.value) {
    if (!isNotHomePage.value) {
      headerRef.value.style.display = "none";
      gsap.set(headerRef.value, { y: -100, opacity: 0 });
    } else {
      headerRef.value.style.display = "flex";
      gsap.set(headerRef.value, { y: 0, opacity: 1 });
    }
  }

  // 监听用户活动事件
  const events = ["mousedown", "mousemove", "keypress", "keydown", "scroll", "touchstart", "click"];
  events.forEach((event) => {
    window.addEventListener(event, handleUserActivity, { passive: true });
  });

  // 初始化定时器
  resetInactivityTimer();
});

onUnmounted(() => {
  // 清理定时器
  if (inactivityTimer) {
    clearTimeout(inactivityTimer);
  }

  // 移除事件监听器
  const events = ["mousedown", "mousemove", "keypress", "keydown", "scroll", "touchstart", "click"];
  events.forEach((event) => {
    window.removeEventListener(event, handleUserActivity);
  });
});
</script>

<template>
  <div class="app-shell" :style="appBackgroundStyle" @contextmenu="handleContextMenu" @mousemove="handleUserActivity"
    @mousedown="handleUserActivity" @keydown="handleUserActivity" @click="handleUserActivity"
    @touchstart="handleUserActivity" @scroll="handleUserActivity">
    <header ref="headerRef" class="app-header" v-if="isNotHomePage">
      <div class="brand">
        <span class="brand-title">扭蛋机抽奖</span>
        <span class="brand-subtitle">Playful Gacha Lottery</span>
      </div>
      <nav class="app-nav">
        <button v-for="item in navItems" :key="item.path" class="nav-button"
          :class="{ active: activePath === item.path }" @click="router.push(item.path)">
          {{ item.label }}
        </button>
        <button type="button" class="nav-button fullscreen-btn" :title="isFullscreen ? '退出全屏' : '全屏'"
          @click="toggleFullscreen">
          <span class="fullscreen-icon" aria-hidden="true">
            <template v-if="isFullscreen">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/></svg>
            </template>
            <template v-else>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
            </template>
          </span>
        </button>
      </nav>
    </header>
    <!-- 首页/屏保时显示的浮动全屏按钮 -->
    <button v-if="!isNotHomePage" type="button" class="fullscreen-fab" :title="isFullscreen ? '退出全屏' : '全屏'"
      @click="toggleFullscreen">
      <span class="fullscreen-icon" aria-hidden="true">
        <template v-if="isFullscreen">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/></svg>
        </template>
        <template v-else>
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
        </template>
      </span>
    </button>
    <RouteTransition />
  </div>
</template>

<style scoped>
.app-shell {
  min-height: 100vh;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  background-attachment: fixed;
}

.app-header {
  position: sticky;
  top: 0;
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-md);
  align-items: center;
  justify-content: space-between;
  padding: var(--space-lg) var(--space-2xl);
  background: white;
  box-shadow: var(--shadow-sm);
  z-index: 100;
}

.brand {
  display: grid;
  gap: 4px;
}

.brand-title {
  font-family: "Fredoka", system-ui, sans-serif;
  font-weight: 700;
  font-size: 1.4rem;
}

.brand-subtitle {
  font-size: 0.85rem;
  opacity: 0.7;
}

.app-nav {
  display: flex;
  gap: var(--space-sm);
  flex-wrap: wrap;
}

.nav-button {
  border: 2px solid transparent;
  background: #eef2ff;
  color: var(--color-text);
  padding: 8px 16px;
  border-radius: 999px;
  font-weight: 600;
  cursor: pointer;
  transition: all 200ms ease;
}

.nav-button.active,
.nav-button:hover {
  border-color: var(--color-primary);
  background: #ffffff;
  box-shadow: var(--shadow-sm);
}

.fullscreen-btn {
  padding: 8px 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  opacity: 0.1;
  transition: opacity 0.2s ease;
}

.fullscreen-btn:hover {
  opacity: 1;
}

.fullscreen-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

/* 首页/屏保时的浮动全屏按钮 */
.fullscreen-fab {
  position: fixed;
  bottom: var(--space-xl);
  right: var(--space-xl);
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.8);
  background: rgba(255, 255, 255, 0.9);
  color: var(--color-text);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--shadow-lg);
  z-index: 50;
  opacity: 0.1;
  transition: opacity 0.2s ease, transform 0.2s ease, background 0.2s ease;
}

.fullscreen-fab:hover {
  opacity: 1;
  background: #ffffff;
  transform: scale(1.05);
}

.fullscreen-fab:active {
  transform: scale(0.98);
}
</style>