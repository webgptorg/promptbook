import logoImage from '@/public/logo-blue-white-256.png';
import Image from 'next/image';
import Link from 'next/link';
import { getPages } from './getPages';

export default function HomePage() {
    // Note: Pages are discovered automatically from the app directory structure
    // When you add a new page directory with page.tsx, it will appear here automatically
    const pages = getPages();

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
            <div className="container mx-auto px-4 py-16">
                <h1 className="text-4xl font-bold text-gray-900 mb-4">
                    <Image src={logoImage} alt="Promptbook Logo" height={50} className="inline-block mr-4" />
                    Promptbook utils
                </h1>
                <p className="text-xl text-gray-600 mb-12">Misc utils which can help with random LLM related tasks.</p>

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {pages.map((page) => (
                        <Link
                            key={page.path}
                            href={page.path}
                            className="block p-6 bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 border border-gray-200 hover:border-blue-400"
                        >
                            <h2 className="text-2xl font-semibold text-gray-900 mb-2">{page.title}</h2>
                            <p className="text-gray-600">{page.description}</p>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
