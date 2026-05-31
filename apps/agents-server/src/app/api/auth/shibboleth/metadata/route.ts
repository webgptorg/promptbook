import { NextRequest, NextResponse } from 'next/server';
import {
    createShibbolethServiceProviderMetadata,
    loadShibbolethConfiguration,
    logShibbolethAuthenticationEvent,
} from '../../../../../utils/shibbolethAuthentication';

/**
 * Forces this route to run in Node.js because node-saml metadata generation depends on Node APIs.
 */
export const runtime = 'nodejs';

/**
 * Handles get.
 */
export async function GET(request: NextRequest) {
    const configuration = await loadShibbolethConfiguration(request);

    if (!configuration.isEnabled || !configuration.issuer || !configuration.callbackUrl) {
        logShibbolethAuthenticationEvent('metadata_rejected_disabled');
        return NextResponse.json({ error: 'Shibboleth authentication is not enabled.' }, { status: 404 });
    }

    const metadataXml = createShibbolethServiceProviderMetadata({
        issuer: configuration.issuer,
        callbackUrl: configuration.callbackUrl,
    });

    logShibbolethAuthenticationEvent('metadata_served', {
        issuer: configuration.issuer,
        callbackUrl: configuration.callbackUrl,
    });

    return new NextResponse(metadataXml, {
        headers: {
            'Content-Type': 'application/samlmetadata+xml; charset=utf-8',
            'Cache-Control': 'no-store',
        },
    });
}
