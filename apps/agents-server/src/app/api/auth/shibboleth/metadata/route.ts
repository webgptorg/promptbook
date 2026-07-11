import { NextResponse } from 'next/server';
import {
    createShibbolethServiceProviderMetadataXml,
    resolveShibbolethPublicRequestUrl,
} from '../../../../../utils/shibbolethAuthentication';

/**
 * Handles get.
 */
export async function GET(request: Request) {
    const metadataXml = await createShibbolethServiceProviderMetadataXml(resolveShibbolethPublicRequestUrl(request));

    return new NextResponse(metadataXml, {
        headers: {
            'Content-Type': 'application/samlmetadata+xml; charset=utf-8',
        },
    });
}
