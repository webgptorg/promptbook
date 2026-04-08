import type { ServerEnvironment } from '../../src/utils/serverRegistry';

/**
 * Minimal Vercel project-domain payload used by the sync script.
 *
 * @private type of `sync-vercel-domains`
 */
export type VercelProjectDomain = {
    /**
     * Domain name registered on the Vercel project.
     */
    readonly name: string;
    /**
     * Whether the domain is already verified by Vercel.
     */
    readonly verified?: boolean;
    /**
     * Git branch linked to the domain when it targets a non-production branch deployment.
     */
    readonly gitBranch?: string | null;
    /**
     * Custom Vercel environment identifier linked to the domain.
     */
    readonly customEnvironmentId?: string | null;
};

/**
 * Desired domain configuration derived from one `_Server` row.
 *
 * @private type of `sync-vercel-domains`
 */
export type DesiredVercelProjectDomain = {
    /**
     * Domain name registered on the Vercel project.
     */
    readonly name: string;
    /**
     * Source `_Server.environment` value.
     */
    readonly sourceEnvironment: ServerEnvironment;
    /**
     * Human-readable Vercel environment label used for diagnostics.
     */
    readonly vercelEnvironmentName: string;
    /**
     * Git branch bound to the domain when applicable.
     */
    readonly gitBranch?: string;
    /**
     * Custom Vercel environment id bound to the domain when applicable.
     */
    readonly customEnvironmentId?: string;
};

/**
 * Reconfiguration step for an existing domain whose Vercel binding drifted from `_Server`.
 *
 * @private type of `sync-vercel-domains`
 */
export type VercelDomainReconfiguration = {
    /**
     * Existing Vercel domain payload.
     */
    readonly currentDomain: VercelProjectDomain;
    /**
     * Desired Vercel domain payload derived from `_Server`.
     */
    readonly desiredDomain: DesiredVercelProjectDomain;
    /**
     * Human-readable mismatch reasons.
     */
    readonly reasons: ReadonlyArray<string>;
};

/**
 * Diff between `_Server` domains and current Vercel project domains.
 *
 * @private type of `sync-vercel-domains`
 */
export type VercelDomainSyncPlan = {
    /**
     * Normalized domains required by `_Server`.
     */
    readonly desiredDomains: ReadonlyArray<string>;
    /**
     * Project domains that should be added on Vercel.
     */
    readonly domainsToAdd: ReadonlyArray<DesiredVercelProjectDomain>;
    /**
     * Existing project domains that should be verified.
     */
    readonly domainsToVerify: ReadonlyArray<string>;
    /**
     * Existing project domains that should be rebound to a different branch/environment.
     */
    readonly domainsToReconfigure: ReadonlyArray<VercelDomainReconfiguration>;
    /**
     * Existing project domains missing from `_Server`.
     */
    readonly domainsToFlag: ReadonlyArray<string>;
    /**
     * Ignored Vercel-managed domains.
     */
    readonly ignoredDomains: ReadonlyArray<string>;
};

/**
 * Vercel API configuration loaded from environment variables.
 *
 * @private type of `sync-vercel-domains`
 */
export type VercelApiConfiguration = {
    /**
     * Project id or name accepted by Vercel project-domain endpoints.
     */
    readonly projectIdOrName: string;
    /**
     * API token used for authentication.
     */
    readonly token: string;
    /**
     * Optional team id for team-owned projects.
     */
    readonly teamId?: string;
};

/**
 * Minimal custom-environment metadata required for LTS domain routing.
 *
 * @private type of `sync-vercel-domains`
 */
export type VercelCustomEnvironment = {
    /**
     * Stable Vercel custom environment id.
     */
    readonly id: string;
    /**
     * Optional slug used in the Vercel UI/API.
     */
    readonly slug?: string;
    /**
     * Optional display name used in the Vercel UI/API.
     */
    readonly name?: string;
};

/**
 * Minimal Vercel project metadata required by the sync script.
 *
 * @private type of `sync-vercel-domains`
 */
export type VercelProjectMetadata = {
    /**
     * Production branch configured on the Vercel project.
     */
    readonly productionBranch: string;
    /**
     * Custom environments configured on the Vercel project.
     */
    readonly customEnvironments: ReadonlyArray<VercelCustomEnvironment>;
};

/**
 * Minimal Vercel domain-configuration payload used to derive Cloudflare DNS targets.
 *
 * @private type of `sync-vercel-domains`
 */
export type VercelDomainConfiguration = {
    /**
     * Recommended IPv4 records for the domain.
     */
    readonly recommendedIPv4: ReadonlyArray<{
        /**
         * Lower rank means higher preference.
         */
        readonly rank: number;
        /**
         * Recommended IPv4 values.
         */
        readonly value: ReadonlyArray<string>;
    }>;
    /**
     * Recommended CNAME records for the domain.
     */
    readonly recommendedCNAME: ReadonlyArray<{
        /**
         * Lower rank means higher preference.
         */
        readonly rank: number;
        /**
         * Recommended CNAME target.
         */
        readonly value: string;
    }>;
    /**
     * Whether Vercel considers the domain currently misconfigured.
     */
    readonly misconfigured: boolean;
};
