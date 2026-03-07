import type { CSSProperties } from 'react';
import type { ConnectionType, GraphSummaryInfo } from './buildGraphData';
import { CONNECTION_TYPES, EDGE_LABELS, EDGE_STYLES } from './buildGraphData';

/**
 * Props for the graph summary card.
 */
type GraphSummaryCardProps = {
    readonly label: string;
    readonly value: number;
    readonly helperText?: string;
};

/**
 * Simple stat card used inside the overview panel.
 */
function GraphSummaryCard({ label, value, helperText }: GraphSummaryCardProps) {
    return (
        <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3 shadow-sm">
            <div className="text-3xl font-semibold leading-tight text-slate-900 tabular-nums">{value}</div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</div>
            {helperText ? <p className="mt-1 text-[10px] font-medium text-slate-400">{helperText}</p> : null}
        </div>
    );
}

/**
 * Props for the connection legend list.
 */
type GraphConnectionLegendProps = {
    readonly connectionCountByType: Record<ConnectionType, number>;
};

/**
 * Displays connection counts for each link type with color cues.
 */
function GraphConnectionLegend({ connectionCountByType }: GraphConnectionLegendProps) {
    return (
        <div className="mt-3 grid gap-2 md:grid-cols-3">
            {CONNECTION_TYPES.map((type) => {
                const style: CSSProperties = {
                    borderBottomWidth: 2,
                    borderBottomStyle: EDGE_STYLES[type].dash ? 'dashed' : 'solid',
                    borderBottomColor: EDGE_STYLES[type].color,
                    width: 36,
                    display: 'inline-block',
                };

                return (
                    <div
                        key={type}
                        className="flex items-center justify-between rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-[11px] text-slate-600 shadow-sm"
                    >
                        <div className="flex items-center gap-2">
                            <span className="inline-block" style={style}></span>
                            <span className="font-semibold text-slate-700">{EDGE_LABELS[type]}</span>
                        </div>
                        <span className="text-sm font-semibold text-slate-900">{connectionCountByType[type]}</span>
                    </div>
                );
            })}
        </div>
    );
}

/**
 * Props for the graph summary overview panel.
 */
type GraphSummaryPanelProps = {
    readonly summary: GraphSummaryInfo;
};

/**
 * Overview UI displayed above the graph that surfaces top-level metrics.
 *
 * @private function of AgentsGraph
 */
export function GraphSummaryPanel({ summary }: GraphSummaryPanelProps) {
    const cards = [
        { label: 'Visible agents', value: summary.agentCount },
        { label: 'Servers represented', value: summary.serverCount },
        { label: 'Explicit connections', value: summary.totalConnections, helperText: 'Inheritance / Import / Team' },
        { label: 'Folder order links', value: summary.orderLinkCount },
    ];

    return (
        <div className="space-y-2 rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
            <div className="grid gap-3 md:grid-cols-4">
                {cards.map((card) => (
                    <GraphSummaryCard key={card.label} {...card} />
                ))}
            </div>
            <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Connections by type</p>
                <GraphConnectionLegend connectionCountByType={summary.connectionCountByType} />
            </div>
        </div>
    );
}
