import type { Config } from "tailwindcss";

export default {
  content: ["./renderer/index.html", "./renderer/src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        zed: {
          bg: "var(--zed-bg)",
          panel: "var(--zed-panel)",
          surface: "var(--zed-surface)",
          element: "var(--zed-element)",
          "element-hover": "var(--zed-element-hover)",
          "element-active": "var(--zed-element-active)",
          "element-selected": "var(--zed-element-selected)",
          border: "var(--zed-border)",
          "border-alt": "var(--zed-border-alt)",
          "border-focused": "var(--zed-border-focused)",
          text: "var(--zed-text)",
          "text-muted": "var(--zed-text-muted)",
          "text-placeholder": "var(--zed-text-placeholder)",
          accent: "var(--zed-accent)",
          "scrollbar-thumb": "var(--zed-scrollbar-thumb)",
          "scrollbar-track": "var(--zed-scrollbar-track)"
        }
      },
      fontFamily: {
        sans: [
          "SF Pro Text",
          "SF Pro Display",
          "-apple-system",
          "Segoe UI",
          "Inter",
          "system-ui",
          "sans-serif"
        ],
        mono: [
          "SF Mono",
          "SFMono-Regular",
          "JetBrains Mono",
          "IBM Plex Mono",
          "monospace"
        ]
      },
      borderRadius: {
        sm: "4px",
        md: "6px",
        lg: "8px"
      }
    }
  },
  plugins: []
} satisfies Config;
