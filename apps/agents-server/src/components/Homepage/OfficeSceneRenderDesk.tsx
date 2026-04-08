import type { OfficeAgentVisual, OfficeDesk } from './buildOfficeLayout';
import { OfficeSceneGeometry, type OfficeSceneMetrics } from './OfficeSceneGeometry';

/**
 * Props for one desk renderer.
 */
type OfficeSceneRenderDeskProps = {
    desk: OfficeDesk;
    occupant: OfficeAgentVisual | null;
    metrics: OfficeSceneMetrics;
};

/**
 * Renders one desk including monitor glow and compact work preview.
 *
 * @private function of <OfficeScene/>
 */
export function OfficeSceneRenderDesk(props: OfficeSceneRenderDeskProps) {
    const { desk, occupant, metrics } = props;
    const deskColor = occupant?.isRemote ? '#2563eb' : desk.color;
    const isShowingScreen = occupant?.state === 'working';
    const labelPoint = OfficeSceneGeometry.projectPoint(
        { x: desk.x + 12, y: desk.y + 8 },
        OfficeSceneGeometry.DESK_MONITOR_HEIGHT + 6,
        metrics,
    );
    const keyboardTop = OfficeSceneGeometry.projectTopFace(
        desk.x + 10,
        desk.y + 13,
        16,
        7,
        OfficeSceneGeometry.OFFICE_OBJECT_HEIGHT + 2,
        metrics,
    );
    const mugPoint = OfficeSceneGeometry.projectPoint(
        { x: desk.x + desk.width - 8, y: desk.y + 8 },
        OfficeSceneGeometry.OFFICE_OBJECT_HEIGHT + 3,
        metrics,
    );

    return (
        <g>
            {OfficeSceneGeometry.renderIsometricBlock(
                `${desk.id}:chair`,
                {
                    x: desk.x + 18,
                    y: desk.y + desk.depth + 5,
                    width: 16,
                    depth: 12,
                    elevation: OfficeSceneGeometry.OFFICE_OBJECT_HEIGHT - 8,
                },
                metrics,
                {
                    topFill: 'rgba(51,65,85,0.7)',
                    frontFill: 'rgba(30,41,59,0.8)',
                    rightFill: 'rgba(15,23,42,0.82)',
                    topStroke: 'rgba(15,23,42,0.4)',
                    faceStroke: 'rgba(255,255,255,0.2)',
                    topStrokeWidth: 0.8,
                    faceStrokeWidth: 0.6,
                },
            )}
            {OfficeSceneGeometry.renderIsometricBlock(
                `${desk.id}:table`,
                {
                    x: desk.x,
                    y: desk.y,
                    width: desk.width,
                    depth: desk.depth,
                    elevation: OfficeSceneGeometry.OFFICE_OBJECT_HEIGHT,
                },
                metrics,
                {
                    topFill: OfficeSceneGeometry.hexToRgba(deskColor, 0.26),
                    frontFill: OfficeSceneGeometry.hexToRgba(deskColor, 0.33),
                    rightFill: OfficeSceneGeometry.hexToRgba(deskColor, 0.38),
                    topStroke: 'rgba(15,23,42,0.24)',
                    faceStroke: 'rgba(255,255,255,0.36)',
                    topStrokeWidth: 1,
                    faceStrokeWidth: 0.8,
                    topPatternId: 'office-desk-wood-pattern',
                    topPatternOpacity: 0.58,
                },
            )}
            {OfficeSceneGeometry.renderIsometricBlock(
                `${desk.id}:monitor`,
                {
                    x: desk.x + 11,
                    y: desk.y + 3,
                    width: 18,
                    depth: 8,
                    elevation: OfficeSceneGeometry.DESK_MONITOR_HEIGHT,
                },
                metrics,
                {
                    topFill: isShowingScreen ? 'rgba(14,165,233,0.86)' : 'rgba(51,65,85,0.86)',
                    frontFill: isShowingScreen ? 'rgba(6,182,212,0.8)' : 'rgba(30,41,59,0.88)',
                    rightFill: isShowingScreen ? 'rgba(3,105,161,0.84)' : 'rgba(15,23,42,0.9)',
                    topStroke: 'rgba(255,255,255,0.44)',
                    faceStroke: 'rgba(255,255,255,0.3)',
                    topStrokeWidth: 0.8,
                    faceStrokeWidth: 0.6,
                },
            )}
            <polygon
                points={keyboardTop}
                fill="rgba(148,163,184,0.62)"
                stroke="rgba(15,23,42,0.26)"
                strokeWidth={0.6}
            />
            <circle cx={mugPoint.x} cy={mugPoint.y} r={2.2} fill="rgba(248,250,252,0.92)" />
            {isShowingScreen && occupant?.previewText && (
                <text x={labelPoint.x} y={labelPoint.y} fill="rgba(8,47,73,0.88)" fontSize={7.3} fontWeight={700}>
                    {OfficeSceneGeometry.truncateText(occupant.previewText, 18)}
                </text>
            )}
        </g>
    );
}
