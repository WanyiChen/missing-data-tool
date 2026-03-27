import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
    plugins: [react(), tailwindcss()],
    server: {
        proxy: {
            "/api": "http://localhost:8000",
        },
    },
    preview: {
        host: true,
        port: process.env.PORT ? parseInt(process.env.PORT) : 4173,
        allowedHosts: [
            "missing-data-tool-1.onrender.com",
            "localhost",
            "127.0.0.1"
        ]
    },
    resolve: {
        alias: {
            stream: "stream-browserify",
        },
    },
    optimizeDeps: {
        esbuildOptions: {
            define: {
                global: "globalThis",
            },
        },
    },
});
