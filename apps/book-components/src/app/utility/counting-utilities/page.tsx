'use client';

import CopyButton from '@/components/CopyButton';
import CountingUtilitiesCodeSamples from '@/components/counting-utilities/CountingUtilitiesCodeSamples';
import CountingUtilitiesPreviewWrapper from '@/components/counting-utilities/CountingUtilitiesPreviewWrapper';
import { Footer } from '@/components/Footer/Footer';
import { Header } from '@/components/Header/Header';
import { Download, Tag, User } from 'lucide-react';

export default function CountingUtilitiesPage() {
    const utility = {
        name: 'Counting Utilities',
        description: 'A collection of utilities for counting words, characters, and sentences in a text.',
        tags: ['text', 'utility', 'counting'],
        version: '1.0.0',
        author: 'Promptbook',
        repository: 'https://github.com/webgptorg/promptbook',
        category: 'Text Analysis',
        dependencies: {
            react: '^18.0.0 || ^19.0.0',
            '@promptbook/utils': '0.103.0-4',
        },
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-purple-50">
            <Header />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Utility Header */}
                        <div className="bg-white rounded-lg shadow-md p-6">
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <h1 className="text-3xl font-bold text-gray-900 mb-2">{utility.name}</h1>
                                    <p className="text-lg text-gray-600 mb-4">{utility.description}</p>
                                    <div className="flex flex-wrap gap-2">
                                        {utility.tags.map((tag) => (
                                            <span
                                                key={tag}
                                                className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800"
                                            >
                                                <Tag className="h-3 w-3 mr-1" />
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="inline-block bg-gray-100 text-gray-800 text-sm font-medium px-3 py-1 rounded-full mb-2 whitespace-nowrap">
                                        v{utility.version}
                                    </span>
                                    <div className="text-sm text-gray-500">
                                        <div className="flex items-center">
                                            <User className="h-4 w-4 mr-1" />
                                            {utility.author}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <CountingUtilitiesPreviewWrapper />
                        <CountingUtilitiesCodeSamples />
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Quick Actions */}
                        <div className="bg-white rounded-lg shadow-md p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                            <div className="space-y-3">
                                <a
                                    href={utility.repository}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700 transition-colors"
                                >
                                    <Download className="h-4 w-4 mr-2" />
                                    Download Utility
                                </a>
                                <CopyButton
                                    text={`import { countCharacters, countWords, ... } from '@promptbook/utils'`}
                                    className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                                >
                                    <Download className="h-4 w-4 mr-2" />
                                    Copy Import
                                </CopyButton>
                            </div>
                        </div>

                        {/* Technical Details */}
                        <div className="bg-white rounded-lg shadow-md p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Technical Details</h3>
                            <div className="space-y-4">
                                <div>
                                    <h4 className="text-sm font-medium text-gray-900 mb-2">Category</h4>
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                        {utility.category}
                                    </span>
                                </div>
                                <div>
                                    <h4 className="text-sm font-medium text-gray-900 mb-2">Dependencies</h4>
                                    <div className="space-y-1">
                                        {Object.entries(utility.dependencies).map(([dep, version]) => (
                                            <div key={dep} className="text-sm text-gray-600 font-mono">
                                                {dep}: {version}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <Footer />
        </div>
    );
}
