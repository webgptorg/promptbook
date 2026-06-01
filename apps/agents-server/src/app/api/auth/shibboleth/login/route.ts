import { NextResponse } from 'next/server';
import {
    createShibbolethSamlClient,
    getShibbolethRequestDetails,
    recordShibbolethAuthenticationAttempt,
    resolveShibbolethAuthenticationConfiguration,
    sanitizeShibbolethRelayState,
} from '../../../../../utils/shibbolethAuthentication';

/**
 * Handles get.
 */
export async function GET(request: Request) {
    const requestDetails = getShibbolethRequestDetails(request);
    const relayState = sanitizeShibbolethRelayState(new URL(request.url).searchParams.get('returnTo'));

    try {
        const configuration = await resolveShibbolethAuthenticationConfiguration({
            requestUrl: request.url,
            isIdentityProviderMetadataValidationEnabled: true,
        });

        if (!configuration.isActive) {
            await recordShibbolethAuthenticationAttempt({
                stage: 'LOGIN_REQUEST',
                status: 'REJECTED',
                requestDetails,
                relayState,
                errorMessage: 'Shibboleth authentication is not active.',
            });
            return NextResponse.json({ error: 'Shibboleth authentication is not active.' }, { status: 404 });
        }

        if (!configuration.isConfigured) {
            const errorMessage = configuration.errors.join(' ');
            await recordShibbolethAuthenticationAttempt({
                stage: 'LOGIN_REQUEST',
                status: 'FAILED',
                requestDetails,
                relayState,
                errorMessage,
            });
            return NextResponse.json({ error: errorMessage }, { status: 503 });
        }

        const saml = createShibbolethSamlClient(configuration);
        const authorizeUrl = await saml.getAuthorizeUrlAsync(relayState, undefined, {});

        await recordShibbolethAuthenticationAttempt({
            stage: 'LOGIN_REQUEST',
            status: 'REDIRECTED',
            requestDetails,
            relayState,
        });

        return NextResponse.redirect(authorizeUrl);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to start Shibboleth authentication.';
        await recordShibbolethAuthenticationAttempt({
            stage: 'LOGIN_REQUEST',
            status: 'FAILED',
            requestDetails,
            relayState,
            errorMessage,
        });

        console.error('Shibboleth login start error:', error);
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
