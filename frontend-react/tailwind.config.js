/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: "class",
    theme: {
        extend: {
            colors: {
                primary: "#6366f1",
                secondary: "#ec4899",
                "background-light": "#f3f4f6",
                "background-dark": "#0f172a",
                "surface-light": "#ffffff",
                "surface-dark": "#1e293b",
                "border-light": "#e2e8f0",
                "border-dark": "#334155",
                "text-secondary": "#94a3b8",
            },
            fontFamily: {
                "display": ["Spline Sans", "Noto Sans", "sans-serif"],
                "body": ["Spline Sans", "Noto Sans", "sans-serif"],
            },
            borderRadius: { "DEFAULT": "0.25rem", "lg": "0.5rem", "xl": "0.75rem", "2xl": "1rem", "full": "9999px" },
        },
    },
    plugins: [],
}
