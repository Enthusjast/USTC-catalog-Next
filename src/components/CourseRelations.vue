<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { catalog } from "../api/catalog";
import { useQuery } from "../features/useQuery";
import { mapConcurrent } from "../domain/concurrency";
import { courseOccurrences } from "../domain/programCourses";
import type {
  Lesson,
  ProgramSummary,
  QueryMeta,
  Semester,
} from "../domain/models";
import QueryState from "./QueryState.vue";
import Pagination from "./Pagination.vue";
import EmptyState from "./EmptyState.vue";

const props = defineProps<{ code: string; department?: string }>();
const lessonsOpen = ref(false),
  plansOpen = ref(false),
  years = ref("2"),
  selectedGrade = ref(""),
  selectedDept = ref(""),
  selectedType = ref("");
const semesters = useQuery(
  (signal, force) => catalog.semesters({ signal, force }),
  "semesters",
  lessonsOpen,
);
const plans = useQuery(
  (signal, force) => catalog.programs({ signal, force }),
  "plans",
  plansOpen,
);
const grades = computed(() =>
  [...new Set(plans.data.value?.map((plan) => plan.grade))].sort().reverse(),
);
const departments = computed(() => [
  ...new Set(plans.data.value?.map((plan) => plan.department)),
]);
const types = computed(() => [
  ...new Set(plans.data.value?.map((plan) => plan.trainType)),
]);
const grade = computed({
  get: () => selectedGrade.value || grades.value[0] || "",
  set: (value) => {
    selectedGrade.value = value;
  },
});
const scope = computed(() =>
  (plans.data.value ?? []).filter(
    (plan) =>
      plan.grade === grade.value &&
      (!selectedDept.value || plan.department === selectedDept.value) &&
      (!selectedType.value || plan.trainType === selectedType.value),
  ),
);
const terms = computed(() => {
  const now = new Date(),
    start = new Date();
  start.setFullYear(start.getFullYear() - Number(years.value));
  return (semesters.data.value ?? []).filter(
    (semester) =>
      Date.parse(semester.start) <= now.getTime() &&
      Date.parse(semester.end) >= start.getTime(),
  );
});
const planRun = ref<{ code: string; items: ProgramSummary[]; token: number }>(),
  lessonRun = ref<{ code: string; items: Semester[]; token: number }>();
const planProgress = ref(0),
  lessonProgress = ref(0),
  lessonPage = ref(1);
let token = 0;
function message(error: unknown) {
  return error instanceof Error ? error.message : "查询失败。";
}
const planResults = useQuery(
  async (signal, force) => {
    const run = planRun.value!;
    const results = await mapConcurrent(
      run.items,
      async (item) => {
        try {
          const result = await catalog.expandedProgram(item.id, {
            signal,
            force,
          });
          return {
            summary: item,
            occurrences: courseOccurrences(result.data.modules, run.code),
            meta: result.meta,
            sources: result.data.referenceSources ?? [],
            issues:
              result.data.referenceIssues?.map((issue) => issue.message) ?? [],
          };
        } catch (error) {
          if (signal.aborted) throw error;
          return {
            summary: item,
            occurrences: [],
            sources: [] as QueryMeta[],
            issues: [message(error)],
            meta: undefined,
          };
        } finally {
          if (planRun.value?.token === run.token) planProgress.value++;
        }
      },
      signal,
    );
    return { data: results, meta: plans.meta.value! };
  },
  () => planRun.value?.token,
  () => !!planRun.value && !!plans.meta.value,
);
const lessonResults = useQuery(
  async (signal, force) => {
    const run = lessonRun.value!;
    const results = await mapConcurrent(
      run.items,
      async (item) => {
        try {
          const result = await catalog.lessons(item.id, { signal, force });
          return {
            semester: item,
            lessons: result.data.filter(
              (lesson) => lesson.course.code === run.code,
            ),
            meta: result.meta,
            error: undefined,
          };
        } catch (error) {
          if (signal.aborted) throw error;
          return {
            semester: item,
            lessons: [] as Lesson[],
            meta: undefined,
            error: message(error),
          };
        } finally {
          if (lessonRun.value?.token === run.token) lessonProgress.value++;
        }
      },
      signal,
    );
    return { data: results, meta: semesters.meta.value! };
  },
  () => lessonRun.value?.token,
  () => !!lessonRun.value && !!semesters.meta.value,
);
const matches = computed(
  () =>
    planResults.data.value?.filter((result) => result.occurrences.length) ?? [],
);
const incomplete = computed(
  () => planResults.data.value?.filter((result) => result.issues.length) ?? [],
);
const rows = computed(
  () =>
    lessonResults.data.value?.flatMap((result) =>
      result.lessons.map((lesson) => ({ lesson, semester: result.semester })),
    ) ?? [],
);
const visibleLessons = computed(() =>
  rows.value.slice((lessonPage.value - 1) * 25, lessonPage.value * 25),
);
watch([() => props.code, selectedDept, selectedGrade, selectedType], () => {
  planRun.value = undefined;
  planProgress.value = 0;
});
watch([() => props.code, years], () => {
  lessonRun.value = undefined;
  lessonPage.value = 1;
  lessonProgress.value = 0;
});
watch(
  () => props.code,
  () => {
    lessonsOpen.value = false;
    plansOpen.value = false;
    selectedDept.value = "";
    selectedGrade.value = "";
  },
);
function startPlans() {
  planProgress.value = 0;
  planRun.value = { code: props.code, items: scope.value, token: ++token };
}
function startLessons() {
  lessonProgress.value = 0;
  lessonPage.value = 1;
  lessonRun.value = { code: props.code, items: terms.value, token: ++token };
}
</script>
<template>
  <section class="course-relations">
    <details
      :open="lessonsOpen"
      @toggle="lessonsOpen = ($event.target as HTMLDetailsElement).open"
    >
      <summary>近年公开教学班</summary>
      <div class="relation-content">
        <QueryState
          :loading="semesters.loading.value"
          :error="semesters.error.value"
          :meta="semesters.meta.value"
          @retry="semesters.reload"
        />
        <div class="relation-controls">
          <div class="filter-field">
            <label for="related-years">查询范围</label
            ><select id="related-years" v-model="years">
              <option value="1">近 1 年</option>
              <option value="2">近 2 年</option>
              <option value="3">近 3 年</option>
            </select>
          </div>
          <button
            class="button secondary"
            :disabled="!terms.length || lessonResults.loading.value"
            @click="startLessons"
          >
            读取 {{ terms.length }} 个学期</button
          ><button
            v-if="lessonResults.loading.value"
            class="text-button"
            @click="lessonRun = undefined"
          >
            取消
          </button>
        </div>
        <p class="muted">
          按课程编号 {{ code }} 精确匹配；仅在开始查询后读取所选范围的公开安排。
        </p>
        <p v-if="lessonResults.loading.value" role="status">
          已查询 {{ lessonProgress }} / {{ lessonRun?.items.length }} 个学期…
        </p>
        <QueryState
          :error="lessonResults.error.value"
          @retry="lessonResults.reload"
        /><template v-if="lessonResults.data.value"
          ><div class="table-scroll">
            <table v-if="rows.length">
              <thead>
                <tr>
                  <th>学期与教学班</th>
                  <th>教师</th>
                  <th>公开时间</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="{ lesson, semester } in visibleLessons"
                  :key="`${semester.id}:${lesson.id}`"
                >
                  <td>
                    <RouterLink
                      :to="{
                        path: '/lessons',
                        query: {
                          semester: semester.id,
                          q: lesson.code,
                          lesson: lesson.code,
                        },
                      }"
                      ><span>{{ semester.name }}</span
                      ><span class="mono course-code">{{
                        lesson.code
                      }}</span></RouterLink
                    >
                  </td>
                  <td>{{ lesson.teachers.join("、") || "未提供" }}</td>
                  <td class="schedule-text">
                    {{ lesson.schedule.text || "未提供安排" }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <Pagination
            :total="rows.length"
            :page="lessonPage"
            @change="lessonPage = $event" />
          <p
            v-for="result in lessonResults.data.value.filter(
              (item) => item.error,
            )"
            :key="result.semester.id"
            class="notice warning"
          >
            {{ result.semester.name }}：{{ result.error }}，该学期结果未知。
          </p>
          <EmptyState
            v-if="!rows.length"
            title="已成功读取的学期中未找到该课程"
            message="未读取学期与所选范围外的开课情况未知。" />
          <details class="reference-sources">
            <summary>各学期来源与查询时间</summary>
            <div
              v-for="result in lessonResults.data.value"
              :key="result.semester.id"
            >
              <strong
                >{{ result.semester.name }} ·
                {{
                  result.meta ? `${result.lessons.length} 个教学班` : "未知"
                }}</strong
              ><QueryState :meta="result.meta" @retry="lessonResults.reload" />
            </div></details
        ></template>
      </div>
    </details>
    <details
      :open="plansOpen"
      @toggle="plansOpen = ($event.target as HTMLDetailsElement).open"
    >
      <summary>包含本课程的执行计划</summary>
      <div class="relation-content">
        <QueryState
          :loading="plans.loading.value"
          :error="plans.error.value"
          :meta="plans.meta.value"
          @retry="plans.reload"
        />
        <div class="relation-controls">
          <div class="filter-field">
            <label for="related-grade">入学年级</label
            ><select id="related-grade" v-model="grade">
              <option v-for="value in grades" :key="value">{{ value }}</option>
            </select>
          </div>
          <div class="filter-field">
            <label for="related-department">计划院系</label
            ><select id="related-department" v-model="selectedDept">
              <option value="">全部院系</option>
              <option v-for="value in departments" :key="value">
                {{ value }}
              </option>
            </select>
          </div>
          <div class="filter-field">
            <label for="related-type">培养类型</label
            ><select id="related-type" v-model="selectedType">
              <option value="">全部类型</option>
              <option v-for="value in types" :key="value">{{ value }}</option>
            </select>
          </div>
        </div>
        <p class="muted">
          检索所选范围的 {{ scope.length }} 份计划（含公共模块），按编号
          {{ code }} 精确匹配。课程开课院系不限制计划所属院系。
        </p>
        <div class="flex-actions">
          <button
            class="button secondary"
            :disabled="!scope.length || planResults.loading.value"
            @click="startPlans"
          >
            查找包含本课程的计划</button
          ><button
            v-if="department && departments.includes(department)"
            class="text-button"
            @click="selectedDept = department"
          >
            仅选课程所属院系</button
          ><button
            v-if="planResults.loading.value"
            class="text-button"
            @click="planRun = undefined"
          >
            取消
          </button>
        </div>
        <p v-if="planResults.loading.value" role="status">
          已核对 {{ planProgress }} / {{ planRun?.items.length }} 份计划…
        </p>
        <QueryState
          :error="planResults.error.value"
          @retry="planResults.reload"
        /><template v-if="planResults.data.value"
          ><article
            v-for="match in matches"
            :key="match.summary.id"
            class="relation-match"
          >
            <RouterLink :to="`/programs/${match.summary.id}`"
              ><strong>{{ match.summary.name }}</strong></RouterLink
            >
            <p>
              {{ match.summary.grade }} 级 · {{ match.summary.department }} ·
              {{ match.summary.trainType }}
            </p>
            <p v-for="(occurrence, index) in match.occurrences" :key="index">
              {{ occurrence.path }} ·
              {{
                occurrence.entry.compulsory === undefined
                  ? "属性未提供"
                  : occurrence.entry.compulsory
                    ? "必修"
                    : "选修"
              }}
              · {{ occurrence.entry.terms.join("、") || "建议学期未提供" }}
            </p>
            <QueryState :meta="match.meta" @retry="planResults.reload" />
          </article>
          <p v-if="incomplete.length" class="notice warning">
            {{
              incomplete.length
            }}
            份计划或公共模块读取不完整；未匹配不能解释为不包含本课程。
          </p>
          <details v-if="incomplete.length" class="reference-sources">
            <summary>查看未完成的计划</summary>
            <p v-for="item in incomplete" :key="item.summary.id">
              {{ item.summary.name }}：{{ item.issues.join("；") }}
            </p>
          </details>
          <EmptyState
            v-if="!matches.length"
            title="成功读取的计划条目中未找到本课程"
            message="可切换年级、院系或培养类型。读取不完整的计划与范围外计划未知。"
        /></template>
      </div>
    </details>
  </section>
</template>
