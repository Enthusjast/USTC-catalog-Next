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
} from "@lucide/vue";
import { catalog } from "../api/catalog";
import { useQuery } from "../features/useQuery";
import { useSemester } from "../features/useSemester";
import { useFilter, useDebounced } from "../features/useFilters";
import { usePlanner } from "../features/usePlanner";
import { usePagination } from "../features/usePagination";
import { lessonConflicts, weekdays, formatClock } from "../domain/schedule";
import { lessonCalendar, downloadCalendar } from "../domain/calendar";
import { periodLayouts } from "../domain/periods";
import PageHeading from "../components/PageHeading.vue";
import QueryState from "../components/QueryState.vue";
import FilterPanel from "../components/FilterPanel.vue";
import EmptyState from "../components/EmptyState.vue";
import Pagination from "../components/Pagination.vue";
import DisclosureDialog from "../components/DisclosureDialog.vue";
import WeekTimetable from "../components/WeekTimetable.vue";
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
  detailCode = useFilter("lesson");
const { data, meta, loading, error, reload } = useQuery(
  (signal, force) => catalog.lessons(semester.value, { signal, force }),
  semester,
  () => !!semester.value,
);
const planner = usePlanner(semester),
  conflicts = computed(() => lessonConflicts(planner.lessons.value));
const firstMonday = ref(""),
  layout = ref(""),
  exportMessage = ref("");
const departments = computed(() =>
  [...new Set(data.value?.map((l) => l.department))].sort(),
);
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
  (data.value ?? []).filter(
    (l) =>
      (!keyword.value ||
        `${l.code} ${l.course.code} ${l.course.name} ${l.course.englishName ?? ""} ${l.teachers.join(" ")} ${l.department} ${l.schedule.text}`
          .toLowerCase()
          .includes(keyword.value.toLowerCase())) &&
      (!dept.value || l.department === dept.value) &&
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
    query: { semester: semester.value },
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
  <PageHeading
    title="全校教学班"
    description="筛选公开开课安排，建立本机候选清单并检查时间重叠。候选清单不表示实际选课。"
    eyebrow="03 / PUBLIC LESSONS"
    ><div class="filter-field" style="margin: 0; min-width: 200px">
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
    公开开课信息可能次日更新。时间冲突仅描述公开安排，不读取个人选课关系。
  </div>
  <div class="query-layout">
    <FilterPanel
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
        ><select id="lesson-dept" v-model="dept">
          <option value="">全部院系</option>
          <option v-for="d in departments" :key="d">{{ d }}</option>
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
      <div class="panel">
        <div class="results-toolbar">
          <strong
            >教学班
            <span class="muted" aria-live="polite">{{
              data ? filtered.length : "—"
            }}</span></strong
          >
          <div class="flex-actions">
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
                <tr v-for="lesson in visible" :key="lesson.id">
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
                    <span>{{ lesson.teachers.join("、") || "未提供" }}</span>
                    <p class="course-en">{{ lesson.department }}</p>
                  </td>
                  <td>
                    <p class="schedule-text">
                      {{ lesson.schedule.text || "未提供安排" }}
                    </p>
                    <span v-if="lesson.schedule.unknown" class="tag warning"
                      >部分时间无法判断</span
                    >
                  </td>
                  <td>
                    {{ lesson.count ?? "未提供" }} /
                    {{ lesson.capacity ?? "未提供" }}
                  </td>
                  <td>
                    <button
                      class="icon-button"
                      :aria-label="`${planner.lessons.value.some((l) => l.id === lesson.id) ? '移除' : '加入'} ${lesson.course.name} 候选清单`"
                      :aria-pressed="
                        planner.lessons.value.some((l) => l.id === lesson.id)
                      "
                      @click="planner.toggle(lesson)"
                    >
                      <Check
                        v-if="
                          planner.lessons.value.some((l) => l.id === lesson.id)
                        "
                        :size="18"
                      /><Plus v-else :size="18" />
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
          <h2>
            本机候选清单
            <span class="muted">{{ planner.lessons.value.length }}</span>
          </h2>
          <button
            v-if="planner.lessons.value.length"
            class="text-button"
            @click="planner.clear"
          >
            <Trash2 :size="15" />清空本学期
          </button>
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
            @click="planner.toggle(lesson)"
          >
            <Trash2 :size="16" />
          </button>
        </div>
        <p v-if="!planner.lessons.value.length" class="muted planner-note">
          点击教学班旁的 +，开始整理候选清单。
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
      ><span class="mono muted">{{ detail.code }}</span>
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
      <div class="flex-actions">
        <button class="button" @click="planner.toggle(detail)">
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
