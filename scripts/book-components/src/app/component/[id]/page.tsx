import ComponentPreview from '@/components/ComponentPreview';
import CopyButton from '@/components/CopyButton';
import { getComponentById } from '@/lib/components';
import { ArrowLeft, Code, Download, ExternalLink, Eye, Settings, Tag, User } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

interface ComponentPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ComponentPage({ params }: ComponentPageProps) {
  const { id } = await params;
  const component = getComponentById(id);

  if (!component) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link
                href="/"
                className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Back to Gallery
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <a
                href={component.repository}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Repository
              </a>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Component Header */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    {component.name}
                  </h1>
                  <p className="text-lg text-gray-600 mb-4">
                    {component.description}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {component.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                      >
                        <Tag className="h-3 w-3 mr-1" />
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="text-right">
                  <span className="inline-block bg-gray-100 text-gray-800 text-sm font-medium px-3 py-1 rounded-full mb-2">
                    v{component.version}
                  </span>
                  <div className="text-sm text-gray-500">
                    <div className="flex items-center">
                      <User className="h-4 w-4 mr-1" />
                      {component.author}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Live Preview */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                    <Eye className="h-5 w-5 mr-2" />
                    Live Preview
                  </h2>
                </div>
              </div>
              <ComponentPreview componentId={component.id} />
            </div>

            {/* Features */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Settings className="h-5 w-5 mr-2" />
                Features
              </h2>
              <ul className="space-y-2">
                {component.features.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <span className="flex-shrink-0 h-5 w-5 text-green-500 mr-3 mt-0.5">✓</span>
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Code Examples */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Code className="h-5 w-5 mr-2" />
                  Usage Examples
                </h2>
              </div>
              <div className="p-6 space-y-6">
                {component.examples.map((example, index) => (
                  <div key={index}>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-medium text-gray-900">
                        {example.title}
                      </h3>
                      <CopyButton
                        text={example.code}
                        className="inline-flex items-center px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
                      />
                    </div>
                    <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                      <code>{example.code}</code>
                    </pre>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Quick Actions
              </h3>
              <div className="space-y-3">
                <a
                  href={component.repository}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Component
                </a>
                <CopyButton
                  text={`import ${component.name.replace(/\s+/g, '')} from './${component.id}/${component.name.replace(/\s+/g, '')}'`}
                  className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Copy Import
                </CopyButton>
              </div>
            </div>

            {/* Technical Details */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Technical Details
              </h3>
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Category</h4>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                    {component.category}
                  </span>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Dependencies</h4>
                  <div className="space-y-1">
                    {Object.entries(component.dependencies).map(([dep, version]) => (
                      <div key={dep} className="text-sm text-gray-600 font-mono">
                        {dep}: {version}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Props Documentation */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Props
              </h3>
              <div className="space-y-4">
                {Object.entries(component.props).map(([propName, propInfo]) => (
                  <div key={propName} className="border-b border-gray-200 pb-3 last:border-b-0">
                    <div className="flex items-start justify-between mb-1">
                      <code className="text-sm font-mono text-blue-600">
                        {propName}
                      </code>
                      {propInfo.required && (
                        <span className="text-xs text-red-600 font-medium">
                          required
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 font-mono mb-1">
                      {propInfo.type}
                    </div>
                    <div className="text-sm text-gray-700 mb-1">
                      {propInfo.description}
                    </div>
                    {propInfo.default !== undefined && (
                      <div className="text-xs text-gray-500">
                        Default: <code className="font-mono">{JSON.stringify(propInfo.default)}</code>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
