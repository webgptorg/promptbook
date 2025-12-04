import { getGroupedCommitmentDefinitions } from '../../../../../../src/commitments';
import { BookCommitment } from '../../../../../../src/commitments/_base/BookCommitment';
import { notFound } from 'next/navigation';
import ReactMarkdown from 'react-markdown';

type DocPageProps = {
    params: Promise<{
        docId: string;
    }>;
};

export default async function DocPage(props: DocPageProps) {
    const { docId } = await props.params;
    
    // Decode the docId in case it contains encoded characters (though types usually don't)
    const commitmentType = decodeURIComponent(docId) as BookCommitment;
    const groupedCommitments = getGroupedCommitmentDefinitions();
    const group = groupedCommitments.find(
        (g) => g.primary.type === commitmentType || g.aliases.includes(commitmentType),
    );

    if (!group) {
        notFound();
    }

    const { primary, aliases } = group;

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
            <div className="container mx-auto px-4 py-16">
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                    <div className="p-8 border-b border-gray-100 bg-gray-50/50">
                        <div className="flex items-center gap-4 mb-4">
                            <h1 className="text-4xl font-bold text-gray-900 tracking-tight">
                                {primary.type}
                                {aliases.length > 0 && (
                                    <span className="text-gray-400 font-normal ml-4 text-2xl">
                                        / {aliases.join(' / ')}
                                    </span>
                                )}
                            </h1>
                            <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                                Commitment
                            </span>
                        </div>
                        {primary.description && (
                            <p className="text-xl text-gray-600 leading-relaxed max-w-3xl">
                                {primary.description}
                            </p>
                        )}
                    </div>
                    
                    <div className="p-8">
                        <article className="prose prose-lg prose-slate max-w-none prose-headings:font-bold prose-h2:text-2xl prose-h2:mt-8 prose-h2:mb-4 prose-p:text-gray-600 prose-pre:bg-gray-50 prose-pre:border prose-pre:border-gray-200 prose-pre:text-gray-800">
                            <ReactMarkdown>
                                {primary.documentation}
                            </ReactMarkdown>
                        </article>
                    </div>
                </div>
            </div>
        </div>
    );
}
