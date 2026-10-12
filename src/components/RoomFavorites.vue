<script setup lang="ts">
import { ref } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useRoomFavorites } from "../features/useRoomFavorites";
import { roomDirectory, buildingLabel } from "../domain/roomDirectory";
import { workspaceBusy } from "../features/useWorkspace";
import DisclosureDialog from "./DisclosureDialog.vue";
const props = defineProps<{ date: string }>(),
  favorites = useRoomFavorites(),
  router = useRouter(),
  route = useRoute(),
  open = ref(false),
  selected = ref("");
function jump() {
  if (!selected.value) return;
  void router.replace({
    query: {
      ...route.query,
      date: props.date,
      roomKey: `directory:${selected.value}`,
      roomView: "week",
    },
  });
  selected.value = "";
}
</script>
<template>
  <div
    v-if="favorites.rooms.value.length"
    class="panel room-favorites flex-actions"
  >
    <label for="favorite-room-jump">常用教室</label
    ><select id="favorite-room-jump" v-model="selected" @change="jump">
      <option value="">选择教室</option>
      <option
        v-for="room in favorites.rooms.value"
        :key="room.directoryId"
        :value="String(room.directoryId)"
        :disabled="
          !roomDirectory.some((entry) => entry.id === room.directoryId)
        "
      >
        {{ buildingLabel(room.building) }} · {{ room.room }}
      </option></select
    ><button class="text-button" @click="open = true">管理</button>
  </div>
  <DisclosureDialog :open="open" title="常用教室" @close="open = false"
    ><div
      v-for="room in favorites.rooms.value"
      :key="room.directoryId"
      class="flex-actions favorite-room-row"
    >
      <span>{{ buildingLabel(room.building) }} · {{ room.room }}</span
      ><button
        class="text-button"
        :disabled="workspaceBusy"
        :aria-label="`移除常用教室 ${room.room}`"
        @click="favorites.remove(room.directoryId)"
      >
        移除
      </button>
    </div></DisclosureDialog
  >
</template>
<style scoped>
.room-favorites {
  padding: 12px;
  margin: 12px 0;
}
.room-favorites select {
  width: auto;
  max-width: 100%;
}
.favorite-room-row {
  padding: 12px 0;
  justify-content: space-between;
}
</style>
