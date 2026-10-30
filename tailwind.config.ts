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
        sheet: "#F8FAFC",
        canvas: "#FFFFFF",
        royal: {
          DEFAULT: "#2563EB",
          50: "#EFF6FF",
          100: "#DBEAFE",
          200: "#BFDBFE",
          500: "#3B82F6",
          600: "#2563EB",
          700: "#1D4ED8",
          800: "#1E40AF",
          hover: "#1D4ED8",
          light: "#EFF6FF",
        },
        alert: {
          DEFAULT: "#FBBF24",
          hover: "#F59E0B",
          light: "#FEF3C7",
          text: "#92400E",
          border: "#FCD34D",
        },
        brand: {
          50: "#EFF6FF",
          100: "#DBEAFE",
          200: "#BFDBFE",
          300: "#93C5FD",
          400: "#60A5FA",
          500: "#3B82F6",
          600: "#2563EB",
          700: "#1D4ED8",
          800: "#1E40AF",
          900: "#0F172A",
          950: "#020617",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "'Inter'", "system-ui", "-apple-system", "sans-serif"],
        display: ["var(--font-sans)", "'Inter'", "system-ui", "-apple-system", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
