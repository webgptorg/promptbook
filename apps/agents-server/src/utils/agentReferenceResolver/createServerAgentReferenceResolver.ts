import { normalizeAgentName } from '@promptbook-local/core';
import type { AgentCollection } from '@promptbook-local/types';
import type { AgentReferenceResolver } from '@promptbook-local/core';

type ServerResolverOptions = {
    readonly agentCollection: AgentCollection;
    readonly localServerUrl: string;
    readonly federatedServers?: readonly string[];
};

type RemoteAgentLookup = {
    readonly byName: Map<string, string>;
    readonly byId: Map<string, string>;
};

const REFERENCE_TOKEN_REGEX = /(\{([^}]+)\}|@([A-Za-z0-9_-]+))/g;
const BASE58_PATTERN = /^[1-9A-HJ-NP-Za-km-z]+$/;

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

class ServerAgentReferenceResolver implements AgentReferenceResolver {
    private readonly agentCollection: AgentCollection;
    private readonly localServerUrl: string;
    private readonly federatedServers: string[];
    private readonly localNameToUrl = new Map<string, string>();
    private readonly localIdToUrl = new Map<string, string>();
    private readonly remoteCaches = new Map<string, RemoteAgentLookup>();
    private readonly remoteRequests = new Map<string, Promise<RemoteAgentLookup>>();

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

    public async resolveCommitmentContent(_commitmentType: string, content: string): Promise<string> {
        if (!content) {
            return content;
        }

        const parts: string[] = [];
        let lastIndex = 0;
        let match: RegExpExecArray | null;

        REFERENCE_TOKEN_REGEX.lastIndex = 0;
        while ((match = REFERENCE_TOKEN_REGEX.exec(content)) !== null) {
            const [token] = match;
            const tokenValue = (match[2] ?? match[3] ?? '').trim();

            parts.push(content.slice(lastIndex, match.index));
            lastIndex = match.index + token.length;

            if (!tokenValue) {
                parts.push(token);
                continue;
            }

            const resolved = await this.resolveReferenceUrl(tokenValue);
            parts.push(resolved);
        }

        parts.push(content.slice(lastIndex));
        return parts.join('');
    }

    private async resolveReferenceUrl(value: string): Promise<string> {
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

        throw new Error(`Unable to resolve agent reference "${value}"`);
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

            const payload = (await response.json()) as { agents?: Array<{ agentName?: string; permanentId?: string; url?: string }> };
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
