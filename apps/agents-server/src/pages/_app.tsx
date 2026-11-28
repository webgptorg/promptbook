import type { AppProps } from 'next/app';
import '../app/globals.css';

/**
 * Shared pages-router app shell used for special fallback routes such as `500`.
 */
export default function LegacyPagesApp({ Component, pageProps }: AppProps) {
    return <Component {...pageProps} />;
}
