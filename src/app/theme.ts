import { StyleProvider, Themes } from "@varlet/ui";

// Material 3 blue tonal palette. Both library controls and custom visualizations
// consume these roles, so a theme switch changes every surface together.
const light = {
  "--hsl-primary": "218, 38%, 41%",
  "--hsl-on-primary": "0, 0%, 100%",
  "--hsl-primary-container": "221, 100%, 92%",
  "--hsl-on-primary-container": "217, 100%, 12%",
  "--hsl-info": "220, 14%, 39%",
  "--hsl-on-info": "0, 0%, 100%",
  "--hsl-info-container": "221, 47%, 90%",
  "--hsl-on-info-container": "222, 33%, 13%",
  "--hsl-body": "240, 100%, 99%",
  "--hsl-text": "220, 10%, 11%",
  "--hsl-surface-container-low": "235, 50%, 97%",
  "--hsl-surface-container": "231, 32%, 95%",
  "--hsl-surface-container-high": "228, 24%, 92%",
  "--hsl-surface-container-highest": "223, 19%, 90%",
  "--hsl-on-surface-variant": "220, 9%, 29%",
  "--hsl-outline": "220, 9%, 48%",
  "--hsl-danger": "3, 71%, 41%",
  "--hsl-on-danger": "0, 0%, 100%",
  "--hsl-danger-container": "6, 100%, 92%",
  "--hsl-on-danger-container": "3, 100%, 13%",
};
const dark = {
  "--hsl-primary": "219, 100%, 83%",
  "--hsl-on-primary": "217, 65%, 22%",
  "--hsl-primary-container": "218, 46%, 32%",
  "--hsl-on-primary-container": "221, 100%, 92%",
  "--hsl-info": "222, 26%, 81%",
  "--hsl-on-info": "221, 21%, 22%",
  "--hsl-info-container": "221, 16%, 32%",
  "--hsl-on-info-container": "221, 47%, 90%",
  "--hsl-body": "223, 18%, 8%",
  "--hsl-text": "228, 10%, 90%",
  "--hsl-surface-container-low": "220, 10%, 11%",
  "--hsl-surface-container": "223, 9%, 13%",
  "--hsl-surface-container-high": "222, 8%, 17%",
  "--hsl-surface-container-highest": "223, 7%, 21%",
  "--hsl-on-surface-variant": "220, 15%, 80%",
  "--hsl-outline": "220, 6%, 58%",
  "--hsl-danger": "6, 100%, 84%",
  "--hsl-on-danger": "3, 100%, 21%",
  "--hsl-danger-container": "3, 100%, 29%",
  "--hsl-on-danger-container": "6, 100%, 92%",
};
export function applyTheme(theme: "light" | "dark") {
  StyleProvider({
    ...(theme === "dark" ? Themes.md3Dark : Themes.md3Light),
    ...(theme === "dark" ? dark : light),
    "--field-decorator-text-color": "var(--color-text)",
    "--field-decorator-blur-color": "var(--color-outline)",
    "--field-decorator-placeholder-color": "var(--color-on-surface-variant)",
    "--button-normal-height": "44px",
    "--button-small-height": "44px",
    "--button-normal-font-size": "14px",
    "--select-scroller-max-height": "min(320px, 48dvh)",
    "--paper-background": "var(--color-body)",
    "--paper-border-radius": "20px",
  });
  document.documentElement.dataset.theme = theme;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", theme === "dark" ? "#111318" : "#f9f9ff");
}
