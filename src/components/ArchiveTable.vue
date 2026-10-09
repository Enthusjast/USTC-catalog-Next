<script setup lang="ts">
import type { ArchiveDocument } from "../api/archiveSchemas";
type Table = Extract<ArchiveDocument["blocks"][number], { type: "table" }>;
defineProps<{ table: Table; number: number }>();
</script>
<template>
  <div class="table-scroll archive-table">
    <table>
      <caption>
        {{
          table.caption || `归档课程表 ${number}`
        }}
      </caption>
      <component
        :is="
          section === 'head' ? 'thead' : section === 'foot' ? 'tfoot' : 'tbody'
        "
        v-for="section in ['head', 'body', 'foot'] as const"
        :key="section"
        ><tr
          v-for="(row, index) in table.rows.filter(
            (row) => row.section === section,
          )"
          :key="index"
        >
          <component
            :is="cell.header ? 'th' : 'td'"
            v-for="(cell, cellIndex) in row.cells"
            :key="cellIndex"
            :colspan="cell.colSpan"
            :rowspan="cell.rowSpan"
            :scope="
              cell.header ? (section === 'head' ? 'col' : 'row') : undefined
            "
            >{{ cell.text }}</component
          >
        </tr></component
      >
    </table>
  </div>
</template>
