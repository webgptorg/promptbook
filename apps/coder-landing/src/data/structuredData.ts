import { ADVANCED_FEATURES } from './advancedFeatures';
import { HARNESS_CATALOG } from './harnessCatalog';
import { BRAND_PROFILE_URLS, GITHUB_URL, NPM_PACKAGE_URL, PROMPTBOOK_URL } from './links';
import {
    PUBLISHER_LEGAL_NAME,
    PUBLISHER_NAME,
    resolveSiteUrl,
    SITE_ALTERNATE_NAME,
    SITE_DESCRIPTION,
    SITE_KEYWORDS,
    SITE_LANGUAGE,
    SITE_LOGO_PATH,
    SITE_NAME,
    SITE_TITLE,
    SITE_URL,
} from './siteMetadata';

/**
 * Structured data (JSON-LD) of the landing page, understood by Google, Bing and other search engines.
 *
 * Note: Every value here is also visible on the rendered page - structured data must never claim
 *       anything the visitor cannot see, see [`specs/metadata.md`](../../specs/metadata.md)
 */

/**
 * Reference to another node of the structured data graph.
 */
type StructuredDataReference = {
    readonly '@id': string;
};

/**
 * Identifier of the company node in the structured data graph.
 */
const ORGANIZATION_ID = resolveSiteUrl('/#organization');

/**
 * Identifier of the website node in the structured data graph.
 */
const WEBSITE_ID = resolveSiteUrl('/#website');

/**
 * Identifier of the landing page node in the structured data graph.
 */
const WEBPAGE_ID = resolveSiteUrl('/#webpage');

/**
 * Identifier of the `ptbk coder` software node in the structured data graph.
 */
const SOFTWARE_APPLICATION_ID = resolveSiteUrl('/#software-application');

/**
 * Company which publishes both `ptbk coder` and Promptbook.
 */
type OrganizationStructuredData = {
    readonly '@type': 'Organization';
    readonly '@id': string;
    readonly name: string;
    readonly legalName: string;
    readonly url: string;
    readonly logo: string;
    readonly sameAs: ReadonlyArray<string>;
};

/**
 * Website which the landing page belongs to.
 */
type WebSiteStructuredData = {
    readonly '@type': 'WebSite';
    readonly '@id': string;
    readonly url: string;
    readonly name: string;
    readonly alternateName: string;
    readonly description: string;
    readonly inLanguage: string;
    readonly publisher: StructuredDataReference;
};

/**
 * The landing page itself.
 */
type WebPageStructuredData = {
    readonly '@type': 'WebPage';
    readonly '@id': string;
    readonly url: string;
    readonly name: string;
    readonly description: string;
    readonly inLanguage: string;
    readonly isPartOf: StructuredDataReference;
    readonly about: StructuredDataReference;
};

/**
 * The `ptbk coder` command line tool which the landing page is about.
 */
type SoftwareApplicationStructuredData = {
    readonly '@type': 'SoftwareApplication';
    readonly '@id': string;
    readonly name: string;
    readonly alternateName: string;
    readonly description: string;
    readonly url: string;
    readonly applicationCategory: 'DeveloperApplication';
    readonly applicationSubCategory: string;
    readonly operatingSystem: string;
    readonly softwareRequirements: string;
    readonly downloadUrl: string;
    readonly codeRepository: string;
    readonly license: string;
    readonly image: string;
    readonly keywords: string;
    readonly featureList: ReadonlyArray<string>;
    readonly author: StructuredDataReference;
    readonly publisher: StructuredDataReference;
};

/**
 * Everything the landing page declares about itself, as one linked JSON-LD graph.
 */
export type LandingPageStructuredData = {
    readonly '@context': 'https://schema.org';
    readonly '@graph': ReadonlyArray<
        OrganizationStructuredData | WebSiteStructuredData | WebPageStructuredData | SoftwareApplicationStructuredData
    >;
};

/**
 * Builds the structured data of the company behind `ptbk coder`.
 */
function createOrganizationStructuredData(): OrganizationStructuredData {
    return {
        '@type': 'Organization',
        '@id': ORGANIZATION_ID,
        name: PUBLISHER_NAME,
        legalName: PUBLISHER_LEGAL_NAME,
        url: PROMPTBOOK_URL,
        logo: resolveSiteUrl(SITE_LOGO_PATH),
        sameAs: BRAND_PROFILE_URLS,
    };
}

/**
 * Builds the structured data of the `ptbk coder` website.
 *
 * Note: The name is the short product name, because this is the name Google shows as the site name
 *       of every result from this domain - the full title belongs to the page node below.
 */
function createWebSiteStructuredData(): WebSiteStructuredData {
    return {
        '@type': 'WebSite',
        '@id': WEBSITE_ID,
        url: SITE_URL,
        name: SITE_NAME,
        alternateName: SITE_ALTERNATE_NAME,
        description: SITE_DESCRIPTION,
        inLanguage: SITE_LANGUAGE,
        publisher: { '@id': ORGANIZATION_ID },
    };
}

/**
 * Builds the structured data of the landing page.
 */
function createWebPageStructuredData(): WebPageStructuredData {
    return {
        '@type': 'WebPage',
        '@id': WEBPAGE_ID,
        url: SITE_URL,
        name: SITE_TITLE,
        description: SITE_DESCRIPTION,
        inLanguage: SITE_LANGUAGE,
        isPartOf: { '@id': WEBSITE_ID },
        about: { '@id': SOFTWARE_APPLICATION_ID },
    };
}

/**
 * Builds the structured data of the `ptbk coder` tool.
 *
 * Note: The feature list and the supported harnesses are taken from the same data modules which render
 *       the features and harnesses sections, so the search engine never sees a feature the page does not show.
 */
function createSoftwareApplicationStructuredData(): SoftwareApplicationStructuredData {
    const supportedHarnessNames = HARNESS_CATALOG.map((harness) => harness.displayName).join(', ');

    return {
        '@type': 'SoftwareApplication',
        '@id': SOFTWARE_APPLICATION_ID,
        name: SITE_NAME,
        alternateName: SITE_ALTERNATE_NAME,
        description: SITE_DESCRIPTION,
        url: SITE_URL,
        applicationCategory: 'DeveloperApplication',
        applicationSubCategory: 'Coding agent orchestrator',
        operatingSystem: 'Windows, macOS, Linux',
        softwareRequirements: `Node.js and one of the supported coding agents: ${supportedHarnessNames}`,
        downloadUrl: NPM_PACKAGE_URL,
        codeRepository: GITHUB_URL,
        license: `${GITHUB_URL}/blob/main/LICENSE.md`,
        image: resolveSiteUrl(SITE_LOGO_PATH),
        keywords: SITE_KEYWORDS.join(', '),
        featureList: ADVANCED_FEATURES.map((feature) => feature.title),
        author: { '@id': ORGANIZATION_ID },
        publisher: { '@id': ORGANIZATION_ID },
    };
}

/**
 * Builds the whole structured data graph of the landing page.
 */
export function createLandingPageStructuredData(): LandingPageStructuredData {
    return {
        '@context': 'https://schema.org',
        '@graph': [
            createOrganizationStructuredData(),
            createWebSiteStructuredData(),
            createWebPageStructuredData(),
            createSoftwareApplicationStructuredData(),
        ],
    };
}
