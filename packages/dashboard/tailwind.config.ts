import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: "#06080c",
        surface: "#0d1117",
        elevated: "#151b24",
        raised: "#1c2333",
        ink: {
          DEFAULT: "#e6edf3",
          2: "#8b949e",
          3: "#525a64",
          4: "#2d333b",
        },
        glow: {
          DEFAULT: "#39ff85",
          dim: "rgba(57, 255, 133, 0.08)",
        },
        coral: {
          DEFAULT: "#ff6b6b",
          dim: "rgba(255, 107, 107, 0.08)",
        },
        amber: {
          DEFAULT: "#ffb224",
          dim: "rgba(255, 178, 36, 0.08)",
        },
        steel: {
          DEFAULT: "#5a8a9a",
          dim: "rgba(90, 138, 154, 0.08)",
        },
      },
      fontFamily: {
        display: ["Space Grotesk", "system-ui", "sans-serif"],
        sans: ["Source Sans 3", "system-ui", "sans-serif"],
        mono: ["DM Mono", "monospace"],
      },
      borderColor: {
        DEFAULT: "rgba(139, 148, 158, 0.06)",
        emphasis: "rgba(139, 148, 158, 0.12)",
      },
    },
  },
  plugins: [],
};

export default config;
