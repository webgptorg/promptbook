import { Section } from '../../components/Homepage/Section';
import Link from 'next/link';
import { COMMITMENT_REGISTRY } from '../../../../../src/commitments';

export default function DocsPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
            <div className="container mx-auto px-4 py-16">
                <Section title="Documentation">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {COMMITMENT_REGISTRY.map((commitment) => (
                            <Link
                                key={commitment.type}
                                href={`/docs/${commitment.type}`}
                                className="block p-6 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow hover:border-blue-500 group"
                            >
                                <h3 className="text-xl font-semibold mb-2 group-hover:text-blue-600 transition-colors">
                                    {commitment.type}
                                </h3>
                                {commitment.description && (
                                    <p className="text-gray-600 line-clamp-3">{commitment.description}</p>
                                )}
                            </Link>
                        ))}
                    </div>
                </Section>
            </div>
        </div>
    );
}
