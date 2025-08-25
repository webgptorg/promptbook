import { getAllComponents, getComponentsByCategory } from '@/lib/components';
import { ExternalLink, Package, Search, Tag, User } from 'lucide-react';
import Link from 'next/link';

export default function Home() {
    const components = getAllComponents();
    const componentsByCategory = getComponentsByCategory();

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
            {/* Header */}
            <header className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src="https://www.ptbk.io/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Flogo-blue-transparent-256.493b7e49.png&w=64&q=75"
                                alt="Promptbook Logo"
                                className="h-10 w-10"
                            />
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">Promptbook Components</h1>
                                <p className="text-gray-600">A curated gallery of React components for developers</p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-4">
                            <a
                                href="https://github.com/webgptorg/promptbook-components"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                            >
                                <ExternalLink className="h-4 w-4 mr-2" />
                                GitHub
                            </a>
                        </div>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <section className="py-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h2 className="text-4xl font-bold text-gray-900 mb-4">Build Faster with Ready-to-Use Components</h2>
                    <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
                        Discover, preview, and copy high-quality React components built with Tailwind CSS. Each
                        component is self-contained and ready to integrate into your project.
                    </p>
                    <div className="flex justify-center">
                        <div className="relative max-w-md w-full">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search components..."
                                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                    </div>
                </div>
            </section>

            {/* Stats */}
            <section className="py-8 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
                        <div>
                            <div className="text-3xl font-bold text-blue-600">{components.length}</div>
                            <div className="text-gray-600">Components</div>
                        </div>
                        <div>
                            <div className="text-3xl font-bold text-purple-600">
                                {Object.keys(componentsByCategory).length}
                            </div>
                            <div className="text-gray-600">Categories</div>
                        </div>
                        <div>
                            <div className="text-3xl font-bold text-green-600">100%</div>
                            <div className="text-gray-600">Open Source</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Components Grid */}
            <section className="py-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    {Object.entries(componentsByCategory).map(([category, categoryComponents]) => (
                        <div key={category} className="mb-12">
                            <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                                <Package className="h-6 w-6 mr-2 text-blue-600" />
                                {category}
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {categoryComponents.map((component) => (
                                    <Link
                                        key={component.id}
                                        href={`/component/${component.id}`}
                                        className="group block"
                                    >
                                        <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 overflow-hidden border border-gray-200">
                                            <div className="p-6">
                                                <div className="flex items-start justify-between mb-3">
                                                    <h4 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                                                        {component.name}
                                                    </h4>
                                                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                                        v{component.version}
                                                    </span>
                                                </div>
                                                <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                                                    {component.description}
                                                </p>
                                                <div className="flex flex-wrap gap-2 mb-4">
                                                    {component.tags.slice(0, 3).map((tag) => (
                                                        <span
                                                            key={tag}
                                                            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                                                        >
                                                            <Tag className="h-3 w-3 mr-1" />
                                                            {tag}
                                                        </span>
                                                    ))}
                                                    {component.tags.length > 3 && (
                                                        <span className="text-xs text-gray-500">
                                                            +{component.tags.length - 3} more
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center justify-between text-sm text-gray-500">
                                                    <div className="flex items-center">
                                                        <User className="h-4 w-4 mr-1" />
                                                        {component.author}
                                                    </div>
                                                    <div className="text-blue-600 group-hover:text-blue-700">
                                                        View Details →
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-gray-900 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                        <div className="col-span-1 md:col-span-2">
                            <div className="flex items-center space-x-3 mb-4">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src="https://www.ptbk.io/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Flogo-blue-transparent-256.493b7e49.png&w=64&q=75"
                                    alt="Promptbook Logo"
                                    className="h-8 w-8"
                                />
                                <span className="text-xl font-bold">Promptbook</span>
                            </div>
                            <p className="text-gray-400 mb-4">
                                Revolutionizing software development with natural language programming. Build AI
                                applications in minutes, not weeks.
                            </p>
                            <div className="flex space-x-4">
                                <a
                                    href="https://github.com/webgptorg/promptbook"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-gray-400 hover:text-white transition-colors"
                                >
                                    GitHub
                                </a>
                                <a
                                    href="https://www.ptbk.io"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-gray-400 hover:text-white transition-colors"
                                >
                                    Website
                                </a>
                                <a
                                    href="https://promptbook.studio"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-gray-400 hover:text-white transition-colors"
                                >
                                    Studio
                                </a>
                            </div>
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold mb-4">Resources</h3>
                            <ul className="space-y-2">
                                <li>
                                    <a
                                        href="https://www.ptbk.io/get-started"
                                        className="text-gray-400 hover:text-white transition-colors"
                                    >
                                        Get Started
                                    </a>
                                </li>
                                <li>
                                    <a
                                        href="https://www.ptbk.io/manifest"
                                        className="text-gray-400 hover:text-white transition-colors"
                                    >
                                        Documentation
                                    </a>
                                </li>
                                <li>
                                    <a
                                        href="https://github.com/webgptorg/promptbook/discussions"
                                        className="text-gray-400 hover:text-white transition-colors"
                                    >
                                        Community
                                    </a>
                                </li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold mb-4">Company</h3>
                            <ul className="space-y-2">
                                <li>
                                    <a
                                        href="https://aldaron.ptbk.io"
                                        className="text-gray-400 hover:text-white transition-colors"
                                    >
                                        Aldaron AI
                                    </a>
                                </li>
                                <li>
                                    <a
                                        href="https://www.pavolhejny.com"
                                        className="text-gray-400 hover:text-white transition-colors"
                                    >
                                        About
                                    </a>
                                </li>
                                <li>
                                    <a
                                        href="mailto:me@pavolhejny.com"
                                        className="text-gray-400 hover:text-white transition-colors"
                                    >
                                        Contact
                                    </a>
                                </li>
                            </ul>
                        </div>
                    </div>
                    <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
                        <p>&copy; 2025 Promptbook. All rights reserved. Open source and built with ❤️</p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
