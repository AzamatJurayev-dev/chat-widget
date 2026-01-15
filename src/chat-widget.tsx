/* eslint-disable react-refresh/only-export-components */

import {useEffect, useRef, useState} from "react";
import {createRoot} from "react-dom/client";
import "./chat-widget.css";
import {CONFIG} from "./const.ts";
import {detectTheme, sanitizeHTML} from "./funtions.ts";
import {apiFetch, fetchHistory} from "./api.ts";
import type {ChatMode, Message} from "./types.ts";


if (!CONFIG.baseURL) {
    console.error("ChatWidget: baseURL is missing");
}

function ChatWidget({root}: { root: HTMLElement }) {
    const [open, setOpen] = useState(false);
    const [mode, setMode] = useState<ChatMode>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [streaming, setStreaming] = useState(false);
    const [statusText, setStatusText] = useState<string | null>(null);

    const bottomRef = useRef<HTMLDivElement>(null);
    const messagesRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const update = () => root.setAttribute("data-theme", detectTheme());
        update();

        const obs = new MutationObserver(update);
        obs.observe(document.documentElement, {attributes: true});
        obs.observe(document.body, {attributes: true});
        return () => obs.disconnect();
    }, []);

    /* AUTO SCROLL */
    useEffect(() => {
        bottomRef.current?.scrollIntoView({behavior: "smooth"});
    }, [messages.length, statusText]);

    /* LOAD HISTORY */
    useEffect(() => {
        fetchHistory(mode!, setMessages);
    }, [mode]);

    const refetchHistory = () => {
        fetchHistory(mode!, setMessages);
    };


    /* SEND MESSAGE */
    const sendMessage = async () => {
        if (!input.trim() || streaming || !mode) return;

        const userMsg: Message = {
            id: crypto.randomUUID(),
            role: "user",
            content: input,
        };

        setMessages((p) => [...p, userMsg]);
        setInput("");
        setStreaming(true);

        const endpoint = mode === "admin" ? "/sql/" : "/query/";

        const res = await apiFetch(endpoint, {question: userMsg.content});

        const aiId = crypto.randomUUID();
        setMessages((p) => [...p, {id: aiId, role: "assistant", content: ""}]);

        const es = new EventSource(
            `${res.stream_url}?token=${CONFIG.token}&project_id=${CONFIG.projectId}&service_key=${CONFIG.serviceKey}`
        );

        let buffer = "";

        es.onmessage = (e) => {
            const data = JSON.parse(e.data);

            // STATUS
            if (data.type === "status") {
                setStatusText(data.content);
                return;
            }

            // TOKEN (AI streaming)
            if (data.type === "token") {
                buffer += data.content;
                setMessages((p) =>
                    p.map((m) => (m.id === aiId ? {...m, content: buffer} : m))
                );
                return;
            }

            // MEDIA
            if (data.type === "media") {
                setMessages((p) => [
                    ...p,
                    {
                        id: crypto.randomUUID(),
                        role: "assistant",
                        content: data.content,
                        kind: "media",
                    },
                ]);
                return;
            }

            // DONE
            if (data.type === "done") {
                es.close();
                setStreaming(false);
                setStatusText(null);

                // 👇 MUHIM: history qayta yuklanadi
                refetchHistory();

                return;
            }
        };

    };

    return (
        <>
            {open && (
                <div id="chat-widget-panel">
                    {!mode && (
                        <div className="cw-entry">
                            <h3>Qanday yordam bera olamiz?</h3>

                            <div className="cw-entry-card" onClick={() => setMode("user")}>
                                <strong>User yordamchi</strong>
                                <span>AI orqali tezkor javob</span>
                            </div>

                            <div className="cw-entry-card" onClick={() => setMode("admin")}>
                                <strong>Admin bilan bog‘lanish</strong>
                                <span>Jonli mutaxassis</span>
                            </div>
                        </div>
                    )}

                    {mode && (
                        <>
                            <div id="chat-widget-header">
                                <span>{mode === "admin" ? "Admin chat" : "User chat"}</span>
                                <span
                                    className="cw-close"
                                    onClick={() => {
                                        setMode(null);
                                        setMessages([]);
                                    }}
                                >
                  ✕
                </span>
                            </div>

                            <div id="chat-widget-messages" ref={messagesRef}>
                                {messages.map((m) =>
                                    m.kind === "media" ? (
                                        <div
                                            key={m.id}
                                            className={`chat-msg ${
                                                m.role === "user" ? "chat-user" : "chat-ai"
                                            }`}
                                            dangerouslySetInnerHTML={{
                                                __html: sanitizeHTML(m.content),
                                            }}
                                        />
                                    ) : (
                                        <div
                                            key={m.id}
                                            className={`chat-msg ${
                                                m.role === "user" ? "chat-user" : "chat-ai"
                                            }`}
                                        >
                                            {m.content}
                                        </div>
                                    )
                                )}

                                {statusText && (
                                    <div className="chat-status">{statusText}</div>
                                )}

                                {streaming && statusText && (
                                    <div className="chat-status chat-status-loading">
                                        <span className="spinner"/>
                                        <span>{statusText}</span>
                                    </div>
                                )}
                                <div ref={bottomRef}/>
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

const rootEl = document.createElement("div");
rootEl.id = "chat-widget-root";
document.body.appendChild(rootEl);
createRoot(rootEl).render(<ChatWidget root={rootEl}/>);
