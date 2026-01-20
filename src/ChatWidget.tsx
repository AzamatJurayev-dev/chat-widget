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

    const [streaming, setStreaming] = useState(false);
    const [statusText, setStatusText] = useState<string | null>(null);

    /* ===== FAKE TYPING STATE ===== */
    const rawTextRef = useRef("");
    const fakeCancelRef = useRef(false);

    const aiMsgIdRef = useRef<string | null>(null);
    const esRef = useRef<EventSource | null>(null);
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

    /* ===== HISTORY (FAQAT MODE O‘ZGARGANDA) ===== */
    useEffect(() => {
        if (mode) fetchHistory(mode, setMessages);
    }, [mode]);

    /* ===== FAKE TYPING ENGINE ===== */
    function fakeTyping(text: string) {
        fakeCancelRef.current = false;

        let i = 0;
        let output = "";

        const typeNext = () => {
            if (fakeCancelRef.current) return;
            if (i >= text.length) return;

            const step = Math.random() > 0.75 ? 2 : 1;
            const chunk = text.slice(i, i + step);
            i += step;

            output += chunk;

            setMessages((prev) =>
                prev.map((m) =>
                    m.id === aiMsgIdRef.current
                        ? { ...m, content: output }
                        : m
                )
            );

            const lastChar = chunk.slice(-1);
            let delay = 25 + Math.random() * 50;
            if (lastChar === " ") delay += 80;
            if (".,!?".includes(lastChar)) delay += 150;

            setTimeout(typeNext, delay);
        };

        typeNext();
    }

    /* ===== SEND MESSAGE ===== */
    async function sendMessage() {
        if (!input.trim() || !mode) return;

        /* old typingni to‘xtat */
        fakeCancelRef.current = true;
        rawTextRef.current = "";

        esRef.current?.close();
        setStreaming(false);

        const userMsg: Message = {
            id: crypto.randomUUID(),
            role: "user",
            content: input,
        };

        setMessages((p) => [...p, userMsg]);
        setInput("");
        setStatusText(null);

        setStreaming(true);

        const endpoint = mode === "admin" ? "/sql/" : "/query/";
        const res = await apiFetch<any>(endpoint, { question: userMsg.content });

        const aiId = crypto.randomUUID();
        aiMsgIdRef.current = aiId;

        setMessages((p) => [...p, { id: aiId, role: "assistant", content: "" }]);

        esRef.current = new EventSource(
            `${res.stream_url}?token=${CONFIG.token}&project_id=${CONFIG.projectId}&service_key=${CONFIG.serviceKey}`
        );

        esRef.current.onmessage = (e) => {
            const data = JSON.parse(e.data);

            if (data.type === "status") {
                setStatusText(data.content);
                return;
            }

            if (data.type === "token") {
                rawTextRef.current += data.content;
                return;
            }

            if (data.type === "done") {
                esRef.current?.close();
                setStreaming(false);
                setStatusText(null);

                const fullText = rawTextRef.current;
                rawTextRef.current = "";

                fakeTyping(fullText);
            }
        };

        esRef.current.onerror = () => {
            esRef.current?.close();
            setStreaming(false);
            setStatusText(null);
        };
    }

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
                                        {streaming && m.id === aiMsgIdRef.current && (
                                            <span className="typing-cursor" />
                                        )}
                                    </div>
                                ))}

                                {statusText && (
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
