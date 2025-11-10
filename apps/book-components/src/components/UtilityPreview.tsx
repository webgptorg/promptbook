'use client';

import CountingUtilitiesPreview from './counting-utilities/CountingUtilitiesPreview';
import HumanizeAiTextPreview from './humanize-ai-text/HumanizeAiTextPreview';

type UtilityPreviewProps = {
    utilityId: string;
};

export default function UtilityPreview({ utilityId }: UtilityPreviewProps) {
    if (utilityId === 'humanize-ai-text') {
        return <HumanizeAiTextPreview />;
    }

    if (utilityId === 'counting-utilities') {
        return <CountingUtilitiesPreview />;
    }

    return <div className="p-6">Preview not available</div>;
}
