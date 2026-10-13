import { createApp } from "vue";
import App from "./App.vue";
import { router } from "./router";
import { startPWA } from "../features/usePWA";
import { installUI } from "./ui";
import "../styles/main.css";

const app = createApp(App);
installUI(app);
app.use(router).mount("#app");
startPWA();
