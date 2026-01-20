import { CONFIG } from "./const";
import type { Message } from "./types";

export async function apiFetch<T>(
    path: string,
    body?: any
): Promise<T> {
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

    if (!r.ok) throw new Error("API error");
    return r.json();
}

export async function fetchHistory(
    mode: "user" | "admin",
    setMessages: (v: Message[]) => void
) {
    const historyType = mode === "admin" ? "sql" : "query";

    const r = await fetch(
        `${CONFIG.baseURL}/history/?history_type=${historyType}`,
        {
            headers: {
                Authorization: `Bearer ${CONFIG.token}`,
                "X-Project-Id": CONFIG.projectId,
                "X-Service-Key": CONFIG.serviceKey,
            },
        }
    );

    const res = await r.json();

    if (Array.isArray(res.results)) {
        setMessages(
            res.results.map((m: any) => ({
                id: String(m.id),
                role: m.sender === "user" ? "user" : "assistant",
                content: m.message,
            }))
        );
    }
}
