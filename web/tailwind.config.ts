import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        sand: "#f3efe6",
        ink: "#12263a",
        coral: "#f26b5b",
        mint: "#57cc99"
      }
    }
  },
  plugins: []
};

export default config;
