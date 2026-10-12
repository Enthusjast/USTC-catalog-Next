<script setup lang="ts">
import { computed } from "vue";
import type { Lesson } from "../domain/models";
import { catalog } from "../api/catalog";
import { useQuery } from "../features/useQuery";
import DisclosureDialog from "./DisclosureDialog.vue";
import QueryState from "./QueryState.vue";
import EmptyState from "./EmptyState.vue";
import CourseContent from "./CourseContent.vue";
import IcourseLink from "./IcourseLink.vue";
import { workspaceBusy } from "../features/useWorkspace";
import { teacherLink } from "../domain/queryLinks";
import LessonSchedule from "./LessonSchedule.vue";
const props = defineProps<{
  code: string;
  semester: string;
  detail?: Lesson;
  selected: boolean;
  weekStart?: string;
  week?: number;
}>();
defineEmits<{ close: []; candidate: [lesson: Lesson] }>();
const lessonInfo = useQuery(
  (signal, force) =>
    catalog.lessonDetails(props.code, props.semester, { signal, force }),
  () => `${props.semester}:${props.code}`,
  () => !!props.semester && !!props.code,
);
const detailCourse = computed(() =>
  lessonInfo.data.value?.find((c) => c.code === props.code),
);
</script>
<template>
  <DisclosureDialog
    :open="!!code"
    title="公开教学班详情"
    @close="$emit('close')"
    ><template v-if="detail"
      ><QueryState
        :loading="lessonInfo.loading.value"
        :error="lessonInfo.error.value"
        :meta="lessonInfo.meta.value"
        @retry="lessonInfo.reload"
      /><span class="mono muted">{{ detail.code }}</span>
      <div class="detail-title">
        <h3>{{ detail.course.name }}</h3>
        <p>{{ detailCourse?.englishName ?? detail.course.englishName }}</p>
      </div>
      <dl class="detail-grid">
        <div>
          <dt>教师</dt>
          <dd>
            <template v-for="(teacher, index) in detail.teachers" :key="teacher"
              ><span v-if="index">、</span
              ><RouterLink
                class="text-button"
                :to="teacherLink(semester, teacher)"
                >{{ teacher }}</RouterLink
              ></template
            ><span v-if="!detail.teachers.length">未提供</span>
          </dd>
        </div>
        <div>
          <dt>开课院系</dt>
          <dd>{{ detail.department }}</dd>
        </div>
        <div>
          <dt>课程编号</dt>
          <dd class="mono">{{ detail.course.code }}</dd>
        </div>
        <div>
          <dt>学分 / 学时</dt>
          <dd>
            {{ detailCourse?.credits ?? detail.credits ?? "未提供" }} /
            {{ detailCourse?.hours ?? detail.hours ?? "未提供" }}
          </dd>
        </div>
        <div>
          <dt>学历层次</dt>
          <dd>{{ detail.education ?? "未提供" }}</dd>
        </div>
        <div>
          <dt>课堂类型</dt>
          <dd>{{ detail.classType ?? "未提供" }}</dd>
        </div>
        <div>
          <dt>授课语言</dt>
          <dd>{{ detailCourse?.language ?? detail.language ?? "未提供" }}</dd>
        </div>
        <div>
          <dt>考核方式</dt>
          <dd>{{ detailCourse?.examMode ?? detail.examMode ?? "未提供" }}</dd>
        </div>
        <div>
          <dt>开课校区</dt>
          <dd>{{ detail.campus ?? "未提供" }}</dd>
        </div>
        <div>
          <dt>选课人数 / 上限</dt>
          <dd>
            {{ detail.count ?? "未提供" }} / {{ detail.capacity ?? "未提供" }}
          </dd>
        </div>
      </dl>
      <section class="detail-section">
        <h3>原始公开时间安排</h3>
        <p>{{ detail.schedule.text || "未提供" }}</p>
        <LessonSchedule
          :schedule="detail.schedule"
          :week-start="weekStart"
          :week="week"
        />
      </section>
      <p v-if="detail.schedule.unknown" class="notice warning">
        部分时间无法识别，完整冲突状态未知。
      </p>
      <CourseContent
        :course="detailCourse"
        :loading="lessonInfo.loading.value"
      />
      <div class="flex-actions">
        <IcourseLink :lesson="detail" variant="button" />
        <button
          class="button"
          :disabled="workspaceBusy"
          @click="$emit('candidate', detail)"
        >
          {{ selected ? "移除候选" : "加入候选清单" }}</button
        ><RouterLink
          class="button secondary"
          :to="{
            path: '/courses',
            query: {
              q: detail.course.code,
              course: detail.course.code,
              history: '1',
            },
          }"
          >查看课程详情</RouterLink
        >
      </div></template
    ><EmptyState v-else title="未找到该教学班" message="请确认学期和教学班号。"
  /></DisclosureDialog>
</template>
