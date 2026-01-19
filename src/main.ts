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
import "./styles/global.css";

const app = createApp(App);
const pinia = createPinia();

pinia.use(piniaPluginPersistedstate);

app.use(pinia);
app.use(router);
app.use(ElementPlus);
app.use(ContextMenu);

app.mount("#app");
