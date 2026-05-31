import { afterEach, describe, expect, it } from '@jest/globals';
import {
    parseShibbolethIdentityProviderMetadata,
    resolveSafeShibbolethRelayState,
    resolveShibbolethPublicBaseUrl,
} from './shibbolethAuthentication';

const ORIGINAL_NEXT_PUBLIC_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL;

describe('shibboleth authentication helpers', () => {
    afterEach(() => {
        if (ORIGINAL_NEXT_PUBLIC_SITE_URL === undefined) {
            delete process.env.NEXT_PUBLIC_SITE_URL;
        } else {
            process.env.NEXT_PUBLIC_SITE_URL = ORIGINAL_NEXT_PUBLIC_SITE_URL;
        }
    });

    it('parses IdP metadata into entity ID, redirect entrypoint, and PEM certificates', () => {
        const metadata = parseShibbolethIdentityProviderMetadata(`
            <?xml version="1.0"?>
            <md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata"
                xmlns:ds="http://www.w3.org/2000/09/xmldsig#"
                entityID="https://idp.example.test/idp/shibboleth">
                <md:IDPSSODescriptor protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
                    <md:KeyDescriptor use="signing">
                        <ds:KeyInfo>
                            <ds:X509Data>
                                <ds:X509Certificate>MIICtestcertificatevalue</ds:X509Certificate>
                            </ds:X509Data>
                        </ds:KeyInfo>
                    </md:KeyDescriptor>
                    <md:SingleSignOnService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
                        Location="https://idp.example.test/SAML2/POST"/>
                    <md:SingleSignOnService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect"
                        Location="https://idp.example.test/SAML2/Redirect"/>
                </md:IDPSSODescriptor>
            </md:EntityDescriptor>
        `);

        expect(metadata.entityId).toBe('https://idp.example.test/idp/shibboleth');
        expect(metadata.entryPoint).toBe('https://idp.example.test/SAML2/Redirect');
        expect(metadata.certificates).toHaveLength(1);
        expect(metadata.certificates[0]).toContain('-----BEGIN CERTIFICATE-----');
        expect(metadata.certificates[0]).toContain('MIICtestcertificatevalue');
    });

    it('keeps RelayState local to this server', () => {
        expect(resolveSafeShibbolethRelayState('/admin/metadata?tab=auth')).toBe('/admin/metadata?tab=auth');
        expect(resolveSafeShibbolethRelayState('https://evil.example.test')).toBe('/');
        expect(resolveSafeShibbolethRelayState('//evil.example.test/path')).toBe('/');
    });

    it('resolves the configured public site URL before request headers', () => {
        process.env.NEXT_PUBLIC_SITE_URL = 'https://configured.example.test/';

        expect(
            resolveShibbolethPublicBaseUrl(
                new Request('http://internal.example.test', {
                    headers: {
                        host: 'internal.example.test',
                    },
                }),
            ),
        ).toBe('https://configured.example.test');
    });

    it('falls back to forwarded request headers for public base URL', () => {
        delete process.env.NEXT_PUBLIC_SITE_URL;

        expect(
            resolveShibbolethPublicBaseUrl(
                new Request('http://internal.example.test', {
                    headers: {
                        'x-forwarded-host': 'agents.example.test',
                        'x-forwarded-proto': 'https',
                    },
                }),
            ),
        ).toBe('https://agents.example.test');
    });
});
