import type { Config } from "tailwindcss";
import rtl from "tailwindcss-rtl";

const config: Config = {
  darkMode: 'class',
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      screens: {
        'xs': '375px',  // iPhone SE and larger
        '3xl': '1920px', // Large desktop
      },
    },
  },
  plugins: [rtl],
};
export default config;
