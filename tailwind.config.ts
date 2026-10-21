import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0f4f8",
          100: "#d9e2ec",
          200: "#bcccdc",
          300: "#9fb3c8",
          400: "#829ab1",
          500: "#627d98",
          600: "#486581",
          700: "#334e68",
          800: "#243b53",
          900: "#102a43",
          950: "#0b1d30",
        },
        navy: {
          800: "#1e293b",
          900: "#0f172a",
          950: "#0a0f1d",
        },
        teal: {
          500: "#14b8a6",
          600: "#0d9488",
          700: "#0f766e",
        },
        sand: {
          50: "#fbfbf9",
          100: "#f5f5f0",
          200: "#e8e8df",
          300: "#d6d6c7",
        }
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "-apple-system", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
