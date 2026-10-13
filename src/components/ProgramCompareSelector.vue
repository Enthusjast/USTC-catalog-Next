<script setup lang="ts">
import { watch } from "vue";
import type { ProgramSummary } from "../domain/models";
import { useProgramFilters } from "../features/useProgramFilters";

const props = defineProps<{
  side: "left" | "right";
  title: string;
  programs?: ProgramSummary[];
}>();
const selected = defineModel<string>({ required: true });
const id = `compare-${props.side}`;
const {
  q,
  dept,
  type,
  grade,
  departments,
  types,
  grades,
  filtered,
  active,
  clear,
} = useProgramFilters(() => props.programs, props.side);

watch(filtered, (options) => {
  if (
    props.programs &&
    selected.value &&
    !options.some((program) => program.id === selected.value)
  )
    selected.value = "";
});
</script>
<template>
  <section
    class="panel program-compare-selector"
    :aria-labelledby="`${id}-heading`"
  >
    <header class="program-compare-selector-heading">
      <h2 :id="`${id}-heading`">{{ title }}</h2>
      <UiButton
        type="button"
        class="text-button"
        :disabled="!active"
        :aria-label="`${title}：清除全部筛选`"
        @click="clear"
      >
        清除全部筛选
      </UiButton>
    </header>
    <div class="program-compare-fields">
      <div class="filter-field">
        <label :for="`${id}-q`">专业或计划名称</label>
        <UiInput
          :id="`${id}-q`"
          v-model="q"
          type="search"
          placeholder="如：数学、强基"
        />
      </div>
      <div class="filter-field">
        <label :for="`${id}-type`">培养类型</label>
        <UiSelect :id="`${id}-type`" v-model="type">
          <option value="">全部培养类型</option>
          <option v-for="t in types" :key="t">{{ t }}</option>
        </UiSelect>
      </div>
      <div class="filter-field">
        <label :for="`${id}-dept`">院系</label>
        <UiSelect :id="`${id}-dept`" v-model="dept">
          <option value="">全部院系</option>
          <option v-for="d in departments" :key="d">{{ d }}</option>
        </UiSelect>
      </div>
      <div class="filter-field">
        <label :for="`${id}-grade`">入学年级</label>
        <UiSelect :id="`${id}-grade`" v-model="grade">
          <option value="">全部年级</option>
          <option v-for="g in grades" :key="g">{{ g }}</option>
        </UiSelect>
      </div>
      <div class="filter-field program-compare-plan-field">
        <label :for="`${id}-plan`">选择计划</label>
        <UiSelect
          :id="`${id}-plan`"
          v-model="selected"
          :disabled="!programs || !filtered.length"
          :aria-describedby="
            programs && !filtered.length ? `${id}-empty` : undefined
          "
        >
          <option value="">请选择计划</option>
          <option v-for="p in filtered" :key="p.id" :value="p.id">
            {{ p.grade }} 级 · {{ p.name }} · {{ p.trainType }} ·
            {{ p.department }}
          </option>
        </UiSelect>
      </div>
    </div>
    <p
      v-if="programs && !filtered.length"
      :id="`${id}-empty`"
      class="muted program-compare-empty"
      role="status"
    >
      没有符合条件的计划。
    </p>
  </section>
</template>
