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
import "./styles/global.css";

async function bootstrap() {
  const app = createApp(App);
  const pinia = createPinia();
  pinia.use(piniaPluginPersistedstate);

  app.use(pinia);
  app.use(router);
  app.use(ElementPlus);
  app.use(ContextMenu);

  // 胶片图片走 IndexedDB：启动时先 hydrate，避免刷新后丢失
  await useGachaStore(pinia).hydrateFilmImages();

  app.mount("#app");
}

bootstrap();
