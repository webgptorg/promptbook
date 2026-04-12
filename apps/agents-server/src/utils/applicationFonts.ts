import { Barlow_Condensed, Poppins } from 'next/font/google';

/**
 * Shared Barlow Condensed font variable used across app-router and pages-router shells.
 */
const barlowCondensed = Barlow_Condensed({
    subsets: ['latin'],
    weight: ['300', '400', '500', '600', '700'],
    display: 'swap',
    fallback: ['Arial', 'Helvetica', 'sans-serif'],
    variable: '--font-barlow-condensed',
});

/**
 * Shared Poppins font variable used across app-router and pages-router shells.
 */
const poppins = Poppins({
    subsets: ['latin'],
    weight: ['400', '500', '600', '700', '800'],
    display: 'swap',
    fallback: ['Arial', 'Helvetica', 'sans-serif'],
    variable: '--font-poppins',
});

/**
 * Shared font-variable class list applied to branded shells outside the root app layout.
 */
export const APPLICATION_FONT_VARIABLE_CLASS_NAME = `${barlowCondensed.variable} ${poppins.variable}`;
