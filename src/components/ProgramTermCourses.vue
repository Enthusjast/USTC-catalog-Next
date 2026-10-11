<script setup lang="ts">
import { computed } from "vue";
import type { ProgramModule } from "../domain/models";
import { programTermGroups } from "../domain/programView";
defineEmits<{ course: [code: string] }>();
const props = defineProps<{ modules: ProgramModule[] }>();
const groups = computed(() => programTermGroups(props.modules));
</script>
<template>
  <section v-for="group in groups" :key="group.term" class="panel program-term">
    <h2>{{ group.label }}</h2>
    <div class="table-scroll">
      <table>
        <thead>
          <tr>
            <th>课程</th>
            <th>学分</th>
            <th>属性</th>
            <th>模块与备注</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in group.entries" :key="row.key">
            <td>
              <span class="mono">{{ row.entry.course.code }}</span
              ><button
                class="course-name"
                @click="$emit('course', row.entry.course.code)"
              >
                {{ row.entry.course.name }}
              </button>
            </td>
            <td>{{ row.entry.course.credits ?? "未提供" }}</td>
            <td>
              {{
                row.entry.compulsory === undefined
                  ? "未提供"
                  : row.entry.compulsory
                    ? "必修"
                    : "选修"
              }}
            </td>
            <td>
              {{ row.path }}
              <p v-if="row.entry.remark">{{ row.entry.remark }}</p>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
<style scoped>
.program-term {
  padding: 16px;
  margin: 16px 0;
}
.program-term h2 {
  font-size: 18px;
}
.program-term td {
  white-space: normal;
  min-width: 80px;
}
.program-term td:first-child {
  min-width: 160px;
}
.program-term td:last-child {
  min-width: 180px;
}
</style>
