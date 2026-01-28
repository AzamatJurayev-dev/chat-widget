import { CONFIG } from "./config";
import { fetchHistory, streamAnswer } from "./api";
import "./styles.css";

let abortController: AbortController | null = null;

export function createWidget() {
    const root = document.createElement("div");
    root.className = `cw-root ${CONFIG.classMode}`;

    root.innerHTML = `
    <div class="cw-header">💬 Chat</div>
    <div class="cw-body"></div>
    <div class="cw-status"></div>
    <div class="cw-footer">
      <input placeholder="Savol yozing..." />
      <button>➤</button>
    </div>
  `;

    document.body.appendChild(root);

    const body = root.querySelector(".cw-body")!;
    const statusEl = root.querySelector(".cw-status")!;
    const input = root.querySelector("input")!;
    const button = root.querySelector("button")!;

    const addMsg = (role: "user" | "bot", text = "") => {
        const el = document.createElement("div");
        el.className = `cw-msg ${role}`;
        el.textContent = text;
        body.appendChild(el);
        body.scrollTop = body.scrollHeight;
        return el;
    };

    /* history */
    fetchHistory().then((list) =>
        list.forEach((m) =>
            addMsg(m.sender === "user" ? "user" : "bot", m.message)
        )
    );

    /* send */
    button.onclick = async () => {
        const text = input.value.trim();
        if (!text) return;

        input.value = "";
        addMsg("user", text);
        const botEl = addMsg("bot");

        statusEl.textContent = "Yozilmoqda...";

        abortController?.abort();
        abortController = new AbortController();

        await streamAnswer(
            text,
            {
                onStatus: (t) => (statusEl.textContent = t),
                onDelta: (t) => {
                    botEl.textContent += t;
                    body.scrollTop = body.scrollHeight;
                },
                onDone: () => {
                    statusEl.textContent = "";
                    abortController = null;
                },
            },
            abortController.signal
        );
    };
}
