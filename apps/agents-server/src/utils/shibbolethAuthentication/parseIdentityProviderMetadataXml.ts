import { DOMParser } from '@xmldom/xmldom';
import { SAML_HTTP_REDIRECT_BINDING } from './shibbolethAuthenticationConstants';
import type { ShibbolethIdentityProviderMetadata } from './shibbolethAuthenticationTypes';

/**
 * Minimal XML node shape used to avoid mixing browser DOM and xmldom typings.
 *
 * @private type of `shibbolethAuthentication`
 */
type XmlNodeWithElements = {
    readonly getElementsByTagName: (tagName: string) => ArrayLike<XmlElementWithAttributes>;
};

/**
 * Minimal XML element shape used by the Shibboleth metadata parser.
 *
 * @private type of `shibbolethAuthentication`
 */
type XmlElementWithAttributes = XmlNodeWithElements & {
    readonly localName?: string | null;
    readonly nodeName: string;
    readonly textContent?: string | null;
    readonly getAttribute: (attributeName: string) => string | null;
};

/**
 * Parses IdP metadata XML into the fields needed for SAML login.
 *
 * @private function of `shibbolethAuthentication`
 */
export function parseIdentityProviderMetadataXml(metadataXml: string): ShibbolethIdentityProviderMetadata {
    const document = new DOMParser().parseFromString(metadataXml, 'application/xml') as unknown as XmlNodeWithElements;
    const singleSignOnServices = getElementsByLocalName(document, 'SingleSignOnService');
    const redirectSingleSignOnService =
        singleSignOnServices.find((element) => element.getAttribute('Binding') === SAML_HTTP_REDIRECT_BINDING) ||
        singleSignOnServices[0];
    const singleSignOnServiceUrl = redirectSingleSignOnService?.getAttribute('Location') || '';
    const signingCertificates = getSigningCertificates(document);

    if (!singleSignOnServiceUrl) {
        throw new Error('Shibboleth Identity Provider metadata is missing SingleSignOnService Location.');
    }

    if (signingCertificates.length === 0) {
        throw new Error('Shibboleth Identity Provider metadata is missing a signing certificate.');
    }

    return {
        singleSignOnServiceUrl,
        signingCertificates,
    };
}

/**
 * Finds all XML elements with the given local name.
 *
 * @private function of `shibbolethAuthentication`
 */
function getElementsByLocalName(root: XmlNodeWithElements, localName: string): Array<XmlElementWithAttributes> {
    return Array.from(root.getElementsByTagName('*')).filter(
        (element) =>
            element.localName === localName ||
            element.nodeName === localName ||
            element.nodeName.endsWith(`:${localName}`),
    );
}

/**
 * Extracts signing certificates from IdP metadata XML.
 *
 * @private function of `shibbolethAuthentication`
 */
function getSigningCertificates(document: XmlNodeWithElements): string[] {
    const signingKeyDescriptors = getElementsByLocalName(document, 'KeyDescriptor').filter((element) => {
        const use = element.getAttribute('use');
        return !use || use === 'signing';
    });
    const certificateElements = signingKeyDescriptors.flatMap((element) =>
        getElementsByLocalName(element, 'X509Certificate'),
    );
    const fallbackCertificateElements =
        certificateElements.length > 0 ? certificateElements : getElementsByLocalName(document, 'X509Certificate');

    return Array.from(
        new Set(
            fallbackCertificateElements
                .map((element) => formatPemCertificate(element.textContent || ''))
                .filter(Boolean),
        ),
    );
}

/**
 * Formats an XML X.509 certificate value as PEM.
 *
 * @private function of `shibbolethAuthentication`
 */
function formatPemCertificate(certificate: string): string {
    const base64Certificate = certificate
        .replace(/-----BEGIN CERTIFICATE-----/gu, '')
        .replace(/-----END CERTIFICATE-----/gu, '')
        .replace(/\s+/gu, '');

    if (!base64Certificate) {
        return '';
    }

    const wrappedCertificate = base64Certificate.match(/.{1,64}/gu)?.join('\n') || base64Certificate;
    return `-----BEGIN CERTIFICATE-----\n${wrappedCertificate}\n-----END CERTIFICATE-----`;
}
