<script setup lang="ts">
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import { List, CalendarDays, ClipboardList, ArrowDown } from "@lucide/vue";
import type { Lesson } from "../domain/models";
import { useSemester } from "../features/useSemester";
import { useFilter } from "../features/useFilters";
import { usePlanner } from "../features/usePlanner";
import { useLessonResults } from "../features/useLessonResults";
import { useLessonComparison } from "../features/useLessonComparison";
import { useLessonTimetable } from "../features/useLessonTimetable";
import LessonTimetable from "../components/LessonTimetable.vue";
import { usePagination } from "../features/usePagination";
import { exportLessons } from "../domain/tableExports";
import { lessonConflicts, weekdays } from "../domain/schedule";
import PageHeading from "../components/PageHeading.vue";
import QueryState from "../components/QueryState.vue";
import FilterPanel from "../components/FilterPanel.vue";
import FilterSummary from "../components/FilterSummary.vue";
import EmptyState from "../components/EmptyState.vue";
import Pagination from "../components/Pagination.vue";
import PlannerPanel from "../components/PlannerPanel.vue";
import LessonComparison from "../components/LessonComparison.vue";
import LessonDetailDialog from "../components/LessonDetailDialog.vue";
import LessonFilterFields from "../components/LessonFilterFields.vue";
import LessonList from "../components/LessonList.vue";
const router = useRouter(),
  semesterQuery = useSemester(),
  semester = semesterQuery.selected;
const results = useLessonResults(semester);
const {
  data,
  meta,
  loading,
  error,
  resolved,
  reload,
  q,
  teacher,
  day,
  period,
  location,
  discipline,
  grading,
  sort,
  advancedOpen,
  metadataOpen,
  lessonFilterInfo,
  filterInfoByCode,
  metadataFiltersPending,
  selectedDepartment,
  departments,
  filterSummary,
  advanced,
  filtered,
} = results;
const detailCode = useFilter("lesson");
const planner = usePlanner(semester),
  conflicts = computed(() => lessonConflicts(planner.lessons.value));
const candidateIds = computed(
    () => new Set(planner.lessons.value.map((lesson) => lesson.id)),
  ),
  plannerPanel = ref<InstanceType<typeof PlannerPanel>>(),
  resultsHeading = ref<HTMLElement>(),
  candidateMessage = ref("");
async function toggleCandidate(lesson: Lesson, desired: boolean) {
  const ok = await planner.toggle(lesson, desired);
  candidateMessage.value = ok
    ? `已${desired ? "加入" : "移除"}候选：${lesson.course.name}，当前共 ${planner.lessons.value.length} 个教学班。`
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
const { page, visible, change } = usePagination(filtered);
const detail = computed(
  () =>
    data.value?.find((l) => l.code === detailCode.value) ??
    planner.lessons.value.find((l) => l.code === detailCode.value),
);
const { compare, compareCodes, compared, compareMessage, toggleCompare } =
  useLessonComparison(data);
const timetable = useLessonTimetable(filtered, planner, teacher);
const {
  view,
  week,
  timetableSource,
  timetableMode,
  timetableDay,
  currentWeek,
  detailWeekStart,
} = timetable;
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
            <button
              class="text-button"
              :disabled="!filtered.length"
              @click="exportLessons(filtered, filterInfoByCode)"
            >
              导出 CSV
            </button>
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
            :semester="semester"
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
          ><LessonTimetable
            :state="timetable"
            :planner="planner"
            @detail="detailCode = $event"
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
    :list-loading="semesterQuery.loading.value || loading"
    :list-error="semesterQuery.error.value || error"
    :list-resolved="resolved"
    :selected="!!detail && candidateIds.has(detail.id)"
    :week-start="detailWeekStart"
    :week="currentWeek"
    @close="detailCode = ''"
    @candidate="toggleCandidate"
    @retry="error ? reload() : semesterQuery.reload()"
  />
</template>
