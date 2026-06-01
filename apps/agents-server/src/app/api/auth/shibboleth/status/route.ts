import { NextResponse } from 'next/server';
import { resolveShibbolethAuthenticationConfiguration } from '../../../../../utils/shibbolethAuthentication';

/**
 * Handles get.
 */
export async function GET(request: Request) {
    const configuration = await resolveShibbolethAuthenticationConfiguration({
        requestUrl: request.url,
        isIdentityProviderMetadataValidationEnabled: false,
    });

    return NextResponse.json({
        isActive: configuration.isActive,
        isConfigured: configuration.isConfigured,
    });
}
