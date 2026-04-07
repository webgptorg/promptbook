import { RefreshCcw, Search, Users, ZoomIn, ZoomOut } from 'lucide-react';
import type { OfficeLayout, OfficeRoom } from './buildOfficeLayout';

/**
 * Props for the office toolbar and status summary.
 */
type AgentsOfficeToolbarProps = {
    rooms: ReadonlyArray<OfficeRoom>;
    stateCounts: OfficeLayout['stateCounts'];
    focusedRoomId: string | null;
    onZoomIn: () => void;
    onZoomOut: () => void;
    onResetCamera: () => void;
    onAutoArrange: () => void;
    onFocusMeetingRoom: () => void;
    onFocusRoom: (roomId: string) => void;
};

/**
 * Renders the office controls, room filters, and status summary.
 *
 * @private function of <AgentsOffice/>
 */
export function AgentsOfficeToolbar(props: AgentsOfficeToolbarProps) {
    const { rooms, stateCounts, focusedRoomId, onZoomIn, onZoomOut, onResetCamera, onAutoArrange, onFocusMeetingRoom, onFocusRoom } =
        props;

    return (
        <>
            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={onZoomIn}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300"
                    >
                        <ZoomIn className="h-4 w-4" />
                        Zoom in
                    </button>
                    <button
                        type="button"
                        onClick={onZoomOut}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300"
                    >
                        <ZoomOut className="h-4 w-4" />
                        Zoom out
                    </button>
                    <button
                        type="button"
                        onClick={onResetCamera}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300"
                    >
                        <RefreshCcw className="h-4 w-4" />
                        Reset
                    </button>
                    <button
                        type="button"
                        onClick={onAutoArrange}
                        className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900 transition hover:border-amber-300"
                    >
                        <Search className="h-4 w-4" />
                        Auto-arrange
                    </button>
                    <button
                        type="button"
                        onClick={onFocusMeetingRoom}
                        className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-900 transition hover:border-emerald-300"
                    >
                        <Users className="h-4 w-4" />
                        Focus team
                    </button>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
                    {rooms.map((room) => (
                        <button
                            key={room.id}
                            type="button"
                            onClick={() => onFocusRoom(room.id)}
                            className={`rounded-full border px-3 py-1.5 text-xs font-semibold tracking-wide transition ${
                                focusedRoomId === room.id
                                    ? 'border-slate-900 bg-slate-900 text-white'
                                    : 'border-white/70 bg-white/90 text-slate-700 hover:border-slate-300'
                            }`}
                        >
                            {room.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
                <OfficeStatusChip label="Idle" value={stateCounts.idle} tone="slate" />
                <OfficeStatusChip label="Working" value={stateCounts.working} tone="amber" />
                <OfficeStatusChip label="Meeting" value={stateCounts.meeting} tone="emerald" />
                <OfficeStatusChip label="Moving" value={stateCounts.moving} tone="sky" />
            </div>
        </>
    );
}

/**
 * Props for one compact toolbar status chip.
 */
type OfficeStatusChipProps = {
    label: string;
    value: number;
    tone: 'slate' | 'amber' | 'emerald' | 'sky';
};

/**
 * Renders one compact status chip for the office toolbar.
 */
function OfficeStatusChip(props: OfficeStatusChipProps) {
    const toneClassName =
        props.tone === 'amber'
            ? 'border-amber-200 bg-amber-50 text-amber-900'
            : props.tone === 'emerald'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
              : props.tone === 'sky'
                ? 'border-sky-200 bg-sky-50 text-sky-900'
                : 'border-slate-200 bg-white text-slate-700';

    return (
        <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 ${toneClassName}`}>
            <span>{props.label}</span>
            <span className="rounded-full bg-white/80 px-2 py-0.5 text-[11px] text-slate-700">{props.value}</span>
        </div>
    );
}
