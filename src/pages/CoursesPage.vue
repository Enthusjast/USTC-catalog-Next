<script setup lang="ts">
import { computed } from "vue";
import { Bookmark, ArrowUpRight } from "@lucide/vue";
import { useRouter } from "vue-router";
import { catalog } from "../api/catalog";
import { flattenDepartments } from "../adapters/catalog";
import { useQuery } from "../features/useQuery";
import { useFilter, useDebounced } from "../features/useFilters";
import { useFavorites } from "../features/useFavorites";
import { usePagination } from "../features/usePagination";
import PageHeading from "../components/PageHeading.vue";
import FilterPanel from "../components/FilterPanel.vue";
import QueryState from "../components/QueryState.vue";
import EmptyState from "../components/EmptyState.vue";
import Pagination from "../components/Pagination.vue";
import CourseDetail from "../components/CourseDetail.vue";
const router = useRouter(),
  q = useFilter("q"),
  keyword = useDebounced(q),
  dept = useFilter("dept"),
  mode = useFilter("mode"),
  category = useFilter("category"),
  history = useFilter("history"),
  saved = useFilter("saved"),
  code = useFilter("course");
const { favorites } = useFavorites();
const departmentQuery = useQuery((signal, force) =>
  catalog.departments({ signal, force }),
);
const departmentOptions = computed(() =>
  flattenDepartments(departmentQuery.data.value ?? []),
);
const selectedDepartment = computed(() =>
  departmentOptions.value.find((d) => d.id === dept.value),
);
const { data, meta, loading, error, reload } = useQuery(
  (signal, force) =>
    keyword.value.trim()
      ? catalog.search(keyword.value.trim(), { signal, force })
      : selectedDepartment.value
        ? catalog.departmentCourses(
            selectedDepartment.value.id,
            selectedDepartment.value.name,
            { signal, force },
          )
        : mode.value === "quality"
          ? catalog.quality({ signal, force })
          : catalog.courses(favorites.value, { signal, force }),
  () =>
    `${keyword.value}|${selectedDepartment.value?.id ?? ""}|${mode.value}|${saved.value === "1" ? favorites.value.join(",") : ""}`,
  () =>
    !!keyword.value.trim() ||
    !!selectedDepartment.value ||
    mode.value === "quality" ||
    (saved.value === "1" && !!favorites.value.length),
);
const categories = computed(() => [
  ...new Set(
    (data.value ?? [])
      .map((c) => c.classification ?? c.category)
      .filter((c): c is string => !!c),
  ),
]);
const filtered = computed(() =>
  (data.value ?? []).filter(
    (c) =>
      (history.value === "1" || c.valid !== false) &&
      (!selectedDepartment.value ||
        !keyword.value ||
        flattenDepartments([selectedDepartment.value]).some(
          (d) => d.name === c.department,
        )) &&
      (!category.value ||
        category.value === (c.classification ?? c.category)) &&
      (saved.value !== "1" || favorites.value.includes(c.code)),
  ),
);
const { page, visible, change } = usePagination(filtered);
const active = computed(
  () =>
    !!keyword.value ||
    !!selectedDepartment.value ||
    mode.value === "quality" ||
    saved.value === "1",
);
function clear() {
  void router.replace({ path: "/courses", query: {} });
}
</script>
<template>
  <PageHeading
    title="课程目录"
    description="按名称、编号或院系查找课程。课程有效状态与具体学期开课情况分别展示。"
    eyebrow="01 / COURSE CATALOG"
    ><a
      class="button secondary"
      href="https://catalog.ustc.edu.cn/catalog"
      target="_blank"
      rel="noopener noreferrer"
      >官方课程目录<ArrowUpRight :size="16" /></a
  ></PageHeading>
  <div class="query-layout">
    <FilterPanel
      ><div class="filter-field">
        <label for="course-q">课程名称或编号</label
        ><input
          id="course-q"
          v-model="q"
          type="search"
          placeholder="如：数学分析、MATH1006"
        />
      </div>
      <div class="filter-field">
        <label for="course-dept">所属院系</label
        ><select id="course-dept" v-model="dept">
          <option value="">全部院系</option>
          <option v-for="d in departmentOptions" :key="d.id" :value="d.id">
            {{ d.name }}
          </option>
        </select>
      </div>
      <QueryState
        :error="departmentQuery.error.value"
        :loading="departmentQuery.loading.value"
        @retry="departmentQuery.reload"
      />
      <div class="filter-field">
        <label for="course-category">课程类别</label
        ><select id="course-category" v-model="category">
          <option value="">全部可用类别</option>
          <option v-for="c in categories" :key="c">{{ c }}</option>
        </select>
      </div>
      <label class="checkbox-label"
        ><input
          type="checkbox"
          :checked="history === '1'"
          @change="
            history = ($event.target as HTMLInputElement).checked ? '1' : ''
          "
        />显示历史课程</label
      ><label class="checkbox-label"
        ><input
          type="checkbox"
          :checked="saved === '1'"
          @change="
            saved = ($event.target as HTMLInputElement).checked ? '1' : ''
          "
        />仅看本机收藏</label
      ><button class="text-button" @click="clear">
        清除全部筛选
      </button></FilterPanel
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
          <div>
            <strong>{{ active ? "查询结果" : "开始探索课程" }}</strong
            ><span v-if="data" class="muted" aria-live="polite"
              >{{ filtered.length }} 门</span
            >
          </div>
          <button
            class="text-button"
            @click="
              mode = 'quality';
              q = '';
              dept = '';
            "
          >
            浏览通识课程
          </button>
        </div>
        <EmptyState
          v-if="
            saved === '1' &&
            !favorites.length &&
            !keyword &&
            !selectedDepartment &&
            mode !== 'quality'
          "
          title="本机还没有收藏课程"
          message="查找课程并在详情中收藏，可在这里汇总查看。"
        />
        <EmptyState
          v-if="!active"
          title="从课程名称或院系开始"
          message="输入关键词，选择院系，或浏览接口提供的通识课程集合。课程目录不代表每学期都会开课。"
        /><EmptyState v-else-if="data && !filtered.length"
          ><button class="button secondary" @click="clear">清除筛选</button
          ><button
            v-if="history !== '1'"
            class="button secondary"
            @click="history = '1'"
          >
            显示历史课程
          </button></EmptyState
        >
        <div v-if="filtered.length" class="table-scroll">
          <table class="course-table">
            <thead>
              <tr>
                <th>课程</th>
                <th>所属院系</th>
                <th>最近开课</th>
                <th>状态 / 详情</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="course in visible" :key="course.code">
                <td>
                  <span class="course-code mono">{{ course.code }}</span
                  ><button class="course-name" @click="code = course.code">
                    {{ course.name }}
                  </button>
                  <p v-if="course.englishName" class="course-en">
                    {{ course.englishName }}
                  </p>
                </td>
                <td class="course-department">
                  {{ course.department ?? "未提供" }}
                  <p
                    v-if="course.classification ?? course.category"
                    class="muted"
                    style="font-size: 12px; margin-top: 6px"
                  >
                    {{ course.classification ?? course.category }}
                  </p>
                </td>
                <td>{{ course.lastTerm ?? "暂无记录" }}</td>
                <td>
                  <span
                    class="tag"
                    :class="course.valid ? 'valid' : 'warning'"
                    >{{
                      course.valid === undefined
                        ? "状态未提供"
                        : course.valid
                          ? "当前有效"
                          : "历史课程"
                    }}</span
                  ><button
                    class="icon-button"
                    :aria-label="`查看 ${course.name} 详情`"
                    @click="code = course.code"
                  >
                    <Bookmark
                      v-if="favorites.includes(course.code)"
                      :size="16"
                    /><ArrowUpRight v-else :size="16" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <Pagination :total="filtered.length" :page="page" @change="change" />
      </div>
    </div>
  </div>
  <CourseDetail
    :code="code"
    :initial="data?.find((c) => c.code === code)"
    @close="code = ''"
  />
</template>
