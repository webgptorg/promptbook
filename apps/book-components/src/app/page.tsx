import ComponentCardPreview from '@/components/ComponentCardPreview';
import { Header } from '@/components/Header/Header';
import { getAllComponents, getComponentsByCategory } from '@/lib/components';
import { getAllUtilities, getUtilitiesByCategory } from '@/lib/utilities';
import { Package, Search, Tag, User } from 'lucide-react';
import Link from 'next/link';
import { classNames } from '../../../../src/book-components/_common/react-utils/classNames';
import { Footer } from '../components/Footer/Footer';

export default function Home() {
    const components = getAllComponents();
    const componentsByCategory = getComponentsByCategory();
    const utilities = getAllUtilities();
    const utilitiesByCategory = getUtilitiesByCategory();

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
            <Header />

            {/* Hero Section */}
            <section className="py-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h2 className="text-4xl font-bold text-gray-900 mb-4">Build with Promptbook Components</h2>
                    <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
                        Discover Promptbook components ready to integrate into your project.
                    </p>
                    <div className="flex justify-center" style={{ display: 'none' /* <- TODO: Bring search back */ }}>
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
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
                        <div>
                            <div className="text-3xl font-bold text-blue-600">{components.length}</div>
                            <div className="text-gray-600">Components</div>
                        </div>
                        <div>
                            <div className="text-3xl font-bold text-yellow-600">{utilities.length}</div>
                            <div className="text-gray-600">Utilities</div>
                        </div>
                        <div>
                            <div className="text-3xl font-bold text-purple-600">
                                {Object.keys(componentsByCategory).length + Object.keys(utilitiesByCategory).length}
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

            {/* Components and Utilities Grid */}
            <section className="py-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    {Object.entries(componentsByCategory).map(([category, categoryComponents]) => (
                        <div
                            key={category}
                            className={classNames('mb-12', category === 'Internal' ? 'opacity-50' : '')}
                        >
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
                                            {/* Component Preview */}
                                            {/*
                                                Wrap ComponentCardPreview so that previews in the
                                                "Internal" category render at 50% opacity.
                                            */}

                                            <ComponentCardPreview componentId={component.id} />

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

                    {Object.entries(utilitiesByCategory).map(([category, categoryUtilities]) => (
                        <div key={category} className="mb-12">
                            <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                                <Package className="h-6 w-6 mr-2 text-yellow-600" />
                                {category}
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {categoryUtilities.map((utility) => (
                                    <Link key={utility.id} href={`/utility/${utility.id}`} className="group block">
                                        <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 overflow-hidden border border-gray-200">
                                            <div className="p-6">
                                                <div className="flex items-start justify-between mb-3">
                                                    <h4 className="text-lg font-semibold text-gray-900 group-hover:text-yellow-600 transition-colors">
                                                        {utility.name}
                                                    </h4>
                                                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                                        v{utility.version}
                                                    </span>
                                                </div>
                                                <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                                                    {utility.description}
                                                </p>
                                                <div className="flex flex-wrap gap-2 mb-4">
                                                    {utility.tags.slice(0, 3).map((tag) => (
                                                        <span
                                                            key={tag}
                                                            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800"
                                                        >
                                                            <Tag className="h-3 w-3 mr-1" />
                                                            {tag}
                                                        </span>
                                                    ))}
                                                    {utility.tags.length > 3 && (
                                                        <span className="text-xs text-gray-500">
                                                            +{utility.tags.length - 3} more
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center justify-between text-sm text-gray-500">
                                                    <div className="flex items-center">
                                                        <User className="h-4 w-4 mr-1" />
                                                        {utility.author}
                                                    </div>
                                                    <div className="text-yellow-600 group-hover:text-yellow-700">
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

            <Footer />
        </div>
    );
}
