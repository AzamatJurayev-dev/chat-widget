import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
    plugins: [
        react(), // fastRefresh YO‘Q
    ],

    define: {
        "process.env.NODE_ENV": '"production"',
        process: {
            env: {},
        },
    },

    build: {
        lib: {
            entry: "src/main.tsx",
            name: "ChatWidget",
            formats: ["iife"],
            fileName: () => "chat-widget.js",
        },
        rollupOptions: {
            output: {
                inlineDynamicImports: true,
            },
        },
    },
});
