import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
const registration = vi.hoisted(() => ({
  registerSW: vi.fn(),
  update: vi.fn(),
}));
vi.mock("virtual:pwa-register", () => ({
  registerSW: registration.registerSW,
}));

let events: EventTarget, reload: ReturnType<typeof vi.fn>;
beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("PROD", true);
  events = new EventTarget();
  reload = vi.fn();
  vi.stubGlobal("window", {
    matchMedia: () => ({ matches: false }),
    addEventListener: events.addEventListener.bind(events),
    setInterval: vi.fn(),
    location: { reload },
  });
  vi.stubGlobal("navigator", { onLine: true, serviceWorker: {} });
  registration.registerSW.mockReset().mockReturnValue(registration.update);
  registration.update.mockReset().mockResolvedValue(undefined);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
async function start() {
  const module = await import("../src/features/usePWA");
  module.startPWA();
  await vi.waitFor(() =>
    expect(registration.registerSW).toHaveBeenCalledOnce(),
  );
  return module.usePWA();
}
describe("PWA prompts", () => {
  it("shows updates without reloading, then reloads only on explicit acceptance", async () => {
    const state = await start(),
      options = registration.registerSW.mock.calls[0]![0];
    options.onNeedRefresh();
    expect(state.needRefresh.value).toBe(true);
    expect(reload).not.toHaveBeenCalled();
    await state.update();
    expect(registration.update).toHaveBeenCalledWith(true);
    options.onNeedReload();
    expect(reload).toHaveBeenCalledOnce();
  });
  it("requires a click when another tab activated the update", async () => {
    const state = await start(),
      options = registration.registerSW.mock.calls[0]![0];
    options.onNeedReload();
    expect(reload).not.toHaveBeenCalled();
    expect(state.needRefresh.value).toBe(true);
    await state.update();
    expect(reload).toHaveBeenCalledOnce();
    expect(registration.update).not.toHaveBeenCalled();
  });
  it("requests installation only from its button and distinguishes dismissal", async () => {
    const state = await start(),
      prompt = vi.fn().mockResolvedValue(undefined);
    const event = Object.assign(
      new Event("beforeinstallprompt", { cancelable: true }),
      {
        prompt,
        userChoice: Promise.resolve({ outcome: "dismissed" }),
      },
    );
    events.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(state.installAvailable.value).toBe(true);
    expect(prompt).not.toHaveBeenCalled();
    await state.install();
    expect(prompt).toHaveBeenCalledOnce();
    expect(state.installed.value).toBe(false);
    expect(state.installAvailable.value).toBe(false);
    events.dispatchEvent(new Event("appinstalled"));
    expect(state.installed.value).toBe(true);
  });
  it("reports failed update and leaves the page open", async () => {
    const state = await start();
    registration.update.mockRejectedValue(new Error("offline"));
    await state.update();
    expect(state.message.value).toContain("更新未完成");
    expect(state.updating.value).toBe(false);
    expect(reload).not.toHaveBeenCalled();
  });
});
