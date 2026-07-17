/**
 * Content types resolved from well-known file extensions of agent project files.
 */
const CONTENT_TYPE_BY_EXTENSION: Record<string, string> = {
    css: 'text/css; charset=utf-8',
    csv: 'text/csv; charset=utf-8',
    gif: 'image/gif',
    htm: 'text/html; charset=utf-8',
    html: 'text/html; charset=utf-8',
    ico: 'image/x-icon',
    jpeg: 'image/jpeg',
    jpg: 'image/jpeg',
    js: 'text/javascript; charset=utf-8',
    json: 'application/json; charset=utf-8',
    md: 'text/markdown; charset=utf-8',
    mjs: 'text/javascript; charset=utf-8',
    mp3: 'audio/mpeg',
    mp4: 'video/mp4',
    pdf: 'application/pdf',
    png: 'image/png',
    svg: 'image/svg+xml',
    txt: 'text/plain; charset=utf-8',
    wasm: 'application/wasm',
    webm: 'video/webm',
    webp: 'image/webp',
    xml: 'application/xml; charset=utf-8',
    yaml: 'text/yaml; charset=utf-8',
    yml: 'text/yaml; charset=utf-8',
    zip: 'application/zip',
};

/**
 * Fallback content type used for unknown project file extensions.
 */
const FALLBACK_CONTENT_TYPE = 'application/octet-stream';

/**
 * Resolves the response content type of one agent project file from its filename.
 *
 * @param fileName - Filename including extension.
 * @returns Matching content type or a binary fallback.
 */
export function resolveAgentProjectFileContentType(fileName: string): string {
    const extension = fileName.toLowerCase().split('.').pop() || '';
    return CONTENT_TYPE_BY_EXTENSION[extension] || FALLBACK_CONTENT_TYPE;
}
