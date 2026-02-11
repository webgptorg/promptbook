import { normalizeAgentName } from '../../../../../src/book-2.0/agent-source/normalizeAgentName';
import type { AgentCollection } from '../../../../../src/collection/agent-collection/AgentCollection';
import type { AgentReferenceResolver } from '../../../../../src/book-2.0/agent-source/AgentReferenceResolver';
import type { BookCommitment } from '../../../../../src/commitments/_base/BookCommitment';
import {
    type AgentReferenceResolutionIssue,
    type IssueTrackingAgentReferenceResolver,
} from './AgentReferenceResolutionIssue';
import { extractAgentReferenceTokens } from './extractAgentReferenceTokens';

/**
 * Dependencies required to resolve local/federated compact references.
 */
type ServerResolverOptions = {
    readonly agentCollection: AgentCollection;
    readonly localServerUrl: string;
    readonly federatedServers?: readonly string[];
};

/**
 * Cached lookup maps fetched from a federated server.
 */
type RemoteAgentLookup = {
    readonly byName: Map<string, string>;
    readonly byId: Map<string, string>;
};

/**
 * Lightweight heuristic for identifying base58-like permanent IDs.
 */
const BASE58_PATTERN = /^[1-9A-HJ-NP-Za-km-z]+$/;

/**
 * Upper bound for in-memory unresolved-reference issue tracking.
 */
const MAX_TRACKED_RESOLUTION_ISSUES = 200;

/**
 * Creates a resolver backed by the Agents Server collection and configured federated servers.
 *
 * @param options - Resolver dependencies
 * @returns Agent reference resolver for the current agents server instance
 * @private
 */
export async function createServerAgentReferenceResolver(
    options: ServerResolverOptions,
): Promise<AgentReferenceResolver> {
    const resolver = new ServerAgentReferenceResolver(options);
    await resolver.initialize();
    return resolver;
}

/**
 * Agents Server resolver that expands compact references and tracks unresolved tokens.
 */
class ServerAgentReferenceResolver implements IssueTrackingAgentReferenceResolver {
    private readonly agentCollection: AgentCollection;
    private readonly localServerUrl: string;
    private readonly federatedServers: string[];
    private readonly localNameToUrl = new Map<string, string>();
    private readonly localIdToUrl = new Map<string, string>();
    private readonly remoteCaches = new Map<string, RemoteAgentLookup>();
    private readonly remoteRequests = new Map<string, Promise<RemoteAgentLookup>>();
    private readonly resolutionIssues: Array<AgentReferenceResolutionIssue> = [];

    public constructor(options: ServerResolverOptions) {
        this.agentCollection = options.agentCollection;
        this.localServerUrl = ServerAgentReferenceResolver.normalizeServerUrl(options.localServerUrl);
        const servers = options.federatedServers || [];
        this.federatedServers = [
            ...new Set(
                servers
                    .map(ServerAgentReferenceResolver.normalizeServerUrl)
                    .filter((server) => server.length > 0 && server !== this.localServerUrl),
            ),
        ];
    }

    public async initialize(): Promise<void> {
        const agents = await this.agentCollection.listAgents();
        for (const agent of agents) {
            const url = this.buildLocalAgentUrl(agent.permanentId || agent.agentName);
            this.localNameToUrl.set(normalizeAgentName(agent.agentName), url);
            this.localNameToUrl.set(agent.agentName, url);
            if (agent.permanentId) {
                this.localIdToUrl.set(agent.permanentId, url);
            }
        }
    }

    /**
     * Drains and returns unresolved-reference issues captured in previous resolutions.
     */
    public consumeResolutionIssues(): Array<AgentReferenceResolutionIssue> {
        const issues = [...this.resolutionIssues];
        this.resolutionIssues.length = 0;
        return issues;
    }

    /**
     * Rewrites compact references in commitment content into canonical URLs.
     *
     * Missing references are handled with commitment-specific safe fallbacks instead of throwing.
     */
    public async resolveCommitmentContent(commitmentType: BookCommitment, content: string): Promise<string> {
        if (!content) {
            return content;
        }

        const parts: string[] = [];
        let lastIndex = 0;
        let hasMissingReference = false;

        for (const tokenMatch of extractAgentReferenceTokens(content)) {
            const token = tokenMatch.token;
            const tokenValue = tokenMatch.reference;
            const tokenIndex = tokenMatch.index;

            parts.push(content.slice(lastIndex, tokenIndex));
            lastIndex = tokenIndex + token.length;

            if (!tokenValue) {
                parts.push(token);
                continue;
            }

            const resolved = await this.resolveReferenceUrl(tokenValue);
            if (resolved) {
                parts.push(resolved);
                continue;
            }

            hasMissingReference = true;
            this.trackResolutionIssue({
                commitmentType,
                token,
                reference: tokenValue,
                message: `Agent reference "${tokenValue}" was not found`,
            });
            parts.push(this.getMissingReferenceReplacement(commitmentType));
        }

        parts.push(content.slice(lastIndex));
        const resolvedContent = parts.join('');

        if (!hasMissingReference) {
            return resolvedContent;
        }

        if (commitmentType === 'FROM') {
            return 'VOID';
        }

        if (commitmentType === 'IMPORT' || commitmentType === 'IMPORTS') {
            return resolvedContent.trim();
        }

        if (commitmentType === 'TEAM') {
            return resolvedContent;
        }

        return resolvedContent;
    }

    /**
     * Resolves a single compact reference payload to an absolute agent URL.
     */
    private async resolveReferenceUrl(value: string): Promise<string | null> {
        if (this.isAbsoluteUrl(value)) {
            return value;
        }

        const normalized = normalizeAgentName(value);
        const isBase58 = BASE58_PATTERN.test(value);

        if (isBase58) {
            const local = this.localIdToUrl.get(value);
            if (local) {
                return local;
            }
            const remote = await this.lookupFederatedAgentById(value);
            if (remote) {
                return remote;
            }
        }

        const local = this.localNameToUrl.get(normalized) ?? this.localNameToUrl.get(value);
        if (local) {
            return local;
        }

        const remoteByName =
            (await this.lookupFederatedAgentByName(normalized)) ?? (await this.lookupFederatedAgentByName(value));
        if (remoteByName) {
            return remoteByName;
        }

        if (!isBase58) {
            const remoteById = await this.lookupFederatedAgentById(value);
            if (remoteById) {
                return remoteById;
            }
        }

        return null;
    }

    /**
     * Tracks resolution issues while bounding memory usage.
     */
    private trackResolutionIssue(issue: AgentReferenceResolutionIssue): void {
        this.resolutionIssues.push(issue);

        if (this.resolutionIssues.length <= MAX_TRACKED_RESOLUTION_ISSUES) {
            return;
        }

        const overLimit = this.resolutionIssues.length - MAX_TRACKED_RESOLUTION_ISSUES;
        this.resolutionIssues.splice(0, overLimit);
    }

    /**
     * Returns a safe textual replacement when a compact reference cannot be resolved.
     */
    private getMissingReferenceReplacement(commitmentType: BookCommitment): string {
        if (commitmentType === 'FROM') {
            return 'VOID';
        }

        if (commitmentType === 'IMPORT' || commitmentType === 'IMPORTS' || commitmentType === 'TEAM') {
            return '';
        }

        return '';
    }

    private async lookupFederatedAgentById(agentId: string): Promise<string | null> {
        for (const server of this.federatedServers) {
            const lookup = await this.ensureRemoteLookup(server);
            const url = lookup.byId.get(agentId);
            if (url) {
                return url;
            }
        }
        return null;
    }

    private async lookupFederatedAgentByName(agentName: string): Promise<string | null> {
        for (const server of this.federatedServers) {
            const lookup = await this.ensureRemoteLookup(server);
            const url = lookup.byName.get(agentName);
            if (url) {
                return url;
            }
        }
        return null;
    }

    private async ensureRemoteLookup(serverUrl: string): Promise<RemoteAgentLookup> {
        const cached = this.remoteCaches.get(serverUrl);
        if (cached) {
            return cached;
        }

        let pending = this.remoteRequests.get(serverUrl);
        if (!pending) {
            pending = this.fetchRemoteAgents(serverUrl);
            this.remoteRequests.set(serverUrl, pending);
        }

        try {
            const lookup = await pending;
            this.remoteCaches.set(serverUrl, lookup);
            return lookup;
        } finally {
            this.remoteRequests.delete(serverUrl);
        }
    }

    private async fetchRemoteAgents(serverUrl: string): Promise<RemoteAgentLookup> {
        const lookup: RemoteAgentLookup = {
            byName: new Map(),
            byId: new Map(),
        };

        const baseUrl = ServerAgentReferenceResolver.normalizeServerUrl(serverUrl);
        const endpoint = `${baseUrl}/api/agents`;

        try {
            const response = await fetch(endpoint);
            if (!response.ok) {
                return lookup;
            }

            const payload = (await response.json()) as {
                agents?: Array<{ agentName?: string; permanentId?: string; url?: string }>;
            };
            const agents = Array.isArray(payload?.agents) ? payload.agents : [];

            for (const agent of agents) {
                if (!agent.agentName) {
                    continue;
                }

                const url = agent.url || this.buildRemoteAgentUrl(baseUrl, agent.agentName, agent.permanentId);
                lookup.byName.set(normalizeAgentName(agent.agentName), url);
                lookup.byName.set(agent.agentName, url);

                if (agent.permanentId) {
                    lookup.byId.set(agent.permanentId, url);
                }
            }
        } catch (error) {
            console.warn('[AgentReferenceResolver] Failed to load agents from', endpoint, error);
        }

        return lookup;
    }

    private buildLocalAgentUrl(identifier: string): string {
        const encoded = encodeURIComponent(identifier);
        return `${this.localServerUrl}/agents/${encoded}`;
    }

    private buildRemoteAgentUrl(baseUrl: string, agentName: string, permanentId?: string): string {
        const id = permanentId || agentName;
        return `${baseUrl}/agents/${encodeURIComponent(id)}`;
    }

    private isAbsoluteUrl(value: string): boolean {
        return value.startsWith('http://') || value.startsWith('https://');
    }

    private static normalizeServerUrl(value: string): string {
        return value.replace(/\/+$/, '');
    }
}
