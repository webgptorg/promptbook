import { NextRequest, NextResponse } from 'next/server';
import {
    createShibbolethSamlClient,
    loadShibbolethConfiguration,
    logShibbolethAuthenticationEvent,
    resolveSafeShibbolethRelayState,
    ShibbolethConfigurationError,
} from '../../../../../utils/shibbolethAuthentication';

/**
 * Forces this route to run in Node.js because node-saml depends on Node crypto/zlib APIs.
 */
export const runtime = 'nodejs';

/**
 * Handles get.
 */
export async function GET(request: NextRequest) {
    const configuration = await loadShibbolethConfiguration(request);

    if (!configuration.isEnabled) {
        logShibbolethAuthenticationEvent('login_rejected_disabled');
        return NextResponse.json({ error: 'Shibboleth authentication is not enabled.' }, { status: 404 });
    }

    if (!configuration.isConfigured) {
        const error = new ShibbolethConfigurationError(configuration.missingConfiguration);
        logShibbolethAuthenticationEvent('login_rejected_incomplete_configuration', {
            missingConfiguration: configuration.missingConfiguration,
        });
        return NextResponse.json({ error: error.message }, { status: 503 });
    }

    const relayState = resolveSafeShibbolethRelayState(request.nextUrl.searchParams.get('redirectTo'));
    const saml = createShibbolethSamlClient(configuration);
    const redirectUrl = await saml.getAuthorizeUrlAsync(relayState, undefined, {});

    logShibbolethAuthenticationEvent('login_redirect_created', {
        issuer: configuration.issuer,
        callbackUrl: configuration.callbackUrl,
        entryPoint: configuration.entryPoint,
        relayState,
    });

    return NextResponse.redirect(redirectUrl);
}
