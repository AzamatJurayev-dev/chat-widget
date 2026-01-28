import { defineConfig } from "vite";

export default defineConfig({
    build: {
        lib: {
            entry: "src/index.ts",
            name: "ChatWidget",
            fileName: "chat-widget",
            formats: ["iife"],
        },
    },
});
