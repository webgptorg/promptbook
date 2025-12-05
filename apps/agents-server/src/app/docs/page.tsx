import Link from 'next/link';
import { Card } from '../../components/Homepage/Card';
import { Section } from '../../components/Homepage/Section';
import { getVisibleCommitmentDefinitions } from '../../utils/getVisibleCommitmentDefinitions';

export default function DocsPage() {
    const groupedCommitments = getVisibleCommitmentDefinitions();

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
            <div className="container mx-auto px-4 py-16">
                <Section title="Documentation">
                    {groupedCommitments.map(({ primary, aliases }) => (
                        <Link key={primary.type} href={`/docs/${primary.type}`} className="block h-full group">
                            <Card className="h-full group-hover:border-blue-500 transition-colors">
                                <h3 className="text-xl font-semibold mb-2 group-hover:text-blue-600 transition-colors">
                                    <span className="mr-2">{primary.icon}</span>
                                    {primary.type}
                                    {aliases.length > 0 && (
                                        <span className="text-gray-400 font-normal text-lg">
                                            {' / '}
                                            {aliases.join(' / ')}
                                        </span>
                                    )}
                                </h3>
                                {primary.description && <p className="text-gray-600 line-clamp-3">{primary.description}</p>}
                            </Card>
                        </Link>
                    ))}
                </Section>
            </div>
        </div>
    );
}
