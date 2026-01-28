export const script =
    (document.currentScript as HTMLScriptElement) ||
    document.querySelector('script[src*="chat-widget"]');

export const CONFIG = {
    baseURL: script?.getAttribute("data-base-url") || "",
    token: script?.getAttribute("data-token") || "",
    projectId: script?.getAttribute("data-project-id") || "",
    serviceKey: script?.getAttribute("data-service-key") || "",
    classMode: script?.getAttribute("data-class-mode") || "dark",
};

if (!CONFIG.baseURL) {
    console.error("[ChatWidget] baseURL missing");
}
