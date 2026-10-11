<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { List, CalendarDays, ClipboardList, ArrowDown } from "@lucide/vue";
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
import { lessonConflicts, weekdays } from "../domain/schedule";
import PageHeading from "../components/PageHeading.vue";
import QueryState from "../components/QueryState.vue";
import FilterPanel from "../components/FilterPanel.vue";
import FilterSummary from "../components/FilterSummary.vue";
import EmptyState from "../components/EmptyState.vue";
import Pagination from "../components/Pagination.vue";
import TimetableExport from "../components/TimetableExport.vue";
import SchemeSelector from "../components/SchemeSelector.vue";
import PlannerPanel from "../components/PlannerPanel.vue";
import LessonComparison from "../components/LessonComparison.vue";
import LessonDetailDialog from "../components/LessonDetailDialog.vue";
import WeekTimetable from "../components/WeekTimetable.vue";
import LessonFilterFields from "../components/LessonFilterFields.vue";
import LessonList from "../components/LessonList.vue";
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
  sort = useFilter("sort", "code"),
  compare = useFilter("compare"),
  timetableSource = useFilter("source", "candidates"),
  timetableMode = useFilter("ttMode", "week"),
  timetableDay = useFilter("ttDay", "1");
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
  plannerPanel = ref<InstanceType<typeof PlannerPanel>>(),
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
  plannerPanel.value?.focus();
}
function showResults() {
  view.value = "list";
  resultsHeading.value?.scrollIntoView({ block: "start" });
  resultsHeading.value?.focus({ preventScroll: true });
}
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
const compareCodes = computed(() =>
  [...new Set(compare.value.split(",").filter(Boolean))].slice(0, 4),
);
const compared = computed(() => {
  const selected = compareCodes.value.flatMap((code) => {
    const lesson = data.value?.find((l) => l.code === code);
    return lesson ? [lesson] : [];
  });
  return selected.filter((l) => l.course.code === selected[0]?.course.code);
});
const compareMessage = ref("");
function toggleCompare(lesson: Lesson) {
  if (compareCodes.value.includes(lesson.code)) {
    compare.value = compareCodes.value
      .filter((code) => code !== lesson.code)
      .join(",");
    return;
  }
  if (
    compared.value.length &&
    compared.value[0]!.course.code !== lesson.course.code
  ) {
    compareMessage.value = "只能对比同一课程的教学班。";
    return;
  }
  if (compareCodes.value.length >= 4) {
    compareMessage.value = "最多对比四个教学班。";
    return;
  }
  compareMessage.value = "";
  compare.value = [...compareCodes.value, lesson.code].join(",");
}
const timetableLessons = computed(() =>
  timetableSource.value === "results" ? filtered.value : planner.lessons.value,
);
const timetableExportData = computed(() => ({
  lessons: timetableLessons.value,
  week: currentWeek.value,
  mode: timetableMode.value === "day" ? ("day" as const) : ("week" as const),
  day: Math.min(7, Math.max(1, Number(timetableDay.value) || 1)),
  title:
    timetableSource.value === "results"
      ? teacher.value
        ? `${teacher.value}的查询课表`
        : "查询结果课表"
      : (planner.active.value?.name ?? "默认方案"),
}));
const currentWeek = computed(() =>
  Math.min(53, Math.max(1, Number(week.value) || 1)),
);
function reset() {
  void router.replace({
    path: "/lessons",
    query: {
      semester: semester.value,
      view: view.value,
      week: week.value,
      source: timetableSource.value,
      ttMode: timetableMode.value,
      ttDay: timetableDay.value,
    },
  });
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
                <CalendarDays :size="15" />周课表
              </button>
            </div>
          </div>
        </div>
        <template v-if="view === 'list'"
          ><LessonList
            :lessons="visible"
            :candidate-ids="candidateIds"
            :compare-codes="compareCodes"
            @detail="detailCode = $event"
            @candidate="toggleCandidate"
            @compare="toggleCompare" />
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
            <label for="timetable-source">课表来源</label
            ><select
              id="timetable-source"
              v-model="timetableSource"
              class="field-input"
            >
              <option value="candidates">候选方案</option>
              <option value="results">查询结果</option>
            </select>
            <label for="timetable-mode">视图</label
            ><select
              id="timetable-mode"
              v-model="timetableMode"
              class="field-input"
            >
              <option value="week">完整周</option>
              <option value="day">单日</option>
            </select>
            <select
              v-if="timetableMode === 'day'"
              v-model="timetableDay"
              class="field-input"
              aria-label="课表星期"
            >
              <option
                v-for="(d, i) in weekdays"
                :key="d"
                :value="String(i + 1)"
              >
                周{{ d }}
              </option>
            </select>
          </div>
          <SchemeSelector
            v-if="timetableSource !== 'results'"
            :planner="planner"
          />
          <TimetableExport :data="timetableExportData" />
          <WeekTimetable
            :lessons="timetableLessons"
            :week="currentWeek"
            :mode="timetableExportData.mode"
            :day="timetableExportData.day"
            @select="detailCode = $event"
          />
        </template>
      </div>
      <PlannerPanel
        ref="plannerPanel"
        :planner="planner"
        :data="data"
        :semester="semester"
        :conflicts="conflicts"
        @results="showResults"
        @detail="detailCode = $event"
        @candidate="toggleCandidate"
      />
    </div>
  </div>
  <p v-if="compareMessage" class="notice" role="status">{{ compareMessage }}</p>
  <LessonComparison
    :lessons="compared"
    :candidates="planner.lessons.value"
    @remove="compare = compareCodes.filter((code) => code !== $event).join(',')"
    @close="compare = ''"
    @detail="detailCode = $event"
  />
  <LessonDetailDialog
    :code="detailCode"
    :semester="semester"
    :detail="detail"
    :selected="!!detail && candidateIds.has(detail.id)"
    @close="detailCode = ''"
    @candidate="toggleCandidate"
  />
</template>
