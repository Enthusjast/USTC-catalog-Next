<script setup lang="ts">
import { ArrowUpRight, Archive } from "@lucide/vue";
import PageHeading from "../components/PageHeading.vue";
</script>
<template>
  <PageHeading
    title="历史培养方案归档"
    description="历史资料与 API 执行计划分开呈现。请按入学年级与专业核对适用范围。"
    eyebrow="ARCHIVES / 历史资料"
  />
  <nav class="tabs" aria-label="资料集合">
    <RouterLink to="/programs">API 执行计划</RouterLink
    ><RouterLink class="active" to="/archives"
      >历史培养方案 / 静态归档</RouterLink
    >
  </nav>
  <div class="notice">
    <Archive :size="19" />
    <p>
      历史正文来自官方静态页面或归档文件。其版本不代表当前教学安排；点击来源链接浏览正文、课程表和附件。
    </p>
  </div>
  <div class="archive-grid">
    <article class="panel result-card">
      <div class="card-topline">
        <span class="tag warning">2013 级</span
        ><span class="tag">静态资料</span>
      </div>
      <h2>2013 级培养方案目录</h2>
      <p>按院系、专业、英才班、交叉学科及双学位课程设置浏览官方历史正文。</p>
      <a
        class="button secondary"
        style="margin-top: 24px"
        href="https://catalog.ustc.edu.cn/program"
        target="_blank"
        rel="noopener noreferrer"
        >浏览官方历史正文<ArrowUpRight :size="16"
      /></a>
    </article>
    <article class="panel result-card">
      <div class="card-topline">
        <span class="tag">历年资料</span><span class="tag">官方归档</span>
      </div>
      <h2>本科教育培养方案归档</h2>
      <p>
        通过本科教育官方归档页查找年级、专业说明及原始附件。文件标注的年级和版本为准。
      </p>
      <a
        class="button secondary"
        style="margin-top: 24px"
        href="https://www.teach.ustc.edu.cn/education/241.html"
        target="_blank"
        rel="noopener noreferrer"
        >查看官方归档与附件<ArrowUpRight :size="16"
      /></a>
    </article>
  </div>
</template>
