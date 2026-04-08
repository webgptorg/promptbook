import type { PointerEvent as ReactPointerEvent } from 'react';
import type { OfficeAgentVisual, OfficeRoom } from './buildOfficeLayout';
import { OfficeSceneGeometry, type OfficeSceneMetrics } from './OfficeSceneGeometry';

/**
 * Props for one agent renderer.
 */
type OfficeSceneRenderAgentProps = {
    agent: OfficeAgentVisual;
    room: OfficeRoom | null;
    metrics: OfficeSceneMetrics;
    onHover: (event: ReactPointerEvent<SVGGElement>) => void;
    onLeave: () => void;
    onOpen: () => void;
};

/**
 * Renders one avatar with deterministic character styling and state bubble.
 *
 * @private function of <OfficeScene/>
 */
export function OfficeSceneRenderAgent(props: OfficeSceneRenderAgentProps) {
    const { agent, room, metrics, onHover, onLeave, onOpen } = props;
    const basePosition = OfficeSceneGeometry.projectPoint(
        agent.position,
        OfficeSceneGeometry.OFFICE_OBJECT_HEIGHT + 10,
        metrics,
    );
    const groundShadow = OfficeSceneGeometry.projectPoint(agent.position, 0, metrics);
    const displayName = agent.agent.meta.fullname || agent.agent.agentName;
    const nameplateFill = agent.isRemote ? 'rgba(37,99,235,0.92)' : 'rgba(15,23,42,0.9)';
    const initials = displayName.slice(0, 1).toUpperCase();
    const outfitColor = agent.isRemote
        ? '#1d4ed8'
        : OfficeSceneGeometry.pickColorFromSeed(agent.seed, OfficeSceneGeometry.AGENT_OUTFIT_PALETTE);
    const skinColor = OfficeSceneGeometry.pickColorFromSeed(agent.seed + 7, OfficeSceneGeometry.AGENT_SKIN_PALETTE);
    const hairColor = OfficeSceneGeometry.pickColorFromSeed(agent.seed + 19, OfficeSceneGeometry.AGENT_HAIR_PALETTE);
    const movementStart = agent.path
        ? OfficeSceneGeometry.projectPoint(agent.path.from, OfficeSceneGeometry.OFFICE_OBJECT_HEIGHT + 10, metrics)
        : null;
    const movementEnd = agent.path
        ? OfficeSceneGeometry.projectPoint(agent.path.to, OfficeSceneGeometry.OFFICE_OBJECT_HEIGHT + 10, metrics)
        : null;
    const bubblePoint = OfficeSceneGeometry.projectPoint(
        agent.position,
        OfficeSceneGeometry.AGENT_BUBBLE_HEIGHT,
        metrics,
    );
    const remoteHalo =
        room?.kind === 'head-office'
            ? 'rgba(59,130,246,0.18)'
            : agent.isRemote
            ? 'rgba(59,130,246,0.12)'
            : 'rgba(245,158,11,0.12)';

    return (
        <g
            onMouseEnter={onHover}
            onMouseMove={onHover}
            onMouseLeave={onLeave}
            onClick={(event) => {
                event.stopPropagation();
                onOpen();
            }}
            onPointerDown={(event) => event.stopPropagation()}
            onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onOpen();
                }
            }}
            role="button"
            tabIndex={0}
            aria-label={`Open ${displayName}`}
            className="cursor-pointer"
        >
            <g>
                {movementStart && movementEnd && (
                    <animateTransform
                        attributeName="transform"
                        type="translate"
                        values={`${movementStart.x - basePosition.x} ${movementStart.y - basePosition.y};${
                            movementEnd.x - basePosition.x
                        } ${movementEnd.y - basePosition.y};${movementStart.x - basePosition.x} ${
                            movementStart.y - basePosition.y
                        }`}
                        dur={`${agent.path?.durationMs || 3600}ms`}
                        begin={`${agent.path?.delayMs || 0}ms`}
                        repeatCount="indefinite"
                    />
                )}

                <ellipse cx={groundShadow.x} cy={groundShadow.y + 8} rx={14} ry={6} fill="rgba(15,23,42,0.16)" />
                <circle cx={basePosition.x} cy={basePosition.y - 8} r={14} fill={remoteHalo} />
                <rect
                    x={basePosition.x - 6}
                    y={basePosition.y - 10}
                    width={12}
                    height={12}
                    rx={3}
                    fill={outfitColor}
                    stroke="rgba(15,23,42,0.28)"
                    strokeWidth={1}
                />
                <rect
                    x={basePosition.x - 5.4}
                    y={basePosition.y + 1.4}
                    width={4.1}
                    height={5.4}
                    rx={1.4}
                    fill={OfficeSceneGeometry.hexToRgba(outfitColor, 0.9)}
                />
                <rect
                    x={basePosition.x + 1.3}
                    y={basePosition.y + 1.4}
                    width={4.1}
                    height={5.4}
                    rx={1.4}
                    fill={OfficeSceneGeometry.hexToRgba(outfitColor, 0.82)}
                />
                <circle
                    cx={basePosition.x}
                    cy={basePosition.y - 12.6}
                    r={5.7}
                    fill={skinColor}
                    stroke="rgba(15,23,42,0.2)"
                    strokeWidth={1}
                />
                <path
                    d={`M ${basePosition.x - 5.2} ${basePosition.y - 13.1} Q ${basePosition.x} ${
                        basePosition.y - 19.5
                    } ${basePosition.x + 5.2} ${basePosition.y - 13.1} L ${basePosition.x + 4.2} ${
                        basePosition.y - 10.3
                    } L ${basePosition.x - 4.2} ${basePosition.y - 10.3} Z`}
                    fill={hairColor}
                    opacity={0.92}
                />
                <circle cx={basePosition.x - 1.8} cy={basePosition.y - 12.7} r={0.72} fill="rgba(15,23,42,0.7)" />
                <circle cx={basePosition.x + 1.8} cy={basePosition.y - 12.7} r={0.72} fill="rgba(15,23,42,0.7)" />
                <rect
                    x={basePosition.x - 2.9}
                    y={basePosition.y - 5.8}
                    width={5.8}
                    height={4.4}
                    rx={1.6}
                    fill="rgba(255,255,255,0.24)"
                />
                <text
                    x={basePosition.x}
                    y={basePosition.y - 2.4}
                    textAnchor="middle"
                    fill="white"
                    fontSize={4.6}
                    fontWeight={800}
                >
                    {initials}
                </text>

                <rect
                    x={basePosition.x - 16}
                    y={basePosition.y + 8}
                    width={32}
                    height={12}
                    rx={6}
                    fill={nameplateFill}
                    opacity={0.94}
                />
                <text
                    x={basePosition.x}
                    y={basePosition.y + 16.5}
                    textAnchor="middle"
                    fill="white"
                    fontSize={7.5}
                    fontWeight={700}
                >
                    {OfficeSceneGeometry.truncateText(displayName, 8)}
                </text>
                {renderActivityBubble(agent.state, bubblePoint)}
            </g>
        </g>
    );
}

/**
 * Renders a compact status bubble inspired by pixel-office activity indicators.
 *
 * @param state - Agent activity state.
 * @param bubblePoint - Screen-space bubble anchor.
 * @returns Activity bubble SVG group.
 */
function renderActivityBubble(state: OfficeAgentVisual['state'], bubblePoint: { x: number; y: number }) {
    const bubbleFill =
        state === 'working'
            ? 'rgba(3,105,161,0.92)'
            : state === 'meeting'
            ? 'rgba(5,150,105,0.9)'
            : state === 'moving'
            ? 'rgba(59,130,246,0.9)'
            : 'rgba(71,85,105,0.88)';
    const bubbleStroke =
        state === 'working'
            ? 'rgba(6,182,212,0.66)'
            : state === 'meeting'
            ? 'rgba(52,211,153,0.72)'
            : state === 'moving'
            ? 'rgba(147,197,253,0.78)'
            : 'rgba(203,213,225,0.7)';

    return (
        <g transform={`translate(${bubblePoint.x - 12} ${bubblePoint.y - 16})`}>
            <rect width={24} height={12} rx={4} fill={bubbleFill} stroke={bubbleStroke} strokeWidth={1} />
            <path d="M 10 12 L 12 15.4 L 14 12" fill={bubbleFill} stroke={bubbleStroke} strokeWidth={0.7} />
            {state === 'working' && (
                <g>
                    <rect x={6} y={6.8} width={2.2} height={3} rx={0.7} fill="rgba(255,255,255,0.9)">
                        <animate attributeName="height" values="2.5;4.2;2.8" dur="1.2s" repeatCount="indefinite" />
                    </rect>
                    <rect x={10.7} y={5.6} width={2.2} height={4.3} rx={0.7} fill="rgba(255,255,255,0.96)">
                        <animate
                            attributeName="height"
                            values="3.2;5;3.5"
                            dur="1.2s"
                            repeatCount="indefinite"
                            begin="0.18s"
                        />
                    </rect>
                    <rect x={15.4} y={6.6} width={2.2} height={3.2} rx={0.7} fill="rgba(255,255,255,0.9)">
                        <animate
                            attributeName="height"
                            values="2.8;4.4;3.1"
                            dur="1.2s"
                            repeatCount="indefinite"
                            begin="0.34s"
                        />
                    </rect>
                </g>
            )}
            {state === 'meeting' && (
                <g>
                    <circle cx={8} cy={6.8} r={1.4} fill="rgba(255,255,255,0.95)">
                        <animate attributeName="opacity" values="0.4;1;0.45" dur="1.1s" repeatCount="indefinite" />
                    </circle>
                    <circle cx={12} cy={6.8} r={1.4} fill="rgba(255,255,255,0.95)">
                        <animate
                            attributeName="opacity"
                            values="0.5;1;0.5"
                            dur="1.1s"
                            repeatCount="indefinite"
                            begin="0.2s"
                        />
                    </circle>
                    <circle cx={16} cy={6.8} r={1.4} fill="rgba(255,255,255,0.95)">
                        <animate
                            attributeName="opacity"
                            values="0.45;1;0.45"
                            dur="1.1s"
                            repeatCount="indefinite"
                            begin="0.4s"
                        />
                    </circle>
                </g>
            )}
            {state === 'moving' && (
                <path
                    d="M 7 7 L 12 4 L 12 6.4 L 17 6.4 L 17 7.6 L 12 7.6 L 12 10 Z"
                    fill="rgba(255,255,255,0.94)"
                    stroke="rgba(255,255,255,0.94)"
                    strokeWidth={0.5}
                />
            )}
            {state === 'idle' && (
                <path d="M 8 8.6 C 10 5 14 5 16 8.6" stroke="rgba(255,255,255,0.92)" strokeWidth={1.2} fill="none" />
            )}
        </g>
    );
}
