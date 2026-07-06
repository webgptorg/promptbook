import { NextResponse } from 'next/server';
import {
    resolveShibbolethAuthenticationConfiguration,
    resolveShibbolethPublicRequestUrl,
} from '../../../../../utils/shibbolethAuthentication';

/**
 * Handles get.
 */
export async function GET(request: Request) {
    const configuration = await resolveShibbolethAuthenticationConfiguration({
        requestUrl: resolveShibbolethPublicRequestUrl(request),
        isIdentityProviderMetadataValidationEnabled: false,
    });

    return NextResponse.json({
        isActive: configuration.isActive,
        isConfigured: configuration.isConfigured,
    });
}
