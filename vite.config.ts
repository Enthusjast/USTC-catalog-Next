import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";
import { readFileSync } from "node:fs";

export default defineConfig({
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
});
