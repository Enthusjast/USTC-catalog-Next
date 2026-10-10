<script setup lang="ts">
import { computed } from "vue";
import { Bookmark, ArrowUpRight, Search, BookOpen } from "@lucide/vue";
import { useRouter } from "vue-router";
import { catalog } from "../api/catalog";
import { flattenDepartments } from "../adapters/catalog";
import { useQuery } from "../features/useQuery";
import { useFilter, useDebounced } from "../features/useFilters";
import { useFavorites } from "../features/useFavorites";
import { useFilterSummary } from "../features/useFilterSummary";
import { publicCourseCatalogues } from "../domain/courseCatalog";
import { usePagination } from "../features/usePagination";
import PageHeading from "../components/PageHeading.vue";
import FilterPanel from "../components/FilterPanel.vue";
import FilterSummary from "../components/FilterSummary.vue";
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
  code = useFilter("course"),
  sort = useFilter("sort", "code"),
  catalogueCode = useFilter("catalog", "ma");
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
const selectedCatalogue = computed(() =>
  publicCourseCatalogues.find((entry) => entry.code === catalogueCode.value),
);
const scope = computed(() =>
  mode.value === "public"
    ? "public"
    : mode.value === "quality"
      ? "quality"
      : mode.value === "saved" ||
          (saved.value === "1" && !keyword.value && !dept.value)
        ? "saved"
        : "search",
);
const queryKey = computed(() =>
  scope.value === "public"
    ? `public:${catalogueCode.value}`
    : scope.value === "quality"
      ? "quality"
      : scope.value === "saved"
        ? `saved:${favorites.value.join(",")}`
        : selectedDepartment.value
          ? `department:${selectedDepartment.value.id}`
          : `search:${keyword.value}`,
);
const { data, meta, loading, error, reload } = useQuery(
  (signal, force) =>
    scope.value === "public" && selectedCatalogue.value
      ? catalog.publicCourses(selectedCatalogue.value, { signal, force })
      : scope.value === "quality"
        ? catalog.quality({ signal, force })
        : scope.value === "saved"
          ? catalog.courses(favorites.value, { signal, force })
          : selectedDepartment.value
            ? catalog.departmentCourses(
                selectedDepartment.value.id,
                selectedDepartment.value.name,
                { signal, force },
              )
            : catalog.search(keyword.value.trim(), { signal, force }),
  queryKey,
  () =>
    scope.value === "public"
      ? !!selectedCatalogue.value
      : scope.value === "quality" ||
        (scope.value === "saved"
          ? !!favorites.value.length
          : !!keyword.value.trim() || !!selectedDepartment.value),
);
const categories = computed(() => [
  ...new Set(
    (data.value ?? [])
      .map((c) => c.classification ?? c.category)
      .filter((c): c is string => !!c),
  ),
]);
const filtered = computed(() =>
  (data.value ?? [])
    .filter(
      (c) =>
        (history.value === "1" || c.valid !== false) &&
        (!keyword.value.trim() ||
          (scope.value === "search" && !selectedDepartment.value) ||
          `${c.code} ${c.name} ${c.englishName ?? ""} ${c.department ?? ""}`
            .toLowerCase()
            .includes(keyword.value.trim().toLowerCase())) &&
        (!selectedDepartment.value ||
          scope.value === "search" ||
          flattenDepartments([selectedDepartment.value]).some(
            (d) => d.name === c.department,
          )) &&
        (!category.value ||
          category.value === (c.classification ?? c.category)) &&
        (saved.value !== "1" || favorites.value.includes(c.code)),
    )
    .sort((a, b) =>
      (sort.value === "name"
        ? a.name
        : sort.value === "department"
          ? scope.value === "public"
            ? (a.category ?? "")
            : (a.department ?? "")
          : a.code
      ).localeCompare(
        sort.value === "name"
          ? b.name
          : sort.value === "department"
            ? scope.value === "public"
              ? (b.category ?? "")
              : (b.department ?? "")
            : b.code,
        "zh-CN",
        { numeric: true },
      ),
    ),
);
const filterSummary = useFilterSummary({
  q: { label: "关键词", model: q },
  dept: {
    label: "院系",
    model: dept,
    display: () => selectedDepartment.value?.name,
  },
  category: { label: "类别", model: category },
  history: {
    label: "课程范围",
    model: history,
    display: () => "包含历史课程",
    active: () => history.value === "1",
  },
  saved: {
    label: "收藏",
    model: saved,
    display: () => "仅看收藏",
    active: () => saved.value === "1" && scope.value !== "saved",
  },
});
const { page, visible, change } = usePagination(filtered);
const active = computed(
  () =>
    !!keyword.value.trim() ||
    !!selectedDepartment.value ||
    scope.value !== "search",
);
function selectScope(next: string) {
  mode.value = next;
  q.value = "";
  dept.value = "";
  category.value = "";
  saved.value = next === "saved" ? "1" : "";
}
function clear() {
  void router.replace({
    path: "/courses",
    query:
      scope.value === "public"
        ? { mode: "public", catalog: catalogueCode.value }
        : scope.value === "quality"
          ? { mode: "quality" }
          : scope.value === "saved"
            ? { mode: "saved", saved: "1" }
            : {},
  });
}
</script>
<template>
  <PageHeading title="课程目录"
    ><a
      class="button secondary"
      href="https://catalog.ustc.edu.cn/catalog"
      target="_blank"
      rel="noopener noreferrer"
      >官方课程目录<ArrowUpRight :size="16" /></a
  ></PageHeading>
  <div class="view-switcher" role="group" aria-label="课程查询方式">
    <button
      type="button"
      :class="{ active: scope === 'search' }"
      :aria-pressed="scope === 'search'"
      @click="selectScope('search')"
    >
      <Search :size="16" />课程搜索
    </button>
    <button
      type="button"
      :class="{ active: scope === 'public' }"
      :aria-pressed="scope === 'public'"
      @click="selectScope('public')"
    >
      <BookOpen :size="16" />通修门类
    </button>
    <button
      type="button"
      :class="{ active: scope === 'quality' }"
      :aria-pressed="scope === 'quality'"
      @click="selectScope('quality')"
    >
      <BookOpen :size="16" />综合素质
    </button>
    <button
      type="button"
      :class="{ active: scope === 'saved' }"
      :aria-pressed="scope === 'saved'"
      @click="selectScope('saved')"
    >
      <Bookmark :size="16" />本机收藏<span class="view-count">{{
        favorites.length
      }}</span>
    </button>
  </div>
  <div class="query-layout">
    <FilterPanel
      :active-count="filterSummary.count.value"
      :result-count="data ? filtered.length : undefined"
      :result-label="
        scope === 'public' && (selectedCatalogue?.sourceIds.length ?? 0) > 1
          ? '条课程记录'
          : '门课程'
      "
      ><div class="filter-field">
        <label for="course-q">课程名称或编号</label
        ><input
          id="course-q"
          v-model="q"
          type="search"
          placeholder="如：数学分析、MATH1006"
        />
      </div>
      <div v-if="scope === 'public'" class="filter-field">
        <label for="course-catalogue">通修门类</label
        ><select
          id="course-catalogue"
          v-model="catalogueCode"
          @change="category = ''"
        >
          <option v-if="!selectedCatalogue" :value="catalogueCode" disabled>
            请选择有效门类
          </option>
          <option
            v-for="entry in publicCourseCatalogues"
            :key="entry.code"
            :value="entry.code"
          >
            {{ entry.name }}
          </option>
        </select>
      </div>
      <div
        v-if="scope === 'search' || data?.some((course) => !!course.department)"
        class="filter-field"
      >
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
      ><label v-if="scope !== 'saved'" class="checkbox-label"
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
      <FilterSummary
        :filters="filterSummary.filters.value"
        @remove="filterSummary.remove"
        @clear="clear"
      />
      <div class="panel">
        <div class="results-toolbar">
          <div>
            <strong>{{
              scope === "public"
                ? `${selectedCatalogue?.name ?? "通修"}目录`
                : scope === "quality"
                  ? "综合素质课程"
                  : active
                    ? "查询结果"
                    : "开始探索课程"
            }}</strong
            ><span v-if="data" class="muted" aria-live="polite"
              >{{ filtered.length }}
              {{
                scope === "public" &&
                (selectedCatalogue?.sourceIds.length ?? 0) > 1
                  ? "条"
                  : "门"
              }}</span
            >
          </div>
          <label v-if="active" class="sort-control"
            >排序<select v-model="sort">
              <option value="code">课程编号</option>
              <option value="name">课程名称</option>
              <option value="department">
                {{ scope === "public" ? "课程类别" : "所属院系" }}
              </option>
            </select></label
          >
        </div>
        <div
          v-if="['public', 'quality'].includes(scope) && categories.length"
          class="category-shortcuts"
          role="group"
          aria-label="课程分类"
        >
          <button
            type="button"
            :aria-pressed="!category"
            :class="{ active: !category }"
            @click="category = ''"
          >
            全部类别
          </button>
          <button
            v-for="value in categories"
            :key="value"
            type="button"
            :aria-pressed="category === value"
            :class="{ active: category === value }"
            @click="category = value"
          >
            {{ value }}
          </button>
        </div>
        <EmptyState
          v-if="scope === 'public' && !selectedCatalogue"
          title="请选择通修门类"
          message="此链接的门类不在目录中，可重新选择数学、物理等门类。"
          ><button class="button secondary" @click="catalogueCode = 'ma'">
            打开数学类
          </button></EmptyState
        >
        <EmptyState
          v-if="scope === 'saved' && !favorites.length"
          title="本机还没有收藏课程"
          message="查找课程并在详情中收藏，可在这里汇总查看。"
          ><button class="button secondary" @click="selectScope('search')">
            查找课程
          </button></EmptyState
        >
        <EmptyState
          v-if="!active"
          title="从课程名称或院系开始"
          message="输入课程名称或编号，按院系浏览专业课程，或选择通修门类与综合素质课程。课程有效不代表每学期都会开课。"
          ><button class="button" @click="selectScope('public')">
            浏览通修门类</button
          ><button class="button secondary" @click="selectScope('saved')">
            查看本机收藏
          </button></EmptyState
        ><EmptyState
          v-else-if="
            data &&
            !filtered.length &&
            !(scope === 'saved' && !favorites.length)
          "
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
                <th>{{ scope === "public" ? "课程类别" : "所属院系" }}</th>
                <th>最近开课</th>
                <th>状态 / 详情</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(course, index) in visible"
                :key="`${course.code}:${index}`"
              >
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
                  {{
                    scope === "public"
                      ? (course.category ?? "未提供类别")
                      : (course.department ?? "未提供")
                  }}
                  <p
                    v-if="
                      scope === 'public'
                        ? !!course.classification
                        : !!(course.classification ?? course.category)
                    "
                    class="muted"
                    style="font-size: 12px; margin-top: 6px"
                  >
                    {{
                      scope === "public"
                        ? course.classification
                        : (course.classification ?? course.category)
                    }}
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
