export type ChatMode = "admin" | "user" | null;

export type Message = {
    id: string;
    role: "user" | "assistant";
    content: string;
    kind?: "text" | "media";
};