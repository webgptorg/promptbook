import JSZip from 'jszip';
import type { Readable } from 'node:stream';

/** Bound compressed input and streamed JSON expansion of a historical BookC archive. */
export const MAX_BOOKC_BYTES = 4 * 1024 * 1024;

/** Read the legacy JSON entry without extracting files or executing archive contents. */
export async function readBookc(bytes: Uint8Array): Promise<string> {
    if (bytes.byteLength > MAX_BOOKC_BYTES) throw new Error('The legacy archive exceeds the 4 MiB preview limit.');
    const zip = await JSZip.loadAsync(bytes);
    const entry = zip.file('index.book.json');
    if (!entry) throw new Error('No index.book.json in this legacy .bookc archive.');
    const text = await new Promise<string>((resolve, reject) => {
        const chunks: Buffer[] = [];
        let size = 0;
        // JSZip declares only ReadableStream, although its Node stream implements destroy().
        const stream = entry.nodeStream() as Readable;
        stream.on('data', (chunk: Buffer) => {
            size += chunk.length;
            if (size > MAX_BOOKC_BYTES) {
                reject(new Error('The expanded index exceeds the 4 MiB preview limit.'));
                stream.destroy();
            } else chunks.push(chunk);
        });
        stream.once('error', reject);
        stream.once('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    });
    return JSON.stringify(JSON.parse(text), null, 2);
}

/** Escape all archive content and render it in a script-free, network-free preview. */
export function previewHtml(title: string, content: string): string {
    const entities: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    const escape = (text: string) => text.replace(/[&<>"']/g, (char) => entities[char]!);
    return `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'"><title>Legacy BookC</title><style>body{font-family:var(--vscode-font-family);color:var(--vscode-editor-foreground);background:var(--vscode-editor-background);padding:20px}pre{white-space:pre-wrap;overflow-wrap:anywhere}</style></head><body><h1>${escape(title)}</h1><p>Legacy compiled Book archive. Edit the corresponding .book source.</p><pre>${escape(content)}</pre></body></html>`;
}
