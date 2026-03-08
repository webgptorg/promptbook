import type { AgentPreparationStatusSnapshot } from '@/src/utils/agentPreparation';

/**
 * Props for rendering one agent pre-index status badge in the profile view.
 */
type AgentPreparationStatusBadgeProps = {
    readonly status: AgentPreparationStatusSnapshot | null;
};

/**
 * Prepared UI model for the status badge.
 */
type AgentPreparationStatusBadgeModel = {
    readonly title: string;
    readonly detail: string | null;
    readonly toneClasses: string;
    readonly dotClasses: string;
};

/**
 * Tone classes for the "prepared" state.
 */
const PREPARED_TONE_CLASSES = 'border-emerald-200 bg-emerald-50/90 text-emerald-800';

/**
 * Tone classes for the "preparing" state.
 */
const PREPARING_TONE_CLASSES = 'border-blue-200 bg-blue-50/90 text-blue-800';

/**
 * Tone classes for the "failed" state.
 */
const FAILED_TONE_CLASSES = 'border-red-200 bg-red-50/90 text-red-800';

/**
 * Tone classes for the default "not prepared" state.
 */
const NOT_PREPARED_TONE_CLASSES = 'border-slate-200 bg-white/85 text-slate-700';

/**
 * Converts ISO timestamp into user-readable local datetime text.
 */
function formatPreparationTimestamp(timestamp: string | null): string | null {
    if (!timestamp) {
        return null;
    }

    const parsed = new Date(timestamp);
    if (Number.isNaN(parsed.getTime())) {
        return null;
    }

    return parsed.toLocaleString();
}

/**
 * Maps preparation snapshot to concise badge copy and color classes.
 */
function resolvePreparationBadgeModel(
    status: AgentPreparationStatusSnapshot | null,
): AgentPreparationStatusBadgeModel {
    if (!status || status.state === 'NOT_PREPARED') {
        return {
            title: 'Preparation pending',
            detail: 'Vector index is not prepared for the latest version yet.',
            toneClasses: NOT_PREPARED_TONE_CLASSES,
            dotClasses: 'bg-slate-400',
        };
    }

    if (status.state === 'PREPARED') {
        const preparedAt = formatPreparationTimestamp(status.completedAt);
        return {
            title: 'Prepared',
            detail: preparedAt ? `Last prepared at ${preparedAt}` : 'Vector index is up to date.',
            toneClasses: PREPARED_TONE_CLASSES,
            dotClasses: 'bg-emerald-500',
        };
    }

    if (status.state === 'FAILED') {
        const failedAt = formatPreparationTimestamp(status.failedAt);
        const failurePrefix = failedAt ? `Last failure at ${failedAt}. ` : '';
        const errorDetail = status.lastError ? status.lastError : 'Will retry automatically.';
        return {
            title: 'Preparation failed',
            detail: `${failurePrefix}${errorDetail}`,
            toneClasses: FAILED_TONE_CLASSES,
            dotClasses: 'bg-red-500',
        };
    }

    const startedAt = formatPreparationTimestamp(status.startedAt);
    const scheduledAt = formatPreparationTimestamp(status.runAfter);
    const detail = startedAt
        ? `Started at ${startedAt}`
        : scheduledAt
          ? `Scheduled for ${scheduledAt}`
          : 'Running in background...';

    return {
        title: 'Preparing...',
        detail,
        toneClasses: PREPARING_TONE_CLASSES,
        dotClasses: 'bg-blue-500',
    };
}

/**
 * Renders one status badge describing whether background pre-indexing is up to date.
 */
export function AgentPreparationStatusBadge({ status }: AgentPreparationStatusBadgeProps) {
    const model = resolvePreparationBadgeModel(status);

    return (
        <div className={`basis-full rounded-xl border px-3 py-2 shadow-sm backdrop-blur-sm ${model.toneClasses}`}>
            <div className="flex items-center gap-2 text-sm font-semibold">
                <span className={`inline-block h-2 w-2 rounded-full ${model.dotClasses}`} />
                {model.title}
            </div>
            {model.detail && <p className="mt-1 text-xs leading-relaxed opacity-90">{model.detail}</p>}
        </div>
    );
}
