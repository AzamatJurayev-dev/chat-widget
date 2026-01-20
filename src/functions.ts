import { CONFIG } from "./const";

export function detectTheme(): "dark" | "light" {
    const cls = CONFIG.classMode;
    return document.documentElement.classList.contains(cls) ||
    document.body.classList.contains(cls)
        ? "dark"
        : "light";
}

export function sanitizeHTML(html: string) {
    return html
        .replace(/<script.*?>.*?<\/script>/gi, "")
        .replace(/on\w+=".*?"/gi, "")
        .replace(/javascript:/gi, "")
        .replace(/<iframe.*?>.*?<\/iframe>/gi, "");
}
