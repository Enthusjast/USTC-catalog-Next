export {};
declare module "vue" {
  export interface GlobalComponents {
    UiButton: (typeof import("./components/ui/UiButton.vue"))["default"];
    UiInput: (typeof import("./components/ui/UiInput.vue"))["default"];
    UiSelect: (typeof import("./components/ui/UiSelect.vue"))["default"];
    UiCheckbox: (typeof import("./components/ui/UiCheckbox.vue"))["default"];
    VarLoading: (typeof import("@varlet/ui"))["Loading"];
    VarPaper: (typeof import("@varlet/ui"))["Paper"];
    VarChip: (typeof import("@varlet/ui"))["Chip"];
  }
}
