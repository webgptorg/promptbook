import type { AgentBasicInformation, string_agent_permanent_id, string_url } from '@promptbook-local/types';
import { AgentProfile } from '../../../components/AgentProfile/AgentProfile';
import { PseudoAgentDescriptor } from '../../../utils/pseudoAgents';

type PseudoAgentProfileProps = {
    readonly descriptor: PseudoAgentDescriptor;
    readonly canonicalAgentId: string;
    readonly canonicalUrl: string;
};

/**
 * Constructs a minimal agent profile that leans on the shared hero layout.
 *
 * @param descriptor - Source data describing the pseudo agent.
 * @param canonicalAgentId - Permanent identifier presented in the route.
 * @returns An object that can be rendered by `<AgentProfile />`.
 * @private internal helper for pseudo-agent rendering
 */
function createPseudoAgentProfile(descriptor: PseudoAgentDescriptor, canonicalAgentId: string): AgentBasicInformation {
    return {
        agentName: descriptor.displayName,
        agentHash: `pseudo-agent-${descriptor.canonicalName}`,
        permanentId: canonicalAgentId,
        personaDescription: descriptor.summary,
        initialMessage: null,
        meta: {
            fullname: descriptor.displayName,
            description: descriptor.summary,
            color: descriptor.heroColor,
        },
        links: [],
        parameters: [],
        capabilities: [],
        samples: [],
        knowledgeSources: [],
    };
}

/**
 * Renders a pseudo-agent documentation page that mirrors the regular agent profile.
 *
 * @private internal UI for pseudo-agent profile routes
 */
export function PseudoAgentProfilePage({ descriptor, canonicalAgentId, canonicalUrl }: PseudoAgentProfileProps) {
    const parsedUrl = new URL(canonicalUrl);
    const canonicalPath = `/agents/${encodeURIComponent(canonicalAgentId)}`;
    const agentEmail = `${canonicalAgentId}@${parsedUrl.hostname}`;
    const pseudoAgentProfile = createPseudoAgentProfile(descriptor, canonicalAgentId);

    return (
        <AgentProfile
            agent={pseudoAgentProfile}
            permanentId={canonicalAgentId as string_agent_permanent_id}
            agentUrl={canonicalUrl}
            agentEmail={agentEmail}
            publicUrl={parsedUrl.origin as string_url}
            className="min-h-screen"
        >
            <div className="space-y-6 text-gray-800">
                <div className="grid gap-4 md:grid-cols-2">
                    <InfoCard
                        title="Local path on this server"
                        value={canonicalPath}
                        description="Bookmark this route to revisit the pseudo-agent documentation without leaving the server."
                    />
                    <InfoCard
                        title="Agent reference URL"
                        value={descriptor.pseudoUrl}
                        description="Use this identifier inside your agents to bring {User}, {Void}, or {Null} into play."
                    />
                </div>

                <section className="rounded-2xl border border-gray-200 bg-white/90 p-6 shadow-sm">
                    <h2 className="text-base font-semibold text-gray-900">About {descriptor.displayName}</h2>
                    <p className="mt-3 text-sm text-gray-700">{descriptor.description}</p>
                </section>

                <section className="rounded-2xl border border-gray-200 bg-white/90 p-6 shadow-sm">
                    <h2 className="text-base font-semibold text-gray-900">Usage highlights</h2>
                    <ul className="mt-3 space-y-2 text-sm text-gray-700">
                        {descriptor.usageNotes.map((note, index) => (
                            <li key={`${descriptor.canonicalName}-usage-${index}`} className="flex items-start gap-3">
                                <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-gray-500" />
                                <span>{note}</span>
                            </li>
                        ))}
                    </ul>
                </section>

                <section className="rounded-2xl border border-gray-200 bg-white/90 p-6 shadow-sm">
                    <h3 className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-500">Aliases</h3>
                    <div className="mt-3 flex flex-wrap gap-2">
                        {descriptor.aliasExamples.map((alias) => (
                            <span
                                key={alias}
                                className="rounded-full border border-gray-300 bg-gray-100 px-3 py-1 text-xs font-mono text-gray-700"
                            >
                                {alias}
                            </span>
                        ))}
                    </div>
                    <p className="mt-3 text-xs uppercase tracking-[0.3em] text-gray-500">
                        References are case insensitive and accept braces or the `@` prefix.
                    </p>
                </section>

                <section className="rounded-2xl border border-gray-200 bg-white/90 p-6 shadow-sm">
                    <h3 className="text-base font-semibold text-gray-900">Context</h3>
                    <p className="mt-2 text-sm text-gray-700">
                        Pseudo agents only exist inside the agent definition that mentions them. This page simply
                        explains how {descriptor.displayName} behaves so you can reuse it consistently.
                    </p>
                    <p className="mt-2 text-sm text-gray-700">
                        Every reply is generated inside the parent agent's session and is discarded the moment the agent
                        continues—pseudo agents do not offer standalone chat history.
                    </p>
                </section>
            </div>
        </AgentProfile>
    );
}

type InfoCardProps = {
    readonly title: string;
    readonly value: string;
    readonly description?: string;
};

/**
 * Displays a labeled detail with an optional helper text.
 *
 * @private helper for pseudo-agent details
 */
function InfoCard({ title, value, description }: InfoCardProps) {
    return (
        <div className="rounded-2xl border border-gray-200 bg-white/90 p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-500">{title}</p>
            <div className="mt-3 text-sm font-mono text-gray-900 break-words">{value}</div>
            {description && <p className="mt-2 text-xs text-gray-500">{description}</p>}
        </div>
    );
}
