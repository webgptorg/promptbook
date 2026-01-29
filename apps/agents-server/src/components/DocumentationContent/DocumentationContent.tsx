import { MarkdownContent } from '@promptbook-local/components';
import { OpenMojiIcon } from '../OpenMojiIcon/OpenMojiIcon';

type DocumentationContentProps = {
    primary: {
        type: string;
        icon: string;
        description?: string;
        documentation: string;
    };
    aliases?: string[];
    isPrintOnly?: boolean;
};

export function DocumentationContent({ primary, aliases = [], isPrintOnly = false }: DocumentationContentProps) {
    return (
        <div
            className={`bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden ${
                isPrintOnly ? 'shadow-none border-none' : ''
            } print:shadow-none print:border-none print:rounded-none`}
        >
            <div
                className={`p-8 border-b border-gray-100 bg-gray-50/50 ${
                    isPrintOnly ? 'border-none bg-white p-0 mb-4' : ''
                } print:p-0 print:border-none print:bg-white print:mb-4`}
            >
                <div className="flex items-center gap-4 mb-4">
                    <h1 className="text-4xl font-bold text-gray-900 tracking-tight print:text-3xl">
                        <OpenMojiIcon icon={primary.icon} variant="color" className="mr-3" />
                        {primary.type}
                        {aliases.length > 0 && (
                            <span className="text-gray-400 font-normal ml-4 text-2xl print:text-xl">
                                / {aliases.join(' / ')}
                            </span>
                        )}
                    </h1>
                    {!isPrintOnly && (
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 print:hidden">
                            Commitment
                        </span>
                    )}
                </div>
                {primary.description && (
                    <p className="text-xl text-gray-600 leading-relaxed max-w-3xl print:text-lg">
                        {primary.description}
                    </p>
                )}
            </div>

            <div className={`p-8 ${isPrintOnly ? 'p-0' : ''} print:p-0`}>
                <article className="prose prose-lg prose-slate max-w-none prose-headings:font-bold prose-headings:tracking-tight prose-headings:text-gray-900 prose-h1:text-4xl prose-h1:mb-8 prose-h2:text-2xl prose-h2:mt-12 prose-h2:mb-6 prose-h2:pb-2 prose-h2:border-b prose-h2:border-gray-200 prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-4 prose-h3:text-gray-800 prose-p:text-gray-600 prose-p:leading-relaxed prose-p:mb-6 prose-a:text-blue-600 prose-a:no-underline hover:prose-a:text-blue-700 hover:prose-a:underline prose-a:transition-colors prose-strong:font-bold prose-strong:text-gray-900 prose-code:text-blue-600 prose-code:bg-blue-50 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:before:content-none prose-code:after:content-none prose-code:font-medium prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-pre:shadow-lg prose-pre:rounded-xl prose-pre:p-6 prose-ul:list-disc prose-ul:pl-6 prose-li:marker:text-gray-400 prose-li:mb-2 prose-ol:list-decimal prose-ol:pl-6 prose-li:mb-2 prose-blockquote:border-l-4 prose-blockquote:border-blue-500 prose-blockquote:bg-blue-50/50 prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:rounded-r-lg prose-blockquote:not-italic prose-blockquote:text-gray-700 prose-blockquote:my-8 prose-img:rounded-xl prose-img:shadow-md prose-img:my-8 prose-hr:border-gray-200 prose-hr:my-10 prose-table:w-full prose-th:text-left prose-th:py-2 prose-th:px-3 prose-th:bg-gray-100 prose-th:font-semibold prose-th:text-gray-900 prose-td:py-2 prose-td:px-3 prose-td:border-b prose-td:border-gray-200 prose-tr:hover:bg-gray-50 print:prose-base print:max-w-none">
                    <MarkdownContent
                        content={primary.documentation}
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
