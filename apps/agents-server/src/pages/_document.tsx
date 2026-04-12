import { Head, Html, Main, NextScript } from 'next/document';
import { APPLICATION_FONT_VARIABLE_CLASS_NAME } from '../utils/applicationFonts';

/**
 * Shared pages-router document used by static fallback routes such as `500`.
 */
export default function LegacyPagesDocument() {
    return (
        <Html lang="en">
            <Head />
            <body className={`${APPLICATION_FONT_VARIABLE_CLASS_NAME} bg-white text-gray-900 antialiased`}>
                <Main />
                <NextScript />
            </body>
        </Html>
    );
}
