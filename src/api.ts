import {CONFIG} from "./const.ts";
import type {Message} from "./types.ts";

export async function apiFetch(path: string, body: any) {
    const r = await fetch(CONFIG.baseURL + path, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${CONFIG.token}`,
            "X-Project-Id": CONFIG.projectId,
            "X-Service-Key": CONFIG.serviceKey,
        },
        body: JSON.stringify(body),
    });
    return await r.json();
}

export const fetchHistory = async (mode: string, setMessages: (val: Message[]) => void) => {
    if (!mode) return;

    const historyType = mode === "admin" ? "sql" : "query";

    const res = await fetch(
        `${CONFIG.baseURL}/history/?history_type=${historyType}`,
        {
            headers: {
                Authorization: `Bearer ${CONFIG.token}`,
                "X-Project-Id": CONFIG.projectId,
                "X-Service-Key": CONFIG.serviceKey,
            },
        }
    ).then((r) => r.json());

    if (Array.isArray(res.results)) {
        setMessages(
            res.results.map((m: any) => ({
                id: String(m.id),
                role: m.sender === "user" ? "user" : "assistant",
                content: m.message,
                kind: m.message?.includes("<") ? "media" : "text",
            }))
        );
    }
};
