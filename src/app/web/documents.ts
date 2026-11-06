import type { Actor } from './access.js';

/**
 * Escapes text for HTML element content and attribute values.
 */
function escapeHtml(text: string): string {
    return text.replace(/[&<>"']/g, (character) => `&#${String(character.charCodeAt(0))};`);
}

/**
 * The engine's own page for a signed-in member while no verified engine UI bundle is installed: who is signed in, the
 * engine and the way to the API, under `ENGINE_UI_CSP` (no script, no inline style). Non-document requests get 404.
 *
 * @private App web origin
 */
export function engineHomePage(request: Request, actor: Actor, engine: { readonly name: string; readonly engineId?: string; readonly uiProblem?: string }): Response {
    const url = new URL(request.url);
    if (request.method !== 'GET' && request.method !== 'HEAD') return new Response(null, { status: 405, headers: { allow: 'GET, HEAD' } });
    if (url.pathname !== '/' && !(request.headers.get('accept') ?? '').includes('text/html')) return new Response('Not found\n', { status: 404, headers: { 'content-type': 'text/plain; charset=utf-8' } });
    const body = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(engine.name)} · Promptbook engine</title>
</head>
<body>
<main>
<h1>${escapeHtml(engine.name)}</h1>
<p>You are signed in to this Promptbook engine as <strong>${escapeHtml(actor.displayName)}</strong> (${escapeHtml(actor.role)}).</p>
<p>${escapeHtml(engine.uiProblem ?? 'The engine UI is not installed yet; the engine keeps working and serves its API.')}</p>
${engine.engineId ? `<p>Engine ID: <code>${escapeHtml(engine.engineId)}</code></p>` : ''}
<p><a href="/api/v1/engine">Engine information</a> · <a href="/api/v1/me">Your access</a></p>
<form method="post" action="/auth/sign-out"><button type="submit">Sign out</button></form>
</main>
</body>
</html>
`;
    return new Response(request.method === 'HEAD' ? null : body, { status: 200, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
}
