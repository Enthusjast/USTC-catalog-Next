<script setup lang="ts">
import { useId } from "vue";
import type { usePlanner } from "../features/usePlanner";
import { workspaceBusy } from "../features/useWorkspace";
import { isFirstMonday } from "../domain/dates";
const props = defineProps<{
    planner: ReturnType<typeof usePlanner>;
    prefix?: string;
  }>(),
  unique = useId();
const id = props.prefix ?? `calendar-${unique}`,
  firstMonday = props.planner.firstMonday,
  layout = props.planner.layout;
</script>
<template>
  <div class="calendar-settings flex-actions">
    <div class="filter-field">
      <label :for="`${id}-start`">第 1 教学周的周一日期</label
      ><input
        :id="`${id}-start`"
        v-model="firstMonday"
        type="date"
        :disabled="workspaceBusy"
        :aria-invalid="!!firstMonday && !isFirstMonday(firstMonday)"
        :aria-describedby="
          firstMonday && !isFirstMonday(firstMonday) ? `${id}-error` : undefined
        "
      />
      <p
        v-if="firstMonday && !isFirstMonday(firstMonday)"
        :id="`${id}-error`"
        class="calendar-error"
      >
        请选择第 1 教学周的周一日期。
      </p>
    </div>
    <div class="filter-field">
      <label :for="`${id}-layout`">日历时间方式</label
      ><select :id="`${id}-layout`" v-model="layout" :disabled="workspaceBusy">
        <option value="">全天提醒（含课节说明）</option>
        <option value="1">课节表 1（第 1 节 07:50）</option>
        <option value="2">课节表 2（第 1 节 08:00）</option>
      </select>
    </div>
  </div>
</template>
<style scoped>
.calendar-settings {
  align-items: flex-end;
}
.calendar-settings .filter-field {
  margin: 8px 0;
  flex: 1;
  min-width: 160px;
}
.calendar-error {
  color: var(--error);
  font-size: 13px;
}
</style>
