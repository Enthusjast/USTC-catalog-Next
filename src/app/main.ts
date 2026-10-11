import { createApp } from "vue";
import App from "./App.vue";
import { router } from "./router";
import { startPWA } from "../features/usePWA";
import "../styles/main.css";

createApp(App).use(router).mount("#app");
startPWA();
