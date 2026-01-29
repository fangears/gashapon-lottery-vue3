import { createRouter, createWebHistory } from "vue-router";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    // { path: "/", name: "gacha", component: () => import("../views/GachaView.vue") },
    { path: "/", name: "gacha", component: () => import("../views/GachaView2.vue") },
    { path: "/admin", name: "admin", component: () => import("../views/AdminView.vue") },
    { path: "/history", name: "history", component: () => import("../views/HistoryView.vue") },
    { path: "/screensaver", name: "screensaver", component: () => import("../views/ScreensaverView.vue") },
    { path: "/images", name: "images", component: () => import("../views/ImageManagerView.vue") },
  ],
});

export default router;
