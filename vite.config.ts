import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
// На GitHub Pages приложение раздаётся из /git_quest_game/, поэтому при сборке
// задаём base. В режиме разработки base остаётся "/", чтобы npm run dev работал
// по обычному адресу.
export default defineConfig(({ command }) => ({
  base: command === "build" ? "/git_quest_game/" : "/",
  plugins: [react()],
  test: {
    globals: true,
    environment: "node",
  },
}));
