import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  if (command === "build" && env.VITE_DATA_MODE === "fixtures")
    throw new Error("演示数据仅用于开发服务器，不能构建发布产物。");
  if (
    command === "build" &&
    env.VITE_API_BASE_URL &&
    new URL(env.VITE_API_BASE_URL).protocol !== "https:"
  )
    throw new Error("发布构建的数据接口必须使用 HTTPS。");
  return {
    resolve: {
      alias:
        command === "build"
          ? [
              {
                find: "./fixtures",
                replacement: fileURLToPath(
                  new URL("./src/api/fixtureStub.ts", import.meta.url),
                ),
              },
            ]
          : [],
    },
    base: "/",
    plugins: [
      vue(),
      tailwindcss(),
      VitePWA({
        registerType: "prompt",
        injectRegister: false,
        includeAssets: [],
        includeManifestIcons: false,
        manifest: {
          id: "/",
          name: "USTC-catalog-Next",
          short_name: "USTC-catalog-Next",
          description: "中国科学技术大学公开课程查询与本机规划工具",
          lang: "zh-CN",
          start_url: "/",
          scope: "/",
          display: "standalone",
          theme_color: "#1b4f7e",
          background_color: "#f5f8fc",
          icons: [
            {
              src: "/icons/icon-192.png",
              sizes: "192x192",
              type: "image/png",
              purpose: "any",
            },
            {
              src: "/icons/icon-512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "any",
            },
            {
              src: "/icons/icon-maskable-512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "maskable",
            },
          ],
        },
        workbox: {
          globPatterns: ["**/*.{js,css,html,svg,png,txt}"],
          globIgnores: ["data/**"],
          navigateFallback: "/index.html",
          cleanupOutdatedCaches: true,
          // API responses and archive JSON remain owned by validated IndexedDB caching.
          runtimeCaching: [],
        },
        devOptions: { enabled: false },
      }),
      {
        name: "license-notices",
        generateBundle() {
          for (const file of ["LICENSE", "THIRD_PARTY_NOTICES.md"])
            this.emitFile({
              type: "asset",
              fileName: `${file}.txt`,
              source: readFileSync(file, "utf8"),
            });
        },
      },
    ],
  };
});
