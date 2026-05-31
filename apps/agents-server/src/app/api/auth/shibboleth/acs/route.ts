import { NextRequest, NextResponse } from 'next/server';
import { setSession } from '../../../../../utils/session';
import {
    createShibbolethProfileLogDetails,
    createShibbolethSamlClient,
    loadShibbolethConfiguration,
    logShibbolethAuthenticationEvent,
    resolveSafeShibbolethRelayState,
    resolveShibbolethUser,
    ShibbolethConfigurationError,
} from '../../../../../utils/shibbolethAuthentication';

/**
 * Forces this route to run in Node.js because node-saml depends on Node crypto/zlib APIs.
 */
export const runtime = 'nodejs';

/**
 * Handles post.
 */
export async function POST(request: NextRequest) {
    const configuration = await loadShibbolethConfiguration(request);

    if (!configuration.isEnabled) {
        logShibbolethAuthenticationEvent('acs_rejected_disabled');
        return NextResponse.json({ error: 'Shibboleth authentication is not enabled.' }, { status: 404 });
    }

    if (!configuration.isConfigured) {
        const error = new ShibbolethConfigurationError(configuration.missingConfiguration);
        logShibbolethAuthenticationEvent('acs_rejected_incomplete_configuration', {
            missingConfiguration: configuration.missingConfiguration,
        });
        return NextResponse.json({ error: error.message }, { status: 503 });
    }

    try {
        const formData = await request.formData();
        const samlResponse = formData.get('SAMLResponse');
        const relayState = resolveSafeShibbolethRelayState(
            typeof formData.get('RelayState') === 'string' ? String(formData.get('RelayState')) : null,
        );

        if (typeof samlResponse !== 'string' || samlResponse.trim() === '') {
            logShibbolethAuthenticationEvent('acs_rejected_missing_saml_response');
            return NextResponse.json({ error: 'Missing SAMLResponse.' }, { status: 400 });
        }

        logShibbolethAuthenticationEvent('acs_response_received', {
            relayState,
            responseLength: samlResponse.length,
        });

        const saml = createShibbolethSamlClient(configuration);
        const { profile } = await saml.validatePostResponseAsync({
            SAMLResponse: samlResponse,
            RelayState: relayState,
        });

        if (!profile) {
            logShibbolethAuthenticationEvent('acs_rejected_empty_profile');
            return NextResponse.json({ error: 'Shibboleth did not return a user profile.' }, { status: 401 });
        }

        logShibbolethAuthenticationEvent(
            'acs_profile_validated',
            createShibbolethProfileLogDetails(profile, configuration.usernameAttribute),
        );

        const user = await resolveShibbolethUser(profile, configuration);
        await setSession({
            username: user.username,
            isAdmin: user.isAdmin,
            isGlobalAdmin: false,
        });

        logShibbolethAuthenticationEvent('acs_session_created', {
            username: user.username,
            isAdmin: user.isAdmin,
            isNewUser: user.isNewUser,
            relayState,
        });

        return NextResponse.redirect(new URL(relayState, request.url), 303);
    } catch (error) {
        logShibbolethAuthenticationEvent('acs_failed', {
            error: error instanceof Error ? error.message : String(error),
        });

        return NextResponse.json({ error: 'Shibboleth authentication failed.' }, { status: 401 });
    }
}
