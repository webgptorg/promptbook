import { MarkdownContent } from '@promptbook-local/components';
import Link from 'next/link';
import { DocsToolbar } from '../../components/DocsToolbar/DocsToolbar';
import { DocumentationContent } from '../../components/DocumentationContent/DocumentationContent';
import { Card } from '../../components/Homepage/Card';
import { Section } from '../../components/Homepage/Section';
import { OpenMojiIcon } from '../../components/OpenMojiIcon/OpenMojiIcon';
import { PrintHeader } from '../../components/PrintHeader/PrintHeader';
import { getVisibleCommitmentDefinitions } from '../../utils/getVisibleCommitmentDefinitions';

export default function DocsPage() {
    const groupedCommitments = getVisibleCommitmentDefinitions();

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
            <div className="container mx-auto px-4 py-16">
                <DocsToolbar />
                <PrintHeader title="Full Documentation" />

                {/* Screen view: Cards */}
                <div className="print:hidden">
                    <Section title="Documentation">
                        {groupedCommitments.map(({ primary, aliases }) => (
                            <Link key={primary.type} href={`/docs/${primary.type}`} className="block h-full group">
                                <Card className="h-full group-hover:border-blue-500 transition-colors">
                                    <h3 className="text-xl font-semibold mb-2 group-hover:text-blue-600 transition-colors">
                                        <OpenMojiIcon icon={primary.icon} variant="color" className="mr-2" />
                                        {primary.type}
                                        {aliases.length > 0 && (
                                            <span className="text-gray-400 font-normal text-lg">
                                                {' / '}
                                                {aliases.join(' / ')}
                                            </span>
                                        )}
                                    </h3>
                                    {primary.description && (
                                        <p className="text-gray-600 line-clamp-3">
                                            <MarkdownContent content={primary.description} />
                                        </p>
                                    )}
                                </Card>
                            </Link>
                        ))}
                    </Section>
                </div>

                {/* Print view: Full Content */}
                <div className="hidden print:block space-y-12">
                    {groupedCommitments.map(({ primary, aliases }) => (
                        <div key={primary.type} className="break-inside-avoid page-break-after-always">
                            <DocumentationContent primary={primary} aliases={aliases} isPrintOnly={true} />
                            <hr className="my-8 border-gray-200" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
