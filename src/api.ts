import { CONFIG } from "./config";

export type StreamHandlers = {
    onStatus?: (text: string) => void;
    onDelta: (text: string) => void;
    onDone: () => void;
};

export function headers() {
    return {
        "Content-Type": "application/json",
        Authorization: `Bearer ${CONFIG.token}`,
        "X-Project-Id": CONFIG.projectId,
        "X-Service-Key": CONFIG.serviceKey,
    };
}

/* -------- HISTORY -------- */
export async function fetchHistory(): Promise<
    { sender: string; message: string }[]
> {
    const res = await fetch(
        `${CONFIG.baseURL}/history/?history_type=query`,
        { headers: headers() }
    );
    const json = await res.json();
    return Array.isArray(json.results) ? json.results : [];
}

/* -------- STREAM -------- */
export async function streamAnswer(
    question: string,
    handlers: StreamHandlers,
    signal: AbortSignal
) {
    const res = await fetch(`${CONFIG.baseURL}/query/`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ question }),
        signal,
    });

    if (!res.body) throw new Error("No stream body");

    const reader = res.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    while (true) {
        const { value, done } = await reader.read();
        if (done) {
            handlers.onDone();
            break;
        }

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() || "";

        for (const part of parts) {
            let event = "";
            let data = "";

            for (const line of part.split("\n")) {
                if (line.startsWith("event:"))
                    event = line.slice(6).trim();
                if (line.startsWith("data:"))
                    data += line.slice(5).trim();
            }

            if (!data) continue;

            const payload = JSON.parse(data);

            if (event === "status") {
                handlers.onStatus?.(payload.v || "");
            }

            if (event === "delta") {
                handlers.onDelta(
                    typeof payload.v === "string"
                        ? payload.v
                        : payload.v?.text || ""
                );
            }

            if (event === "done") {
                handlers.onDone();
                return;
            }
        }
    }
}
