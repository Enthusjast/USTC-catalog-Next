<script setup lang="ts">
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import { Download } from "@lucide/vue";
import { catalog } from "../api/catalog";
import { useQuery } from "../features/useQuery";
import { useSemester } from "../features/useSemester";
import { useFilter } from "../features/useFilters";
import { usePlanner } from "../features/usePlanner";
import { usePagination } from "../features/usePagination";
import { useFilterSummary } from "../features/useFilterSummary";
import { formatClock, weekdays } from "../domain/schedule";
import { examConflicts } from "../domain/examConflicts";
import { examCalendar, downloadCalendar } from "../domain/calendar";
import PageHeading from "../components/PageHeading.vue";
import QueryState from "../components/QueryState.vue";
import FilterSummary from "../components/FilterSummary.vue";
import EmptyState from "../components/EmptyState.vue";
import Pagination from "../components/Pagination.vue";
const router = useRouter(),
  semesterQuery = useSemester(),
  semester = semesterQuery.selected;
const kind = useFilter("kind", "course"),
  q = useFilter("q"),
  date = useFilter("date"),
  dept = useFilter("dept"),
  room = useFilter("room"),
  view = useFilter("view", "list"),
  savedOnly = useFilter("saved"),
  weekDate = useFilter("week");
const filterSummary = useFilterSummary({
  q: { label: "关键词", model: q },
  date: { label: "考试日期", model: date },
  dept: { label: "院系", model: dept },
  room: { label: "考场", model: room },
  saved: {
    label: "关联范围",
    model: savedOnly,
    active: () => savedOnly.value === "1",
    display: () => "本机候选教学班",
  },
});
const { data, meta, loading, error, reload } = useQuery(
  (signal, force) =>
    catalog.exams(semester.value, kind.value === "general", { signal, force }),
  () => `${semester.value}:${kind.value}`,
  () => !!semester.value,
);
const planner = usePlanner(semester),
  exportMessage = ref("");
const departments = computed(() => [
  ...new Set(
    (data.value ?? []).map((e) => e.department).filter((d): d is string => !!d),
  ),
]);
const filtered = computed(() =>
  (data.value ?? [])
    .filter(
      (e) =>
        (!q.value ||
          `${e.courseName} ${e.courseCode} ${e.lessonCode ?? ""}`
            .toLowerCase()
            .includes(q.value.toLowerCase())) &&
        (!date.value || e.date === date.value) &&
        (!dept.value || e.department === dept.value) &&
        (!room.value || e.rooms.some((r) => r.includes(room.value))) &&
        (savedOnly.value !== "1" ||
          planner.lessons.value.some((l) =>
            e.lessonCode
              ? l.code === e.lessonCode
              : l.course.code === e.courseCode,
          )),
    )
    .sort(
      (a, b) =>
        (a.date ?? "9999").localeCompare(b.date ?? "9999") ||
        (a.start ?? 1440) - (b.start ?? 1440),
    ),
);
const { page, visible, change } = usePagination(filtered);
const conflicts = computed(() =>
  examConflicts(filtered.value, savedOnly.value !== "1"),
);
const days = computed(() => {
  const chosen =
    weekDate.value ||
    date.value ||
    filtered.value.find((e) => e.date)?.date ||
    new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Shanghai" });
  const start = new Date(`${chosen}T12:00:00+08:00`);
  if (!Number.isFinite(start.getTime())) return [];
  start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7));
  return weekdays.map((day, index) => {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + index);
    return {
      name: day,
      date: d.toLocaleDateString("sv-SE", { timeZone: "Asia/Shanghai" }),
    };
  });
});
function reset() {
  void router.replace({
    path: "/exams",
    query: {
      semester: semester.value,
      kind: kind.value,
      view: view.value,
      week: weekDate.value || undefined,
    },
  });
}
function exportICS() {
  const result = examCalendar(filtered.value);
  if (result.count)
    downloadCalendar(
      result.content,
      `ustc-exams-${kind.value}-${semester.value}.ics`,
    );
  exportMessage.value = `已导出 ${result.count} 场考试${result.skipped.length ? `；日期或时间不足，跳过：${result.skipped.join("、")}` : ""}。`;
}
</script>
<template>
  <PageHeading
    title="考试查询"
    description="查看公开课程考试与通识类考试，按日期、课程和考场筛选。"
    eyebrow="04 / EXAM SCHEDULE"
    ><div class="filter-field" style="margin: 0; min-width: 200px">
      <label for="exam-semester">查询学期</label
      ><select id="exam-semester" v-model="semester">
        <option v-if="!semesterQuery.data.value" value="">正在读取学期</option>
        <option v-for="s in semesterQuery.data.value" :key="s.id" :value="s.id">
          {{ s.name }}
        </option>
      </select>
    </div></PageHeading
  >
  <div class="notice warning">
    公开考试安排可能次日更新，实际安排以综合教务系统为准。
  </div>
  <QueryState
    :loading="semesterQuery.loading.value"
    :error="semesterQuery.error.value"
    @retry="semesterQuery.reload"
  />
  <nav class="tabs" aria-label="考试类型">
    <button
      :class="{ active: kind === 'course' }"
      :aria-pressed="kind === 'course'"
      @click="kind = 'course'"
    >
      课程考试</button
    ><button
      :class="{ active: kind === 'general' }"
      :aria-pressed="kind === 'general'"
      @click="kind = 'general'"
    >
      通识类考试
    </button>
  </nav>
  <div class="panel inline-filters">
    <div class="filter-field">
      <label for="exam-q">课程名称或编号</label
      ><input id="exam-q" v-model="q" type="search" placeholder="课程关键词" />
    </div>
    <div class="filter-field">
      <label for="exam-date">考试日期</label
      ><input id="exam-date" v-model="date" type="date" />
    </div>
    <div class="filter-field">
      <label for="exam-dept">院系</label
      ><select id="exam-dept" v-model="dept">
        <option value="">全部院系</option>
        <option v-for="d in departments" :key="d">{{ d }}</option>
      </select>
    </div>
    <div class="filter-field">
      <label for="exam-room">考场</label
      ><input id="exam-room" v-model="room" placeholder="教室编号" />
    </div>
    <button class="text-button" @click="reset">清除筛选</button>
  </div>
  <label class="checkbox-label"
    ><input
      type="checkbox"
      :checked="savedOnly === '1'"
      @change="
        savedOnly = ($event.target as HTMLInputElement).checked ? '1' : ''
      "
    />仅看本学期候选教学班关联考试</label
  ><QueryState :loading="loading" :error="error" :meta="meta" @retry="reload" />
  <FilterSummary
    :filters="filterSummary.filters.value"
    @remove="filterSummary.remove"
    @clear="reset"
  />
  <div class="panel">
    <div class="results-toolbar">
      <strong
        >考试安排
        <span class="muted" aria-live="polite">{{
          data ? `${filtered.length} 场` : "—"
        }}</span></strong
      >
      <div class="flex-actions">
        <button
          class="text-button"
          :aria-pressed="view === 'list'"
          @click="view = 'list'"
        >
          列表</button
        ><button
          class="text-button"
          :aria-pressed="view === 'week'"
          @click="view = 'week'"
        >
          周历</button
        ><button
          class="text-button"
          :disabled="!filtered.length"
          @click="exportICS"
        >
          <Download :size="15" />导出 ICS
        </button>
      </div>
    </div>
    <template v-if="view === 'list'"
      ><div v-if="visible.length" class="table-scroll">
        <table class="course-table">
          <thead>
            <tr>
              <th>课程 / 教学班</th>
              <th>日期与时间</th>
              <th>考场</th>
              <th>院系与备注</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="exam in visible" :key="exam.id">
              <td>
                <span class="course-code mono">{{
                  exam.lessonCode ?? exam.courseCode
                }}</span
                ><strong>{{ exam.courseName }}</strong>
              </td>
              <td>
                {{ exam.date ?? "日期未提供" }}
                <p class="muted">
                  {{ formatClock(exam.start) }}–{{ formatClock(exam.end) }}
                </p>
              </td>
              <td>{{ exam.rooms.join("、") || "未提供" }}</td>
              <td>
                {{ exam.department ?? "院系未提供" }}
                <p class="course-en">{{ exam.remark }}</p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <Pagination
        :total="filtered.length"
        :page="page"
        @change="change" /></template
    ><template v-else
      ><div class="week-controls">
        <label for="exam-week">查看日期所在周</label
        ><input
          id="exam-week"
          v-model="weekDate"
          class="field-input"
          type="date"
        />
      </div>
      <div class="exam-week">
        <section v-for="d in days" :key="d.date">
          <h2>
            周{{ d.name }}<span>{{ d.date }}</span>
          </h2>
          <article
            v-for="exam in filtered.filter((e) => e.date === d.date)"
            :key="exam.id"
          >
            <strong>{{ exam.courseName }}</strong>
            <p>{{ formatClock(exam.start) }}–{{ formatClock(exam.end) }}</p>
            <p>{{ exam.rooms.join("、") || "考场未提供" }}</p>
          </article>
          <p v-if="!filtered.some((e) => e.date === d.date)" class="muted">
            无公开记录
          </p>
        </section>
      </div></template
    ><EmptyState
      v-if="data && !filtered.length"
      :title="
        data.length ? '没有符合筛选条件的考试' : '该学期暂无此类公开考试记录'
      "
      message="未公布记录不表示没有考试。可切换考试类型、学期或访问综合教务系统。"
      ><button class="button secondary" @click="reset">
        清除筛选
      </button></EmptyState
    >
  </div>
  <p v-if="exportMessage" class="notice" role="status" style="margin-top: 20px">
    {{ exportMessage }}
  </p>
  <section
    v-if="filtered.length"
    class="panel compare-section"
    style="margin-top: 24px"
  >
    <h2>公开安排重叠提示</h2>
    <p class="muted">
      {{
        savedOnly === "1"
          ? "检查候选教学班关联考试的已知时间。"
          : "仅检查有明确考场的同日占用，不推断个人考试关系。"
      }}
    </p>
    <p
      v-for="overlap in conflicts.overlaps"
      :key="`${overlap.left.id}:${overlap.right.id}`"
      class="notice warning"
    >
      {{ overlap.left.courseName }} 与 {{ overlap.right.courseName }}：{{
        overlap.left.date
      }}
      时间重叠{{
        overlap.rooms.length ? `，共同考场 ${overlap.rooms.join("、")}` : ""
      }}。
    </p>
    <p v-if="conflicts.unknown.length" class="notice warning">
      {{ conflicts.unknown.length }}
      场考试缺少准确日期、时间或本次检查所需的考场信息，无法判断完整重叠状态。
    </p>
    <p v-if="!conflicts.overlaps.length && !conflicts.unknown.length">
      已知安排中未发现{{ savedOnly === "1" ? "时间" : "同一考场的时间" }}重叠。
    </p>
  </section>
</template>
