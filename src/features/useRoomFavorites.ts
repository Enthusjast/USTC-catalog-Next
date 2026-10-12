import { computed } from "vue";
import type { RoomSummary } from "../domain/roomAvailability";
import { roomBuildingCode, roomDirectory } from "../domain/roomDirectory";
import { workspace, editWorkspace } from "./useWorkspace";
export function useRoomFavorites() {
  const rooms = computed(() => workspace.value.roomFavorites);
  return {
    rooms,
    includes: (id?: number) =>
      id !== undefined && rooms.value.some((room) => room.directoryId === id),
    async toggle(room: RoomSummary) {
      if (room.directoryId === undefined) return false;
      const entry = roomDirectory.find(
        (entry) => entry.id === room.directoryId,
      );
      if (!entry) return false;
      const id = room.directoryId,
        desired = !rooms.value.some((r) => r.directoryId === id);
      return editWorkspace((next) => {
        if (!desired)
          next.roomFavorites = next.roomFavorites.filter(
            (r) => r.directoryId !== id,
          );
        else if (!next.roomFavorites.some((r) => r.directoryId === id)) {
          if (next.roomFavorites.length >= 100)
            throw new Error("最多收藏 100 间教室。");
          next.roomFavorites.push({
            directoryId: id,
            room: room.room,
            building: roomBuildingCode(room) ?? entry.buildingCode,
          });
        }
      });
    },
    remove: (id: number) =>
      editWorkspace((next) => {
        next.roomFavorites = next.roomFavorites.filter(
          (r) => r.directoryId !== id,
        );
      }),
  };
}
