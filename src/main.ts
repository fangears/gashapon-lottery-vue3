import { createApp } from "vue";
import ElementPlus from "element-plus";
import "element-plus/dist/index.css";
import "normalize.css";
import ContextMenu from "@imengyu/vue3-context-menu";
import "@imengyu/vue3-context-menu/lib/vue3-context-menu.css";
import { createPinia } from "pinia";
import piniaPluginPersistedstate from "pinia-plugin-persistedstate";
import App from "./App.vue";
import router from "./router";
import { useGachaStore } from "./stores/gacha";
import { useImageLibraryStore } from "./stores/imageLibrary";
import "./styles/global.css";

async function bootstrap() {
  const app = createApp(App);
  const pinia = createPinia();
  pinia.use(piniaPluginPersistedstate);

  app.use(pinia);
  app.use(router);
  app.use(ElementPlus);
  app.use(ContextMenu);

  // 图片库走 Tauri AppData：启动时 hydrate，确保各页面可直接选择/使用
  const gachaStore = useGachaStore(pinia);
  const imageStore = useImageLibraryStore(pinia);
  await imageStore.hydrate();

  // 兼容迁移：把旧版奖品 base64(dataURL) 图片写入图库，并把配置替换成图库 id
  await Promise.all(
    gachaStore.config.prizes.map(async (prize, index) => {
      const value = prize.imageUrl ?? "";
      if (!/^data:image\/[a-z0-9.+-]+;base64,/i.test(value)) return;
      try {
        const imported = await imageStore.importDataUrl(value, `${prize.name || "prize"}-image`, ["prize"]);
        gachaStore.updatePrize(index, { imageUrl: imported.id });
      } catch {
        // ignore
      }
    }),
  );

  // 若胶片未配置，则默认选中“film”标签的图片（兼容从旧 film_images 迁移的素材）
  if (!gachaStore.config.filmImageIds?.length) {
    const filmIds = imageStore.items.filter((x) => x.tags?.includes("film")).map((x) => x.id);
    if (filmIds.length) gachaStore.setFilmImageIds(filmIds);
  }

  // 若屏保未配置：优先用“screensaver”标签，否则沿用胶片选择（保持旧版体验）
  if (!gachaStore.config.screensaverImageIds?.length) {
    const screensaverIds = imageStore.items.filter((x) => x.tags?.includes("screensaver")).map((x) => x.id);
    if (screensaverIds.length) gachaStore.setScreensaverImageIds(screensaverIds);
    else if (gachaStore.config.filmImageIds?.length) gachaStore.setScreensaverImageIds(gachaStore.config.filmImageIds);
  }

  app.mount("#app");
}

bootstrap();
