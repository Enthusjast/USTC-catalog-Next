<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute } from "vue-router";
import { ArrowLeft, ArrowUpRight, Link } from "@lucide/vue";
import { archives } from "../api/archives";
import { useQuery } from "../features/useQuery";
import { useFilter } from "../features/useFilters";
import PageHeading from "../components/PageHeading.vue";
import QueryState from "../components/QueryState.vue";
import ArchiveTable from "../components/ArchiveTable.vue";
const route = useRoute(),
  view = useFilter("view", "text"),
  copied = ref("");
const code = computed(() => String(route.params.code));
const { data, meta, loading, error, reload } = useQuery(
  (signal, force) => archives.document(code.value, { signal, force }),
  code,
);
const tables = computed(
  () => data.value?.blocks.filter((block) => block.type === "table") ?? [],
);
async function share() {
  try {
    await navigator.clipboard.writeText(location.href);
    copied.value = "分享链接已复制。";
  } catch {
    copied.value = "请复制浏览器地址栏中的完整链接。";
  }
}
</script>
<template>
  <RouterLink class="text-button" to="/archives" style="margin-bottom: 20px"
    ><ArrowLeft :size="16" />返回历史归档</RouterLink
  ><PageHeading
    :title="data?.title ?? '历史方案正文'"
    :description="
      data
        ? `${data.version} · ${data.kind}${data.department ? ` · ${data.department}` : ''}`
        : `读取历史文档 ${code}`
    "
    eyebrow="HISTORICAL DOCUMENT / 历史文档"
    ><button class="button secondary" @click="share">
      <Link :size="16" />复制分享链接</button
    ><a
      v-if="data"
      class="button secondary"
      :href="data.source"
      target="_blank"
      rel="noopener noreferrer"
      >官方原始正文<ArrowUpRight :size="16" /></a
  ></PageHeading>
  <p v-if="copied" class="notice" role="status">{{ copied }}</p>
  <div class="notice warning">
    此处为历史静态资料。文档内学分要求和课程设置适用于其原始版本，不用于判断当前毕业要求或开课情况。
  </div>
  <QueryState
    :loading="loading"
    :error="error"
    :meta="meta"
    @retry="reload"
  /><template v-if="data"
    ><nav class="tabs" aria-label="历史文档视图">
      <button
        :class="{ active: view === 'text' }"
        :aria-pressed="view === 'text'"
        @click="view = 'text'"
      >
        官方正文阅读区</button
      ><button
        :class="{ active: view === 'tables' }"
        :aria-pressed="view === 'tables'"
        @click="view = 'tables'"
      >
        归档课程表（{{ tables.length }}）
      </button>
    </nav>
    <section v-if="view === 'text'" class="panel archive-reader">
      <h2>原始历史正文</h2>
      <p class="muted">
        下方由官方静态文档直接加载，可在阅读区内滚动；网络不可用时，可查看已归档课程表或稍后打开官方来源。
      </p>
      <blockquote v-if="data.excerpt">正文摘录：{{ data.excerpt }}…</blockquote>
      <iframe
        :key="data.source"
        :src="data.source"
        :title="`${data.title}（官方 ${data.version} 历史正文）`"
        sandbox="allow-popups allow-popups-to-escape-sandbox"
        referrerpolicy="no-referrer"
        loading="lazy"
      /><a
        class="text-button"
        :href="data.source"
        target="_blank"
        rel="noopener noreferrer"
        >在官方页面阅读完整正文<ArrowUpRight :size="14"
      /></a>
    </section>
    <section v-else class="panel archive-document">
      <p class="muted">
        以下为归档时读取的原始课程表，保留列顺序、表头、合并单元格和表内备注；表格可在自身区域横向滚动。段落说明请在官方正文中核对。
      </p>
      <template v-for="(block, index) in data.blocks" :key="index"
        ><component
          v-if="block.type === 'heading'"
          :is="`h${block.level}`"
          class="archive-heading"
          >{{ block.text }}</component
        ><ArchiveTable
          v-else
          :table="block"
          :number="
            data.blocks
              .slice(0, index + 1)
              .filter((item) => item.type === 'table').length
          "
      /></template>
      <p v-if="!tables.length" class="notice">
        此文档未提供课程表，可在官方正文阅读区查看历史说明。
      </p>
    </section>
    <section v-if="data.links.length" class="panel archive-attachments">
      <h2>原始资料链接</h2>
      <a
        v-for="(link, index) in data.links"
        :key="index"
        class="text-button"
        :href="link.url"
        target="_blank"
        rel="noopener noreferrer"
        >{{ link.title }}<ArrowUpRight :size="14"
      /></a></section
  ></template>
</template>
