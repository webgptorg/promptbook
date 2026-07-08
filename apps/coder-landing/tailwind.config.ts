import type { Config } from 'tailwindcss';

/**
 * Tailwind configuration for the ptbk coder landing page.
 */
const TAILWIND_CONFIG: Config = {
    content: [
        './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
        './src/components/**/*.{js,ts,jsx,tsx,mdx}',
        './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
        extend: {},
    },
    plugins: [],
};

export default TAILWIND_CONFIG;
