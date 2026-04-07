import { BookOpen, MessageSquare, UserRound } from 'lucide-react';
import { resolveAgentAvatarImageUrl } from '../../../../../src/utils/agents/resolveAgentAvatarImageUrl';
import type { OfficeAgentVisual } from './buildOfficeLayout';

/**
 * Props for the office hover tooltip.
 */
type OfficeTooltipProps = {
    agent: OfficeAgentVisual;
    publicUrl: string;
    x: number;
    y: number;
    onOpenProfile: () => void;
    onOpenChat: () => void;
    onOpenBook: () => void;
};

/**
 * Tooltip panel shown when the user hovers one agent in the office scene.
 *
 * @private function of <AgentsOffice/>
 */
export function OfficeTooltip(props: OfficeTooltipProps) {
    const { agent, publicUrl, x, y, onOpenProfile, onOpenChat, onOpenBook } = props;
    const avatarUrl = resolveAgentAvatarImageUrl({ agent: agent.agent, baseUrl: agent.agent.serverUrl || publicUrl });
    const displayName = agent.agent.meta.fullname || agent.agent.agentName;

    return (
        <div
            className="absolute z-20 w-[240px] rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.18)] backdrop-blur"
            style={{ left: x, top: y }}
        >
            <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-slate-100">
                    {avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={avatarUrl}
                            alt={displayName}
                            className="agent-avatar-pixelated h-full w-full object-cover"
                        />
                    ) : (
                        <span className="text-sm font-bold text-slate-700">{displayName.charAt(0).toUpperCase()}</span>
                    )}
                </div>

                <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold text-slate-900">{displayName}</div>
                    <div className="mt-1 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                        {formatOfficeState(agent.state)}
                    </div>
                    <div className="mt-2 text-xs text-slate-600">
                        {agent.roomLabel}
                        {agent.serverLabel ? ` / ${agent.serverLabel}` : ''}
                    </div>
                </div>
            </div>

            <p className="mt-3 text-sm leading-5 text-slate-700">{agent.summaryText}</p>
            <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700">{agent.previewText}</div>

            {agent.capabilityBadges.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                    {agent.capabilityBadges.map((badge) => (
                        <span key={badge} className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                            {badge}
                        </span>
                    ))}
                </div>
            )}

            <div className="mt-4 flex gap-2">
                <button
                    type="button"
                    onClick={onOpenProfile}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300"
                >
                    <UserRound className="h-4 w-4" />
                    Profile
                </button>
                <button
                    type="button"
                    onClick={onOpenChat}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300"
                >
                    <MessageSquare className="h-4 w-4" />
                    Message
                </button>
                <button
                    type="button"
                    onClick={onOpenBook}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300"
                >
                    <BookOpen className="h-4 w-4" />
                    Book
                </button>
            </div>
        </div>
    );
}

/**
 * Formats a user-facing office activity label.
 *
 * @param state - Office activity state.
 * @returns Human-readable state label.
 */
function formatOfficeState(state: OfficeAgentVisual['state']): string {
    if (state === 'working') {
        return 'Working';
    }

    if (state === 'meeting') {
        return 'In meeting';
    }

    if (state === 'moving') {
        return 'Moving';
    }

    return 'Idle';
}
