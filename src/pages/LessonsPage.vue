<script setup lang="ts">
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import {
  Plus,
  Check,
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
import { lessonConflicts, weekdays, formatClock } from "../domain/schedule";
import { lessonCalendar, downloadCalendar } from "../domain/calendar";
import { periodLayouts } from "../domain/periods";
import PageHeading from "../components/PageHeading.vue";
import QueryState from "../components/QueryState.vue";
import FilterPanel from "../components/FilterPanel.vue";
import FilterSummary from "../components/FilterSummary.vue";
import EmptyState from "../components/EmptyState.vue";
import Pagination from "../components/Pagination.vue";
import DisclosureDialog from "../components/DisclosureDialog.vue";
import WeekTimetable from "../components/WeekTimetable.vue";
import LessonSchedule from "../components/LessonSchedule.vue";
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
  category = useFilter("category"),
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
const lessonInfo = useQuery(
  (signal, force) =>
    catalog.lessonDetails(detailCode.value, semester.value, { signal, force }),
  () => `${semester.value}:${detailCode.value}`,
  () => !!semester.value && !!detailCode.value,
);
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
  category: { label: "课程范畴", model: category },
  language: { label: "授课语言", model: language },
  exam: { label: "考试方式", model: examMode },
});
const options = (
  field: "education" | "classType" | "category" | "language" | "examMode",
) => [
  ...new Set(
    (data.value ?? []).map((l) => l[field]).filter((v): v is string => !!v),
  ),
];
const advanced = computed(() => [
  {
    key: "education",
    label: "学历层次",
    model: education,
    values: options("education"),
  },
  { key: "type", label: "课堂类型", model: type, values: options("classType") },
  {
    key: "category",
    label: "课程范畴",
    model: category,
    values: options("category"),
  },
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
  (data.value ?? [])
    .filter(
      (l) =>
        (!keyword.value ||
          `${l.code} ${l.course.code} ${l.course.name} ${l.course.englishName ?? ""} ${l.teachers.join(" ")} ${l.department} ${l.schedule.text}`
            .toLowerCase()
            .includes(keyword.value.toLowerCase())) &&
        (!dept.value ||
          l.department === dept.value ||
          l.departmentCode === dept.value) &&
        (!teacher.value || l.teachers.some((t) => t.includes(teacher.value))) &&
        ((!day.value && !period.value) ||
          l.schedule.slots.some(
            (s) =>
              (!day.value || s.day === Number(day.value)) &&
              (!period.value || s.periods.includes(Number(period.value))),
          )) &&
        (!location.value || l.schedule.text.includes(location.value)) &&
        (!education.value || l.education === education.value) &&
        (!type.value || l.classType === type.value) &&
        (!category.value || l.category === category.value) &&
        (!language.value || l.language === language.value) &&
        (!examMode.value || l.examMode === examMode.value),
    )
    .sort((a, b) =>
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
      :result-count="data ? filtered.length : undefined"
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
      <details>
        <summary>更多筛选</summary>
        <div class="filter-field">
          <label for="lesson-location">上课地点</label
          ><input
            id="lesson-location"
            v-model="location"
            placeholder="教室或楼宇"
          />
        </div>
        <div v-for="field in advanced" :key="field.key" class="filter-field">
          <label :for="`lesson-${field.key}`">{{ field.label }}</label
          ><select
            :id="`lesson-${field.key}`"
            :value="field.model.value"
            @change="
              field.model.value = ($event.target as HTMLSelectElement).value
            "
          >
            <option value="">不限</option>
            <option v-for="value in field.values" :key="value">
              {{ value }}
            </option>
          </select>
        </div>
      </details>
      <button class="text-button" @click="reset">清除筛选</button></FilterPanel
    >
    <div>
      <QueryState
        :loading="loading"
        :error="error"
        :meta="meta"
        @retry="reload"
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
              data ? filtered.length : "—"
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
          ><div v-if="visible.length" class="table-scroll">
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
                  v-for="lesson in visible"
                  :key="lesson.id"
                  :class="{ 'is-candidate': candidateIds.has(lesson.id) }"
                >
                  <td>
                    <span class="course-code mono">{{ lesson.code }}</span
                    ><button
                      class="course-name"
                      @click="detailCode = lesson.code"
                    >
                      {{ lesson.course.name }}
                    </button>
                    <p class="course-en">
                      {{ lesson.credits ?? "未提供" }} 学分 ·
                      {{ lesson.hours ?? "未提供" }} 学时
                    </p>
                  </td>
                  <td>
                    <span
                      ><span class="lesson-mobile-label">教师：</span
                      >{{ lesson.teachers.join("、") || "未提供" }}</span
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
                      :class="{ 'is-selected': candidateIds.has(lesson.id) }"
                      :aria-label="`${candidateIds.has(lesson.id) ? '移除' : '加入'} ${lesson.course.name} 候选清单`"
                      :aria-pressed="candidateIds.has(lesson.id)"
                      @click="toggleCandidate(lesson)"
                    >
                      <Check
                        v-if="candidateIds.has(lesson.id)"
                        :size="18"
                      /><Plus v-else :size="18" />{{
                        candidateIds.has(lesson.id) ? "已加入" : "候选"
                      }}
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <EmptyState
            v-if="data && !filtered.length"
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
              </option></select
            ><span class="muted">显示本机候选清单中已识别的安排</span>
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
        <p class="muted planner-note">
          仅保存在此浏览器。{{
            planner.savedAt.value
              ? `清单保存时间：${new Date(planner.savedAt.value).toLocaleString("zh-CN")}。`
              : ""
          }}已保存安排可能过期，可使用当前查询结果更新。
        </p>
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
          <p class="planner-note muted">
            请依据官方校历填写首周日期。接口未提供钟点，选择课节表时请先核对下方作息；无法识别的教学班会跳过。
          </p>
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
  <DisclosureDialog
    :open="!!detailCode"
    title="公开教学班详情"
    @close="detailCode = ''"
    ><template v-if="detail"
      ><QueryState
        :loading="lessonInfo.loading.value"
        :error="lessonInfo.error.value"
        :meta="lessonInfo.meta.value"
        @retry="lessonInfo.reload"
      /><span class="mono muted">{{ detail.code }}</span>
      <div class="detail-title">
        <h3>{{ detail.course.name }}</h3>
        <p>{{ detail.course.englishName }}</p>
      </div>
      <dl class="detail-grid">
        <div>
          <dt>教师</dt>
          <dd>{{ detail.teachers.join("、") || "未提供" }}</dd>
        </div>
        <div>
          <dt>开课院系</dt>
          <dd>{{ detail.department }}</dd>
        </div>
        <div>
          <dt>学分 / 学时</dt>
          <dd>
            {{ detail.credits ?? "未提供" }} / {{ detail.hours ?? "未提供" }}
          </dd>
        </div>
        <div>
          <dt>课堂类型</dt>
          <dd>{{ detail.classType ?? "未提供" }}</dd>
        </div>
        <div>
          <dt>授课语言</dt>
          <dd>{{ detail.language ?? "未提供" }}</dd>
        </div>
        <div>
          <dt>考试方式</dt>
          <dd>{{ detail.examMode ?? "未提供" }}</dd>
        </div>
      </dl>
      <section class="detail-section">
        <h3>原始公开时间安排</h3>
        <p>{{ detail.schedule.text || "未提供" }}</p>
      </section>
      <p v-if="detail.schedule.unknown" class="notice warning">
        部分时间无法识别，完整冲突状态未知。
      </p>
      <section
        v-if="lessonInfo.data.value?.[0]?.description"
        class="detail-section"
      >
        <h3>教学班课程说明</h3>
        <p>{{ lessonInfo.data.value[0].description }}</p>
      </section>
      <section
        v-if="lessonInfo.data.value?.[0]?.references"
        class="detail-section"
      >
        <h3>教学参考资料</h3>
        <p>{{ lessonInfo.data.value[0].references }}</p>
      </section>
      <div class="flex-actions">
        <button class="button" @click="toggleCandidate(detail)">
          {{
            planner.lessons.value.some((l) => l.id === detail!.id)
              ? "移除候选"
              : "加入候选清单"
          }}</button
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
