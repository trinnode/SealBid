import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          ink: "#182028",
          slate: "#45505D",
          sand: "#F1EBDD",
          clay: "#C6754D",
          pine: "#2E5A58",
        },
      },
      boxShadow: {
        card: "0 20px 50px -30px rgba(14, 23, 31, 0.45)",
      },
      backgroundImage: {
        grain:
          "radial-gradient(circle at 1px 1px, rgba(0,0,0,0.08) 1px, transparent 0)",
      },
    },
  },
  plugins: [],
};

export default config;
