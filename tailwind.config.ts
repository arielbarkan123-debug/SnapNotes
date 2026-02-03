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
        aurora: {
          violet: 'var(--aurora-violet)',
          'violet-light': 'var(--aurora-violet-light)',
          'violet-dark': 'var(--aurora-violet-dark)',
          rose: 'var(--aurora-rose)',
          sky: 'var(--aurora-sky)',
          amber: 'var(--aurora-amber)',
          green: 'var(--aurora-green)',
        },
      },
      borderRadius: {
        'card': '22px',
      },
      boxShadow: {
        'card': 'var(--card-shadow)',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'var(--font-rubik)', 'system-ui', 'sans-serif'],
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
