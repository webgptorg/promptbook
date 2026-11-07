import { readFile } from 'node:fs/promises';

/**
 * Minimal first-run page shipped with the engine. It uses the signed UI's authenticated API contract
 * while a verified App bundle is unavailable.
 *
 * @private App web origin
 */
export async function onboardingPage(request: Request): Promise<Response | undefined> {
    if (!['GET', 'HEAD'].includes(request.method)) return undefined;
    const path = new URL(request.url).pathname;
    const headers = { 'cache-control': 'no-store' };
    if (path === '/_ptbk/onboarding.js') {
        const script = request.method === 'HEAD' ? null : await readFile(new URL('./onboarding-browser.js', import.meta.url), 'utf8');
        return new Response(script, { headers: { ...headers, 'content-type': 'text/javascript; charset=utf-8' } });
    }
    if (path !== '/' && path !== '/onboarding') return undefined;
    const html = '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
        '<meta name="viewport" content="width=device-width, initial-scale=1">' +
        '<title>Project initialization · Promptbook</title><script type="module" src="/_ptbk/onboarding.js"></script></head>' +
        '<body><header><p>Promptbook</p></header><main><p>Loading project initialization…</p></main></body></html>';
    return new Response(request.method === 'HEAD' ? null : html, { headers: { ...headers, 'content-type': 'text/html; charset=utf-8' } });
}
