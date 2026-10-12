/** Use the state shown by the trigger, even if another tab changed the workspace before Vue painted. */
export function selectionIntent(event: Event) {
  return (
    (event.currentTarget as HTMLElement).getAttribute("aria-pressed") !== "true"
  );
}
