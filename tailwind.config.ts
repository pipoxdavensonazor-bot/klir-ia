import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        klir: {
          primary: "#004F6E",
          accent: "#D4AF37",
          dark: "#003548",
          light: "#E8F4F8",
          canvas: "#F0F7FA",
          ink: "#0C2A36",
        },
      },
      fontFamily: {
        sans: ["var(--font-dm-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-syne)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
