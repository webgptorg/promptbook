import { spaceTrim } from 'spacetrim';
import { DatabaseError } from '../../../../src/errors/DatabaseError';
import { SERVER_ENVIRONMENT, type ServerEnvironment, type ServerRecord } from '../../src/utils/serverRegistry';
import { normalizeManagedDomain } from '../normalizeManagedDomain';
import type {
    DesiredVercelProjectDomain,
    VercelProjectDomain,
    VercelProjectMetadata,
} from './VercelDomainSyncPlan';
import {
    normalizeCustomEnvironmentId,
    normalizeEnvironmentIdentifier,
    normalizeGitBranch,
} from './normalizeVercelDomainBinding';

/**
 * `_Server.environment` -> Vercel routing mapping.
 */
const SERVER_ENVIRONMENT_VERCEL_BINDINGS = {
    [SERVER_ENVIRONMENT.LTS]: {
        gitBranch: 'lts',
        vercelEnvironmentName: 'lts',
        customEnvironmentLookupName: 'lts',
    },
    [SERVER_ENVIRONMENT.PRODUCTION]: {
        gitBranch: 'production',
        vercelEnvironmentName: 'Production',
    },
    [SERVER_ENVIRONMENT.PREVIEW]: {
        gitBranch: 'preview',
        vercelEnvironmentName: 'Preview',
    },
    [SERVER_ENVIRONMENT.LIVE]: {
        gitBranch: 'main',
        vercelEnvironmentName: 'Development',
    },
} as const;

/**
 * Resolves the desired Vercel binding for one `_Server` row.
 *
 * @param server - Registered server row.
 * @param options - Project metadata needed for environment mapping.
 * @returns Desired Vercel domain configuration.
 */
export function resolveDesiredProjectDomain(
    server: Pick<ServerRecord, 'domain' | 'environment'>,
    options: {
        readonly projectMetadata: VercelProjectMetadata;
        readonly projectDomains?: ReadonlyArray<VercelProjectDomain>;
    },
): DesiredVercelProjectDomain {
    const normalizedDomain = normalizeManagedDomain(server.domain);

    switch (server.environment) {
        case SERVER_ENVIRONMENT.PRODUCTION: {
            const productionBranch = normalizeGitBranch(options.projectMetadata.productionBranch);
            if (productionBranch !== SERVER_ENVIRONMENT_VERCEL_BINDINGS[SERVER_ENVIRONMENT.PRODUCTION].gitBranch) {
                throw new DatabaseError(
                    spaceTrim(`
                        Cannot map \`${normalizedDomain}\` from \`${
                        SERVER_ENVIRONMENT.PRODUCTION
                    }\` to Vercel \`Production\`.

                        Expected the Vercel production branch to be \`${
                            SERVER_ENVIRONMENT_VERCEL_BINDINGS[SERVER_ENVIRONMENT.PRODUCTION].gitBranch
                        }\`,
                        but the project is configured with \`${options.projectMetadata.productionBranch || '<empty>'}\`.
                    `),
                );
            }

            return {
                name: normalizedDomain,
                sourceEnvironment: server.environment,
                vercelEnvironmentName:
                    SERVER_ENVIRONMENT_VERCEL_BINDINGS[SERVER_ENVIRONMENT.PRODUCTION].vercelEnvironmentName,
            };
        }

        case SERVER_ENVIRONMENT.PREVIEW:
        case SERVER_ENVIRONMENT.LIVE:
            return resolveBranchBoundDesiredProjectDomain(
                normalizedDomain,
                server.environment,
                options.projectMetadata,
            );

        case SERVER_ENVIRONMENT.LTS: {
            const binding = SERVER_ENVIRONMENT_VERCEL_BINDINGS[SERVER_ENVIRONMENT.LTS];
            const customEnvironmentId = resolveCustomEnvironmentId(binding.customEnvironmentLookupName, {
                projectMetadata: options.projectMetadata,
                projectDomains: options.projectDomains,
            });

            return {
                name: normalizedDomain,
                sourceEnvironment: server.environment,
                vercelEnvironmentName: binding.vercelEnvironmentName,
                gitBranch: binding.gitBranch,
                customEnvironmentId,
            };
        }

        default:
            return assertNever(server.environment);
    }
}

/**
 * Resolves the desired binding for branch-based Vercel environments.
 *
 * @param normalizedDomain - Normalized domain.
 * @param environment - Source `_Server.environment`.
 * @param projectMetadata - Vercel project metadata.
 * @returns Desired Vercel domain configuration.
 */
function resolveBranchBoundDesiredProjectDomain(
    normalizedDomain: string,
    environment: Extract<ServerEnvironment, 'PREVIEW' | 'LIVE'>,
    projectMetadata: VercelProjectMetadata,
): DesiredVercelProjectDomain {
    const binding = SERVER_ENVIRONMENT_VERCEL_BINDINGS[environment];
    const normalizedProductionBranch = normalizeGitBranch(projectMetadata.productionBranch);

    if (normalizedProductionBranch === normalizeGitBranch(binding.gitBranch)) {
        throw new DatabaseError(
            spaceTrim(`
                Cannot map \`${normalizedDomain}\` from \`${environment}\` to Vercel \`${binding.vercelEnvironmentName}\`.

                The mapped branch \`${binding.gitBranch}\` is configured as the Vercel production branch,
                so it cannot be attached as a branch-specific custom domain.
            `),
        );
    }

    return {
        name: normalizedDomain,
        sourceEnvironment: environment,
        vercelEnvironmentName: binding.vercelEnvironmentName,
        gitBranch: binding.gitBranch,
    };
}

/**
 * Resolves the custom-environment id used for one `_Server.environment` mapping.
 *
 * @param environmentName - Expected custom-environment slug/name.
 * @param options - Project metadata and current domains.
 * @returns Matching custom-environment id.
 */
function resolveCustomEnvironmentId(
    environmentName: string,
    options: {
        readonly projectMetadata: VercelProjectMetadata;
        readonly projectDomains?: ReadonlyArray<VercelProjectDomain>;
    },
): string {
    const normalizedEnvironmentName = normalizeEnvironmentIdentifier(environmentName);

    const matchingCustomEnvironment = options.projectMetadata.customEnvironments.find((customEnvironment) =>
        [customEnvironment.id, customEnvironment.slug, customEnvironment.name]
            .filter((candidate): candidate is string => Boolean(candidate))
            .some((candidate) => normalizeEnvironmentIdentifier(candidate) === normalizedEnvironmentName),
    );
    if (matchingCustomEnvironment) {
        return matchingCustomEnvironment.id;
    }

    const matchingDomain = (options.projectDomains || []).find(
        (projectDomain) =>
            normalizeGitBranch(projectDomain.gitBranch) === normalizedEnvironmentName &&
            normalizeCustomEnvironmentId(projectDomain.customEnvironmentId) !== null,
    );
    if (matchingDomain?.customEnvironmentId) {
        return matchingDomain.customEnvironmentId;
    }

    const fallbackEnvironmentVariable =
        process.env.VERCEL_CUSTOM_ENVIRONMENT_ID_LTS?.trim() || process.env.VERCEL_LTS_CUSTOM_ENVIRONMENT_ID?.trim();
    if (normalizedEnvironmentName === 'lts' && fallbackEnvironmentVariable) {
        return fallbackEnvironmentVariable;
    }

    throw new DatabaseError(
        spaceTrim(`
            Failed to resolve the Vercel custom environment for \`${environmentName}\`.

            Expected a custom environment named \`${environmentName}\` on the Vercel project,
            or an existing project domain already bound to that custom environment.
        `),
    );
}

/**
 * Exhaustiveness guard for impossible `_Server.environment` branches.
 *
 * @param value - Impossible runtime value.
 * @returns Never returns.
 */
function assertNever(value: never): never {
    throw new DatabaseError(
        spaceTrim(`
            Encountered an unsupported server environment during Vercel sync: \`${String(value)}\`.
        `),
    );
}
