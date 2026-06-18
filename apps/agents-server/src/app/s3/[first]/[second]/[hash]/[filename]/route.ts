import { NextRequest, NextResponse } from 'next/server';
import {
    $provideCdnForServer,
    resolveCdnPublicUrlForServer,
} from '../../../../../../tools/$provideCdnForServer';
import { $provideServer } from '../../../../../../tools/$provideServer';

/**
 * Serves files stored under the hash-based CDN key format:
 * `{hash[0]}/{hash[1]}/{sha256-hash}/{filename}`
 *
 * This route is reached when nginx routes a request matching
 * `^/s3/[0-9a-f]/[0-9a-f]/[0-9a-f]{64}/` to Next.js instead of VersityGW,
 * which keeps the internal S3 bucket and path prefix hidden from the public URL.
 *
 * [✨🏣] Companion route for `getUserFileCdnKey` and the `publicCdnBaseUrl`
 * configuration in `$provideCdnForServer`.
 */
export async function GET(
    _request: NextRequest,
    {
        params,
    }: {
        params: Promise<{
            first: string;
            second: string;
            hash: string;
            filename: string;
        }>;
    },
) {
    const { first, second, hash, filename } = await params;
    const key = `${first}/${second}/${hash}/${filename}`;

    const providedServer = await $provideServer();
    const cdn = $provideCdnForServer({
        cdnPublicUrl: resolveCdnPublicUrlForServer(providedServer.publicUrl),
    });

    const file = await cdn.getItem(key);

    if (!file) {
        return new NextResponse(null, { status: 404 });
    }

    return new NextResponse(file.data, {
        headers: {
            'Content-Type': file.type,
            'Cache-Control': 'public, max-age=31536000, immutable',
        },
    });
}
