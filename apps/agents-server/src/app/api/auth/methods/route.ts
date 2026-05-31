import { NextResponse } from 'next/server';
import {
    AUTHENTICATION_METHODS_METADATA_KEY,
    parseAuthenticationMethods,
} from '../../../../constants/authenticationMethods';
import {
    DEFAULT_SHIBBOLETH_PROVIDER_LABEL,
    SHIBBOLETH_PROVIDER_LABEL_METADATA_KEY,
} from '../../../../constants/shibbolethAuthentication';
import { getMetadataMap } from '../../../../database/getMetadata';

/**
 * Handles get.
 */
export async function GET() {
    try {
        const metadata = await getMetadataMap([
            AUTHENTICATION_METHODS_METADATA_KEY,
            SHIBBOLETH_PROVIDER_LABEL_METADATA_KEY,
        ]);
        const methods = parseAuthenticationMethods(metadata[AUTHENTICATION_METHODS_METADATA_KEY]);

        return NextResponse.json({
            methods,
            shibboleth: {
                isEnabled: methods.includes('SHIBBOLETH'),
                providerLabel:
                    metadata[SHIBBOLETH_PROVIDER_LABEL_METADATA_KEY]?.trim() || DEFAULT_SHIBBOLETH_PROVIDER_LABEL,
                loginUrl: '/api/auth/shibboleth/login',
            },
        });
    } catch (error) {
        console.error('Failed to load authentication methods:', error);

        return NextResponse.json({
            methods: ['PASSWORD'],
            shibboleth: {
                isEnabled: false,
                providerLabel: DEFAULT_SHIBBOLETH_PROVIDER_LABEL,
                loginUrl: '/api/auth/shibboleth/login',
            },
        });
    }
}
