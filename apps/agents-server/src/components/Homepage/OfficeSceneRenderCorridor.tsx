import type { OfficeLayout, OfficePoint } from './buildOfficeLayout';
import { OfficeSceneGeometry, type OfficeSceneMetrics } from './OfficeSceneGeometry';

/**
 * Props for the office corridor renderer.
 */
type OfficeSceneRenderCorridorProps = {
    corridorHub: OfficePoint;
    layout: OfficeLayout;
    metrics: OfficeSceneMetrics;
};

/**
 * Renders the central corridor spine.
 *
 * @private function of <OfficeScene/>
 */
export function OfficeSceneRenderCorridor(props: OfficeSceneRenderCorridorProps) {
    const { corridorHub, layout, metrics } = props;
    const start = OfficeSceneGeometry.projectPoint({ x: corridorHub.x - 28, y: 0 }, 0, metrics);
    const end = OfficeSceneGeometry.projectPoint({ x: corridorHub.x + 24, y: layout.worldHeight - 100 }, 0, metrics);
    const rightStart = OfficeSceneGeometry.projectPoint({ x: corridorHub.x + 30, y: 0 }, 0, metrics);
    const rightEnd = OfficeSceneGeometry.projectPoint(
        { x: corridorHub.x + 82, y: layout.worldHeight - 100 },
        0,
        metrics,
    );
    const centerStart = {
        x: (start.x + rightStart.x) / 2,
        y: (start.y + rightStart.y) / 2,
    };
    const centerEnd = {
        x: (end.x + rightEnd.x) / 2,
        y: (end.y + rightEnd.y) / 2,
    };
    const laneAngle = (Math.atan2(centerEnd.y - centerStart.y, centerEnd.x - centerStart.x) * 180) / Math.PI;

    return (
        <g>
            <polygon
                points={`${start.x},${start.y} ${rightStart.x},${rightStart.y} ${rightEnd.x},${rightEnd.y} ${end.x},${end.y}`}
                fill="rgba(148,163,184,0.28)"
                stroke="rgba(71,85,105,0.42)"
                strokeWidth={2.1}
            />
            <polygon
                points={`${start.x},${start.y} ${rightStart.x},${rightStart.y} ${rightEnd.x},${rightEnd.y} ${end.x},${end.y}`}
                fill="url(#office-corridor-pattern)"
                opacity={0.6}
            />
            <line
                x1={centerStart.x}
                y1={centerStart.y}
                x2={centerEnd.x}
                y2={centerEnd.y}
                stroke="rgba(241,245,249,0.88)"
                strokeWidth={2.2}
                strokeLinecap="round"
                strokeDasharray="14 12"
            />
            {Array.from({ length: 7 }, (_, markerIndex) => {
                const progress = (markerIndex + 1) / 8;
                const markerCenter = OfficeSceneGeometry.interpolatePoint(centerStart, centerEnd, progress);
                return (
                    <rect
                        key={`corridor-marker-${markerIndex}`}
                        x={markerCenter.x - 8}
                        y={markerCenter.y - 1.8}
                        width={16}
                        height={3.6}
                        rx={1.6}
                        fill="rgba(15,23,42,0.15)"
                        transform={`rotate(${laneAngle} ${markerCenter.x} ${markerCenter.y})`}
                    />
                );
            })}
        </g>
    );
}
