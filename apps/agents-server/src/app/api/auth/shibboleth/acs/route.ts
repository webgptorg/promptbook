import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import {
    createShibbolethSamlClient,
    findOrCreateShibbolethUser,
    getShibbolethRequestDetails,
    recordShibbolethAuthenticationAttempt,
    resolveShibbolethAuthenticationConfiguration,
    sanitizeShibbolethRelayState,
} from '../../../../../utils/shibbolethAuthentication';
import { setSession } from '../../../../../utils/session';

/**
 * Handles post.
 */
export async function POST(request: Request) {
    const requestDetails = getShibbolethRequestDetails(request);
    let relayState = '/';

    try {
        const formData = await request.formData();
        const samlResponse = formData.get('SAMLResponse');
        relayState = sanitizeShibbolethRelayState(formData.get('RelayState')?.toString());

        if (typeof samlResponse !== 'string' || !samlResponse) {
            await recordShibbolethAuthenticationAttempt({
                stage: 'ASSERTION_CONSUMER_SERVICE',
                status: 'FAILED',
                requestDetails,
                relayState,
                errorMessage: 'Missing SAMLResponse.',
            });
            return NextResponse.json({ error: 'Missing SAMLResponse.' }, { status: 400 });
        }

        const configuration = await resolveShibbolethAuthenticationConfiguration({
            requestUrl: request.url,
            isIdentityProviderMetadataValidationEnabled: true,
        });

        if (!configuration.isActive) {
            await recordShibbolethAuthenticationAttempt({
                stage: 'ASSERTION_CONSUMER_SERVICE',
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
                stage: 'ASSERTION_CONSUMER_SERVICE',
                status: 'FAILED',
                requestDetails,
                relayState,
                errorMessage,
            });
            return NextResponse.json({ error: errorMessage }, { status: 503 });
        }

        const saml = createShibbolethSamlClient(configuration);
        const { profile } = await saml.validatePostResponseAsync({ SAMLResponse: samlResponse });

        if (!profile) {
            await recordShibbolethAuthenticationAttempt({
                stage: 'ASSERTION_CONSUMER_SERVICE',
                status: 'FAILED',
                requestDetails,
                relayState,
                errorMessage: 'Shibboleth response did not include a user profile.',
            });
            return NextResponse.json({ error: 'Shibboleth response did not include a user profile.' }, { status: 401 });
        }

        const linkedUser = await findOrCreateShibbolethUser(profile);
        await setSession({
            username: linkedUser.user.username,
            isAdmin: linkedUser.user.isAdmin,
            isGlobalAdmin: false,
        });
        revalidatePath('/', 'layout');

        await recordShibbolethAuthenticationAttempt({
            stage: 'ASSERTION_CONSUMER_SERVICE',
            status: 'SUCCESS',
            requestDetails,
            relayState,
            userId: linkedUser.user.id,
            email: linkedUser.profileAttributes.email,
            displayName: linkedUser.profileAttributes.displayName,
            nameId: linkedUser.profileAttributes.nameId,
            rawAttributes: linkedUser.profileAttributes.rawAttributes,
        });

        return NextResponse.redirect(new URL(relayState, request.url), 303);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to finish Shibboleth authentication.';
        await recordShibbolethAuthenticationAttempt({
            stage: 'ASSERTION_CONSUMER_SERVICE',
            status: 'FAILED',
            requestDetails,
            relayState,
            errorMessage,
        });

        console.error('Shibboleth assertion consumer service error:', error);
        return NextResponse.json({ error: errorMessage }, { status: 401 });
    }
}
