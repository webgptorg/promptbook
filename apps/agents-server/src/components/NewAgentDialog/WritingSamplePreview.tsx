import { NewAgentWizardClassNames } from './NewAgentWizardClassNames';

/**
 * Props for one mocked-chat preview bubble stack.
 */
type WritingSamplePreviewProps = {
    /**
     * Assistant message to show in the preview bubble.
     */
    readonly assistantMessage: string;

    /**
     * Optional label shown above the preview.
     */
    readonly title?: string;

    /**
     * Shared user-side prompt shown above the assistant sample.
     */
    readonly userMessage: string;
};

/**
 * Renders a minimal mocked-chat preview used for writing-style samples.
 *
 * @param props - Writing preview props.
 * @returns Mocked chat bubbles.
 *
 * @private internal component of <NewAgentWizard/>.
 */
export function WritingSamplePreview(props: WritingSamplePreviewProps) {
    const { assistantMessage, title, userMessage } = props;

    return (
        <div className={NewAgentWizardClassNames.mutedSurfaceCard}>
            {title && <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">{title}</div>}
            <div className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl rounded-br-md bg-white px-3 py-2 text-xs text-slate-700 shadow-sm dark:bg-slate-950 dark:text-slate-200 dark:shadow-slate-950/35">
                    {userMessage}
                </div>
            </div>
            <div className="mt-2 flex justify-start">
                <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-blue-600 px-3 py-2 text-xs text-white shadow-sm dark:bg-blue-500">
                    {assistantMessage}
                </div>
            </div>
        </div>
    );
}
