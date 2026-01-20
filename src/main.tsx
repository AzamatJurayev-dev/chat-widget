import { createRoot } from "react-dom/client";
import { ChatWidget } from "./ChatWidget";

const rootEl = document.createElement("div");
rootEl.id = "chat-widget-root";
document.body.appendChild(rootEl);

createRoot(rootEl).render(<ChatWidget root={rootEl} />);
