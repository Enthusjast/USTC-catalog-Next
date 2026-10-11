<script setup lang="ts">
import { ref } from "vue";
import { Trash2, Download, RefreshCw } from "@lucide/vue";
import { clearCache } from "../api/cache";
import { clearAllLocalData } from "../features/clearLocalData";
import { usePWA } from "../features/usePWA";
import WorkspaceBackup from "../components/WorkspaceBackup.vue";
import PageHeading from "../components/PageHeading.vue";
const message = ref(""),
  clearing = ref(false),
  confirmClear = ref(false);
const {
  installed,
  installAvailable,
  installing,
  needRefresh,
  updating,
  install,
  update,
  message: pwaMessage,
} = usePWA();
async function clearLocal(all = false) {
  if (clearing.value) return;
  clearing.value = true;
  message.value = "";
  try {
    if (all) await clearAllLocalData();
    else await clearCache();
    message.value = all
      ? "全部本机查询资料、方案、收藏及偏好已清除。"
      : "查询缓存已清除，方案和收藏已保留。";
  } catch (cause) {
    message.value = `清除未完成：${(cause as Error).message}`;
  } finally {
    clearing.value = false;
    confirmClear.value = false;
  }
}
</script>
<template>
  <PageHeading
    title="站点说明"
    description="了解本站功能和本机数据管理。"
    eyebrow="ABOUT / 关于本站"
  />
  <article class="panel prose">
    <h2>新一代公共查询工具</h2>
    <p>
      USTC-catalog-Next
      是新一代的中国科学技术大学教务公共查询工具。我们查询公开只读资料，并提供浏览器内的检索与一系列辅助功能。
    </p>
    <h2>公开资料</h2>
    <p>
      原始公开资料来自<a
        href="https://catalog.ustc.edu.cn/"
        target="_blank"
        rel="noopener noreferrer"
        >中国科大教务目录</a
      >。
    </p>
    <p>
      公开教学班、考试和替代关系可能次日更新。部分结果请以<a
        href="https://jw.ustc.edu.cn/"
        target="_blank"
        rel="noopener noreferrer"
        >综合教务系统</a
      >为准。
    </p>
    <h2>安装与离线使用</h2>
    <p>
      首次联网加载完成后，可以离线打开应用并阅读已查询的资料。未查询的内容仍需要联网，公开数据不会在后台自动更新。
    </p>
    <p v-if="installed">已作为应用安装。</p>
    <button
      v-else-if="installAvailable"
      class="button secondary"
      :disabled="installing"
      @click="install"
    >
      <Download :size="16" />{{
        installing ? "正在安装…" : "安装 USTC-catalog-Next"
      }}
    </button>
    <p v-else>可通过浏览器菜单选择“安装应用”或“添加到主屏幕”。</p>
    <button
      v-if="needRefresh"
      class="button secondary"
      :disabled="updating"
      @click="update"
    >
      <RefreshCw :size="16" />{{ updating ? "正在更新…" : "更新应用" }}
    </button>
    <p v-if="pwaMessage" role="status">{{ pwaMessage }}</p>
    <WorkspaceBackup />
    <h2>本机数据与隐私</h2>
    <p>本站缓存部分查询结果数据至本地，我们不会收集提交您的任何数据。</p>
    <p>
      清除查询缓存保留方案与收藏；清除全部本机数据还会移除新旧候选清单、收藏、筛选、主题及浏览位置。清除前可导出
      JSON 备份。
    </p>
    <div class="flex-actions">
      <button
        class="button secondary"
        :disabled="clearing"
        @click="clearLocal(false)"
      >
        <Trash2 :size="16" />清除查询缓存
      </button>
      <button
        class="button secondary"
        :disabled="clearing"
        @click="confirmClear = true"
      >
        <Trash2 :size="16" />清除全部本机数据
      </button>
    </div>
    <div
      v-if="confirmClear"
      class="notice"
      role="group"
      aria-label="确认清除全部本机数据"
    >
      <p>此浏览器中的方案与收藏也将被删除。</p>
      <div class="flex-actions">
        <button class="button" :disabled="clearing" @click="clearLocal(true)">
          确认清除
        </button>
        <button
          class="button secondary"
          :disabled="clearing"
          @click="confirmClear = false"
        >
          取消
        </button>
      </div>
    </div>
    <p v-if="message" role="status" style="margin-top: 16px">{{ message }}</p>
    <h2>项目与许可证</h2>
    <p>
      本项目按 MIT 许可证在
      <a
        href="https://github.com/Enthusjast/USTC-catalog-Next"
        target="_blank"
        rel="noopener noreferrer"
        >GitHub</a
      >
      开源。
    </p>
  </article>
</template>
