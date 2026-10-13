import type { App } from "vue";
import { Menu, Loading, Paper, Chip, Ripple, Locale } from "@varlet/ui";
import UiButton from "../components/ui/UiButton.vue";
import UiInput from "../components/ui/UiInput.vue";
import UiSelect from "../components/ui/UiSelect.vue";
import UiCheckbox from "../components/ui/UiCheckbox.vue";
import "@varlet/ui/es/button/style/index.mjs";
import "@varlet/ui/es/input/style/index.mjs";
import "@varlet/ui/es/select/style/index.mjs";
import "@varlet/ui/es/checkbox/style/index.mjs";
import "@varlet/ui/es/loading/style/index.mjs";
import "@varlet/ui/es/paper/style/index.mjs";
import "@varlet/ui/es/chip/style/index.mjs";

export function installUI(app: App) {
  Locale.use("zh-CN");
  // Keep menus in the native dialog's top layer, with viewport positioning.
  Menu.setPropsDefaults({ teleport: false, strategy: "fixed" });
  app.component("UiButton", UiButton);
  app.component("UiInput", UiInput);
  app.component("UiSelect", UiSelect);
  app.component("UiCheckbox", UiCheckbox);
  app.component("VarLoading", Loading);
  app.component("VarPaper", Paper);
  app.component("VarChip", Chip);
  app.directive("ripple", Ripple);
}
