import { nextTick, onMounted, onBeforeUnmount, watch, type Ref } from "vue";
import { storageKey } from "./storageKey";
interface Position {
  top: number;
  floors: Record<string, number>;
}
export function useClassroomPositions(
  key: () => string,
  ready: () => boolean,
  root: Ref<HTMLElement | undefined>,
) {
  const storage = storageKey("classroom-positions"),
    positions = new Map<string, Position>();
  let current = key(),
    restoring = false,
    revision = 0,
    timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const saved = JSON.parse(sessionStorage.getItem(storage) ?? "[]");
    if (Array.isArray(saved))
      for (const entry of saved.slice(-10)) {
        if (
          Array.isArray(entry) &&
          typeof entry[0] === "string" &&
          typeof entry[1]?.top === "number" &&
          entry[1].top >= 0 &&
          entry[1].floors &&
          typeof entry[1].floors === "object"
        )
          positions.set(entry[0], entry[1]);
      }
  } catch {
    /* Browsing positions are optional. */
  }
  function save() {
    if (restoring || !root.value || !ready()) return;
    const floors: Record<string, number> = {};
    root.value
      .querySelectorAll<HTMLElement>("[data-floor-key]")
      .forEach((floor) => {
        const scroll = floor.querySelector<HTMLElement>(
          ".room-timeline-scroll",
        );
        if (scroll && floor.dataset.floorKey)
          floors[floor.dataset.floorKey] = scroll.scrollLeft;
      });
    positions.delete(current);
    positions.set(current, { top: window.scrollY, floors });
    while (positions.size > 10)
      positions.delete(positions.keys().next().value!);
    try {
      sessionStorage.setItem(storage, JSON.stringify([...positions]));
    } catch {
      /* Storage failure does not affect querying. */
    }
  }
  function scroll() {
    clearTimeout(timer);
    if (!restoring) timer = setTimeout(save, 120);
  }
  async function restore() {
    if (!ready() || !root.value) return;
    const generation = ++revision,
      saved = positions.get(current);
    restoring = true;
    await nextTick();
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        if (generation !== revision) return;
        root.value
          ?.querySelectorAll<HTMLElement>("[data-floor-key]")
          .forEach((floor) => {
            const scroll = floor.querySelector<HTMLElement>(
                ".room-timeline-scroll",
              ),
              left = saved?.floors[floor.dataset.floorKey ?? ""];
            if (scroll)
              scroll.scrollLeft =
                typeof left === "number" && Number.isFinite(left) ? left : 0;
          });
        window.scrollTo({ top: saved?.top ?? 0, behavior: "instant" });
        restoring = false;
      }),
    );
  }
  watch(
    key,
    (next) => {
      save();
      current = next;
      revision++;
      restoring = false;
      void restore();
    },
    { flush: "sync" },
  );
  watch(
    ready,
    (value) => {
      if (value) void restore();
      else {
        revision++;
        restoring = false;
      }
    },
    { flush: "post" },
  );
  onMounted(() => {
    window.addEventListener("scroll", scroll, true);
    void restore();
  });
  onBeforeUnmount(() => {
    save();
    revision++;
    clearTimeout(timer);
    window.removeEventListener("scroll", scroll, true);
  });
}
