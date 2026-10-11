<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRouter } from "vue-router";
import {
  Trash2,
  Download,
  AlertTriangle,
  List,
  CalendarDays,
  ClipboardList,
  ArrowDown,
} from "@lucide/vue";
import type { Lesson } from "../domain/models";
import { catalog } from "../api/catalog";
import { useQuery } from "../features/useQuery";
import { useSemester } from "../features/useSemester";
import { useFilter, useDebounced } from "../features/useFilters";
import { usePlanner } from "../features/usePlanner";
import { usePagination } from "../features/usePagination";
import { useFilterSummary } from "../features/useFilterSummary";
import { useLessonFilterInfo } from "../features/useLessonFilterInfo";
import {
  matchesLessonFilters,
  matchesOption,
  missingValue,
} from "../domain/lessonFilters";
import { rankLessons } from "../domain/search";
import { lessonConflicts, weekdays, formatClock } from "../domain/schedule";
import { lessonCalendar, downloadCalendar } from "../domain/calendar";
import { periodLayouts } from "../domain/periods";
import PageHeading from "../components/PageHeading.vue";
import QueryState from "../components/QueryState.vue";
import FilterPanel from "../components/FilterPanel.vue";
import FilterSummary from "../components/FilterSummary.vue";
import EmptyState from "../components/EmptyState.vue";
import Pagination from "../components/Pagination.vue";
import LessonDetailDialog from "../components/LessonDetailDialog.vue";
import WeekTimetable from "../components/WeekTimetable.vue";
import LessonFilterFields from "../components/LessonFilterFields.vue";
import LessonList from "../components/LessonList.vue";
import { clockMinutes } from "../domain/schedule";
const router = useRouter(),
  semesterQuery = useSemester(),
  semester = semesterQuery.selected;
const q = useFilter("q"),
  keyword = useDebounced(q),
  dept = useFilter("dept"),
  teacher = useFilter("teacher"),
  day = useFilter("day"),
  period = useFilter("period"),
  location = useFilter("location"),
  education = useFilter("education"),
  type = useFilter("type"),
  courseType = useFilter("courseType"),
  category = useFilter("category"),
  discipline = useFilter("discipline"),
  grading = useFilter("grading"),
  campus = useFilter("campus"),
  language = useFilter("language"),
  examMode = useFilter("exam"),
  view = useFilter("view", "list"),
  week = useFilter("week", "1"),
  detailCode = useFilter("lesson"),
  sort = useFilter("sort", "code");
const { data, meta, loading, error, reload } = useQuery(
  (signal, force) => catalog.lessons(semester.value, { signal, force }),
  semester,
  () => !!semester.value,
);
const advancedOpen = ref(false);
watch(
  () =>
    [
      education,
      type,
      courseType,
      category,
      discipline,
      grading,
      campus,
      language,
      examMode,
    ].some((field) => !!field.value),
  (active) => {
    if (active) advancedOpen.value = true;
  },
  { immediate: true },
);
const metadataOpen = ref(false);
const baseFiltered = computed(() =>
  (data.value ?? []).filter((l) =>
    matchesLessonFilters(l, {
      q: keyword.value,
      dept: dept.value,
      teacher: teacher.value,
      day: day.value,
      period: period.value,
      location: location.value,
      education: education.value,
      type: type.value,
      courseType: courseType.value,
      category: category.value,
      campus: campus.value,
      language: language.value,
      exam: examMode.value,
    }),
  ),
);
const lessonFilterInfo = useLessonFilterInfo(
  semester,
  baseFiltered,
  () => metadataOpen.value || !!discipline.value || !!grading.value,
);
const filterInfoByCode = computed(
  () =>
    new Map(
      (lessonFilterInfo.data.value ?? []).map((info) => [info.code, info]),
    ),
);
const metadataFiltersPending = computed(
  () =>
    !!baseFiltered.value.length &&
    !!(discipline.value || grading.value) &&
    !lessonFilterInfo.data.value,
);
const planner = usePlanner(semester),
  conflicts = computed(() => lessonConflicts(planner.lessons.value));
const candidateIds = computed(
    () => new Set(planner.lessons.value.map((lesson) => lesson.id)),
  ),
  plannerHeading = ref<HTMLElement>(),
  resultsHeading = ref<HTMLElement>(),
  candidateMessage = ref("");
function toggleCandidate(lesson: Lesson) {
  const wasSelected = candidateIds.value.has(lesson.id);
  planner.toggle(lesson);
  candidateMessage.value =
    candidateIds.value.has(lesson.id) !== wasSelected
      ? `已${wasSelected ? "移除" : "加入"}候选：${lesson.course.name}，当前共 ${planner.lessons.value.length} 个教学班。`
      : planner.storageError.value;
}
function showPlanner() {
  plannerHeading.value?.scrollIntoView({ block: "start" });
  plannerHeading.value?.focus({ preventScroll: true });
}
function showResults() {
  view.value = "list";
  resultsHeading.value?.scrollIntoView({ block: "start" });
  resultsHeading.value?.focus({ preventScroll: true });
}
const firstMonday = ref(""),
  layout = ref(""),
  exportMessage = ref("");
const departments = computed(() =>
  [
    ...new Map(
      (data.value ?? []).map((l) => [
        l.departmentCode,
        { code: l.departmentCode, name: l.department },
      ]),
    ).values(),
  ].sort((a, b) => a.name.localeCompare(b.name, "zh")),
);
const selectedDepartment = computed({
  get: () =>
    departments.value.find((d) => d.name === dept.value)?.code ?? dept.value,
  set: (value) => {
    dept.value = value;
  },
});
const filterSummary = useFilterSummary({
  q: { label: "关键词", model: q },
  dept: {
    label: "院系",
    model: dept,
    display: () =>
      departments.value.find(
        (department) => department.code === selectedDepartment.value,
      )?.name,
  },
  teacher: { label: "教师", model: teacher },
  day: {
    label: "星期",
    model: day,
    display: () =>
      weekdays[Number(day.value) - 1]
        ? `周${weekdays[Number(day.value) - 1]}`
        : day.value,
  },
  period: {
    label: "课节",
    model: period,
    display: () => `第 ${period.value} 节`,
  },
  location: { label: "地点", model: location },
  education: { label: "学历层次", model: education },
  type: { label: "课堂类型", model: type },
  courseType: {
    label: "课程类型",
    model: courseType,
    display: () => (courseType.value === missingValue ? "未提供" : undefined),
  },
  category: { label: "课程范畴", model: category },
  discipline: {
    label: "学科类别",
    model: discipline,
    display: () => (discipline.value === missingValue ? "未提供" : undefined),
  },
  grading: {
    label: "评分制",
    model: grading,
    display: () => (grading.value === missingValue ? "未提供" : undefined),
  },
  campus: {
    label: "校区",
    model: campus,
    display: () => (campus.value === missingValue ? "未提供" : undefined),
  },
  language: { label: "授课语言", model: language },
  exam: { label: "考试方式", model: examMode },
});
function distinctOptions(
  values: (string | undefined)[],
  includeMissing = false,
) {
  const result = [...new Set(values.filter((v): v is string => !!v))].sort(
    (a, b) => a.localeCompare(b, "zh-CN"),
  );
  if (includeMissing && values.some((value) => !value))
    result.push(missingValue);
  return result;
}
const options = (
  field:
    | "education"
    | "classType"
    | "courseType"
    | "category"
    | "language"
    | "examMode"
    | "campus",
) =>
  distinctOptions(
    (data.value ?? []).map((l) => l[field]),
    field === "courseType" || field === "campus",
  );
function detailOptions(field: "discipline" | "grading") {
  if (!lessonFilterInfo.data.value) return [];
  return distinctOptions(
    (lessonFilterInfo.data.value ?? []).map((info) => info[field]),
    true,
  );
}
const advanced = computed(() => [
  {
    key: "education",
    label: "学历层次",
    model: education,
    values: options("education"),
  },
  { key: "type", label: "课堂类型", model: type, values: options("classType") },
  {
    key: "courseType",
    label: "课程类型",
    model: courseType,
    values: options("courseType"),
  },
  {
    key: "category",
    label: "课程范畴",
    model: category,
    values: options("category"),
  },
  {
    key: "discipline",
    label: "学科类别",
    model: discipline,
    values: detailOptions("discipline"),
  },
  {
    key: "grading",
    label: "评分制",
    model: grading,
    values: detailOptions("grading"),
  },
  { key: "campus", label: "校区", model: campus, values: options("campus") },
  {
    key: "language",
    label: "授课语言",
    model: language,
    values: options("language"),
  },
  {
    key: "exam",
    label: "考试方式",
    model: examMode,
    values: options("examMode"),
  },
]);
const filtered = computed(() =>
  (metadataFiltersPending.value ? [] : baseFiltered.value)
    .filter(
      (l) =>
        matchesOption(
          filterInfoByCode.value.get(l.code)?.discipline,
          discipline.value,
        ) &&
        matchesOption(
          filterInfoByCode.value.get(l.code)?.grading,
          grading.value,
        ),
    )
    .sort(
      (a, b) =>
        (keyword.value.trim() && sort.value === "code"
          ? rankLessons([a, b], keyword.value).findIndex((l) => l === a) -
            rankLessons([a, b], keyword.value).findIndex((l) => l === b)
          : 0) ||
        (sort.value === "name"
          ? a.course.name
          : sort.value === "department"
            ? a.department
            : a.code
        ).localeCompare(
          sort.value === "name"
            ? b.course.name
            : sort.value === "department"
              ? b.department
              : b.code,
          "zh-CN",
          { numeric: true },
        ),
    ),
);
const { page, visible, change } = usePagination(filtered);
const detail = computed(
  () =>
    data.value?.find((l) => l.code === detailCode.value) ??
    planner.lessons.value.find((l) => l.code === detailCode.value),
);
const currentWeek = computed(() =>
  Math.min(53, Math.max(1, Number(week.value) || 1)),
);
function reset() {
  void router.replace({
    path: "/lessons",
    query: { semester: semester.value, view: view.value, week: week.value },
  });
}
function exportICS() {
  try {
    const result = lessonCalendar(
      planner.lessons.value,
      firstMonday.value,
      layout.value,
    );
    if (result.count)
      downloadCalendar(result.content, `ustc-lessons-${semester.value}.ics`);
    exportMessage.value = `已导出 ${result.count} 个事件${result.skipped.length ? `；跳过无法识别的安排：${result.skipped.join("、")}` : ""}。`;
  } catch (cause) {
    exportMessage.value = (cause as Error).message;
  }
}
</script>
<template>
  <PageHeading title="全校教学班"
    ><div class="filter-field lesson-semester-field">
      <label for="lesson-semester">查询学期</label
      ><select id="lesson-semester" v-model="semester">
        <option v-if="!semesterQuery.data.value" value="">正在读取学期</option>
        <option v-for="s in semesterQuery.data.value" :key="s.id" :value="s.id">
          {{ s.name }}
        </option>
      </select>
    </div></PageHeading
  ><QueryState
    :loading="semesterQuery.loading.value"
    :error="semesterQuery.error.value"
    @retry="semesterQuery.reload"
  />
  <div class="notice">
    本页查询结果非实时数据，次日更新；实时数据请登录综合教务系统查看。
  </div>
  <div class="query-layout">
    <FilterPanel
      :active-count="filterSummary.count.value"
      :result-count="
        data && !metadataFiltersPending ? filtered.length : undefined
      "
      result-label="个教学班"
      ><div class="filter-field">
        <label for="lesson-q">课程、编号或关键词</label
        ><input
          id="lesson-q"
          v-model="q"
          type="search"
          placeholder="课程、教师、地点"
        />
      </div>
      <div class="filter-field">
        <label for="lesson-dept">开课院系</label
        ><select id="lesson-dept" v-model="selectedDepartment">
          <option value="">全部院系</option>
          <option v-for="d in departments" :key="d.code" :value="d.code">
            {{ d.name }}
          </option>
        </select>
      </div>
      <div class="filter-field">
        <label for="lesson-teacher">授课教师</label
        ><input id="lesson-teacher" v-model="teacher" placeholder="教师姓名" />
      </div>
      <div class="filter-field">
        <label for="lesson-day">星期</label
        ><select id="lesson-day" v-model="day">
          <option value="">不限星期</option>
          <option v-for="(d, i) in weekdays" :key="d" :value="String(i + 1)">
            周{{ d }}
          </option>
        </select>
      </div>
      <div class="filter-field">
        <label for="lesson-period">课节</label
        ><select id="lesson-period" v-model="period">
          <option value="">不限课节</option>
          <option v-for="p in 14" :key="p" :value="String(p)">
            第 {{ p }} 节
          </option>
        </select>
      </div>
      <details
        :open="advancedOpen"
        @toggle="advancedOpen = ($event.target as HTMLDetailsElement).open"
      >
        <summary>更多筛选</summary>
        <div class="filter-field">
          <label for="lesson-location">上课地点</label
          ><input
            id="lesson-location"
            v-model="location"
            placeholder="教室或楼宇"
          />
        </div>
        <LessonFilterFields
          :fields="
            advanced.filter((f) => !['discipline', 'grading'].includes(f.key))
          "
        />
        <details
          :open="metadataOpen || !!discipline || !!grading"
          @toggle="metadataOpen = ($event.target as HTMLDetailsElement).open"
        >
          <summary>学科与评分制</summary>
          <LessonFilterFields
            :fields="
              advanced.filter((f) => ['discipline', 'grading'].includes(f.key))
            "
            :disabled="!lessonFilterInfo.data.value"
            :busy="lessonFilterInfo.loading.value"
          />
          <QueryState
            v-if="!metadataFiltersPending"
            :loading="lessonFilterInfo.loading.value"
            :error="lessonFilterInfo.error.value"
            @retry="lessonFilterInfo.reload"
          />
        </details>
      </details>
      <button class="text-button" @click="reset">清除筛选</button></FilterPanel
    >
    <div>
      <QueryState
        :loading="
          loading || (metadataFiltersPending && lessonFilterInfo.loading.value)
        "
        :error="
          error ??
          (metadataFiltersPending ? lessonFilterInfo.error.value : undefined)
        "
        :meta="meta"
        @retry="
          metadataFiltersPending && lessonFilterInfo.error.value
            ? lessonFilterInfo.reload()
            : reload()
        "
      />
      <FilterSummary
        :filters="filterSummary.filters.value"
        @remove="filterSummary.remove"
        @clear="reset"
      />
      <p class="sr-only" role="status" aria-live="polite">
        {{ candidateMessage }}
      </p>
      <div v-if="planner.lessons.value.length" class="planner-shortcut panel">
        <div class="planner-shortcut-count">
          <ClipboardList :size="18" /><strong
            >本机候选 {{ planner.lessons.value.length }}</strong
          >
        </div>
        <div class="planner-shortcut-status">
          <span v-if="conflicts.overlaps.length" class="tag warning"
            >{{ conflicts.overlaps.length }} 组时间重叠</span
          >
          <span v-if="conflicts.unknown.length" class="tag warning"
            >{{ conflicts.unknown.length }} 个安排无法完整判断</span
          >
          <span
            v-if="!conflicts.overlaps.length && !conflicts.unknown.length"
            class="muted"
            >已识别安排未发现重叠</span
          >
        </div>
        <button class="text-button" @click="showPlanner">
          管理清单<ArrowDown :size="15" />
        </button>
      </div>
      <div class="panel lesson-results-panel">
        <div class="results-toolbar">
          <strong
            ref="resultsHeading"
            class="lesson-results-heading"
            tabindex="-1"
            >教学班
            <span class="muted" aria-live="polite">{{
              data && !metadataFiltersPending ? filtered.length : "—"
            }}</span></strong
          >
          <div class="lesson-result-controls">
            <label v-if="view === 'list'" class="sort-control"
              >排序<select v-model="sort">
                <option value="code">教学班号</option>
                <option value="name">课程名称</option>
                <option value="department">开课院系</option>
              </select></label
            >
            <div class="view-switch" role="group" aria-label="教学班结果视图">
              <button
                class="text-button"
                :aria-pressed="view === 'list'"
                @click="view = 'list'"
              >
                <List :size="15" />查询列表</button
              ><button
                class="text-button"
                :aria-pressed="view === 'week'"
                @click="view = 'week'"
              >
                <CalendarDays :size="15" />候选周课表
              </button>
            </div>
          </div>
        </div>
        <template v-if="view === 'list'"
          ><LessonList
            :lessons="visible"
            :candidate-ids="candidateIds"
            @detail="detailCode = $event"
            @candidate="toggleCandidate" />
          <EmptyState
            v-if="data && !metadataFiltersPending && !filtered.length"
            message="尝试切换学期、修改关键词或清除时间与院系筛选。"
            ><button class="button secondary" @click="reset">
              清除筛选
            </button></EmptyState
          ><Pagination
            :total="filtered.length"
            :page="page"
            @change="change" /></template
        ><template v-else
          ><div class="week-controls">
            <label for="planner-week">教学周</label
            ><select id="planner-week" v-model="week" class="field-input">
              <option v-for="w in 53" :key="w" :value="String(w)">
                第 {{ w }} 周
              </option>
            </select>
            <p class="week-planner-link">
              欲进行详细排课, 请前往
              <a
                href="https://class-arrange.raymondzylei.me/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Raymond 的排课工具（新窗口打开）"
                >Raymond 的排课工具</a
              >
            </p>
            <span class="muted">显示本机候选清单中已识别的安排</span>
          </div>
          <WeekTimetable
            v-if="planner.lessons.value.length"
            :lessons="planner.lessons.value"
            :week="currentWeek"
            @select="detailCode = $event" /><EmptyState
            v-else
            title="先加入候选教学班"
            message="在查询列表中选择教学班，再切换到周课表。"
        /></template>
      </div>
      <section class="planner-panel panel">
        <div class="section-heading">
          <h2 ref="plannerHeading" class="planner-heading" tabindex="-1">
            本机候选清单
            <span class="muted">{{ planner.lessons.value.length }}</span>
          </h2>
          <div class="flex-actions">
            <button class="text-button" @click="showResults">继续查找</button>
            <button
              v-if="planner.lessons.value.length"
              class="text-button"
              @click="planner.clear"
            >
              <Trash2 :size="15" />清空本学期
            </button>
          </div>
        </div>
        <p v-if="planner.storageError.value" class="notice warning">
          {{ planner.storageError.value }}
        </p>
        <div
          v-for="lesson in planner.lessons.value"
          :key="lesson.id"
          class="candidate-row"
        >
          <button class="course-name" @click="detailCode = lesson.code">
            {{ lesson.course.name
            }}<span class="mono">{{ lesson.code }}</span></button
          ><span class="muted">{{ lesson.teachers.join("、") }}</span
          ><button
            class="icon-button"
            :aria-label="`移除候选 ${lesson.course.name}`"
            @click="toggleCandidate(lesson)"
          >
            <Trash2 :size="16" />
          </button>
        </div>
        <p v-if="!planner.lessons.value.length" class="muted planner-note">
          点击教学班旁的“候选”按钮，开始整理清单；加入后可在结果上方直接进入管理。
        </p>
        <template v-if="planner.lessons.value.length"
          ><button
            v-if="data"
            class="text-button"
            @click="planner.refresh(data)"
          >
            使用当前查询结果更新候选安排
          </button>
          <div
            v-for="overlap in conflicts.overlaps"
            :key="`${overlap.left.id}:${overlap.right.id}`"
            class="notice error"
          >
            <AlertTriangle :size="18" />
            <p>
              公开安排存在时间重叠：{{ overlap.left.course.name }} 与
              {{ overlap.right.course.name }}，第
              {{ overlap.weeks.join("、") }} 周。
            </p>
          </div>
          <p v-if="conflicts.unknown.length" class="notice warning">
            无法判断完整冲突：{{
              conflicts.unknown.map((l) => l.code).join("、")
            }}。周课表仅展示其中已识别的时间。
          </p>
          <p
            v-if="!conflicts.overlaps.length && !conflicts.unknown.length"
            class="notice"
          >
            已识别的公开安排中未发现时间重叠。
          </p>
          <div class="ics-settings">
            <div class="filter-field">
              <label for="planner-start">第 1 教学周的周一日期</label
              ><input id="planner-start" v-model="firstMonday" type="date" />
            </div>
            <div class="filter-field">
              <label for="planner-layout">日历时间方式</label
              ><select id="planner-layout" v-model="layout">
                <option value="">全天提醒（含课节说明）</option>
                <option value="1">课节表 1（第 1 节 07:50）</option>
                <option value="2">课节表 2（第 1 节 08:00）</option>
              </select>
            </div>
            <button
              class="button secondary"
              :disabled="!firstMonday"
              @click="exportICS"
            >
              <Download :size="16" />导出 ICS
            </button>
          </div>
          <details v-if="layout" class="period-preview">
            <summary>核对所选课节表</summary>
            <p v-for="(times, i) in periodLayouts[layout]" :key="i">
              第 {{ i }} 节：{{ formatClock(clockMinutes(times[0])) }}–{{
                formatClock(clockMinutes(times[1]))
              }}
            </p>
          </details>
          <p v-if="exportMessage" class="notice" role="status">
            {{ exportMessage }}
          </p></template
        >
      </section>
    </div>
  </div>
  <LessonDetailDialog
    :code="detailCode"
    :semester="semester"
    :detail="detail"
    :selected="!!detail && candidateIds.has(detail.id)"
    @close="detailCode = ''"
    @candidate="toggleCandidate"
  />
</template>
