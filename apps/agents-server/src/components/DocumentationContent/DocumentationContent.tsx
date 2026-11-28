import { MarkdownContent } from '@promptbook-local/components';
import { renderGroupedCommitmentDocumentationMarkdown } from '../../../../../src/book-2.0/book-language-documentation/renderGroupedCommitmentDocumentationMarkdown';
import {
    formatCommitmentReplacementText,
    getCommitmentNoticeMetadata,
    isLowVisibilityCommitmentNotice,
} from '../../../../../src/commitments/_common/getCommitmentNoticeMetadata';
import { OpenMojiIcon } from '../OpenMojiIcon/OpenMojiIcon';

/**
 * Props for documentation content.
 */
type DocumentationContentProps = {
    primary: {
        type: string;
        icon: string;
        description?: string;
        documentation: string;
        isUnfinished?: boolean;
        deprecation?: {
            message: string;
            replacedBy?: ReadonlyArray<string>;
        };
    };
    aliases?: string[];
    isPrintOnly?: boolean;
};

/**
 * Handles documentation content.
 */
export function DocumentationContent({ primary, aliases = [], isPrintOnly = false }: DocumentationContentProps) {
    const notice = getCommitmentNoticeMetadata(primary);
    const isLowVisibilityNotice = isLowVisibilityCommitmentNotice(notice);
    const noticeContent =
        notice && notice.kind === 'deprecated'
            ? `${notice.message}${formatCommitmentReplacementText(primary.deprecation?.replacedBy)}`
            : notice?.message || null;
    const documentationMarkdown = renderGroupedCommitmentDocumentationMarkdown({ primary, aliases });

    return (
        <div
            className={`bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden dark:border-slate-700 dark:bg-slate-900/92 dark:shadow-slate-950/40 ${
                isPrintOnly ? 'shadow-none border-none' : ''
            } print:shadow-none print:border-none print:rounded-none`}
        >
            <div
                className={`p-8 border-b border-gray-100 bg-gray-50/50 dark:border-slate-700 dark:bg-slate-800/72 ${
                    isPrintOnly ? 'border-none bg-white p-0 mb-4' : ''
                } ${
                    isLowVisibilityNotice ? 'opacity-90 print:opacity-100' : ''
                } print:p-0 print:border-none print:bg-white print:mb-4`}
            >
                <div className="flex items-center gap-4 mb-4">
                    <h1 className="text-4xl font-bold text-gray-900 tracking-tight print:text-3xl">
                        <OpenMojiIcon icon={primary.icon} variant="color" className="mr-3" />
                        {primary.type}
                        {aliases.length > 0 && (
                            <span className="text-gray-400 font-normal ml-4 text-2xl dark:text-slate-500 print:text-xl">
                                / {aliases.join(' / ')}
                            </span>
                        )}
                    </h1>
                    {!isPrintOnly && (
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-100 print:hidden">
                            Commitment
                        </span>
                    )}
                    {!isPrintOnly && notice?.kind === 'deprecated' && (
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-100 print:hidden">
                            Deprecated
                        </span>
                    )}
                    {!isPrintOnly && isLowVisibilityNotice && (
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-100 print:hidden">
                            {notice?.badgeLabel}
                        </span>
                    )}
                </div>
                {primary.description && (
                    <p className="text-xl text-gray-600 leading-relaxed max-w-3xl print:text-lg">
                        {primary.description}
                    </p>
                )}
                {noticeContent && (
                    <div
                        className={`mt-4 rounded-xl border px-4 py-3 text-sm print:border ${
                            isLowVisibilityNotice
                                ? 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-950/72 dark:text-slate-200 print:border-slate-200'
                                : 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/40 dark:bg-amber-950/35 dark:text-amber-100 print:border-amber-200'
                        }`}
                    >
                        <div className="font-semibold mb-1">{notice?.detailLabel || 'Deprecated'}</div>
                        <div
                            className={`prose prose-sm max-w-none prose-p:my-0 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:before:content-none prose-code:after:content-none ${
                                isLowVisibilityNotice
                                    ? 'prose-slate prose-code:text-slate-700 prose-code:bg-slate-100'
                                    : 'prose-amber prose-code:text-amber-900 prose-code:bg-amber-100'
                            }`}
                        >
                            <MarkdownContent content={noticeContent} />
                        </div>
                    </div>
                )}
            </div>

            <div className={`p-8 ${isPrintOnly ? 'p-0' : ''} print:p-0`}>
                <article className="prose prose-lg prose-slate max-w-none prose-headings:font-bold prose-headings:tracking-tight prose-headings:text-gray-900 prose-h1:text-4xl prose-h1:mb-8 prose-h2:text-2xl prose-h2:mt-12 prose-h2:mb-6 prose-h2:pb-2 prose-h2:border-b prose-h2:border-gray-200 prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-4 prose-h3:text-gray-800 prose-p:text-gray-600 prose-p:leading-relaxed prose-p:mb-6 prose-a:text-blue-600 prose-a:no-underline hover:prose-a:text-blue-700 hover:prose-a:underline prose-a:transition-colors prose-strong:font-bold prose-strong:text-gray-900 prose-code:text-blue-600 prose-code:bg-blue-50 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:before:content-none prose-code:after:content-none prose-code:font-medium prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-pre:shadow-lg prose-pre:rounded-xl prose-pre:p-6 prose-ul:list-disc prose-ul:pl-6 prose-li:marker:text-gray-400 prose-li:mb-2 prose-ol:list-decimal prose-ol:pl-6 prose-li:mb-2 prose-blockquote:border-l-4 prose-blockquote:border-blue-500 prose-blockquote:bg-blue-50/50 prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:rounded-r-lg prose-blockquote:not-italic prose-blockquote:text-gray-700 prose-blockquote:my-8 prose-img:rounded-xl prose-img:shadow-md prose-img:my-8 prose-hr:border-gray-200 prose-hr:my-10 prose-table:w-full prose-th:text-left prose-th:py-2 prose-th:px-3 prose-th:bg-gray-100 prose-th:font-semibold prose-th:text-gray-900 prose-td:py-2 prose-td:px-3 prose-td:border-b prose-td:border-gray-200 prose-tr:hover:bg-gray-50 dark:prose-invert dark:prose-headings:text-slate-100 dark:prose-h2:border-slate-700 dark:prose-h3:text-slate-100 dark:prose-p:text-slate-300 dark:prose-a:text-sky-300 dark:prose-strong:text-slate-100 dark:prose-code:bg-slate-800 dark:prose-code:text-sky-200 dark:prose-blockquote:border-sky-400 dark:prose-blockquote:bg-slate-950/60 dark:prose-blockquote:text-slate-200 dark:prose-hr:border-slate-700 dark:prose-th:bg-slate-800 dark:prose-th:text-slate-100 dark:prose-td:border-slate-700 dark:prose-tr:hover:bg-slate-800/60 print:prose-base print:max-w-none">
                    <MarkdownContent
                        content={documentationMarkdown}
                        /* TODO: !!!!
                        components={{
                            code(props) {
                                const { children, className, node, ...rest } = props;
                                const match = /language-(\w+)/.exec(className || '');
                                if (match && match[1] === 'book') {
                                    const value = String(children).replace(/\n$/, '');
                                    // Estimate height: lines * 30px + padding
                                    const lineCount = value.split(/\r?\n/).length;
                                    const height = lineCount * 30 + 40; // 30px per line + 40px buffer

                                    return (
                                        <div className="not-prose my-6 rounded-lg overflow-hidden border border-gray-200 shadow-sm print:border-gray-300">
                                            <BookEditor
                                                value={value as string_book}
                                                isReadonly={true}
                                                isVerbose={false}
                                                height={`${height}px`}
                                                isDownloadButtonShown={false}
                                                isAboutButtonShown={false}
                                                isFullscreenButtonShown={true}
                                            />
                                        </div>
                                    );
                                }
                                return (
                                    <code className={className} {...rest}>
                                        {children}
                                    </code>
                                );
                            },
                        }}
                        */
                    />
                </article>
            </div>
        </div>
    );
}
