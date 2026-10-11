<script setup lang="ts">
import { computed } from "vue";
import { ExternalLink } from "@lucide/vue";
import type { Course, CourseTextbook } from "../domain/models";
const props = defineProps<{ course?: Course; loading?: boolean }>();
const fields = computed(() => [
  { label: "课程类型", value: props.course?.courseType },
  { label: "课程范畴", value: props.course?.category },
  { label: "学科类别", value: props.course?.discipline },
  { label: "评分制", value: props.course?.grading },
]);
function textbookFields(book: CourseTextbook) {
  return [
    { label: "作者", value: book.author },
    { label: "出版社", value: book.publisher },
    { label: "版次", value: book.edition },
    { label: "出版日期", value: book.publicationDate },
    { label: "ISBN", value: book.isbn },
  ].filter((f) => f.value);
}
</script>
<template>
  <dl class="detail-grid">
    <div v-for="field in fields" :key="field.label">
      <dt>{{ field.label }}</dt>
      <dd>{{ field.value ?? (loading ? "正在读取…" : "未提供") }}</dd>
    </div>
  </dl>
  <div v-if="!loading" class="lesson-course-details">
    <section class="detail-section">
      <h3>预修要求</h3>
      <p>{{ course?.prerequisites ?? "未提供" }}</p>
    </section>
    <section class="detail-section">
      <h3>教材</h3>
      <p v-if="course?.textbook">{{ course.textbook }}</p>
      <ul v-if="course?.textbooks?.length" class="lesson-textbook-list">
        <li v-for="(book, index) in course.textbooks" :key="index">
          <h4>{{ book.name ?? book.englishName ?? "未提供书名" }}</h4>
          <p v-if="book.name && book.englishName" lang="en">
            {{ book.englishName }}
          </p>
          <dl class="lesson-textbook-fields">
            <div v-for="field in textbookFields(book)" :key="field.label">
              <dt>{{ field.label }}</dt>
              <dd>{{ field.value }}</dd>
            </div>
          </dl>
          <div v-if="book.isbn" class="lesson-textbook-actions">
            <a
              class="button small secondary"
              :href="`http://opac.lib.ustc.edu.cn/opac/openlink.php?t=isbn&q=${encodeURIComponent(book.isbn)}`"
              target="_blank"
              rel="noopener noreferrer"
              :aria-label="`${book.name ?? '教材'}：OPAC 查询（新窗口打开）`"
              >OPAC<ExternalLink :size="14"
            /></a>
            <a
              class="button small secondary"
              :href="`https://book.douban.com/isbn/${encodeURIComponent(book.isbn)}/`"
              target="_blank"
              rel="noopener noreferrer"
              :aria-label="`${book.name ?? '教材'}：豆瓣查询（新窗口打开）`"
              >豆瓣<ExternalLink :size="14"
            /></a>
          </div>
        </li>
      </ul>
      <p v-else-if="!course?.textbook">未提供</p>
    </section>
    <section class="detail-section">
      <h3>参考书</h3>
      <p>{{ course?.references ?? "未提供" }}</p>
    </section>
    <section class="detail-section">
      <h3>中文简介</h3>
      <p>{{ course?.description ?? "未提供" }}</p>
    </section>
    <section class="detail-section">
      <h3>英文简介</h3>
      <p :lang="course?.englishDescription ? 'en' : undefined">
        {{ course?.englishDescription ?? "未提供" }}
      </p>
    </section>
  </div>
</template>
