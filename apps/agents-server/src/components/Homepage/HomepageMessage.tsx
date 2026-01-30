import { MarkdownContent } from '@promptbook-local/components';

/**
 * Props for the homepage message section.
 */
type HomepageMessageProps = {
    /**
     * Markdown content shown above the agents list.
     */
    message: string | null;
};

/**
 * Renders a markdown message above the homepage agents list when configured.
 */
export function HomepageMessage({ message }: HomepageMessageProps) {
    const trimmedMessage = message?.trim();

    if (!trimmedMessage) {
        return null;
    }

    return (
        <section className="mb-10">
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
                <article className="prose prose-slate max-w-none">
                    <MarkdownContent content={trimmedMessage} />
                </article>
            </div>
        </section>
    );
}
