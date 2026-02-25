import { PseudoAgentDescriptor } from '../../../utils/pseudoAgents';

type PseudoAgentProfileProps = {
    readonly descriptor: PseudoAgentDescriptor;
    readonly canonicalAgentId: string;
    readonly canonicalUrl: string;
};

/**
 * Renders documentation for a pseudo agent (User/Void).
 *
 * @private internal UI for pseudo-agent profile routes
 */
export function PseudoAgentProfilePage({
    descriptor,
    canonicalAgentId,
    canonicalUrl,
}: PseudoAgentProfileProps) {
    return (
        <div className="min-h-screen bg-slate-950 text-white">
            <div className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-12">
                <section
                    className="rounded-3xl border border-white/10 bg-gradient-to-br p-8 shadow-2xl"
                    style={{
                        backgroundImage: `linear-gradient(135deg, ${descriptor.heroColor}, ${descriptor.heroAccentColor})`,
                        boxShadow: '0 25px 80px -30px rgba(15, 23, 42, 0.8)',
                    }}
                >
                    <div className="flex flex-wrap items-center gap-4 text-white">
                        <div className="text-5xl">{descriptor.emoji}</div>
                        <div>
                            <p className="text-xs uppercase tracking-[0.3em] text-white/70">pseudo agent</p>
                            <h1 className="text-4xl font-bold">{descriptor.displayName}</h1>
                            <p className="text-sm text-white/90">{descriptor.tagline}</p>
                        </div>
                    </div>
                    <p className="mt-6 text-base text-white/90">{descriptor.summary}</p>
                    <p className="mt-3 text-sm text-white/80">{descriptor.description}</p>
                </section>

                <section className="grid gap-5 md:grid-cols-2">
                    <InfoCard
                        title="Local Agents Server path"
                        value={canonicalUrl}
                        description={`Routes to /agents/${canonicalAgentId} on this server.`}
                    />
                    <InfoCard
                        title="Canonical pseudo-agent URL"
                        value={descriptor.pseudoUrl}
                        description="Used when agents reference {User}/{Void} in TEAM or inheritance."
                    />
                </section>

                <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
                    <h2 className="text-lg font-semibold">How to use {descriptor.displayName}</h2>
                    <ul className="mt-4 space-y-3 text-sm text-white/80">
                        {descriptor.usageNotes.map((note) => (
                            <li key={note} className="flex items-start gap-3">
                                <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-white/80" />
                                <span>{note}</span>
                            </li>
                        ))}
                    </ul>
                </section>

                <section className="grid gap-6 md:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/60">
                            Case-insensitive aliases
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                            {descriptor.aliasExamples.map((alias) => (
                                <span
                                    key={alias}
                                    className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-mono text-white/80"
                                >
                                    {alias}
                                </span>
                            ))}
                        </div>
                        <p className="mt-3 text-xs text-white/60">
                            Pseudo-agent names are case insensitive and accept braces or the `@` prefix.
                        </p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/60">Context</p>
                        <p className="text-sm text-white/80">
                            Pseudo agents only exist inside the source that references them. These pages simply
                            explain how {descriptor.displayName} behaves; you cannot chat with them directly.
                        </p>
                        <p className="text-sm text-white/80">
                            Every pseudo-agent reference runs in the same browser session as the parent agent, so
                            any answer is immediately ignored after it is delivered.
                        </p>
                    </div>
                </section>
            </div>
        </div>
    );
}

type InfoCardProps = {
    readonly title: string;
    readonly value: string;
    readonly description?: string;
};

/**
 * Displays a labeled piece of information with optional explanation.
 *
 * @private helper for pseudo-agent profile layout
 */
function InfoCard({ title, value, description }: InfoCardProps) {
    return (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/60">{title}</p>
            <div className="mt-3 text-sm font-mono text-white break-words">{value}</div>
            {description && <p className="mt-2 text-xs text-white/60">{description}</p>}
        </div>
    );
}
