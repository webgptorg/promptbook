import { NextResponse } from 'next/server';
import { createShibbolethServiceProviderMetadataXml } from '../../../../../utils/shibbolethAuthentication';

/**
 * Handles get.
 */
export async function GET(request: Request) {
    const metadataXml = await createShibbolethServiceProviderMetadataXml(request.url);

    return new NextResponse(metadataXml, {
        headers: {
            'Content-Type': 'application/samlmetadata+xml; charset=utf-8',
        },
    });
}
