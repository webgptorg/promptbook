'use client';

import { BookEditor } from '@promptbook-local/components';
import type { string_book } from '@promptbook-local/types';
import { PencilIcon } from 'lucide-react';
import Link from 'next/link';
import { usePromptbookTheme } from '../../../../components/ThemeMode/usePromptbookTheme';
import { AgentCodePageSection } from './AgentCodePageSection';

/**
 * Props for the source-book section.
 *
 * @private type of `<SourceBookSection/>`
 */
type SourceBookSectionProps = {
    /**
     * Routed agent name.
     */
    readonly agentName: string;

    /**
     * Stored source book shown in the read-only Book viewer.
     */
    readonly agentSource: string_book;
};

/**
 * Renders the read-only Book source viewer and the link to the dedicated Book editor.
 *
 * @private internal component of `<AgentCodePageClient/>`
 */
export function SourceBookSection({ agentName, agentSource }: SourceBookSectionProps) {
    const { promptbookTheme } = usePromptbookTheme();

    return (
        <AgentCodePageSection
            title="Source Book"
            description="Review the stored Book source used to create this agent. Editing stays in the dedicated Book editor."
            actions={
                <Link
                    href={`/agents/${encodeURIComponent(agentName)}/book`}
                    className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                    <PencilIcon className="h-4 w-4" />
                    Edit Book
                </Link>
            }
        >
            <div className="h-[28rem] overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
                <BookEditor
                    className="h-full w-full"
                    height={null}
                    value={agentSource}
                    isReadonly
                    isUploadButtonShown={false}
                    isCameraButtonShown={false}
                    isDownloadButtonShown={false}
                    isAboutButtonShown={false}
                    isFullscreenButtonShown={false}
                    translations={{ readonlyMessage: 'Use Edit Book to change the source.' }}
                    theme={promptbookTheme}
                />
            </div>
        </AgentCodePageSection>
    );
}
