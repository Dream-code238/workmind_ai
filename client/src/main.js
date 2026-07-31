// 应用入口：注册 Vue 插件，挂载应用
import { createApp } from "vue";
import { createPinia } from "pinia";
import ElementPlus from "element-plus";
import * as ElementPlusIconsVue from "@element-plus/icons-vue";

import App from "./App.vue";
import router from "./router/index.js";

import "element-plus/dist/index.css";
import "./styles/global.css";

const app = createApp(App);

// 全局注册 Element Plus 图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component);
}

// Pinia：全局状态管理
app.use(createPinia());

// Vue Router：页面路由
app.use(router);
app.use(ElementPlus);

app.mount("#app");
