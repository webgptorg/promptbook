'use client';

import { BookOpen, MessageSquare, Sparkles, UserRound } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useState, type CSSProperties } from 'react';
import type { AgentOrganizationAgent, AgentOrganizationFolder } from '../../utils/agentOrganization/types';
import { AgentAvatar } from '../AgentAvatar/AgentAvatar';
import { useAgentNaming } from '../AgentNaming/AgentNamingContext';
import {
    buildOfficeLayout,
    type OfficeAgentVisual,
    type OfficeDesk,
    type OfficeLayout,
    type OfficeRoom,
} from './buildOfficeLayout';
import type { AgentWithVisibility } from './useFederatedAgents';

/**
 * Minimum logical width kept for the maze scene so mobile view stays readable.
 */
const MAZE_MIN_SCENE_WIDTH_PX = 820;

/**
 * Minimum logical height kept for the maze scene so rooms have enough breathing room.
 */
const MAZE_MIN_SCENE_HEIGHT_PX = 560;

/**
 * Avatar size rendered for agents inside the maze.
 */
const MAZE_AGENT_SIZE_PX = 72;

/**
 * Corridor thickness used when deriving the maze overlay from office world units.
 */
const MAZE_CORRIDOR_THICKNESS_WORLD = 28;

/**
 * Maximum number of capability dots rendered per agent to keep the scene light.
 */
const MAX_CAPABILITY_DOTS = 3;

/**
 * Deterministic accent colors used for capability satellites around each avatar.
 */
const CAPABILITY_DOT_COLORS = ['#38bdf8', '#f59e0b', '#34d399', '#a78bfa', '#fb7185', '#f97316'] as const;

/**
 * Normalized top-down room model rendered by the maze scene.
 */
type MazeSceneRoom = {
    readonly room: OfficeRoom;
    readonly left: number;
    readonly top: number;
    readonly width: number;
    readonly height: number;
    readonly isDoorOnLeft: boolean;
};

/**
 * Normalized desk model rendered inside the maze rooms.
 */
type MazeSceneDesk = {
    readonly desk: OfficeDesk;
    readonly left: number;
    readonly top: number;
    readonly width: number;
    readonly height: number;
};

/**
 * One corridor strip rendered behind the rooms.
 */
type MazeSceneCorridor = {
    readonly id: string;
    readonly orientation: 'horizontal' | 'vertical';
    readonly left: number;
    readonly top: number;
    readonly width: number;
    readonly height: number;
};

/**
 * Prepared render model for one interactive maze agent.
 */
type MazeSceneAgent = {
    readonly agent: OfficeAgentVisual;
    readonly left: number;
    readonly top: number;
    readonly moveX: number;
    readonly moveY: number;
    readonly zIndex: number;
    readonly bobDurationMs: number;
    readonly bobDelayMs: number;
    readonly capabilityColors: Array<string>;
};

/**
 * Fully prepared maze scene model used by the renderer.
 */
type MazeScene = {
    readonly rooms: Array<MazeSceneRoom>;
    readonly desks: Array<MazeSceneDesk>;
    readonly corridors: Array<MazeSceneCorridor>;
    readonly agents: Array<MazeSceneAgent>;
    readonly hubLeft: number;
    readonly hubTop: number;
};

/**
 * Props for the maze homepage visualization.
 */
type AgentsMazeProps = {
    readonly agents: ReadonlyArray<AgentOrganizationAgent>;
    readonly federatedAgents: ReadonlyArray<AgentWithVisibility>;
    readonly publicUrl: string;
    readonly folders: ReadonlyArray<AgentOrganizationFolder>;
};

/**
 * Renders a responsive top-down office maze that keeps avatars integrated into the environment.
 */
export function AgentsMaze(props: AgentsMazeProps) {
    const { agents, federatedAgents, publicUrl, folders } = props;
    const router = useRouter();
    const { formatText } = useAgentNaming();
    const [activeAgentId, setActiveAgentId] = useState<string | null>(null);

    const layout = useMemo(
        () =>
            buildOfficeLayout({
                agents,
                federatedAgents,
                publicUrl,
                folders,
            }),
        [agents, federatedAgents, publicUrl, folders],
    );
    const scene = useMemo(() => createMazeScene(layout), [layout]);
    const activeAgent = useMemo(
        () => scene.agents.find((agentModel) => agentModel.agent.id === activeAgentId)?.agent || null,
        [activeAgentId, scene.agents],
    );

    /**
     * Opens one local or federated agent route.
     *
     * @param href - Relative app route or absolute federated URL.
     */
    const openHref = (href: string): void => {
        if (/^https?:\/\//.test(href)) {
            window.open(href, '_blank', 'noopener,noreferrer');
            return;
        }

        router.push(href);
    };

    if (layout.agents.length === 0) {
        return (
            <div className="flex justify-center py-12 text-slate-500 dark:text-slate-400">
                {formatText('No agents to show in maze.')}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[28px] border border-slate-200/80 bg-white/80 px-4 py-4 shadow-[0_18px_50px_rgba(15,23,42,0.06)] backdrop-blur dark:border-white/10 dark:bg-slate-900/70 dark:shadow-[0_20px_55px_rgba(2,6,23,0.45)]">
                <div className="min-w-0">
                    <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.22em] text-cyan-700 dark:text-cyan-300">
                        <Sparkles className="h-4 w-4" />
                        Maze Office
                    </div>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                        Agents occupy themed rooms, share corridor traffic, and keep their avatars transparent so built-in
                        visuals sit inside the maze instead of on top of square cards.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <MazeStatPill label="Rooms" value={String(layout.rooms.length)} />
                    <MazeStatPill label="Agents" value={String(layout.agents.length)} />
                    <MazeStatPill label="Meetings" value={String(layout.stateCounts.meeting)} />
                    <MazeStatPill label="In transit" value={String(layout.stateCounts.moving)} />
                </div>
            </div>

            <div className="overflow-x-auto pb-2">
                <div
                    className="maze-scene relative mx-auto overflow-hidden rounded-[34px] border border-slate-200/80 shadow-[0_28px_70px_rgba(15,23,42,0.12)] dark:border-white/10 dark:shadow-[0_32px_80px_rgba(2,6,23,0.55)]"
                    style={{
                        width: 'max(100%, 820px)',
                        minHeight: MAZE_MIN_SCENE_HEIGHT_PX,
                        aspectRatio: `${Math.max(layout.worldWidth, MAZE_MIN_SCENE_WIDTH_PX)} / ${Math.max(
                            layout.worldHeight,
                            MAZE_MIN_SCENE_HEIGHT_PX,
                        )}`,
                    }}
                    onClick={() => setActiveAgentId(null)}
                >
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.18),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(251,191,36,0.14),_transparent_30%),linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(226,232,240,0.95))] dark:hidden" />
                    <div className="absolute inset-0 hidden dark:block dark:bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.18),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(14,165,233,0.14),_transparent_28%),linear-gradient(180deg,_rgba(15,23,42,0.98),_rgba(2,6,23,0.99))]" />
                    <div
                        className="absolute inset-0 opacity-70 dark:opacity-45"
                        style={{
                            backgroundImage:
                                'linear-gradient(rgba(148,163,184,0.18) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.18) 1px, transparent 1px), radial-gradient(circle at 20% 20%, rgba(14,165,233,0.15), transparent 18%), radial-gradient(circle at 78% 74%, rgba(245,158,11,0.12), transparent 16%)',
                            backgroundSize: '42px 42px, 42px 42px, 220px 220px, 260px 260px',
                        }}
                    />
                    <div
                        className="absolute inset-0 opacity-40 dark:opacity-30"
                        style={{
                            backgroundImage:
                                'repeating-linear-gradient(135deg, rgba(255,255,255,0.22) 0, rgba(255,255,255,0.22) 8px, transparent 8px, transparent 52px)',
                        }}
                    />

                    {scene.corridors.map((corridor) => (
                        <div
                            key={corridor.id}
                            className="maze-corridor absolute overflow-hidden rounded-full border border-white/45 bg-white/60 dark:border-white/10 dark:bg-white/5"
                            style={{
                                left: `${corridor.left}%`,
                                top: `${corridor.top}%`,
                                width: `${corridor.width}%`,
                                height: `${corridor.height}%`,
                            }}
                        >
                            <div className="absolute inset-[12%] rounded-full border border-white/35 dark:border-white/10" />
                            <div
                                className={`maze-corridor-flow absolute inset-[18%] rounded-full ${
                                    corridor.orientation === 'horizontal'
                                        ? 'maze-corridor-flow--horizontal'
                                        : 'maze-corridor-flow--vertical'
                                }`}
                            />
                        </div>
                    ))}

                    <div
                        className="absolute h-[4.6%] w-[4.6%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/50 bg-white/80 shadow-[0_0_0_12px_rgba(14,165,233,0.08)] dark:border-white/10 dark:bg-slate-900/80 dark:shadow-[0_0_0_12px_rgba(34,211,238,0.08)]"
                        style={{ left: `${scene.hubLeft}%`, top: `${scene.hubTop}%` }}
                    >
                        <div className="maze-hub-pulse absolute inset-0 rounded-full" />
                    </div>

                    {scene.rooms.map((roomModel) => {
                        const isActiveRoom = activeAgent?.roomId === roomModel.room.id;
                        return (
                            <div
                                key={roomModel.room.id}
                                className="absolute overflow-hidden rounded-[28px] border border-slate-200/90 bg-white/78 shadow-[0_20px_45px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-slate-900/72 dark:shadow-[0_18px_44px_rgba(2,6,23,0.42)]"
                                style={{
                                    left: `${roomModel.left}%`,
                                    top: `${roomModel.top}%`,
                                    width: `${roomModel.width}%`,
                                    height: `${roomModel.height}%`,
                                    boxShadow: isActiveRoom
                                        ? `0 24px 60px ${hexToRgba(roomModel.room.color, 0.18)}`
                                        : undefined,
                                }}
                            >
                                <div
                                    className="absolute inset-0 opacity-95"
                                    style={{
                                        background: `radial-gradient(circle at top left, ${hexToRgba(
                                            roomModel.room.color,
                                            0.2,
                                        )}, transparent 40%)`,
                                    }}
                                />
                                <div
                                    className="absolute inset-[10px] rounded-[22px] opacity-50"
                                    style={{
                                        backgroundImage:
                                            'linear-gradient(rgba(255,255,255,0.24) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.18) 1px, transparent 1px)',
                                        backgroundSize: '26px 26px',
                                    }}
                                />
                                <div
                                    className={`absolute top-1/2 h-11 w-5 -translate-y-1/2 rounded-full border border-white/55 bg-white/75 dark:border-white/10 dark:bg-slate-900/80 ${
                                        roomModel.isDoorOnLeft ? '-left-2.5' : '-right-2.5'
                                    }`}
                                />

                                <div className="relative z-10 flex h-full flex-col justify-between p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <div className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                                                {roomModel.room.label}
                                            </div>
                                            <div className="mt-1 text-[11px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                                                {roomModel.room.subtitle}
                                            </div>
                                        </div>
                                        <span
                                            className="rounded-full px-2 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-100"
                                            style={{
                                                backgroundColor: hexToRgba(roomModel.room.color, 0.14),
                                            }}
                                        >
                                            {layout.agents.filter((agent) => agent.roomId === roomModel.room.id).length}
                                        </span>
                                    </div>

                                    <div className="flex items-end justify-between gap-3">
                                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                            {formatRoomKind(roomModel.room.kind)}
                                        </div>
                                        <div className="flex gap-1.5">
                                            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70 shadow-[0_0_12px_rgba(52,211,153,0.55)]" />
                                            <span className="h-2.5 w-2.5 rounded-full bg-cyan-400/65 shadow-[0_0_12px_rgba(56,189,248,0.45)]" />
                                            <span className="h-2.5 w-2.5 rounded-full bg-amber-400/65 shadow-[0_0_12px_rgba(251,191,36,0.45)]" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {scene.desks.map((deskModel) => (
                        <div
                            key={deskModel.desk.id}
                            className="absolute rounded-[12px] border border-slate-300/80 bg-white/88 shadow-[0_8px_18px_rgba(15,23,42,0.08)] dark:border-slate-700/70 dark:bg-slate-900/88 dark:shadow-[0_10px_20px_rgba(2,6,23,0.35)]"
                            style={{
                                left: `${deskModel.left}%`,
                                top: `${deskModel.top}%`,
                                width: `${deskModel.width}%`,
                                height: `${deskModel.height}%`,
                                boxShadow: deskModel.desk.isRemote
                                    ? `0 0 0 1px ${hexToRgba('#38bdf8', 0.34)}, 0 10px 18px rgba(15,23,42,0.08)`
                                    : undefined,
                            }}
                        >
                            <div className="absolute left-[18%] top-[18%] h-[34%] w-[34%] rounded-[4px] bg-slate-300/90 dark:bg-slate-700/80" />
                            <div className="absolute bottom-[18%] right-[16%] h-[16%] w-[26%] rounded-full bg-emerald-400/75 dark:bg-cyan-300/60" />
                        </div>
                    ))}

                    {scene.agents.map((agentModel) => {
                        const displayName = agentModel.agent.agent.meta.fullname || agentModel.agent.agent.agentName;
                        const isActiveAgent = activeAgentId === agentModel.agent.id;
                        const agentShellStyle = {
                            '--maze-agent-move-x': `${agentModel.moveX}%`,
                            '--maze-agent-move-y': `${agentModel.moveY}%`,
                            '--maze-agent-move-duration': `${agentModel.agent.path?.durationMs || 3200}ms`,
                            '--maze-agent-move-delay': `${agentModel.agent.path?.delayMs || 0}ms`,
                            '--maze-agent-bob-duration': `${agentModel.bobDurationMs}ms`,
                            '--maze-agent-bob-delay': `${agentModel.bobDelayMs}ms`,
                        } as CSSProperties;

                        return (
                            <button
                                key={agentModel.agent.id}
                                type="button"
                                className="maze-agent-anchor absolute bg-transparent p-0"
                                style={{
                                    left: `${agentModel.left}%`,
                                    top: `${agentModel.top}%`,
                                    zIndex: agentModel.zIndex,
                                }}
                                onClick={(event) => {
                                    event.stopPropagation();
                                    if (isActiveAgent) {
                                        openHref(agentModel.agent.chatHref);
                                        return;
                                    }

                                    setActiveAgentId(agentModel.agent.id);
                                }}
                                onPointerEnter={() => setActiveAgentId(agentModel.agent.id)}
                                onFocus={() => setActiveAgentId(agentModel.agent.id)}
                                aria-label={`Inspect ${displayName} in the maze`}
                                title={`${displayName} - ${agentModel.agent.summaryText}`}
                            >
                                <span
                                    className={`maze-agent-motion ${
                                        agentModel.agent.state === 'moving' ? 'maze-agent-motion--moving' : ''
                                    }`}
                                    style={agentShellStyle}
                                >
                                    <span
                                        className={`maze-agent-shell maze-agent-shell--${agentModel.agent.state} ${
                                            isActiveAgent ? 'maze-agent-shell--active' : ''
                                        }`}
                                    >
                                        <span
                                            className="maze-agent-glow absolute inset-[12%] rounded-full blur-xl"
                                            style={{
                                                background: `radial-gradient(circle, ${hexToRgba(
                                                    agentModel.agent.isRemote ? '#38bdf8' : '#f59e0b',
                                                    isActiveAgent ? 0.42 : 0.24,
                                                )}, transparent 72%)`,
                                            }}
                                        />
                                        <span className="maze-agent-visual relative flex h-full w-full items-center justify-center">
                                            <AgentAvatar
                                                agent={agentModel.agent.agent}
                                                baseUrl={agentModel.agent.agent.serverUrl || publicUrl}
                                                size={MAZE_AGENT_SIZE_PX}
                                                surface="transparent"
                                                alt={displayName}
                                                className="block"
                                                imageClassName="agent-avatar-pixelated block"
                                            />
                                        </span>
                                        {agentModel.capabilityColors.map((color, capabilityIndex) => (
                                            <span
                                                key={`${agentModel.agent.id}:capability:${capabilityIndex}`}
                                                className={`maze-capability-dot maze-capability-dot--${capabilityIndex + 1}`}
                                                style={{ backgroundColor: color }}
                                            />
                                        ))}
                                        <span
                                            className={`maze-state-beacon maze-state-beacon--${agentModel.agent.state}`}
                                            aria-hidden
                                        />
                                    </span>
                                </span>
                            </button>
                        );
                    })}

                    <div className="pointer-events-none absolute left-4 top-4 rounded-full border border-white/50 bg-white/78 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600 shadow-[0_8px_24px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-slate-900/72 dark:text-slate-300">
                        Hover or tap agents to inspect
                    </div>
                </div>
            </div>

            <div className="rounded-[28px] border border-slate-200/80 bg-white/82 p-4 shadow-[0_18px_50px_rgba(15,23,42,0.06)] backdrop-blur dark:border-white/10 dark:bg-slate-900/72 dark:shadow-[0_22px_55px_rgba(2,6,23,0.45)]">
                {activeAgent ? (
                    <div className="grid gap-4 lg:grid-cols-[96px_minmax(0,1fr)_auto] lg:items-center">
                        <div className="flex h-24 w-24 items-center justify-center rounded-[28px] bg-slate-100 dark:bg-slate-950/80">
                            <AgentAvatar
                                agent={activeAgent.agent}
                                baseUrl={activeAgent.agent.serverUrl || publicUrl}
                                size={88}
                                surface="transparent"
                                alt={activeAgent.agent.meta.fullname || activeAgent.agent.agentName}
                                className="block"
                                imageClassName="agent-avatar-pixelated block"
                            />
                        </div>

                        <div className="min-w-0">
                            <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                                {activeAgent.agent.meta.fullname || activeAgent.agent.agentName}
                            </div>
                            <div className="mt-1 text-sm uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                                {formatMazeState(activeAgent.state)} / {activeAgent.roomLabel}
                                {activeAgent.serverLabel ? ` / ${activeAgent.serverLabel}` : ''}
                            </div>
                            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                                {activeAgent.summaryText}
                            </p>
                            <div className="mt-3 flex flex-wrap gap-2">
                                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                                    {activeAgent.previewText}
                                </span>
                                {activeAgent.capabilityBadges.map((badge) => (
                                    <span
                                        key={badge}
                                        className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-200"
                                    >
                                        {badge}
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2 lg:justify-end">
                            <MazeActionButton icon={UserRound} label="Profile" onClick={() => openHref(activeAgent.profileHref)} />
                            <MazeActionButton icon={MessageSquare} label="Chat" onClick={() => openHref(activeAgent.chatHref)} />
                            <MazeActionButton icon={BookOpen} label="Book" onClick={() => openHref(activeAgent.bookHref)} />
                        </div>
                    </div>
                ) : (
                    <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
                        Select one agent from the maze to inspect its room, capabilities, and routes. Built-in octopus avatars
                        keep their own animated motion while the maze adds only lightweight CSS movement on top.
                    </p>
                )}
            </div>

            <style jsx>{`
                .maze-scene {
                    --maze-agent-size: ${MAZE_AGENT_SIZE_PX}px;
                }

                .maze-corridor-flow {
                    background-size: 160px 160px;
                    opacity: 0.9;
                }

                .maze-corridor-flow--horizontal {
                    background-image: linear-gradient(
                        90deg,
                        transparent 0,
                        rgba(14, 165, 233, 0.16) 18%,
                        rgba(245, 158, 11, 0.32) 50%,
                        rgba(14, 165, 233, 0.16) 82%,
                        transparent 100%
                    );
                    animation: mazeCorridorHorizontal 15s linear infinite;
                }

                .maze-corridor-flow--vertical {
                    background-image: linear-gradient(
                        180deg,
                        transparent 0,
                        rgba(14, 165, 233, 0.16) 18%,
                        rgba(245, 158, 11, 0.32) 50%,
                        rgba(14, 165, 233, 0.16) 82%,
                        transparent 100%
                    );
                    animation: mazeCorridorVertical 15s linear infinite;
                }

                .maze-hub-pulse {
                    animation: mazeHubPulse 2.4s ease-in-out infinite;
                    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.35);
                }

                .maze-agent-anchor {
                    width: var(--maze-agent-size);
                    height: calc(var(--maze-agent-size) + 10px);
                    transform: translate(-50%, -58%);
                }

                .maze-agent-motion {
                    position: relative;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    width: 100%;
                    height: 100%;
                }

                .maze-agent-motion--moving {
                    animation: mazeAgentMove var(--maze-agent-move-duration) ease-in-out infinite alternate;
                    animation-delay: var(--maze-agent-move-delay);
                }

                .maze-agent-shell {
                    position: relative;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    width: 100%;
                    height: var(--maze-agent-size);
                    animation: mazeAgentBob var(--maze-agent-bob-duration) ease-in-out infinite;
                    animation-delay: var(--maze-agent-bob-delay);
                    transition:
                        transform 180ms ease,
                        filter 180ms ease;
                    filter: drop-shadow(0 12px 18px rgba(15, 23, 42, 0.18));
                }

                .maze-agent-shell--working {
                    animation-name: mazeAgentWork;
                }

                .maze-agent-shell--meeting {
                    animation-name: mazeAgentMeeting;
                }

                .maze-agent-shell--moving {
                    animation-name: mazeAgentBob;
                }

                .maze-agent-shell--active {
                    transform: scale(1.06);
                    filter: drop-shadow(0 16px 24px rgba(14, 165, 233, 0.22));
                }

                .maze-agent-visual {
                    position: relative;
                    z-index: 2;
                    width: var(--maze-agent-size);
                    height: var(--maze-agent-size);
                }

                .maze-capability-dot {
                    position: absolute;
                    z-index: 3;
                    width: 10px;
                    height: 10px;
                    border-radius: 9999px;
                    box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.75), 0 0 18px currentColor;
                    animation: mazeCapabilityPulse 2.2s ease-in-out infinite;
                }

                .maze-capability-dot--1 {
                    left: 8%;
                    top: 14%;
                }

                .maze-capability-dot--2 {
                    right: 6%;
                    top: 18%;
                    animation-delay: 0.2s;
                }

                .maze-capability-dot--3 {
                    right: 12%;
                    bottom: 10%;
                    animation-delay: 0.4s;
                }

                .maze-state-beacon {
                    position: absolute;
                    right: 8%;
                    bottom: 10%;
                    z-index: 4;
                    width: 14px;
                    height: 14px;
                    border-radius: 9999px;
                    border: 2px solid rgba(255, 255, 255, 0.9);
                    box-shadow: 0 0 18px rgba(15, 23, 42, 0.2);
                }

                .maze-state-beacon--idle {
                    background: #94a3b8;
                }

                .maze-state-beacon--working {
                    background: #0ea5e9;
                }

                .maze-state-beacon--meeting {
                    background: #10b981;
                }

                .maze-state-beacon--moving {
                    background: #f59e0b;
                }

                @keyframes mazeCorridorHorizontal {
                    from {
                        transform: translateX(-36%);
                    }

                    to {
                        transform: translateX(36%);
                    }
                }

                @keyframes mazeCorridorVertical {
                    from {
                        transform: translateY(-36%);
                    }

                    to {
                        transform: translateY(36%);
                    }
                }

                @keyframes mazeHubPulse {
                    0%,
                    100% {
                        transform: scale(0.94);
                        opacity: 0.4;
                    }

                    50% {
                        transform: scale(1.22);
                        opacity: 0.85;
                    }
                }

                @keyframes mazeAgentMove {
                    from {
                        transform: translate(0, 0);
                    }

                    to {
                        transform: translate(var(--maze-agent-move-x), var(--maze-agent-move-y));
                    }
                }

                @keyframes mazeAgentBob {
                    0%,
                    100% {
                        transform: translateY(-2px) rotate(-1deg);
                    }

                    50% {
                        transform: translateY(2px) rotate(1deg);
                    }
                }

                @keyframes mazeAgentWork {
                    0%,
                    100% {
                        transform: translateY(-1px) rotate(-2deg) scale(1);
                    }

                    35% {
                        transform: translateY(3px) rotate(1deg) scale(1.02);
                    }

                    70% {
                        transform: translateY(0) rotate(-1deg) scale(0.99);
                    }
                }

                @keyframes mazeAgentMeeting {
                    0%,
                    100% {
                        transform: translateY(0) scale(1);
                    }

                    50% {
                        transform: translateY(-4px) scale(1.04);
                    }
                }

                @keyframes mazeCapabilityPulse {
                    0%,
                    100% {
                        transform: scale(0.9);
                        opacity: 0.7;
                    }

                    50% {
                        transform: scale(1.15);
                        opacity: 1;
                    }
                }
            `}</style>
        </div>
    );
}

/**
 * Renders one compact summary pill above the scene.
 */
function MazeStatPill({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] dark:border-white/10 dark:bg-slate-950/70">
            <span className="font-semibold text-slate-900 dark:text-slate-100">{value}</span>
            <span className="ml-2 text-slate-500 dark:text-slate-400">{label}</span>
        </div>
    );
}

/**
 * Renders one action button inside the selected-agent panel.
 */
function MazeActionButton({
    icon: Icon,
    label,
    onClick,
}: {
    icon: typeof UserRound;
    label: string;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900 dark:border-white/10 dark:bg-slate-950/70 dark:text-slate-200 dark:hover:border-white/20 dark:hover:text-white"
        >
            <Icon className="h-4 w-4" />
            {label}
        </button>
    );
}

/**
 * Converts the office layout into normalized percentages for the maze renderer.
 *
 * @param layout - Office layout shared with the other homepage visualizations.
 * @returns Prepared top-down maze scene.
 */
function createMazeScene(layout: OfficeLayout): MazeScene {
    const corridorThicknessX = toPercentX(MAZE_CORRIDOR_THICKNESS_WORLD, layout.worldWidth);
    const corridorThicknessY = toPercentY(MAZE_CORRIDOR_THICKNESS_WORLD, layout.worldHeight);
    const roomAgentsByRoomId = layout.agents.reduce<Map<string, Array<OfficeAgentVisual>>>((map, agent) => {
        const agentsInRoom = map.get(agent.roomId) || [];
        agentsInRoom.push(agent);
        map.set(agent.roomId, agentsInRoom);
        return map;
    }, new Map());
    const rooms = layout.rooms.map((room) => ({
        room,
        left: toPercentX(room.x, layout.worldWidth),
        top: toPercentY(room.y, layout.worldHeight),
        width: toPercentX(room.width, layout.worldWidth),
        height: toPercentY(room.depth, layout.worldHeight),
        isDoorOnLeft: room.corridorAnchor.x < room.x + room.width / 2,
    }));
    const desks = layout.desks.map((desk) => ({
        desk,
        left: toPercentX(desk.x - desk.width / 2, layout.worldWidth),
        top: toPercentY(desk.y - desk.depth / 2, layout.worldHeight),
        width: toPercentX(desk.width, layout.worldWidth),
        height: toPercentY(desk.depth, layout.worldHeight),
    }));
    const corridorTop = Math.min(layout.corridorHub.y, ...layout.rooms.map((room) => room.corridorAnchor.y));
    const corridorBottom = Math.max(layout.corridorHub.y, ...layout.rooms.map((room) => room.corridorAnchor.y));
    const corridors: Array<MazeSceneCorridor> = [
        {
            id: 'corridor:spine',
            orientation: 'vertical',
            left: toPercentX(layout.corridorHub.x, layout.worldWidth) - corridorThicknessX / 2,
            top: toPercentY(corridorTop, layout.worldHeight) - corridorThicknessY / 2,
            width: corridorThicknessX,
            height: toPercentY(corridorBottom - corridorTop, layout.worldHeight) + corridorThicknessY,
        },
    ];

    for (const room of layout.rooms) {
        const doorX = room.corridorAnchor.x < room.x + room.width / 2 ? room.x : room.x + room.width;
        const corridorLeft = Math.min(doorX, layout.corridorHub.x);
        const corridorWidth = Math.abs(layout.corridorHub.x - doorX);

        corridors.push({
            id: `corridor:${room.id}`,
            orientation: 'horizontal',
            left: toPercentX(corridorLeft, layout.worldWidth),
            top: toPercentY(room.corridorAnchor.y, layout.worldHeight) - corridorThicknessY / 2,
            width: toPercentX(corridorWidth, layout.worldWidth),
            height: corridorThicknessY,
        });
    }

    const agents = layout.agents.map((agent) => {
        const roomAgents = roomAgentsByRoomId.get(agent.roomId) || [];
        const roomIndex = roomAgents.findIndex((roomAgent) => roomAgent.id === agent.id);
        const agentSeed = agent.seed + roomIndex * 17;

        return {
            agent,
            left: toPercentX(agent.position.x, layout.worldWidth),
            top: toPercentY(agent.position.y, layout.worldHeight),
            moveX: agent.path ? toPercentX(agent.path.to.x - agent.path.from.x, layout.worldWidth) : 0,
            moveY: agent.path ? toPercentY(agent.path.to.y - agent.path.from.y, layout.worldHeight) : 0,
            zIndex: 20 + Math.round(toPercentY(agent.position.y, layout.worldHeight) * 10),
            bobDurationMs: 2800 + (agentSeed % 900),
            bobDelayMs: agentSeed % 800,
            capabilityColors: createCapabilityColors(agent),
        };
    });

    return {
        rooms,
        desks,
        corridors,
        agents,
        hubLeft: toPercentX(layout.corridorHub.x, layout.worldWidth),
        hubTop: toPercentY(layout.corridorHub.y, layout.worldHeight),
    };
}

/**
 * Converts a world-space X dimension into a scene percentage.
 *
 * @param value - World-space X coordinate.
 * @param worldWidth - Total scene width.
 * @returns Percentage in the 0..100 range.
 */
function toPercentX(value: number, worldWidth: number): number {
    return (value / worldWidth) * 100;
}

/**
 * Converts a world-space Y dimension into a scene percentage.
 *
 * @param value - World-space Y coordinate.
 * @param worldHeight - Total scene height.
 * @returns Percentage in the 0..100 range.
 */
function toPercentY(value: number, worldHeight: number): number {
    return (value / worldHeight) * 100;
}

/**
 * Resolves a short label for one room kind.
 *
 * @param roomKind - Office room kind.
 * @returns User-facing room kind label.
 */
function formatRoomKind(roomKind: OfficeRoom['kind']): string {
    if (roomKind === 'head-office') {
        return 'Head Office';
    }

    if (roomKind === 'remote') {
        return 'Remote';
    }

    if (roomKind === 'folder') {
        return 'Project room';
    }

    return 'Shared floor';
}

/**
 * Resolves a user-facing activity label for the maze detail panel.
 *
 * @param state - Agent activity state.
 * @returns User-facing state label.
 */
function formatMazeState(state: OfficeAgentVisual['state']): string {
    if (state === 'working') {
        return 'Working';
    }

    if (state === 'meeting') {
        return 'Meeting';
    }

    if (state === 'moving') {
        return 'In transit';
    }

    return 'Idle';
}

/**
 * Resolves a small list of capability colors for one rendered agent.
 *
 * @param agent - Agent visual record.
 * @returns Stable capability colors.
 */
function createCapabilityColors(agent: OfficeAgentVisual): Array<string> {
    const badgeCount = Math.max(1, Math.min(MAX_CAPABILITY_DOTS, agent.capabilityBadges.length || 1));

    return Array.from(
        { length: badgeCount },
        (_, index) => CAPABILITY_DOT_COLORS[(agent.seed + index) % CAPABILITY_DOT_COLORS.length]!,
    );
}

/**
 * Converts a hex color into an rgba string so room accents can stay lightweight.
 *
 * @param color - Hex-like color string.
 * @param alpha - Target alpha channel.
 * @returns Rgba color string.
 */
function hexToRgba(color: string, alpha: number): string {
    const normalized = color.replace('#', '');
    const expanded = normalized.length === 3 ? normalized.split('').map((part) => `${part}${part}`).join('') : normalized;

    if (!/^[0-9a-fA-F]{6}$/.test(expanded)) {
        return `rgba(14, 165, 233, ${alpha})`;
    }

    const red = parseInt(expanded.slice(0, 2), 16);
    const green = parseInt(expanded.slice(2, 4), 16);
    const blue = parseInt(expanded.slice(4, 6), 16);

    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}
