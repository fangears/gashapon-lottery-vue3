import { ref, onMounted, onUnmounted, type Ref } from "vue";

/**
 * 使用浏览器 Fullscreen API 切换全屏模式（适用于页面内容全屏，在 Tauri 与浏览器中均可用）
 */
export function useFullscreen(
  target: Ref<HTMLElement | null> | (() => HTMLElement | null) = () => document.documentElement
) {
  const isFullscreen = ref(false);

  const getTarget = (): HTMLElement | null => {
    if (typeof target === "function") return target();
    return target?.value ?? null;
  };

  const enter = async () => {
    const el = getTarget();
    if (!el) return;
    try {
      await el.requestFullscreen();
      isFullscreen.value = true;
    } catch (e) {
      console.warn("Fullscreen request failed:", e);
    }
  };

  const exit = async () => {
    if (!document.fullscreenElement) return;
    try {
      await document.exitFullscreen();
      isFullscreen.value = false;
    } catch (e) {
      console.warn("Exit fullscreen failed:", e);
    }
  };

  const toggle = async () => {
    if (document.fullscreenElement) {
      await exit();
    } else {
      await enter();
    }
  };

  const onFullscreenChange = () => {
    isFullscreen.value = !!document.fullscreenElement;
  };

  onMounted(() => {
    document.addEventListener("fullscreenchange", onFullscreenChange);
  });

  onUnmounted(() => {
    document.removeEventListener("fullscreenchange", onFullscreenChange);
  });

  return { isFullscreen, enter, exit, toggle };
}
