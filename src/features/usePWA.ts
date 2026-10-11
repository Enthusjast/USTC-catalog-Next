import { ref } from "vue";

interface InstallPrompt extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const needRefresh = ref(false),
  installing = ref(false),
  updating = ref(false),
  installed = ref(false),
  installAvailable = ref(false),
  message = ref("");
let started = false,
  acceptedUpdate = false,
  reloadRequired = false,
  promptEvent: InstallPrompt | undefined,
  updateWorker: ((reloadPage?: boolean) => Promise<void>) | undefined,
  registration: ServiceWorkerRegistration | undefined;

export function startPWA() {
  if (started || typeof window === "undefined") return;
  started = true;
  installed.value =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    promptEvent = event as InstallPrompt;
    installAvailable.value = true;
  });
  window.addEventListener("appinstalled", () => {
    installed.value = true;
    installAvailable.value = false;
    promptEvent = undefined;
    message.value = "应用已安装。";
  });
  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;
  void import("virtual:pwa-register")
    .then(({ registerSW }) => {
      updateWorker = registerSW({
        immediate: true,
        onNeedRefresh: () => {
          needRefresh.value = true;
        },
        onNeedReload: () => {
          reloadRequired = true;
          if (acceptedUpdate) window.location.reload();
          else needRefresh.value = true;
        },
        onRegisteredSW: (_url, value) => {
          registration = value;
        },
      });
    })
    .catch(() => {
      // A failed registration must not interrupt ordinary online queries.
    });
  const check = () => {
    if (navigator.onLine && registration)
      void registration.update().catch(() => {});
  };
  window.addEventListener("online", check);
  window.addEventListener("focus", check);
  window.setInterval(check, 60 * 60 * 1000);
}

async function install() {
  const event = promptEvent;
  if (!event || installing.value) return;
  installing.value = true;
  message.value = "";
  try {
    await event.prompt();
    const choice = await event.userChoice;
    if (choice.outcome === "accepted") installed.value = true;
  } catch {
    message.value = "安装未完成，可从浏览器菜单安装或添加到主屏幕。";
  } finally {
    promptEvent = undefined;
    installAvailable.value = false;
    installing.value = false;
  }
}

async function update() {
  if (!updateWorker || updating.value) return;
  updating.value = true;
  message.value = "";
  try {
    acceptedUpdate = true;
    if (reloadRequired) {
      window.location.reload();
      return;
    }
    await updateWorker(true);
  } catch {
    acceptedUpdate = false;
    message.value = "更新未完成，请恢复网络后再试。";
  } finally {
    updating.value = false;
  }
}

export function usePWA() {
  return {
    needRefresh,
    installing,
    updating,
    installed,
    installAvailable,
    message,
    install,
    update,
  };
}
