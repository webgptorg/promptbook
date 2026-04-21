'use client';

import { Bot, Building2, Network, Sparkles, type LucideIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
    useEffect,
    useMemo,
    useRef,
    useState,
    type CSSProperties,
    type FocusEvent as ReactFocusEvent,
} from 'react';
import type { AgentOrganizationAgent, AgentOrganizationFolder } from '../../utils/agentOrganization/types';
import { useAgentNaming } from '../AgentNaming/AgentNamingContext';
import { AgentAvatar } from '../AgentAvatar/AgentAvatar';
import { buildOfficeLayout, type OfficePoint } from './buildOfficeLayout';
import { OfficeTooltip } from './OfficeTooltip';
import { buildMazeScene, type MazeAgentVisual, type MazeCorridorSegment, type MazeRoomVisual } from './buildMazeScene';
import type { AgentWithVisibility } from './useFederatedAgents';

/**
 * Height reserved for the maze canvas container.
 */
const MAZE_CANVAS_HEIGHT = 780;

/**
 * Fixed avatar-pod size rendered inside the maze.
 */
const MAZE_AGENT_POD_SIZE = 86;

/**
 * Width reserved for the hover tooltip panel.
 */
const TOOLTIP_WIDTH = 240;

/**
 * Interval used to advance simple avatar and corridor motion.
 */
const MAZE_ANIMATION_INTERVAL_MS = 120;

/**
 * Props for the maze-office homepage visualization.
 */
type AgentsMazeOfficeProps = {
    agents: ReadonlyArray<AgentOrganizationAgent>;
    federatedAgents: ReadonlyArray<AgentWithVisibility>;
    publicUrl: string;
    folders: ReadonlyArray<AgentOrganizationFolder>;
};

/**
 * Measured maze container size used for stage fitting.
 */
type MazeContainerSize = {
    width: number;
    height: number;
};

/**
 * Hover tooltip state for one maze agent.
 */
type MazeTooltipState = {
    agentId: string;
    x: number;
    y: number;
};

/**
 * Render-ready maze agent model with resolved screen-space point.
 */
type MazeRenderedAgent = {
    mazeAgent: MazeAgentVisual;
    point: OfficePoint;
};

/**
 * Renders the top-down maze office homepage view.
 */
export function AgentsMazeOffice(props: AgentsMazeOfficeProps) {
    const { agents, federatedAgents, publicUrl, folders } = props;
    const router = useRouter();
    const { formatText } = useAgentNaming();
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [containerSize, setContainerSize] = useState<MazeContainerSize>({
        width: 1200,
        height: MAZE_CANVAS_HEIGHT,
    });
    const [tooltipState, setTooltipState] = useState<MazeTooltipState | null>(null);
    const [animationClockMs, setAnimationClockMs] = useState(() => Date.now());

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
    const mazeScene = useMemo(() => buildMazeScene(layout), [layout]);

    useEffect(() => {
        const container = containerRef.current;

        if (!container) {
            return;
        }

        const resizeObserver = new ResizeObserver((entries) => {
            const nextEntry = entries[0];

            if (!nextEntry) {
                return;
            }

            setContainerSize({
                width: nextEntry.contentRect.width,
                height: nextEntry.contentRect.height,
            });
        });

        resizeObserver.observe(container);

        return () => {
            resizeObserver.disconnect();
        };
    }, []);

    useEffect(() => {
        const intervalId = window.setInterval(() => {
            setAnimationClockMs(Date.now());
        }, MAZE_ANIMATION_INTERVAL_MS);

        return () => {
            window.clearInterval(intervalId);
        };
    }, []);

    const hoveredAgent = useMemo(
        () =>
            tooltipState
                ? mazeScene.agents.find((mazeAgent) => mazeAgent.id === tooltipState.agentId)?.officeAgent || null
                : null,
        [tooltipState, mazeScene.agents],
    );
    const renderedAgents = useMemo<Array<MazeRenderedAgent>>(
        () =>
            mazeScene.agents
                .map((mazeAgent) => ({
                    mazeAgent,
                    point: resolveMazeAgentPoint(mazeAgent, animationClockMs),
                }))
                .sort((left, right) => left.point.y - right.point.y),
        [mazeScene.agents, animationClockMs],
    );
    const mazeScale = useMemo(() => {
        const widthScale = (containerSize.width - 56) / mazeScene.width;
        const heightScale = (containerSize.height - 56) / mazeScene.height;

        return Math.min(1, widthScale, heightScale);
    }, [containerSize.height, containerSize.width, mazeScene.height, mazeScene.width]);

    /**
     * Opens one local or federated agent route.
     *
     * @param href - Relative route or absolute remote URL.
     */
    const openHref = (href: string): void => {
        if (/^https?:\/\//.test(href)) {
            window.open(href, '_blank', 'noopener,noreferrer');
            return;
        }

        router.push(href);
    };

    /**
     * Updates the hover tooltip anchor for one maze agent.
     *
     * @param clientX - Pointer X coordinate.
     * @param clientY - Pointer Y coordinate.
     * @param agentId - Hovered maze agent identifier.
     */
    const updateTooltip = (clientX: number, clientY: number, agentId: string): void => {
        const containerRect = containerRef.current?.getBoundingClientRect();

        if (!containerRect) {
            return;
        }

        setTooltipState({
            agentId,
            x: clientX - containerRect.left,
            y: clientY - containerRect.top,
        });
    };

    /**
     * Clears the current tooltip.
     */
    const clearTooltip = (): void => {
        setTooltipState(null);
    };

    if (mazeScene.agents.length === 0) {
        return <div className="flex justify-center py-12 text-gray-500">{formatText('No agents to show in maze.')}</div>;
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3 rounded-[26px] border border-slate-200 bg-white/80 px-5 py-4 shadow-sm backdrop-blur">
                <div className="max-w-2xl">
                    <div className="text-xs font-semibold uppercase tracking-[0.34em] text-sky-700">Maze Office</div>
                    <p className="mt-2 text-sm leading-6 text-slate-700">
                        Agents share rooms, thread through corridors, and pulse with activity. Hover any avatar pod to inspect
                        the agent and open its workspace.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-700">
                    <MazeSummaryChip icon={Building2} label="Rooms" value={mazeScene.rooms.length} />
                    <MazeSummaryChip icon={Bot} label="Agents" value={mazeScene.agents.length} />
                    <MazeSummaryChip icon={Network} label="Corridors" value={mazeScene.corridors.length} />
                    <MazeSummaryChip icon={Sparkles} label="Moving" value={layout.stateCounts.moving} accent="sky" />
                </div>
            </div>

            <div
                ref={containerRef}
                className="relative overflow-hidden rounded-[34px] border border-slate-200 bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.14),_rgba(255,255,255,0)_28%),radial-gradient(circle_at_bottom_right,_rgba(251,191,36,0.12),_rgba(255,255,255,0)_30%),linear-gradient(180deg,_rgba(248,250,252,0.98),_rgba(226,232,240,0.96))] shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_32px_120px_rgba(15,23,42,0.08)]"
                style={{ height: MAZE_CANVAS_HEIGHT }}
            >
                <div className="pointer-events-none absolute inset-0 opacity-70">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.6),_rgba(255,255,255,0)_58%)]" />
                    <div
                        className="absolute inset-0"
                        style={{
                            backgroundImage:
                                'linear-gradient(to right, rgba(148,163,184,0.14) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.14) 1px, transparent 1px)',
                            backgroundSize: '44px 44px',
                        }}
                    />
                </div>

                <div
                    className="absolute left-1/2 top-1/2 origin-center"
                    style={{
                        width: mazeScene.width,
                        height: mazeScene.height,
                        transform: `translate(-50%, -50%) scale(${mazeScale})`,
                    }}
                >
                    <div className="absolute inset-0 rounded-[40px] border border-white/60 shadow-[inset_0_0_0_1px_rgba(148,163,184,0.08)]" />

                    {mazeScene.corridors.map((corridor) => (
                        <MazeCorridorSegmentView key={corridor.id} corridor={corridor} />
                    ))}

                    <div
                        className="absolute rounded-full border border-sky-300/60 bg-sky-400/18 shadow-[0_0_0_10px_rgba(125,211,252,0.14),0_0_44px_rgba(56,189,248,0.24)]"
                        style={{
                            left: mazeScene.hubPoint.x - 42,
                            top: mazeScene.hubPoint.y - 42,
                            width: 84,
                            height: 84,
                        }}
                    >
                        <div className="absolute inset-[14px] rounded-full border border-white/80 bg-white/70 backdrop-blur" />
                        <div className="absolute inset-0 animate-pulse rounded-full border border-sky-200/80" />
                    </div>

                    {mazeScene.rooms.map((room) => (
                        <MazeRoomCard key={room.room.id} room={room} />
                    ))}

                    {renderedAgents.map(({ mazeAgent, point }) => {
                        const officeAgent = mazeAgent.officeAgent;
                        const displayName = officeAgent.agent.meta.fullname || officeAgent.agent.agentName;

                        return (
                            <button
                                key={mazeAgent.id}
                                type="button"
                                onMouseEnter={(event) => updateTooltip(event.clientX, event.clientY, mazeAgent.id)}
                                onMouseMove={(event) => updateTooltip(event.clientX, event.clientY, mazeAgent.id)}
                                onMouseLeave={clearTooltip}
                                onFocus={(event) => handleAgentFocus(event, updateTooltip, mazeAgent.id)}
                                onBlur={clearTooltip}
                                onClick={() => openHref(officeAgent.profileHref)}
                                className="absolute bg-transparent p-0 text-left"
                                style={{
                                    left: point.x - MAZE_AGENT_POD_SIZE / 2,
                                    top: point.y - MAZE_AGENT_POD_SIZE / 2,
                                    width: MAZE_AGENT_POD_SIZE,
                                    height: MAZE_AGENT_POD_SIZE + 26,
                                }}
                                title={`${displayName} - ${officeAgent.summaryText}`}
                                aria-label={`Open ${displayName}`}
                            >
                                <MazeAgentPod mazeAgent={mazeAgent} publicUrl={publicUrl} />
                                <span className="mt-2 inline-flex max-w-full rounded-full border border-slate-200/90 bg-white/90 px-2 py-1 text-[11px] font-semibold text-slate-700 shadow-sm backdrop-blur">
                                    <span className="truncate">{displayName}</span>
                                </span>
                            </button>
                        );
                    })}
                </div>

                {hoveredAgent && tooltipState && (
                    <OfficeTooltip
                        agent={hoveredAgent}
                        publicUrl={publicUrl}
                        x={clamp(tooltipState.x + 18, 18, containerSize.width - TOOLTIP_WIDTH - 18)}
                        y={clamp(tooltipState.y - 12, 18, containerSize.height - 218)}
                        onOpenProfile={() => openHref(hoveredAgent.profileHref)}
                        onOpenChat={() => openHref(hoveredAgent.chatHref)}
                        onOpenBook={() => openHref(hoveredAgent.bookHref)}
                    />
                )}
            </div>

            <style jsx global>{`
                .maze-agent-shell {
                    animation: maze-avatar-float 3.1s ease-in-out infinite;
                }

                .maze-agent-pulse {
                    animation: maze-avatar-pulse 2.4s ease-in-out infinite;
                }

                .maze-agent-tentacle {
                    transform: translate(-50%, -34%) rotate(var(--maze-angle));
                    transform-origin: 50% 12%;
                    animation: maze-tentacle-sway var(--maze-duration) ease-in-out infinite;
                    animation-delay: var(--maze-delay);
                }

                .maze-corridor-flow {
                    animation: maze-corridor-drift 4.6s linear infinite;
                }

                @keyframes maze-avatar-float {
                    0%,
                    100% {
                        transform: translateY(0px);
                    }
                    50% {
                        transform: translateY(-4px);
                    }
                }

                @keyframes maze-avatar-pulse {
                    0%,
                    100% {
                        opacity: 0.4;
                        transform: scale(0.94);
                    }
                    50% {
                        opacity: 0.92;
                        transform: scale(1.06);
                    }
                }

                @keyframes maze-tentacle-sway {
                    0%,
                    100% {
                        transform: translate(-50%, -34%) rotate(calc(var(--maze-angle) - 9deg)) scaleY(0.94);
                    }
                    50% {
                        transform: translate(-50%, -40%) rotate(calc(var(--maze-angle) + 11deg)) scaleY(1.08);
                    }
                }

                @keyframes maze-corridor-drift {
                    0% {
                        transform: translate3d(0, 0, 0);
                    }
                    100% {
                        transform: translate3d(56px, 0, 0);
                    }
                }
            `}</style>
        </div>
    );
}

/**
 * Renders one summary chip in the maze header.
 *
 * @param props - Summary chip icon, label, and value.
 * @returns Summary chip element.
 */
function MazeSummaryChip({
    icon: Icon,
    label,
    value,
    accent = 'slate',
}: {
    icon: LucideIcon;
    label: string;
    value: number;
    accent?: 'slate' | 'sky';
}) {
    return (
        <span
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 ${
                accent === 'sky'
                    ? 'border-sky-200 bg-sky-50 text-sky-700'
                    : 'border-slate-200 bg-slate-50 text-slate-700'
            }`}
        >
            <Icon className="h-3.5 w-3.5" />
            <span>{label}</span>
            <span className="rounded-full bg-white/90 px-2 py-0.5 text-[11px] shadow-sm">{value}</span>
        </span>
    );
}

/**
 * Renders one absolute-positioned corridor segment.
 *
 * @param props - Corridor segment to render.
 * @returns Corridor block element.
 */
function MazeCorridorSegmentView({ corridor }: { corridor: MazeCorridorSegment }) {
    const toneClasses =
        corridor.tone === 'spine'
            ? 'border-sky-300/70 bg-[linear-gradient(90deg,_rgba(224,242,254,0.92),_rgba(186,230,253,0.98),_rgba(224,242,254,0.92))] shadow-[0_0_38px_rgba(56,189,248,0.18)]'
            : corridor.tone === 'alcove'
            ? 'border-amber-200/70 bg-[linear-gradient(90deg,_rgba(254,249,195,0.88),_rgba(253,230,138,0.92),_rgba(254,249,195,0.88))] shadow-[0_0_24px_rgba(245,158,11,0.12)]'
            : 'border-slate-300/70 bg-[linear-gradient(90deg,_rgba(255,255,255,0.9),_rgba(226,232,240,0.96),_rgba(255,255,255,0.9))] shadow-[0_0_24px_rgba(148,163,184,0.14)]';

    return (
        <div
            className={`absolute overflow-hidden rounded-[999px] border ${toneClasses}`}
            style={{
                left: corridor.x,
                top: corridor.y,
                width: corridor.width,
                height: corridor.height,
            }}
        >
            <div className="maze-corridor-flow absolute inset-0 opacity-60">
                <div
                    className="absolute inset-0"
                    style={{
                        backgroundImage:
                            'repeating-linear-gradient(90deg, rgba(255,255,255,0.58) 0, rgba(255,255,255,0.58) 18px, rgba(255,255,255,0) 18px, rgba(255,255,255,0) 42px)',
                    }}
                />
            </div>
        </div>
    );
}

/**
 * Renders one maze room surface with labels and route beacons.
 *
 * @param props - Maze room record.
 * @returns Room card element.
 */
function MazeRoomCard({ room }: { room: MazeRoomVisual }) {
    const roomSurfaceClasses =
        room.room.kind === 'head-office'
            ? 'border-sky-300/70 bg-[radial-gradient(circle_at_top_left,_rgba(219,234,254,0.96),_rgba(191,219,254,0.82)_38%,_rgba(224,242,254,0.78))] shadow-[0_26px_60px_rgba(30,64,175,0.12)]'
            : room.room.kind === 'remote'
            ? 'border-blue-200/70 bg-[radial-gradient(circle_at_top_left,_rgba(239,246,255,0.96),_rgba(219,234,254,0.86)_34%,_rgba(226,232,240,0.82))] shadow-[0_22px_50px_rgba(59,130,246,0.1)]'
            : 'border-slate-200/80 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.98),_rgba(248,250,252,0.96)_36%,_rgba(226,232,240,0.88))] shadow-[0_24px_52px_rgba(15,23,42,0.08)]';

    return (
        <>
            <div
                className={`absolute rounded-[30px] border p-5 ${roomSurfaceClasses}`}
                style={{
                    left: room.x,
                    top: room.y,
                    width: room.width,
                    height: room.height,
                }}
            >
                <div
                    className="absolute inset-[10px] rounded-[24px] border border-white/70"
                    style={{
                        backgroundImage:
                            'linear-gradient(to right, rgba(148,163,184,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.08) 1px, transparent 1px)',
                        backgroundSize: '28px 28px',
                    }}
                />

                <div className="relative z-10 inline-flex rounded-full border border-white/70 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-600">
                    {room.room.kind === 'head-office'
                        ? 'Head Office'
                        : room.room.kind === 'remote'
                        ? 'Remote Wing'
                        : room.room.kind === 'folder'
                        ? 'Project Room'
                        : 'Core Floor'}
                </div>
                <div className="relative z-10 mt-3 text-lg font-semibold text-slate-900">{room.room.label}</div>
                <div className="relative z-10 mt-1 text-sm text-slate-600">{room.room.subtitle}</div>

                <div className="relative z-10 mt-5 inline-flex rounded-2xl border border-slate-200/80 bg-white/78 px-3 py-2 text-xs font-medium text-slate-700 shadow-sm">
                    {room.agentCount} {room.agentCount === 1 ? 'agent' : 'agents'} in room
                </div>

                <div
                    className="absolute bottom-4 left-5 right-5 h-10 rounded-2xl border border-slate-200/80 bg-white/70"
                    style={{
                        boxShadow: `inset 0 0 0 1px ${room.room.color}22`,
                    }}
                />
            </div>

            <div
                className="absolute rounded-full border border-white/80 bg-white/90 shadow-[0_0_20px_rgba(56,189,248,0.2)]"
                style={{
                    left: room.spinePoint.x - 8,
                    top: room.spinePoint.y - 8,
                    width: 16,
                    height: 16,
                }}
            />
        </>
    );
}

/**
 * Renders one avatar pod that stays agnostic to the underlying avatar visual.
 *
 * @param props - Maze agent render record and current server URL.
 * @returns Avatar pod element.
 */
function MazeAgentPod({ mazeAgent, publicUrl }: { mazeAgent: MazeAgentVisual; publicUrl: string }) {
    const displayName = mazeAgent.officeAgent.agent.meta.fullname || mazeAgent.officeAgent.agent.agentName;

    return (
        <div className="relative flex h-[86px] w-[86px] items-center justify-center">
            {mazeAgent.tentacles.map((tentacle, tentacleIndex) => (
                <span
                    key={`${mazeAgent.id}:tentacle:${tentacleIndex}`}
                    className="maze-agent-tentacle absolute left-1/2 top-1/2 rounded-full opacity-90"
                    style={
                        {
                            width: tentacle.thickness,
                            height: tentacle.length,
                            '--maze-angle': `${tentacle.angleDeg}deg`,
                            '--maze-delay': `${tentacle.delayMs}ms`,
                            '--maze-duration': `${tentacle.durationMs}ms`,
                            background: `linear-gradient(180deg, rgba(255,255,255,0.08), ${mazeAgent.pulseColor})`,
                            boxShadow: `0 0 16px ${mazeAgent.pulseColor}`,
                        } as CSSProperties
                    }
                />
            ))}

            <span
                className="maze-agent-pulse absolute inset-3 rounded-[34%] border"
                style={{
                    borderColor: mazeAgent.pulseColor,
                    boxShadow: `0 0 0 8px ${convertPulseColorToHalo(mazeAgent.pulseColor)}`,
                }}
            />

            <div className="maze-agent-shell relative flex h-[62px] w-[62px] items-center justify-center rounded-[34%] border border-white/80 bg-white/92 shadow-[0_14px_36px_rgba(15,23,42,0.18)] backdrop-blur">
                <div className="absolute inset-[6px] overflow-hidden rounded-[28%] bg-slate-100">
                    <AgentAvatar
                        agent={mazeAgent.officeAgent.agent}
                        baseUrl={mazeAgent.officeAgent.agent.serverUrl || publicUrl}
                        size={50}
                        alt={displayName}
                        className="h-full w-full"
                        imageClassName="agent-avatar-pixelated h-full w-full object-cover"
                    />
                </div>

                <span
                    className={`absolute -bottom-1.5 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.24em] ${
                        mazeAgent.officeAgent.state === 'meeting'
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                            : mazeAgent.officeAgent.state === 'moving'
                            ? 'border-sky-200 bg-sky-50 text-sky-700'
                            : mazeAgent.officeAgent.state === 'working'
                            ? 'border-blue-200 bg-blue-50 text-blue-700'
                            : 'border-slate-200 bg-slate-50 text-slate-600'
                    }`}
                >
                    {mazeAgent.officeAgent.state}
                </span>
            </div>
        </div>
    );
}

/**
 * Positions the tooltip when a maze agent gains keyboard focus.
 *
 * @param event - Focus event from the avatar button.
 * @param updateTooltip - Tooltip updater callback.
 * @param agentId - Maze agent identifier.
 */
function handleAgentFocus(
    event: ReactFocusEvent<HTMLButtonElement>,
    updateTooltip: (clientX: number, clientY: number, agentId: string) => void,
    agentId: string,
): void {
    const buttonRect = event.currentTarget.getBoundingClientRect();
    updateTooltip(buttonRect.left + buttonRect.width / 2, buttonRect.top + buttonRect.height / 2, agentId);
}

/**
 * Resolves the current top-down point for one maze agent.
 *
 * @param mazeAgent - Maze agent visual record.
 * @param animationClockMs - Current animation clock.
 * @returns Current scene point.
 */
function resolveMazeAgentPoint(mazeAgent: MazeAgentVisual, animationClockMs: number): OfficePoint {
    if (!mazeAgent.motionPath || mazeAgent.motionPath.length < 2) {
        return mazeAgent.position;
    }

    const loopDurationMs = mazeAgent.motionDelayMs + mazeAgent.motionDurationMs;
    const seededPhaseMs = (animationClockMs + (mazeAgent.officeAgent.seed % Math.max(1, loopDurationMs))) % Math.max(1, loopDurationMs);

    if (seededPhaseMs <= mazeAgent.motionDelayMs) {
        return mazeAgent.motionPath[0] || mazeAgent.position;
    }

    const walkProgress = (seededPhaseMs - mazeAgent.motionDelayMs) / Math.max(1, mazeAgent.motionDurationMs);
    return interpolatePolylinePoint(mazeAgent.motionPath, mirrorProgress(walkProgress));
}

/**
 * Mirrors one 0..1 progress value into a ping-pong 0..1..0 motion.
 *
 * @param progress - Forward progress value.
 * @returns Ping-pong progress.
 */
function mirrorProgress(progress: number): number {
    const clampedProgress = clamp(progress, 0, 1);
    return clampedProgress <= 0.5 ? clampedProgress * 2 : (1 - clampedProgress) * 2;
}

/**
 * Interpolates one point along a polyline using normalized progress.
 *
 * @param points - Polyline points.
 * @param progress - Progress from 0..1.
 * @returns Point on the polyline.
 */
function interpolatePolylinePoint(points: ReadonlyArray<OfficePoint>, progress: number): OfficePoint {
    if (points.length === 0) {
        return { x: 0, y: 0 };
    }

    if (points.length === 1) {
        return points[0] || { x: 0, y: 0 };
    }

    const segmentLengths = points.slice(1).map((point, index) => measureDistance(points[index] || point, point));
    const totalLength = segmentLengths.reduce((sum, length) => sum + length, 0);

    if (totalLength <= 0) {
        return points[0] || { x: 0, y: 0 };
    }

    let remainingLength = totalLength * clamp(progress, 0, 1);

    for (let index = 0; index < segmentLengths.length; index++) {
        const segmentLength = segmentLengths[index] || 0;
        const from = points[index];
        const to = points[index + 1];

        if (!from || !to) {
            continue;
        }

        if (remainingLength <= segmentLength) {
            const segmentProgress = segmentLength <= 0 ? 0 : remainingLength / segmentLength;
            return {
                x: from.x + (to.x - from.x) * segmentProgress,
                y: from.y + (to.y - from.y) * segmentProgress,
            };
        }

        remainingLength -= segmentLength;
    }

    return points[points.length - 1] || points[0] || { x: 0, y: 0 };
}

/**
 * Measures Euclidean distance between two points.
 *
 * @param from - Start point.
 * @param to - End point.
 * @returns Distance between points.
 */
function measureDistance(from: OfficePoint, to: OfficePoint): number {
    return Math.hypot(to.x - from.x, to.y - from.y);
}

/**
 * Converts the pulse color into a softer halo color.
 *
 * @param pulseColor - Solid-ish pulse color string.
 * @returns Halo-ready color string.
 */
function convertPulseColorToHalo(pulseColor: string): string {
    return pulseColor.replace('0.82', '0.16').replace('0.78', '0.16').replace('0.72', '0.14');
}

/**
 * Clamps a numeric value to the provided bounds.
 *
 * @param value - Input value.
 * @param minValue - Lower bound.
 * @param maxValue - Upper bound.
 * @returns Clamped value.
 */
function clamp(value: number, minValue: number, maxValue: number): number {
    return Math.min(maxValue, Math.max(minValue, value));
}
