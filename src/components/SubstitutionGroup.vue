<script setup lang="ts">
import { useId } from "vue";
import type { Course } from "../domain/models";
defineProps<{ courses: Course[]; label: string }>();
const heading = useId();
</script>
<template>
  <section class="substitution-group" :aria-labelledby="heading">
    <h3 :id="heading" class="substitution-label">
      {{ label
      }}<span v-if="courses.length > 1">组合 · {{ courses.length }} 门</span>
    </h3>
    <template
      v-for="(course, index) in courses"
      :key="`${course.code}:${index}`"
    >
      <span
        v-if="index"
        class="substitution-plus"
        role="img"
        aria-label="与上一门课程共同组成组合"
        >+</span
      >
      <RouterLink
        class="substitution-course"
        :to="{
          path: '/courses',
          query: { q: course.code, course: course.code, history: '1' },
        }"
      >
        <span class="substitution-course-meta"
          ><span class="mono">{{ course.code }}</span
          ><span v-if="course.credits !== undefined"
            >{{ course.credits }} 学分</span
          ></span
        >
        <strong>{{ course.name }}</strong>
      </RouterLink>
    </template>
    <p v-if="!courses.length" class="muted">未提供课程</p>
  </section>
</template>
