import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";
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
