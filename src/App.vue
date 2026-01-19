<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import ContextMenu from "@imengyu/vue3-context-menu";

const router = useRouter();
const route = useRoute();

const navItems = [
  { label: "扭蛋抽奖", path: "/" },
  { label: "后台管理", path: "/admin" },
  { label: "抽奖记录", path: "/history" },
];

const activePath = computed(() => route.path);
const isDev = import.meta.env.DEV;

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
</script>

<template>
  <div class="app-shell" @contextmenu="handleContextMenu">
    <header v-if="isDev" class="app-header">
      <div class="brand">
        <span class="brand-title">扭蛋机抽奖</span>
        <span class="brand-subtitle">Playful Gacha Lottery</span>
      </div>
      <nav class="app-nav">
        <button
          v-for="item in navItems"
          :key="item.path"
          class="nav-button"
          :class="{ active: activePath === item.path }"
          @click="router.push(item.path)"
        >
          {{ item.label }}
        </button>
      </nav>
    </header>
    <router-view />
  </div>
</template>

<style scoped>
.app-header {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-md);
  align-items: center;
  justify-content: space-between;
  padding: var(--space-lg) var(--space-2xl);
  background: white;
  box-shadow: var(--shadow-sm);
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
</style>