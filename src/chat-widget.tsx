/* eslint-disable react-refresh/only-export-components */

import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";

/* ===================== SCRIPT CONFIG ===================== */

const script =
    (document.currentScript as HTMLScriptElement) ||
    document.querySelector('script[src*="chat-widget"]');

const CONFIG = {
    baseURL: script?.getAttribute("data-base-url") || "",
    token: script?.getAttribute("data-token") || "",
    projectId: script?.getAttribute("data-project-id") || "",
    serviceKey: script?.getAttribute("data-service-key") || "",
    classMode: script?.getAttribute("data-class-mode") || "dark",
};

if (!CONFIG.baseURL) {
    console.error("ChatWidget: baseURL is missing");
}

/* ===================== THEME DETECTION ===================== */

function detectTheme() {
    const cls = CONFIG.classMode;
    return document.documentElement.classList.contains(cls) ||
    document.body.classList.contains(cls)
        ? "dark"
        : "light";
}

/* ===================== STYLE (DEFAULT + THEME) ===================== */

const style = document.createElement("style");
style.innerHTML = `
#chat-widget-root {
  position: fixed;
  bottom: 0;
  right: 0;
  z-index: 999999;
  font-family: system-ui, -apple-system, sans-serif;
}

/* BUTTON */
#chat-widget-btn {
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 56px;
  height: 56px;
  border-radius: 999px;
  background: var(--cw-accent);
  color: white;
  font-size: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

/* PANEL */
#chat-widget-panel {
  position: fixed;
  bottom: 90px;
  right: 24px;
  width: 360px;
  height: 480px;
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 25px 60px rgba(0,0,0,.45);
}

/* HEADER */
#chat-widget-header {
  height: 48px;
  padding: 0 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-weight: 600;
  border-bottom: 1px solid var(--cw-border);
}

/* MESSAGES */
#chat-widget-messages {
  flex: 1;
  padding: 12px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.chat-msg {
  max-width: 80%;
  padding: 8px 12px;
  border-radius: 12px;
  font-size: 14px;
  line-height: 1.4;
}

.chat-user {
  align-self: flex-end;
  background: var(--cw-user);
  color: white;
}

.chat-ai {
  align-self: flex-start;
  background: var(--cw-ai);
}

/* INPUT */
#chat-widget-input {
  display: flex;
  gap: 8px;
  padding: 10px;
  border-top: 1px solid var(--cw-border);
}

#chat-widget-input input {
  flex: 1;
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px solid var(--cw-border);
  background: var(--cw-input);
  color: inherit;
}

#chat-widget-input button {
  padding: 0 14px;
  border-radius: 10px;
  border: none;
  background: var(--cw-accent);
  color: white;
  cursor: pointer;
}

/* DARK THEME (shadcn-like) */
[data-theme="dark"] {
  --cw-bg: #020617;
  --cw-text: #f8fafc;
  --cw-border: rgba(255,255,255,.1);
  --cw-ai: #1f2937;
  --cw-user: #4f46e5;
  --cw-input: rgba(255,255,255,.05);
  --cw-accent: #6366f1;
}

/* LIGHT THEME */
[data-theme="light"] {
  --cw-bg: #ffffff;
  --cw-text: #0f172a;
  --cw-border: rgba(15,23,42,.12);
  --cw-ai: #e5e7eb;
  --cw-user: #6366f1;
  --cw-input: #f8fafc;
  --cw-accent: #6366f1;
}

[data-theme] #chat-widget-panel {
  background: var(--cw-bg);
  color: var(--cw-text);
}
`;
document.head.appendChild(style);

/* ===================== API ===================== */

function apiFetch(path: string, options: RequestInit = {}) {
    return fetch(CONFIG.baseURL + path, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${CONFIG.token}`,
            "X-Project-Id": CONFIG.projectId,
            "X-Service-Key": CONFIG.serviceKey,
            ...(options.headers || {}),
        },
    }).then((r) => r.json());
}

/* ===================== TYPES ===================== */

type Message = {
    id: string;
    role: "user" | "assistant";
    content: string;
};

/* ===================== COMPONENT ===================== */

function ChatWidget({ root }: { root: HTMLElement }) {
    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [streaming, setStreaming] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);

    /* auto scroll */
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages.length]);

    /* theme sync */
    useEffect(() => {
        const update = () => root.setAttribute("data-theme", detectTheme());
        update();

        const obs = new MutationObserver(update);
        obs.observe(document.documentElement, { attributes: true });
        obs.observe(document.body, { attributes: true });
        return () => obs.disconnect();
    }, []);

    /* history */
    useEffect(() => {
        if (!open) return;
        apiFetch("/api/chat/history/?page=1&page_size=20").then((res) => {
            setMessages(
                res.results.map((m: any) => ({
                    id: String(m.id),
                    role: m.type || m.role,
                    content: m.message || m.text,
                }))
            );
        });
    }, [open]);

    const sendMessage = async () => {
        if (!input.trim() || streaming) return;

        const userMsg: Message = {
            id: crypto.randomUUID(),
            role: "user",
            content: input,
        };

        setMessages((p) => [...p, userMsg]);
        setInput("");
        setStreaming(true);

        const res = await apiFetch("/api/chat/query/", {
            method: "POST",
            body: JSON.stringify({ question: userMsg.content }),
        });

        const aiMsg: Message = {
            id: crypto.randomUUID(),
            role: "assistant",
            content: "",
        };

        setMessages((p) => [...p, aiMsg]);

        const es = new EventSource(
            `${res.stream_url}?token=${CONFIG.token}&project_id=${CONFIG.projectId}&service_key=${CONFIG.serviceKey}`
        );

        let text = "";
        es.onmessage = (e) => {
            if (e.data === "[DONE]") {
                es.close();
                setStreaming(false);
                return;
            }
            text += e.data;
            setMessages((p) =>
                p.map((m) => (m.id === aiMsg.id ? { ...m, content: text } : m))
            );
        };
    };

    return (
        <>
            {open && (
                <div id="chat-widget-panel">
                    <div id="chat-widget-header">
                        <span>AI Chat</span>
                        <span style={{ cursor: "pointer" }} onClick={() => setOpen(false)}>
              ✕
            </span>
                    </div>

                    <div id="chat-widget-messages">
                        {messages.map((m) => (
                            <div
                                key={m.id}
                                className={`chat-msg ${
                                    m.role === "user" ? "chat-user" : "chat-ai"
                                }`}
                            >
                                {m.content}
                            </div>
                        ))}
                        <div ref={bottomRef} />
                    </div>

                    <div id="chat-widget-input">
                        <input
                            value={input}
                            placeholder="Ask something..."
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                        />
                        <button onClick={sendMessage}>Send</button>
                    </div>
                </div>
            )}

            <div id="chat-widget-btn" onClick={() => setOpen((p) => !p)}>
                🤖
            </div>
        </>
    );
}

/* ===================== MOUNT ===================== */

const rootEl = document.createElement("div");
rootEl.id = "chat-widget-root";
document.body.appendChild(rootEl);
createRoot(rootEl).render(<ChatWidget root={rootEl} />);
