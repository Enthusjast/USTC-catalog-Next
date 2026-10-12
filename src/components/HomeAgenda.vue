<script setup lang="ts">
import { computed, ref } from "vue";
import type { Semester } from "../domain/models";
import { usePlanner } from "../features/usePlanner";
import { useToday } from "../features/useToday";
import { useQuery } from "../features/useQuery";
import { catalog } from "../api/catalog";
import {
  teachingWeek,
  weekDates,
  addISODate,
  isFirstMonday,
} from "../domain/dates";
import { timetableBlocks } from "../domain/timetable";
import { periodTimes } from "../domain/periods";
import { formatClock, weekdays } from "../domain/schedule";
import { lessonLink, roomLink } from "../domain/queryLinks";
import QueryState from "./QueryState.vue";
import CalendarSettings from "./CalendarSettings.vue";
const props = defineProps<{ semester: Semester }>(),
  planner = usePlanner(computed(() => props.semester.id)),
  today = useToday();
const open = ref(false),
  mode = ref("day"),
  week = computed(() => teachingWeek(planner.firstMonday.value, today.value));
const dates = computed(() =>
  mode.value === "day" ? [today.value] : weekDates(today.value),
);
const courseExams = useQuery(
  (signal, force) => catalog.exams(props.semester.id, false, { signal, force }),
  () => props.semester.id,
  open,
);
const generalExams = useQuery(
  (signal, force) => catalog.exams(props.semester.id, true, { signal, force }),
  () => props.semester.id,
  open,
);
const relatedExams = computed(() =>
  [...(courseExams.data.value ?? []), ...(generalExams.data.value ?? [])]
    .filter((exam) =>
      planner.lessons.value.some((lesson) =>
        exam.lessonCode
          ? exam.lessonCode === lesson.code
          : exam.courseCode === lesson.course.code,
      ),
    )
    .sort(
      (a, b) =>
        (a.date ?? "").localeCompare(b.date ?? "") ||
        (a.start ?? 1440) - (b.start ?? 1440),
    ),
);
const exams = computed(() =>
  relatedExams.value.filter(
    (exam) =>
      exam.date &&
      exam.date >= today.value &&
      exam.date < addISODate(today.value, 7),
  ),
);
const undatedExams = computed(() =>
  relatedExams.value.filter((exam) => !exam.date),
);
const blocks = computed(() =>
  week.value ? timetableBlocks(planner.lessons.value, week.value) : [],
);
const unknown = computed(() =>
  planner.lessons.value.filter(
    (l) => l.schedule.unknown || !l.schedule.slots.length,
  ),
);
function label(day: string) {
  return `周${weekdays[(new Date(`${day}T12:00:00Z`).getUTCDay() + 6) % 7]}`;
}
function time(start: number, end: number) {
  const times = periodTimes(
    planner.layout.value,
    Array.from({ length: end - start }, (_, i) => start + i),
  );
  return times
    ? `${formatClock(times.start)}–${formatClock(times.end)}`
    : `第 ${start}–${end - 1} 节`;
}
</script>
<template>
  <details
    v-if="planner.lessons.value.length"
    class="panel home-agenda"
    @toggle="open = ($event.target as HTMLDetailsElement).open"
  >
    <summary>
      今天／本周安排 <span class="muted">{{ planner.active.value?.name }}</span>
    </summary>
    <div class="flex-actions">
      <button
        class="text-button"
        :aria-pressed="mode === 'day'"
        @click="mode = 'day'"
      >
        今天</button
      ><button
        class="text-button"
        :aria-pressed="mode === 'week'"
        @click="mode = 'week'"
      >
        本周
      </button>
    </div>
    <CalendarSettings
      v-if="!isFirstMonday(planner.firstMonday.value)"
      :planner="planner"
      prefix="home-calendar"
    />
    <p v-else-if="!week" class="muted">当前日期不在设置的教学周范围内。</p>
    <template v-else>
      <section v-for="date in dates" :key="date" class="agenda-day">
        <h3>{{ label(date) }} · {{ date }}</h3>
        <article
          v-for="block in blocks.filter(
            (block) =>
              block.day ===
              ((new Date(`${date}T12:00:00Z`).getUTCDay() + 6) % 7) + 1,
          )"
          :key="block.key"
        >
          <RouterLink
            class="course-name"
            :to="lessonLink(semester.id, block.lesson.code)"
            >{{ block.lesson.course.name }}</RouterLink
          ><span
            >{{ time(block.start, block.end) }} ·
            {{ block.lesson.teachers.join("、") }} ·
            <RouterLink
              v-if="roomLink(block.location, date)"
              :to="roomLink(block.location, date)!"
              >{{ block.location }}</RouterLink
            ><span v-else>{{ block.location || "地点未提供" }}</span></span
          >
        </article>
        <p
          v-if="
            !blocks.some(
              (block) =>
                block.day ===
                ((new Date(`${date}T12:00:00Z`).getUTCDay() + 6) % 7) + 1,
            )
          "
          class="muted"
        >
          无已定位的方案安排
        </p>
      </section>
    </template>
    <details v-if="unknown.length">
      <summary>其他未完整定位的安排 {{ unknown.length }}</summary>
      <p v-for="lesson in unknown" :key="lesson.id">
        <RouterLink :to="lessonLink(semester.id, lesson.code)">{{
          lesson.course.name
        }}</RouterLink>
        · {{ lesson.schedule.text || "未提供安排" }}
      </p>
    </details>
    <h3>未来七天关联考试</h3>
    <QueryState
      :loading="courseExams.loading.value"
      :error="courseExams.error.value"
      @retry="courseExams.reload"
    /><QueryState
      :loading="generalExams.loading.value"
      :error="generalExams.error.value"
      @retry="generalExams.reload"
    />
    <p v-for="exam in exams" :key="`${exam.type}:${exam.id}`">
      <RouterLink
        v-if="exam.lessonCode"
        :to="lessonLink(semester.id, exam.lessonCode)"
        >{{ exam.courseName }}</RouterLink
      ><span v-else>{{ exam.courseName }}</span> · {{ exam.date }} ·
      {{ formatClock(exam.start) }}–{{ formatClock(exam.end) }} ·
      {{ exam.rooms.join("、") }}
    </p>
    <p
      v-if="courseExams.data.value && generalExams.data.value && !exams.length"
      class="muted"
    >
      未找到未来七天的关联考试
    </p>
    <details v-if="undatedExams.length">
      <summary>日期未提供的关联考试 {{ undatedExams.length }}</summary>
      <p v-for="exam in undatedExams" :key="`${exam.type}:${exam.id}`">
        {{ exam.courseName }} · {{ formatClock(exam.start) }}–{{
          formatClock(exam.end)
        }}
        · {{ exam.rooms.join("、") }}
      </p>
    </details>
  </details>
</template>
<style scoped>
.home-agenda {
  margin-top: 20px;
  padding: 16px;
}
.home-agenda > summary {
  font-weight: 600;
}
.home-agenda h3 {
  font-size: 15px;
  margin: 12px 0 8px;
}
.agenda-day article {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
  margin: 8px 0;
}
.agenda-day article > span {
  color: var(--muted);
  font-size: 13px;
}
.home-agenda p {
  margin: 8px 0;
  font-size: 13px;
}
</style>
