import { useEffect, useRef, useState } from "react";
import { CONFIG } from "./const";
import { apiFetch, fetchHistory } from "./api";
import { detectTheme, sanitizeHTML } from "./functions";
import type { ChatMode, Message } from "./types";
import "./chat-widget.css";

export function ChatWidget({ root }: { root: HTMLElement }) {
    const [open, setOpen] = useState(false);
    const [mode, setMode] = useState<ChatMode>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");

    const [loading, setLoading] = useState(false);
    const [statusText, setStatusText] = useState<string | null>(null);

    const bufferRef = useRef("");
    const typingCancelRef = useRef(false);

    const aiMsgIdRef = useRef<string | null>(null);
    const bottomRef = useRef<HTMLDivElement>(null);

    /* ===== THEME ===== */
    useEffect(() => {
        const update = () => root.setAttribute("data-theme", detectTheme());
        update();
        const obs = new MutationObserver(update);
        obs.observe(document.documentElement, { attributes: true });
        obs.observe(document.body, { attributes: true });
        return () => obs.disconnect();
    }, []);

    /* ===== SCROLL ===== */
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages.length, statusText]);

    /* ===== HISTORY ===== */
    useEffect(() => {
        if (mode) fetchHistory(mode, setMessages);
    }, [mode]);

    /* ===== SPEED BY LENGTH ===== */
    function typingSpeed(len: number) {
        if (len < 100) return 15;
        if (len < 300) return 25;
        if (len < 800) return 35;
        return 45;
    }

    /* ===== FAKE TYPING ===== */
    function fakeTyping(text: string) {
        typingCancelRef.current = false;

        let i = 0;
        let out = "";
        const delay = typingSpeed(text.length);

        const tick = () => {
            if (typingCancelRef.current) return;
            if (i >= text.length) return;

            out += text[i];
            i++;

            setMessages((prev) =>
                prev.map((m) =>
                    m.id === aiMsgIdRef.current ? { ...m, content: out } : m
                )
            );

            setTimeout(tick, delay);
        };

        tick();
    }

    /* ===== STREAM (FETCH) ===== */
    async function readStream(url: string) {
        const res = await fetch(url);
        const reader = res.body!.getReader();
        const decoder = new TextDecoder();

        let partial = "";

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            partial += decoder.decode(value, { stream: true });
            const lines = partial.split("\n");
            partial = lines.pop() || "";

            for (const line of lines) {
                if (!line.trim()) continue;

                const clean = line.replace(/^data:\s*/, "");
                try {
                    const data = JSON.parse(clean);

                    if (data.type === "status") {
                        setStatusText(data.content);
                    }

                    if (data.type === "token") {
                        bufferRef.current += data.content;
                    }
                } catch {}
            }
        }

        // STREAM TUGADI
        setLoading(false);
        setStatusText(null);

        const text = bufferRef.current;
        bufferRef.current = "";

        fakeTyping(text);
    }

    /* ===== SEND ===== */
    async function sendMessage() {
        if (!input.trim() || !mode) return;

        typingCancelRef.current = true;
        bufferRef.current = "";

        const userMsg: Message = {
            id: crypto.randomUUID(),
            role: "user",
            content: input,
        };

        setMessages((p) => [...p, userMsg]);
        setInput("");
        setLoading(true);
        setStatusText("Yozilmoqda...");

        const endpoint = mode === "admin" ? "/sql/" : "/query/";
        const res = await apiFetch<any>(endpoint, { question: userMsg.content });

        const aiId = crypto.randomUUID();
        aiMsgIdRef.current = aiId;

        setMessages((p) => [...p, { id: aiId, role: "assistant", content: "" }]);

        const streamUrl =
            `${res.stream_url}?token=${CONFIG.token}` +
            `&project_id=${CONFIG.projectId}` +
            `&service_key=${CONFIG.serviceKey}`;

        readStream(streamUrl);
    }

    /* ===== UI ===== */
    return (
        <>
            {open && (
                <div id="chat-widget-panel">
                    {!mode && (
                        <div className="cw-entry">
                            <h3>Qanday yordam bera olamiz?</h3>
                            <div className="cw-entry-card" onClick={() => setMode("user")}>
                                User yordamchi
                            </div>
                            <div className="cw-entry-card" onClick={() => setMode("admin")}>
                                Admin bilan bog‘lanish
                            </div>
                        </div>
                    )}

                    {mode && (
                        <>
                            <div id="chat-widget-header">
                                <span>{mode}</span>
                                <span className="close-icon" onClick={() => setMode(null)}>
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
                                        dangerouslySetInnerHTML={
                                            m.kind === "media"
                                                ? { __html: sanitizeHTML(m.content) }
                                                : undefined
                                        }
                                    >
                                        {m.kind !== "media" && m.content}
                                    </div>
                                ))}

                                {loading && statusText && (
                                    <div className="chat-status chat-status-loading">
                                        <span className="spinner" />
                                        {statusText}
                                    </div>
                                )}

                                <div ref={bottomRef} />
                            </div>

                            <div id="chat-widget-input">
                                <input
                                    value={input}
                                    placeholder="Xabar yozing..."
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                                />
                                <button onClick={sendMessage}>Send</button>
                            </div>
                        </>
                    )}
                </div>
            )}

            <div id="chat-widget-btn" onClick={() => setOpen((p) => !p)}>
                🤖
            </div>
        </>
    );
}
