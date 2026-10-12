<script setup lang="ts">
import { Check, Plus } from "@lucide/vue";
import type { Lesson } from "../domain/models";
import LessonSchedule from "./LessonSchedule.vue";
import IcourseLink from "./IcourseLink.vue";
import { workspaceBusy } from "../features/useWorkspace";
import { teacherLink } from "../domain/queryLinks";
defineProps<{
  lessons: Lesson[];
  candidateIds: Set<string>;
  compareCodes: string[];
  semester?: string;
}>();
defineEmits<{
  detail: [code: string];
  candidate: [lesson: Lesson];
  compare: [lesson: Lesson];
}>();
</script>
<template>
  <div v-if="lessons.length" class="table-scroll">
    <table class="lesson-table">
      <thead>
        <tr>
          <th>课程 / 教学班</th>
          <th>教师与院系</th>
          <th>时间与地点</th>
          <th>人数 / 容量</th>
          <th>候选</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="lesson in lessons"
          :key="lesson.id"
          :class="{ 'is-candidate': candidateIds.has(lesson.id) }"
        >
          <td>
            <span class="course-code mono">{{ lesson.code }}</span
            ><button class="course-name" @click="$emit('detail', lesson.code)">
              {{ lesson.course.name }}
            </button>
            <IcourseLink :lesson="lesson" />
            <p class="course-en">
              {{ lesson.credits ?? "未提供" }} 学分 ·
              {{ lesson.hours ?? "未提供" }} 学时
            </p>
          </td>
          <td>
            <span
              ><span class="lesson-mobile-label">教师：</span
              ><template v-if="semester && lesson.teachers.length"
                ><template
                  v-for="(teacher, index) in lesson.teachers"
                  :key="teacher"
                  ><span v-if="index">、</span
                  ><RouterLink
                    class="text-button"
                    :to="teacherLink(semester, teacher)"
                    >{{ teacher }}</RouterLink
                  ></template
                ></template
              ><template v-else>{{
                lesson.teachers.join("、") || "未提供"
              }}</template></span
            >
            <p class="course-en">{{ lesson.department }}</p>
          </td>
          <td>
            <LessonSchedule :schedule="lesson.schedule" />
          </td>
          <td>
            <span class="lesson-mobile-label">公开人数 / 容量：</span
            >{{ lesson.count ?? "未提供" }} /
            {{ lesson.capacity ?? "未提供" }}
          </td>
          <td>
            <button
              class="button secondary small candidate-button"
              :disabled="workspaceBusy"
              :class="{ 'is-selected': candidateIds.has(lesson.id) }"
              :aria-label="`${candidateIds.has(lesson.id) ? '移除' : '加入'} ${lesson.course.name} 候选清单`"
              :aria-pressed="candidateIds.has(lesson.id)"
              @click="$emit('candidate', lesson)"
            >
              <Check v-if="candidateIds.has(lesson.id)" :size="18" /><Plus
                v-else
                :size="18"
              />{{ candidateIds.has(lesson.id) ? "已加入" : "候选" }}
            </button>
            <button
              class="text-button"
              :aria-pressed="compareCodes.includes(lesson.code)"
              @click="$emit('compare', lesson)"
            >
              {{ compareCodes.includes(lesson.code) ? "已对比" : "对比" }}
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
