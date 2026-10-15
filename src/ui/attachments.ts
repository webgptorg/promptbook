import { copyFile, mkdir, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { shortId } from '../common/ids.js';
import { runProcess } from '../common/process.js';
import type { ComposedSegment } from './composer.js';

/**
 * Extensions treated as images.
 */
const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.svg', '.heic', '.tif', '.tiff']);

/**
 * Largest accepted attachment; larger files are rejected explicitly (never silently truncated).
 *
 * @private composer attachments
 */
export const MAX_ATTACHMENT_BYTES = 50 * 1024 * 1024;

/**
 * Whether a file name looks like an image.
 *
 * @private composer attachments
 */
export function isImagePath(path: string): boolean {
    return IMAGE_EXTENSIONS.has(extname(path).toLowerCase());
}

/**
 * Interprets pasted text as a dropped/pasted file path (terminals paste paths for dragged files).
 *
 * Returns the existing file, or `undefined` when the text is ordinary text.
 *
 * @private composer attachments
 */
export async function droppedFile(text: string): Promise<{ path: string; bytes: number } | undefined> {
    let candidate = text.trim();
    if (!candidate || candidate.includes('\n') || candidate.length > 4096) return undefined;
    if ((candidate.startsWith("'") && candidate.endsWith("'")) || (candidate.startsWith('"') && candidate.endsWith('"'))) candidate = candidate.slice(1, -1);
    if (candidate.startsWith('file://')) {
        try {
            candidate = fileURLToPath(candidate);
        } catch {
            return undefined;
        }
    } else if (process.platform !== 'win32') candidate = candidate.replace(/\\(.)/g, '$1');
    if (!/^([/~]|[A-Za-z]:[\\/]|\\\\)/.test(candidate)) return undefined;
    if (candidate.startsWith('~')) candidate = join(process.env.HOME ?? process.env.USERPROFILE ?? '', candidate.slice(1));
    try {
        const stats = await stat(candidate);
        return stats.isFile() ? { path: candidate, bytes: stats.size } : undefined;
    } catch {
        return undefined;
    }
}

/**
 * Reads an image from the system clipboard where the platform exposes it, into a temporary file.
 *
 * @private composer attachments
 */
export async function clipboardImage(env: NodeJS.ProcessEnv = process.env): Promise<{ path: string; bytes: number } | { problem: string }> {
    const directory = join(tmpdir(), `ptbk-clipboard-${process.pid}`);
    await mkdir(directory, { recursive: true });
    const path = join(directory, `clipboard-${shortId(6)}.png`);
    let result;
    if (process.platform === 'darwin') {
        const script = `set imageData to the clipboard as «class PNGf»\nset fileRef to open for access POSIX file "${path}" with write permission\nwrite imageData to fileRef\nclose access fileRef`;
        result = await runProcess('osascript', ['-e', script], { cwd: directory, env, timeoutMs: 10_000 });
    } else if (process.platform === 'win32') {
        const script = `Add-Type -AssemblyName System.Windows.Forms; $image = [System.Windows.Forms.Clipboard]::GetImage(); if ($image -eq $null) { exit 3 }; $image.Save('${path.replace(/'/g, "''")}', [System.Drawing.Imaging.ImageFormat]::Png)`;
        result = await runProcess('powershell', ['-NoProfile', '-STA', '-Command', script], { cwd: directory, env, timeoutMs: 15_000 });
    } else if (env.WAYLAND_DISPLAY) {
        result = await runProcess('sh', ['-c', `wl-paste --type image/png > "${path}"`], { cwd: directory, env, timeoutMs: 10_000 });
    } else if (env.DISPLAY) {
        result = await runProcess('sh', ['-c', `xclip -selection clipboard -t image/png -o > "${path}"`], { cwd: directory, env, timeoutMs: 10_000 });
    } else {
        return { problem: 'This terminal session has no clipboard access (no display). Attach the image by its file path with Ctrl+O instead.' };
    }
    const bytes = await stat(path).then((stats) => stats.size, () => 0);
    if (result.exitCode !== 0 || bytes === 0) {
        await rm(path, { force: true });
        return { problem: 'The clipboard holds no image (or it cannot be read here). Paste text normally, or attach a file with Ctrl+O.' };
    }
    return { path, bytes };
}

/**
 * Copies attachments next to a document and renders the complete text with relative links at their positions.
 *
 * Pasted text stays verbatim; nothing is summarized. Returns the written files (absolute).
 *
 * @private composer attachments
 */
export async function materializeAttachments(
    segments: readonly ComposedSegment[],
    options: { readonly directory: string; readonly link: (fileName: string) => string },
): Promise<{ text: string; files: string[] }> {
    const files: string[] = [];
    const used = new Set<string>();
    let images = 0;
    let text = '';
    for (const segment of segments) {
        if (segment.type === 'text') {
            text += segment.text;
            continue;
        }
        const extension = extname(segment.name || segment.path).toLowerCase();
        let name = segment.kind === 'image' ? `image-${++images}${extension || '.png'}` : basename(segment.name || segment.path).replace(/[^\w.\- ]+/g, '-');
        for (let counter = 2; used.has(name.toLowerCase()); counter++) name = name.replace(/(\.[^.]*)?$/, `-${counter}$1`);
        used.add(name.toLowerCase());
        await mkdir(options.directory, { recursive: true });
        const target = join(options.directory, name);
        await copyFile(segment.path, target);
        files.push(target);
        const link = options.link(name);
        const href = /[\s()<>]/.test(link) ? `<${link}>` : link;
        text += segment.kind === 'image' ? `![Image ${images}](${href})` : `[${name}](${href})`;
    }
    return { text, files };
}

/**
 * Renders segments for transient use (prompts, answers): attachments as links to their current local paths.
 *
 * @private composer attachments
 */
export function inlineSegments(segments: readonly ComposedSegment[]): string {
    return segments.map((segment) => (segment.type === 'text' ? segment.text : `${segment.kind === 'image' ? '!' : ''}[${segment.name}](<${segment.path}>)`)).join('');
}
