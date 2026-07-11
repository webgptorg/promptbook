import type { Config } from 'tailwindcss';

/**
 * Map of config.
 *
 * Note: Color values come from the official Promptbook branding, see https://www.ptbk.io/branding
 *       and [`specs/design.md`](./specs/design.md)
 */
const config: Config = {
    content: [
        './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
        './src/components/**/*.{js,ts,jsx,tsx,mdx}',
        './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['var(--font-inter)', 'Arial', 'Helvetica', 'sans-serif'],
                display: ['var(--font-outfit)', 'Arial', 'Helvetica', 'sans-serif'],
                mono: ['var(--font-jetbrains-mono)', 'Courier New', 'monospace'],
            },
            colors: {
                'promptbook-blue': '#7AEBFF',
                'promptbook-blue-dark': '#30A8BD',
                'promptbook-green': '#7AFFEB',
                'promptbook-green-dark': '#30BDA8',
                'promptbook-dark-gray': '#111827',
                'promptbook-light-gray': '#F3F4F6',
            },
        },
    },
    plugins: [],
};

export default config;
