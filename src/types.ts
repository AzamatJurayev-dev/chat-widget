export type ChatMode = "user" | "admin" | null;

export type MessageRole = "user" | "assistant";

export type MessageKind = "text" | "media";

export interface Message {
    id: string;
    role: MessageRole;
    content: string;
    kind?: MessageKind;
}
