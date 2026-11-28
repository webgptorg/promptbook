'use client';

import CountingUtilitiesPreview from './counting-utilities/CountingUtilitiesPreview';
import HumanizeAiTextPreview from './humanize-ai-text/HumanizeAiTextPreview';

/**
 * Props for utility preview.
 */
type UtilityPreviewProps = {
    utilityId: string;
};

/**
 * Handles utility preview.
 */
export default function UtilityPreview({ utilityId }: UtilityPreviewProps) {
    if (utilityId === 'humanize-ai-text') {
        return <HumanizeAiTextPreview />;
    }

    if (utilityId === 'counting-utilities') {
        return <CountingUtilitiesPreview />;
    }

    return <div className="p-6">Preview not available</div>;
}
