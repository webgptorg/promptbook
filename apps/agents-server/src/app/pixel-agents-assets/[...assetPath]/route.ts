import { existsSync } from 'fs';
import { readFile } from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';

/**
 * Ensures this route runs in the Node.js runtime where filesystem access is available.
 */
export const runtime = 'nodejs';

/**
 * Relative path from package root to the bundled webview assets directory.
 */
const PIXEL_AGENTS_ASSETS_SUBPATH = path.join(
    'dist',
    'webview',
    'assets',
);

/**
 * Candidate installation roots where `pixel-agents` can be located in this monorepo setup.
 */
const PIXEL_AGENTS_PACKAGE_ROOT_CANDIDATES = [
    path.resolve(process.cwd(), 'node_modules', 'pixel-agents'),
    path.resolve(process.cwd(), '..', '..', 'node_modules', 'pixel-agents'),
];

/**
 * MIME types used by the lightweight asset proxy.
 */
const CONTENT_TYPE_BY_EXTENSION: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.json': 'application/json; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.ttf': 'font/ttf',
};

/**
 * Typed route params for catch-all asset path segments.
 */
type PixelAgentsAssetRouteParams = {
    assetPath: string[];
};

/**
 * Locates the absolute root directory that contains Pixel Agents assets.
 *
 * @returns Absolute assets root path or null when package is not installed.
 */
function resolvePixelAgentsAssetsRoot(): string | null {
    for (const packageRootCandidate of PIXEL_AGENTS_PACKAGE_ROOT_CANDIDATES) {
        const assetsRootCandidate = path.join(packageRootCandidate, PIXEL_AGENTS_ASSETS_SUBPATH);
        if (existsSync(assetsRootCandidate)) {
            return assetsRootCandidate;
        }
    }

    return null;
}

/**
 * Normalizes one catch-all route path into a safe relative file path.
 *
 * @param pathSegments - Catch-all path segments.
 * @returns Safe normalized relative path or null when invalid.
 */
function normalizeSafeRelativePath(pathSegments: ReadonlyArray<string>): string | null {
    if (pathSegments.length === 0) {
        return null;
    }

    const normalizedPath = path.posix.normalize(pathSegments.join('/'));
    if (normalizedPath.startsWith('../') || normalizedPath === '..' || normalizedPath.includes('/../')) {
        return null;
    }

    return normalizedPath;
}

/**
 * Resolves a file content-type from its extension.
 *
 * @param filePath - Absolute file path to serve.
 * @returns MIME type header value.
 */
function resolveContentType(filePath: string): string {
    const extension = path.extname(filePath).toLowerCase();
    return CONTENT_TYPE_BY_EXTENSION[extension] || 'application/octet-stream';
}

/**
 * Loads one asset file from Pixel Agents package data.
 *
 * @param relativePath - Normalized relative asset path under the package assets root.
 * @returns Binary payload and content type.
 */
async function loadPixelAgentsAsset(relativePath: string): Promise<{ data: Buffer; contentType: string } | null> {
    const assetsRoot = resolvePixelAgentsAssetsRoot();
    if (!assetsRoot) {
        return null;
    }

    const absolutePath = path.resolve(assetsRoot, relativePath);
    const normalizedRoot = `${assetsRoot}${path.sep}`;
    if (!absolutePath.startsWith(normalizedRoot)) {
        return null;
    }

    try {
        const data = await readFile(absolutePath);
        return {
            data,
            contentType: resolveContentType(absolutePath),
        };
    } catch {
        return null;
    }
}

/**
 * Proxies selected Pixel Agents assets so the homepage pixel-office view can reuse package sprites.
 */
export async function GET(
    _request: Request,
    { params }: { params: Promise<PixelAgentsAssetRouteParams> },
): Promise<NextResponse> {
    const { assetPath } = await params;
    const relativePath = normalizeSafeRelativePath(assetPath);
    if (!relativePath) {
        return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    const asset = await loadPixelAgentsAsset(relativePath);
    if (!asset) {
        return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    return new NextResponse(asset.data, {
        status: 200,
        headers: {
            'Content-Type': asset.contentType,
            'Cache-Control': 'public, max-age=3600',
        },
    });
}
